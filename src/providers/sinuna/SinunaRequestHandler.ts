import axios from "axios";
import { Context } from "openapi-backend";

import { getJSONResponseHeaders } from "../../utils/default-headers";
import { AccessDeniedException } from "../../utils/exceptions";
import { generateBase64Hash } from "../../utils/hashes";
import { debug, logAxiosException } from "../../utils/logging";
import { prepareCookie, prepareLoginRedirectUrl, prepareLogoutRedirectUrl } from "../../utils/route-utils";
import Runtime from "../../utils/Runtime";
import Settings from "../../utils/Settings";
import { transformExpiresInToExpiresAt_ISOString } from "../../utils/transformers";
import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import SinunaSettings from "./Sinuna.config";
import { parseSinunaAuthenticateResponse, SinunaStateAttributor } from "./utils/SinunaResponseParsers";

/**
 * @see: https://developer.sinuna.fi/integration_documentation/
 * @see: https://openid.net/connect/
 */
export default new (class SinunaRequestHandler implements AuthRequestHandler {
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
  async LoginRequest(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, this.identityProviderIdent);

    const CLIENT_ID = await Settings.getSecret("SINUNA_CLIENT_ID");
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

    const SCOPE = SinunaSettings.scope;
    const CLIENT_ID = await Settings.getSecret("SINUNA_CLIENT_ID");
    const CLIENT_SECRET = await Settings.getSecret("SINUNA_CLIENT_SECRET");
    const REDIRECT_URI = Runtime.getAppUrl("/auth/openid/sinuna/authenticate-response");
    try {
      const response = await axios.post(
        `https://login.iam.qa.sinuna.fi/oxauth/restv1/token`,
        new URLSearchParams({
          grant_type: "authorization_code",
          code: loginCode,
          scope: SCOPE,
          redirect_uri: REDIRECT_URI,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
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
          expiresAt: transformExpiresInToExpiresAt_ISOString(response.data.expires_in),
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
    const LOGOUT_CALLBACK_REDIRECT_URI = Runtime.getAppUrl("/auth/openid/sinuna/logout-response");
    const LOGOUT_REQUEST_URL = `https://login.iam.qa.sinuna.fi/oxauth/restv1/end_session?post_logout_redirect_uri=${LOGOUT_CALLBACK_REDIRECT_URI}`;

    return {
      statusCode: 303,
      headers: {
        Location: LOGOUT_REQUEST_URL,
      },
      cookies: [prepareCookie("appContext", parsedAppContext.hash)],
    };
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
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
      },
      cookies: [prepareCookie("appContext", "")],
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
      const response = await axios.get(`https://login.iam.qa.sinuna.fi/oxauth/restv1/userinfo`, {
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
