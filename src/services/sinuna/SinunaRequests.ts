// @see: https://developer.sinuna.fi/integration_documentation/
import axios from "axios";
import Settings from "../../utils/Settings";
import { generateBase64Hash } from "../../utils/transformers";

import { AppContext, LoginResponse } from "../../utils/types";
import { SinunaStateAttributor, parseSinunaAuthenticateResponse } from "./SinunaResponseParsers";

const SINUNA_AUTH_PROVIDER_IDENT = "sinuna"; // The auth provider identifier for Sinuna

/**
 * LoginRequest
 *
 * @returns
 */
export function getLoginRequestUrl(appContext: AppContext): string {
  const AS_URL = "https://login.iam.qa.sinuna.fi";
  const CLIENT_ID = Settings.getEnv("SINUNA_CLIENT_ID", "client_id");
  const SCOPE = "openid frontend";
  const STATE = SinunaStateAttributor.generate(appContext);
  const REDIRECT_URI = Settings.getAuthRedirectUrl();
  return `https://${AS_URL}/oxauth/restv1/authorize?client_id=${CLIENT_ID}&response_type=code&scope=${SCOPE}&state=${STATE}&redirect_uri=${REDIRECT_URI}`;
}

/**
 * AuthenticateResponse
 *
 * @param state
 * @returns
 */
export function parseAuthenticateResponse(queryParams: { [key: string]: string | string[] }): LoginResponse {
  const authenticateResponse = parseSinunaAuthenticateResponse(queryParams);

  return {
    loginCode: authenticateResponse.loginCode,
    appContextRedirectUrl: authenticateResponse.appContext.redirectUrl,
    authProvider: SINUNA_AUTH_PROVIDER_IDENT,
  };
}

/**
 * AuthTokenRequest
 *
 * @param loginCode
 * @returns
 */
export async function getAccessToken(loginCode: string): Promise<string> {
  const AS_URL = "https://login.iam.qa.sinuna.fi";
  const SCOPE = "openid frontend";

  const CLIENT_ID = Settings.getEnv("SINUNA_CLIENT_ID", "client_id");
  const CLIENT_SECRET = Settings.getEnv("SINUNA_CLIENT_SECRET", "client_secret");

  const REDIRECT_URI = Settings.getAuthRedirectUrl();
  const response = await axios.post(
    `https://${AS_URL}/oxauth/restv1/token`,
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
}
