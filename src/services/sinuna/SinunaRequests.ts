// @see: https://developer.sinuna.fi/integration_documentation/
import axios from "axios";
import { URLSearchParams } from "url";
import { AccessDeniedException } from "../../utils/exceptions";
import { debug, logAxiosException } from "../../utils/logging";
import Runtime from "../../utils/Runtime";
import Settings from "../../utils/Settings";
import { generateBase64Hash } from "../../utils/transformers";

import { AppContext, LoginResponse } from "../../utils/types";
import { SinunaStateAttributor, parseSinunaAuthenticateResponse } from "./SinunaResponseParsers";

const SinunaSettings = {
  ident: "sinuna", // The identifier for Sinuna
  scope: "openid frontend sinuna_id", // The auth scope for Sinuna
};

/**
 * Initializes the SinunaRequests
 */
export async function initializeSinunaRequests() {
  await SinunaStateAttributor.initialize();
}

/**
 * LoginRequest
 *
 * @returns
 */
export async function getLoginRequestUrl(appContext: AppContext): Promise<string> {
  await initializeSinunaRequests();
  const CLIENT_ID = await Settings.getSecret("SINUNA_CLIENT_ID");
  const SCOPE = SinunaSettings.scope;
  const STATE = SinunaStateAttributor.generate(appContext); // Throws if appContext is invalid
  const REDIRECT_URI = Runtime.getAppUrl("/auth/openid/authenticate-response");
  return `https://login.iam.qa.sinuna.fi/oxauth/restv1/authorize?client_id=${CLIENT_ID}&response_type=code&scope=${SCOPE}&state=${STATE}&redirect_uri=${REDIRECT_URI}`;
}

/**
 * AuthenticateResponse
 *
 * @param state
 * @returns
 */
export async function parseAuthenticateResponse(queryParams: { [key: string]: string | string[] }): Promise<LoginResponse> {
  await initializeSinunaRequests();
  const authenticateResponse = parseSinunaAuthenticateResponse(queryParams);

  return {
    loginCode: authenticateResponse.loginCode,
    appContextRedirectUrl: authenticateResponse.appContext.redirectUrl,
    provider: SinunaSettings.ident,
  };
}

/**
 * LogoutResponse
 *
 * @param state
 * @returns
 */
export async function getLogoutRequestUrl(): Promise<string> {
  await initializeSinunaRequests();
  const REDIRECT_URI = Runtime.getAppUrl("/auth/openid/logout-response");
  return `https://login.iam.qa.sinuna.fi/oxauth/restv1/end_session?post_logout_redirect_uri=${REDIRECT_URI}`;
}

/**
 * AuthTokenRequest
 *
 * @param loginCode
 * @returns
 */
export async function fetchAccessToken(loginCode: string): Promise<{ access_token: string; expires_in: number; scope: string; id_token: string; token_type: string }> {
  await initializeSinunaRequests();
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
    return response.data;
  } catch (error) {
    logAxiosException(error);
    throw new AccessDeniedException(String(error));
  }
}

/**
 * UserInfoRequest
 *
 * @param accessToken
 * @returns
 */
export async function fetchUserInfo(accessToken: string): Promise<any> {
  await initializeSinunaRequests();
  try {
    const response = await axios.get(`https://login.iam.qa.sinuna.fi/oxauth/restv1/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    debug(response.data);

    return response.data;
  } catch (error) {
    logAxiosException(error);
    throw new AccessDeniedException(String(error));
  }
}
