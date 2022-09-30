import { Context } from "openapi-backend";
import { getJSONResponseHeaders } from "../../utils/default-headers";
import { parseAppContext } from "../../utils/validators";
import { prepareLoginRedirectUrl, prepareLogoutRedirectUrl } from "../../utils/route-utils";
import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { debug, log } from "../../utils/logging";
import { generateBase64Hash, parseBase64XMLBody, resolveBase64Hash } from "../../utils/transformers";
import { AccessDeniedException, ValidationError } from "../../utils/exceptions";
import { getSuomiFISAML2Client } from "./utils/SuomiFISAML2";
import SuomiFISettings from "./SuomiFI.config";

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
    const appContext = parseAppContext(context, this.identityProviderIdent);
    const samlClient = await getSuomiFISAML2Client();
    const authenticationUrl = await samlClient.getAuthorizeUrlAsync(appContext.hash);

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
    debug("AuthenticateResponse", () => {
      return {
        assertionXml: result.profile.getAssertionXml(),
        samlResponseXml: result.profile.getSamlResponseXml(),
      };
    });
    const appContext = parseAppContext(body.RelayState, this.identityProviderIdent);
    const redirectUrl = prepareLoginRedirectUrl(appContext.object.redirectUrl, result.profile.nameID, this.identityProviderIdent);

    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": `suomiFiLoginState=${generateBase64Hash(result)};`,
      },
    };
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow
   *
   * @param context
   * @returns
   */
  async LogoutRequest(context: Context): Promise<HttpResponse> {
    const appContext = parseAppContext(context, this.identityProviderIdent);
    if (context.request.cookies?.suomiFiLoginState) {
      try {
        const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.suomiFiLoginState)));
        if (!loginState.profile) {
          throw new ValidationError("No profile info on the login state");
        }

        const samlClient = await getSuomiFISAML2Client();
        const logoutRequestUrl = await samlClient.getLogoutUrlAsync(loginState.profile, appContext.hash);

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
    const appContext = parseAppContext(String(body.RelayState), this.identityProviderIdent);

    return {
      statusCode: 303,
      headers: {
        Location: prepareLogoutRedirectUrl(appContext.object.redirectUrl, this.identityProviderIdent),
        "Set-Cookie": `suomiFiLoginState=`,
      },
    };
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

        if (loginState.profile.nameID !== context.request.requestBody.token) {
          debug(loginState, context.request);
          throw new AccessDeniedException("Invalid session token");
        }

        return {
          statusCode: 200,
          headers: getJSONResponseHeaders(),
          body: JSON.stringify(loginState.profile),
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
