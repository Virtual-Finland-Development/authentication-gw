import axios from "axios";
import { Context } from "openapi-backend";
import { v4 as uuidv4 } from "uuid";
import { getJSONResponseHeaders } from "../../utils/default-headers";
import { AccessDeniedException } from "../../utils/exceptions";
import { generateBase64Hash } from "../../utils/hashes";
import { debug, logAxiosException } from "../../utils/logging";
import { prepareLoginRedirectUrl, prepareLogoutRedirectUrl } from "../../utils/route-utils";
import Runtime from "../../utils/Runtime";
import Settings from "../../utils/Settings";
import { transformExpiresInToExpiresAt } from "../../utils/transformers";
import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import TestbedSettings from "./Testbed.config";

/**
 * @see: https://ioxio.com/guides/use-login-portal-in-your-applications
 * @see: https://login.testbed.fi/.well-known/openid-configuration
 */
export default new (class TestbedRequestHandler implements AuthRequestHandler {
  identityProviderIdent = TestbedSettings.ident;

  async initialize(): Promise<void> {}

  /**
   * GET->REDIRECT: The route for handling the auth flow initiating process
   *
   * @param context
   * @returns
   */
  async LoginRequest(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, this.identityProviderIdent);
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
        "Set-Cookie": `appContext=${parsedAppContext.hash};`,
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
    debug(context.request.query);
    const loginCode = String(context.request.query.code);
    const state = String(context.request.query.state);
    const parsedAppContext = parseAppContext(state, this.identityProviderIdent);
    const redirectUrl = prepareLoginRedirectUrl(parsedAppContext.object.redirectUrl, loginCode, this.identityProviderIdent);

    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": `appContext='';`,
      },
    };
  }

  /**
   *  POST: The route for the access token exchange: loginCode -> accessToken, idToken
   *
   * @param context
   * @returns
   */
  async AuthTokenRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, this.identityProviderIdent); // Valites app context
    const loginCode = context.request.requestBody.loginCode; // request body already validated by openapi-backend

    const SCOPE = TestbedSettings.scope;
    const CLIENT_ID = await Settings.getSecret("TESTBED_CLIENT_ID");
    const CLIENT_SECRET = await Settings.getSecret("TESTBED_CLIENT_SECRET");
    const REDIRECT_URI = Runtime.getAppUrl("/auth/openid/testbed/authenticate-response");
    try {
      const response = await axios.post(
        `https://login.testbed.fi/api/oauth/token`,
        new URLSearchParams({
          grant_type: "authorization_code",
          code: loginCode,
          scope: SCOPE,
          redirect_uri: REDIRECT_URI,
        }).toString(),
        {
          headers: {
            Authorization: "Basic " + generateBase64Hash(`${CLIENT_ID}:${CLIENT_SECRET}`),
          },
        }
      );

      debug(response.data);

      return {
        statusCode: 200,
        headers: getJSONResponseHeaders(),
        body: JSON.stringify({
          accessToken: response.data.access_token,
          idToken: response.data.id_token,
          expiresAt: transformExpiresInToExpiresAt(response.data.expires_in),
        }),
      };
    } catch (error) {
      logAxiosException(error);
      throw new AccessDeniedException(String(error));
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

    const queryString = new URLSearchParams({
      post_logout_redirect_uri: Runtime.getAppUrl("/auth/openid/testbed/logout-response"),
      state: parsedAppContext.hash,
      id_token_hint: context.request.query.idToken,
    }).toString();

    const LOGOUT_REQUEST_URL = `https://login.testbed.fi/end-session?${queryString}`;

    return {
      statusCode: 303,
      headers: {
        Location: LOGOUT_REQUEST_URL,
        "Set-Cookie": `appContext=${parsedAppContext.hash};`,
      },
    };
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   * (not used, but required by the Testbed logout flow)
   *
   * @param context
   * @returns
   */
  async LogoutResponse(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, this.identityProviderIdent);
    const redirectUrl = prepareLogoutRedirectUrl(parsedAppContext.object.redirectUrl, this.identityProviderIdent);

    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": `appContext='';`,
      },
    };
  }

  /**
   *  POST: get user info with the access token
   *
   * @param context
   * @returns
   */
  async UserInfoRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, this.identityProviderIdent); // Valites app context

    const accessToken = context.request.requestBody.accessToken;

    try {
      const response = await axios.post(`https://login.testbed.fi/api/oauth/userinfo`, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      debug(response.data);

      return {
        statusCode: 200,
        headers: getJSONResponseHeaders(),
        body: JSON.stringify(response.data),
      };
    } catch (error) {
      logAxiosException(error);
      throw new AccessDeniedException(String(error));
    }
  }
})();
