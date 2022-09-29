import { Context } from "openapi-backend";
import { jsonResponseHeaders } from "../../utils/default-headers";
import { parseAppContext } from "../../utils/validators";
import { prepareLogoutRedirectUrl } from "../../utils/route-utils";
import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { debug } from "../../utils/logging";
import { generateBase64Hash, parseBase64XMLBody, resolveBase64Hash } from "../../utils/transformers";
import { AccessDeniedException, ValidationError } from "../../utils/exceptions";
import SuomiFISAML2Client from "./SuomiFISAML2Client";
import SuomiFISettings from "./SuomiFI.config";

export default class SuomiFIRequestHandler implements AuthRequestHandler {
  static identityProviderIdent = SuomiFISettings.ident;
  async initialize(): Promise<void> {}

  /**
   * GET->REDIRECT: The route for handling the auth flow initiating process
   *
   * @param context
   * @returns
   */
  async LoginRequest(context: Context): Promise<HttpResponse> {
    const appContext = parseAppContext(context, SuomiFISettings.ident);
    const authenticationUrl = await SuomiFISAML2Client().getAuthorizeUrlAsync(appContext.hash);
    debug("Login redirect URL", authenticationUrl);
    return {
      statusCode: 307,
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
    const result = await SuomiFISAML2Client().validatePostResponseAsync(body); // throws
    const appContext = parseAppContext(body.RelayState, SuomiFISettings.ident);
    return {
      statusCode: 307,
      headers: {
        Location: `${appContext.object.redirectUrl}?suomifi-session-token=${result.profile.nameId}&provider=${result.provider}`,
        "Set-Cookie": `loginState=${generateBase64Hash(result)};`,
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
    const appContext = parseAppContext(context, SuomiFISettings.ident);
    if (context.request.cookies?.loginState) {
      try {
        const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.loginState)));
        if (!loginState.profile) {
          throw new ValidationError("No profile info on the login state");
        }

        const logoutRequestUrl = await SuomiFISAML2Client().getLogoutUrlAsync(loginState.profile, appContext.hash);
        debug("Logout redirect URL", logoutRequestUrl);
        return {
          statusCode: 307,
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
    await SuomiFISAML2Client().validateRedirectAsync(body, originalQuery); // throws
    const appContext = parseAppContext(String(body.RelayState), SuomiFISettings.ident);
    return {
      statusCode: 307,
      headers: {
        Location: prepareLogoutRedirectUrl(appContext.object.redirectUrl, "suomifi"),
        "Set-Cookie": `loginState=''`,
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
    parseAppContext(context, SuomiFISettings.ident);
    if (context.request.cookies?.loginState) {
      try {
        const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.loginState)));
        if (!loginState.profile) {
          throw new ValidationError("No profile info on the login state");
        }

        if (loginState.profile.nameId !== context.request.requestBody.token) {
          throw new AccessDeniedException("Invalid session token");
        }

        return {
          statusCode: 200,
          headers: jsonResponseHeaders,
          body: JSON.stringify(loginState.profile),
        };
      } catch (error) {
        throw new ValidationError("Bad login profile data");
      }
    }
    throw new AccessDeniedException("Not logged in");
  }
}