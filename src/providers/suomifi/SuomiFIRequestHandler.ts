import { Context } from "openapi-backend";
import { v4 as uuidv4 } from "uuid";
import { getJSONResponseHeaders } from "../../utils/default-headers";
import { AccessDeniedException, ValidationError } from "../../utils/exceptions";
import { generateBase64Hash, resolveBase64Hash } from "../../utils/hashes";
import { debug, log } from "../../utils/logging";
import { prepareCookie, prepareErrorRedirectUrl, prepareLoginRedirectUrl, prepareLogoutRedirectUrl } from "../../utils/route-utils";
import { parseBase64XMLBody } from "../../utils/transformers";

import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import SuomiFISettings from "./SuomiFI.config";
import { createSignedInTokens, generateSaml2RelayState } from "./SuomiFIAuthorizer";
import SuomiFICookies from "./utils/SuomiFICookies";
import { getSuomiFISAML2Client } from "./utils/SuomiFISAML2";
import { SuomiFiLoginState } from "./utils/SuomifiTypes";

/**
 * @see: https://palveluhallinta.suomi.fi/en/sivut/tunnistus/kayttoonotto/kayttoonoton-vaiheet
 * @see: https://en.wikipedia.org/wiki/SAML_2.0
 * @see: https://github.com/node-saml/node-saml
 */
export default new (class SuomiFIRequestHandler implements AuthRequestHandler {
  identityProviderIdent = SuomiFISettings.ident;
  async initialize(): Promise<void> {}

  /**
   * GET->REDIRECT: The route for handling the auth flow initiating process
   *
   * @param context
   * @returns
   */
  async LoginRequest(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, this.identityProviderIdent, uuidv4());
    const samlClient = await getSuomiFISAML2Client();
    const RelayState = await generateSaml2RelayState(parsedAppContext);
    const authenticationUrl = await samlClient.getAuthorizeUrlAsync(RelayState);

    return {
      statusCode: 303,
      headers: {
        Location: authenticationUrl,
      },
      cookies: [prepareCookie("appContext", parsedAppContext.hash)],
    };
  }

  /**
   * GET->REDIRECT: The route for handling the auth flow callback, redirecting back to the frontend app
   *
   * @param context
   * @returns AuthenticateResponse -> LoginResponse
   */
  async AuthenticateResponse(context: Context): Promise<HttpResponse> {
    const body = parseBase64XMLBody(context.request.body);
    const samlClient = await getSuomiFISAML2Client();

    try {
      const result = await samlClient.validatePostResponseAsync(body); // throws

      const { parsedAppContext, accessToken, idToken, expiresAt } = await createSignedInTokens(body.RelayState, result.profile.nameID); // throws
      const redirectUrl = prepareLoginRedirectUrl(parsedAppContext.object.redirectUrl, accessToken, this.identityProviderIdent);

      const suomiFiLoginState = {
        profile: result.profile,
        context: {
          AuthnContextClassRef: result.profile.getAssertion()["Assertion"]["AuthnStatement"][0]["AuthnContext"][0]["AuthnContextClassRef"][0]["_"],
        },
        accessToken: accessToken,
        idToken: idToken,
        expiresAt: expiresAt,
      };

      // Setup cookies
      const suomiFiLoginStateHash = generateBase64Hash(JSON.stringify(suomiFiLoginState));
      const suomiFiCookies = SuomiFICookies.create(suomiFiLoginStateHash);
      const cookies = [...suomiFiCookies, prepareCookie("appContext", "")];

      return {
        statusCode: 303,
        headers: {
          Location: redirectUrl,
        },
        cookies: cookies,
      };
    } catch (error) {
      debug(error);
      const parsedAppContext = parseAppContext(context, this.identityProviderIdent); // throws
      const redirectUrl = prepareErrorRedirectUrl(parsedAppContext.object.redirectUrl, "Authentication failed", this.identityProviderIdent);
      return {
        statusCode: 303,
        headers: {
          Location: redirectUrl,
        },
        cookies: [prepareCookie("appContext", "")],
      };
    }
  }

  /**
   *  POST: The route for the access token exchange: loginCode -> accessToken, idToken
   *
   * @param context
   * @returns
   */
  async AuthTokenRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, this.identityProviderIdent); // throws
    const loginState = this.#resolveLoginState(context); // throws

    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify({
        accessToken: loginState.accessToken,
        idToken: loginState.idToken,
        expiresAt: loginState.expiresAt,
      }),
    };
  }

  /**
   *  POST: get user info with the access token
   *
   * @param context
   * @returns
   */
  async UserInfoRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, this.identityProviderIdent); // throws
    const loginState = this.#resolveLoginState(context); // throws

    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify(loginState),
    };
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow
   *
   * @param context
   * @returns
   */
  async LogoutRequest(context: Context): Promise<HttpResponse> {
    if (SuomiFICookies.hasSuomifiCookies(context)) {
      const parsedAppContext = parseAppContext(context, this.identityProviderIdent);
      try {
        const loginState = this.#resolveLoginState(context, false); // throws
        const samlClient = await getSuomiFISAML2Client();
        const logoutRequestUrl = await samlClient.getLogoutUrlAsync(loginState.profile, parsedAppContext.hash);

        return {
          statusCode: 303,
          headers: {
            Location: logoutRequestUrl,
          },
        };
      } catch (error) {
        throw new ValidationError("Bad login profile data");
      }
    }
    throw new AccessDeniedException("Not logged in");
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   *
   * @param context
   * @returns
   */
  async LogoutResponse(context: Context): Promise<HttpResponse> {
    const body = context.request.query;
    const originalQuery = new URLSearchParams(body).toString();
    const samlClient = await getSuomiFISAML2Client();
    try {
      await samlClient.validateRedirectAsync(body, originalQuery); // throws
    } catch (error) {
      log("Error", "LogoutResponse", error);
    }
    const parsedAppContext = parseAppContext(String(body.RelayState), this.identityProviderIdent);

    return {
      statusCode: 303,
      headers: {
        Location: prepareLogoutRedirectUrl(parsedAppContext.object.redirectUrl, this.identityProviderIdent),
      },
      cookies: [prepareCookie("suomiFiLoginState", "")],
    };
  }

  #resolveLoginState(context: Context, authorize: boolean = true): SuomiFiLoginState {
    if (!SuomiFICookies.hasSuomifiCookies(context)) {
      throw new AccessDeniedException("Not logged in");
    }

    const suomiFiLoginStateHash = SuomiFICookies.resolve(context);
    const loginState = JSON.parse(resolveBase64Hash(suomiFiLoginStateHash));

    if (!loginState.profile) {
      throw new ValidationError("No profile info on the login state");
    }
    if (!loginState.accessToken) {
      throw new ValidationError("No accessToken info on the login state");
    }

    if (authorize) {
      const requestAccessToken = context.request.requestBody?.accessToken || context.request.requestBody?.loginCode;
      if (loginState.accessToken !== requestAccessToken) {
        debug(loginState, context.request);
        throw new AccessDeniedException("Invalid session token");
      }
    }
    return loginState;
  }
})();
