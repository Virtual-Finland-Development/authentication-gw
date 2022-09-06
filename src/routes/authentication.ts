import { Context } from "openapi-backend";
import * as SinunaRequests from "../services/sinuna/SinunaRequests";
import { jsonResponseHeaders } from "../utils/default-headers";
import { parseAppContext } from "../utils/validators";

/**
 * GET->REDIRECT: The route for handling the auth flow initiating process
 *
 * @param context
 * @returns
 */
export async function LoginRequest(context: Context) {
  const appContext = parseAppContext(context);

  return {
    statusCode: 307,
    headers: {
      location: SinunaRequests.getLoginRequestUrl(appContext),
    },
  };
}

/**
 * GET->REDIRECT: The route for handling the auth flow callback, redirecting back to the frontend app
 *
 * @param context
 * @returns AuthenticateResponse -> LoginResponse
 */
export async function AuthenticateResponse(context: Context) {
  const loginResponse = SinunaRequests.parseAuthenticateResponse(context.request.query);
  const redirectUrl = `${loginResponse.appContextRedirectUrl}?loginCode=${loginResponse.loginCode}&authProvider=${loginResponse.authProvider}`;
  return {
    statusCode: 307,
    headers: {
      location: redirectUrl,
    },
  };
}

/**
 *  POST: The route for the access token exchange: loginCode -> accessToken
 *
 * @param context
 * @returns
 */
export async function AuthTokenRequest(context: Context) {
  parseAppContext(context); // Valites app context
  const token = await SinunaRequests.getAccessToken(context.request.requestBody.loginCode); // request body already validated by openapi-backend
  return {
    statusCode: 200,
    headers: jsonResponseHeaders,
    body: JSON.stringify({ token: token }),
  };
}
