import { Context } from "openapi-backend";
import { v4 as uuidv4 } from "uuid";
import { getJSONResponseHeaders } from "../../utils/default-headers";
import { AccessDeniedException, ValidationError } from "../../utils/exceptions";
import { generateBase64Hash, resolveBase64Hash } from "../../utils/hashes";
import { debug, log } from "../../utils/logging";
import { prepareLoginRedirectUrl, prepareLogoutRedirectUrl } from "../../utils/route-utils";
import { parseBase64XMLBody } from "../../utils/transformers";

import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import SuomiFISettings from "./SuomiFI.config";
import { generateSaml2RelayState, parseSaml2RelayState } from "./SuomiFIAuthorizer";
import { getSuomiFISAML2Client } from "./utils/SuomiFISAML2";

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
    const result = await samlClient.validatePostResponseAsync(body); // throws

    const { appContextHash, accessToken } = parseSaml2RelayState(body.RelayState);
    const parsedAppContext = parseAppContext(appContextHash, this.identityProviderIdent);
    const redirectUrl = prepareLoginRedirectUrl(parsedAppContext.object.redirectUrl, result.profile.nameID, this.identityProviderIdent);

    try {
      const suomiFiLoginState = {
        profile: result.profile,
        context: {
          AuthnContextClassRef: result.profile.getAssertion()["Assertion"]["AuthnStatement"][0]["AuthnContext"][0]["AuthnContextClassRef"][0]["_"],
        },
        accessToken: accessToken,
      };

      return {
        statusCode: 303,
        headers: {
          Location: redirectUrl,
          "Set-Cookie": `suomiFiLoginState=${generateBase64Hash(suomiFiLoginState)}; SameSite=None; Secure; HttpOnly`,
        },
      };
    } catch (err) {
      debug("AuthenticateResponse", err, () => result.profile.getAssertion());
      throw new ValidationError("Bad login profile data: AuthnContextClassRef");
    }
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow
   *
   * @param context
   * @returns
   */
  async LogoutRequest(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, this.identityProviderIdent);
    if (context.request.cookies?.suomiFiLoginState) {
      try {
        const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.suomiFiLoginState)));
        if (!loginState.profile) {
          throw new ValidationError("No profile info on the login state");
        }

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
   * (not used, but required by the Sinuna logout flow)
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
        "Set-Cookie": `suomiFiLoginState=;`,
      },
    };
  }

  /**
   *  POST: The route for the access token exchange: loginCode -> accessToken
   *
   * @param context
   * @returns
   */
  async AuthTokenRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, this.identityProviderIdent);
    if (context.request.cookies?.suomiFiLoginState) {
      try {
        const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.suomiFiLoginState)));
        if (!loginState.accessToken) {
          throw new ValidationError("No accessToken info on the login state");
        }
        return {
          statusCode: 200,
          headers: getJSONResponseHeaders(),
          body: JSON.stringify({
            token: loginState.accessToken,
          }),
        };
      } catch (error) {
        if (error instanceof ValidationError || error instanceof AccessDeniedException) {
          throw error;
        }
        debug(error);
        throw new ValidationError("Bad login profile data");
      }
    }
    throw new AccessDeniedException("Not logged in");
  }

  /**
   *  POST: get user info from with the access token
   *
   * @param context
   * @returns
   */
  async UserInfoRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, this.identityProviderIdent);
    if (context.request.cookies?.suomiFiLoginState) {
      try {
        const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.suomiFiLoginState)));
        if (!loginState.profile) {
          throw new ValidationError("No profile info on the login state");
        }
        if (!loginState.accessToken) {
          throw new ValidationError("No accessToken info on the login state");
        }
        if (loginState.accessToken !== context.request.requestBody.token) {
          debug(loginState, context.request);
          throw new AccessDeniedException("Invalid session token");
        }

        return {
          statusCode: 200,
          headers: getJSONResponseHeaders(),
          body: JSON.stringify(loginState),
        };
      } catch (error) {
        if (error instanceof ValidationError || error instanceof AccessDeniedException) {
          throw error;
        }
        debug(error);
        throw new ValidationError("Bad login profile data");
      }
    }
    throw new AccessDeniedException("Not logged in");
  }
})();
