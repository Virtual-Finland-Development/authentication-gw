import { Context } from "openapi-backend";
import axios from "axios";

import { jsonResponseHeaders } from "../../utils/default-headers";
import { parseAppContext } from "../../utils/validators";
import Authorizator from "../../utils/Authorizator";
import { prepareLogoutRedirectUrl } from "../../utils/route-utils";
import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { parseSinunaAuthenticateResponse, SinunaStateAttributor } from "./SinunaResponseParsers";
import Settings from "../../utils/Settings";
import Runtime from "../../utils/Runtime";
import { generateBase64Hash } from "../../utils/transformers";
import { debug, logAxiosException } from "../../utils/logging";
import { AccessDeniedException } from "../../utils/exceptions";
import SinunaSettings from "./Sinuna.config";

export default class SinunaRequestHandler implements AuthRequestHandler {
  static identityProviderIdent = SinunaSettings.ident;

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
    const appContext = parseAppContext(context, SinunaSettings.ident);

    const CLIENT_ID = await Settings.getSecret("SINUNA_CLIENT_ID");
    const SCOPE = SinunaSettings.scope;
    const STATE = SinunaStateAttributor.generate(appContext.object); // Throws if appContext is invalid
    const REDIRECT_URI = Runtime.getAppUrl("/auth/openid/authenticate-response");
    const SINUNA_LOGIN_URL = `https://login.iam.qa.sinuna.fi/oxauth/restv1/authorize?client_id=${CLIENT_ID}&response_type=code&scope=${SCOPE}&state=${STATE}&redirect_uri=${REDIRECT_URI}`;

    return {
      statusCode: 307,
      headers: {
        Location: SINUNA_LOGIN_URL,
        "Set-Cookie": `appContext=${appContext.hash};`,
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
    const authenticateResponse = parseSinunaAuthenticateResponse(context.request.query);
    const appContextObj = authenticateResponse.appContextObj;

    const loginResponse = {
      loginCode: authenticateResponse.loginCode,
      provider: SinunaSettings.ident,
    };

    const redirectUrl = `${appContextObj.redirectUrl}?loginCode=${loginResponse.loginCode}&provider=${loginResponse.provider}`;
    return {
      statusCode: 307,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": `appContext='';`,
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
    parseAppContext(context, SinunaSettings.ident); // Valites app context
    const loginCode = context.request.requestBody.loginCode; // request body already validated by openapi-backend

    const SCOPE = SinunaSettings.scope;
    const CLIENT_ID = await Settings.getSecret("SINUNA_CLIENT_ID");
    const CLIENT_SECRET = await Settings.getSecret("SINUNA_CLIENT_SECRET");
    const REDIRECT_URI = Runtime.getAppUrl("/auth/openid/authenticate-response");
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
        headers: jsonResponseHeaders,
        body: JSON.stringify({ token: response.data.access_token, expiresIn: response.data.expires_in }),
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
    const appContext = parseAppContext(context, SinunaSettings.ident);
    const LOGOUT_CALLBACK_REDIRECT_URI = Runtime.getAppUrl("/auth/openid/logout-response");
    const LOGOUT_REQUEST_URL = `https://login.iam.qa.sinuna.fi/oxauth/restv1/end_session?post_logout_redirect_uri=${LOGOUT_CALLBACK_REDIRECT_URI}`;

    return {
      statusCode: 307,
      headers: {
        Location: LOGOUT_REQUEST_URL,
        "Set-Cookie": `appContext=${appContext.hash};`,
      },
    };
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   * (not used, but required by the Sinuna logout flow)
   *
   * @param context
   * @returns
   */
  async LogoutResponse(context: Context): Promise<HttpResponse> {
    const appContext = parseAppContext(context, SinunaSettings.ident);
    const redirectUrl = prepareLogoutRedirectUrl(appContext.object.redirectUrl, "sinuna");

    return {
      statusCode: 307,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": `appContext='';`,
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
    parseAppContext(context, SinunaSettings.ident); // Valites app context

    const accessToken = context.request.requestBody.token;

    try {
      const response = await axios.get(`https://login.iam.qa.sinuna.fi/oxauth/restv1/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      debug(response.data);

      return {
        statusCode: 200,
        headers: jsonResponseHeaders,
        body: JSON.stringify(response.data),
      };
    } catch (error) {
      logAxiosException(error);
      throw new AccessDeniedException(String(error));
    }
  }

  /**
   *  POST: authorize request using the access token and app context
   *
   * @param context
   * @returns
   */
  async AuthorizeRequest(context: Context): Promise<HttpResponse> {
    const response = await this.UserInfoRequest(context);
    const appName = parseAppContext(context, SinunaSettings.ident).object.appName;
    await Authorizator.authorize(SinunaSettings.ident, appName, JSON.parse(String(response.body)));

    return {
      statusCode: 200,
      headers: jsonResponseHeaders,
      body: JSON.stringify({
        message: "Access Granted",
      }),
    };
  }
}
