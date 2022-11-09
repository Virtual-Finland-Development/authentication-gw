import { Context } from "openapi-backend";
import { v4 as uuidv4 } from "uuid";
import { BaseRequestHandler } from "../../utils/BaseRequestHandler";
import { getJSONResponseHeaders } from "../../utils/default-headers";
import { AccessDeniedException, NoticeException, ValidationError } from "../../utils/exceptions";
import { debug } from "../../utils/logging";
import { prepareCookie, prepareLoginRedirectUrl, prepareLogoutRedirectUrl } from "../../utils/route-utils";
import Runtime from "../../utils/Runtime";
import Settings from "../../utils/Settings";
import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import TestbedSettings from "./Testbed.config";
import authorize from "./TestbedAuthorizer";
import * as TestbedRequests from "./utils/TestbedRequests";

/**
 * @see: https://ioxio.com/guides/use-login-portal-in-your-applications
 * @see: https://login.testbed.fi/.well-known/openid-configuration
 */
export default new (class TestbedRequestHandler extends BaseRequestHandler implements AuthRequestHandler {
  identityProviderIdent = TestbedSettings.ident;

  async initialize(): Promise<void> {}

  /**
   * GET->REDIRECT: The route for handling the auth flow initiating process
   *
   * @param context
   * @returns
   */
  async LoginRequest(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent });
    const clientId = await Settings.getSecret("TESTBED_CLIENT_ID");
    const queryString = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      acr_values: TestbedSettings.acr_values,
      scope: TestbedSettings.scope,
      redirect_uri: Runtime.getAppUrl("/auth/openid/testbed/authenticate-response"),
      nonce: uuidv4(),
      state: parsedAppContext.hash,
    }).toString();

    const TESTBED_LOGIN_URL = `https://login.testbed.fi/start-login?${queryString}`;

    return {
      statusCode: 303,
      headers: {
        Location: TESTBED_LOGIN_URL,
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
      debug(context.request.query);

      if (context.request.query.error) {
        throw new NoticeException(String(context.request.query.error_description) || String(context.request.query.error));
      }

      const loggedInCode = String(context.request.query.code);
      const state = String(context.request.query.state);
      const parsedAppContext = parseAppContext(state, { provider: this.identityProviderIdent });

      if (!loggedInCode) {
        throw new Error("Missing login code");
      }

      const redirectUrl = prepareLoginRedirectUrl(parsedAppContext.object.redirectUrl, loggedInCode, this.identityProviderIdent);

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
   * POST: transform loggedInCode to LoggedInResponse
   *
   * @param context
   * @returns
   */
  async LoggedInRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, { provider: this.identityProviderIdent }); // Valites app context
    const loggedInCode = context.request.requestBody.loggedInCode; // request body already validated by openapi-backend

    try {
      // Get the token
      const tokens = await TestbedRequests.getTokensWithLoginCode(loggedInCode);
      // Get user info
      const userInfo = await TestbedRequests.getUserInfoWithAccessToken(tokens.accessToken);

      return {
        statusCode: 200,
        headers: getJSONResponseHeaders(),
        body: JSON.stringify({
          idToken: tokens.idToken,
          expiresAt: tokens.expiresAt,
          profileData: userInfo,
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
    try {
      const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent });

      const idToken = String(context.request.query?.idToken);
      if (!idToken) {
        throw new ValidationError("Missing ID token");
      }

      try {
        // Verify logout token
        await authorize(idToken, "logout");
      } catch (error) {
        throw new NoticeException("Already logged out");
      }

      const queryString = new URLSearchParams({
        post_logout_redirect_uri: Runtime.getAppUrl("/auth/openid/testbed/logout-response"),
        state: parsedAppContext.hash,
        id_token_hint: idToken,
      }).toString();

      const LOGOUT_REQUEST_URL = `https://login.testbed.fi/end-session?${queryString}`;

      return {
        statusCode: 303,
        headers: {
          Location: LOGOUT_REQUEST_URL,
        },
        cookies: [prepareCookie("appContext", parsedAppContext.hash)],
      };
    } catch (error) {
      return this.getLogoutRequestFailedResponse(context, error);
    }
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   * (not used, but required by the Testbed logout flow)
   *
   * @param context
   * @returns
   */
  async LogoutResponse(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent });
    const redirectUrl = prepareLogoutRedirectUrl(parsedAppContext.object.redirectUrl, this.identityProviderIdent);

    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
      },
      cookies: [prepareCookie("appContext", "")],
    };
  }
})();
