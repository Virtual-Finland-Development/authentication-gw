import { Context } from "openapi-backend";
import { BaseRequestHandler } from "../../utils/BaseRequestHandler";

import { getJSONResponseHeaders } from "../../utils/default-headers";
import { AccessDeniedException, NoticeException } from "../../utils/exceptions";
import { decodeIdToken } from "../../utils/JWK-Utils";
import { prepareCookie, prepareLoginRedirectUrl, prepareLogoutRedirectUrl } from "../../utils/route-utils";
import Runtime from "../../utils/Runtime";
import Settings from "../../utils/Settings";
import { ensureObject } from "../../utils/transformers";
import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import * as SinunaRequests from "./service/SinunaRequests";
import { parseSinunaAuthenticateResponse, SinunaStateAttributor } from "./service/SinunaResponseParsers";
import SinunaSettings from "./Sinuna.config";

/**
 * @see: https://developer.sinuna.fi/integration_documentation/
 * @see: https://openid.net/connect/
 */
export default new (class SinunaRequestHandler extends BaseRequestHandler implements AuthRequestHandler {
  identityProviderIdent = SinunaSettings.ident;

  async initialize(): Promise<void> {
    await SinunaStateAttributor.initialize();
  }

  /**
   * GET->REDIRECT: The route for handling the auth flow initiating process
   *
   * @param context
   * @returns
   */
  async AuthenticationRequest(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent });

    const CLIENT_ID = await Settings.getStageSecret("SINUNA_CLIENT_ID");
    const SCOPE = SinunaSettings.scope;
    const STATE = SinunaStateAttributor.generate(parsedAppContext.object); // Throws if appContext is invalid
    const REDIRECT_URI = Runtime.getAppUrl("/auth/openid/sinuna/authenticate-response");
    const SINUNA_LOGIN_URL = `https://login.iam.qa.sinuna.fi/oxauth/restv1/authorize?client_id=${CLIENT_ID}&response_type=code&scope=${SCOPE}&state=${STATE}&redirect_uri=${REDIRECT_URI}`;

    return {
      statusCode: 303,
      headers: {
        Location: SINUNA_LOGIN_URL,
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
    try {
      if (context.request.query.error) {
        throw new NoticeException(String(context.request.query.error_description) || String(context.request.query.error));
      }

      const authenticateResponse = parseSinunaAuthenticateResponse(context.request.query);
      const appContextObj = authenticateResponse.appContextObj;
      const redirectUrl = prepareLoginRedirectUrl(appContextObj.redirectUrl, authenticateResponse.loginCode, this.identityProviderIdent);

      return {
        statusCode: 303,
        headers: {
          Location: redirectUrl,
        },
        cookies: [prepareCookie("appContext", "")],
      };
    } catch (error) {
      return this.getAuthenticateResponseFailedResponse(context, error);
    }
  }

  /**
   * POST: transform loginCode to LoginResponse
   *
   * @param context
   * @returns
   */
  async LoginRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, { provider: this.identityProviderIdent }); // Valites app context
    const loginCode = context.request.requestBody.loginCode; // request body already validated by openapi-backend

    try {
      // Get the token
      const tokens = await SinunaRequests.getTokensWithLoginCode(loginCode);
      // Decode id token
      const idTokenPayload = { email: ensureObject(decodeIdToken(tokens.idToken)?.decodedToken?.payload) };
      // Get user info
      const userInfo = await SinunaRequests.getUserInfoWithAccessToken(tokens.accessToken);
      // Merge
      const profile = {
        ...idTokenPayload,
        ...userInfo,
      };

      return {
        statusCode: 200,
        headers: getJSONResponseHeaders(),
        body: JSON.stringify({
          idToken: tokens.idToken,
          expiresAt: tokens.expiresAt,
          profileData: {
            userId: profile.inum,
            email: profile.email,
            profile: profile,
          },
        }),
      };
    } catch (error) {
      throw new AccessDeniedException(error);
    }
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow
   *
   * @param context
   * @returns
   */
  async LogoutRequest(context: Context): Promise<HttpResponse> {
    return this.LogoutResponse(context);
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   *
   * @param context
   * @returns
   */
  async LogoutResponse(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent });
    const redirectUrl = prepareLogoutRedirectUrl(parsedAppContext.object.redirectUrl, this.identityProviderIdent, {
      message: "Log out from the Sinuna login session at: https://frontend.sunbackend.qa.sinuna.fi/",
      type: "info",
    });

    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
      },
      cookies: [prepareCookie("appContext", "")],
    };
  }
})();
