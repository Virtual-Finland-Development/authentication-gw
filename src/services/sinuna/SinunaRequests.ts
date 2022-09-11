// @see: https://developer.sinuna.fi/integration_documentation/
import axios from "axios";
import Settings from "../../utils/Settings";
import { ensureUrlQueryParam, generateBase64Hash } from "../../utils/transformers";

import { AppContext, LoginResponse } from "../../utils/types";
import { SinunaStateAttributor, parseSinunaAuthenticateResponse } from "./SinunaResponseParsers";

const SINUNA_AUTH_PROVIDER_IDENT = "sinuna"; // The auth provider identifier for Sinuna

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
  const CLIENT_ID = await Settings.getSecret("SINUNA_CLIENT_ID", "client_id");
  const SCOPE = "openid frontend";
  const STATE = SinunaStateAttributor.generate(appContext); // Throws if appContext is invalid
  const REDIRECT_URI = Settings.getAuthRedirectUrl();
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
    authProvider: SINUNA_AUTH_PROVIDER_IDENT,
  };
}

/**
 * LogoutResponse
 *
 * @param state
 * @returns
 */
export async function getLogoutRequestUrl(appContext: AppContext): Promise<string> {
  await initializeSinunaRequests();
  // Redirecting straight to the app context might work, but not tested
  const logoutRedirectUrl = prepareLogoutRedirectUrl(appContext.redirectUrl);
  return `https://login.iam.qa.sinuna.fi/oxauth/restv1/end_session?post_logout_redirect_uri=${logoutRedirectUrl}`;
}

/**
 *
 * @param redirectUrl
 * @returns
 */
export function prepareLogoutRedirectUrl(redirectUrl: string): string {
  return ensureUrlQueryParam(redirectUrl, "logout", "success");
}

/**
 * AuthTokenRequest
 *
 * @param loginCode
 * @returns
 */
export async function getAccessToken(loginCode: string): Promise<string> {
  await initializeSinunaRequests();
  const SCOPE = "openid frontend";

  const CLIENT_ID = await Settings.getSecret("SINUNA_CLIENT_ID", "client_id");
  const CLIENT_SECRET = await Settings.getSecret("SINUNA_CLIENT_SECRET", "client_secret");

  const REDIRECT_URI = Settings.getAuthRedirectUrl();
  try {
    const response = await axios.post(
      `https://login.iam.qa.sinuna.fi/oxauth/restv1/token`,
      {
        grant_type: "authorization_code",
        code: loginCode,
        scope: SCOPE,
        redirect_uri: REDIRECT_URI,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + generateBase64Hash(`${CLIENT_ID}:${CLIENT_SECRET}`),
        },
      }
    );
    return response.data.access_token;
  } catch (error: any) {
    // @see: https://axios-http.com/docs/handling_errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log("Error", error.message);
    }
    console.log(error.config);
    throw error;
  }
}
