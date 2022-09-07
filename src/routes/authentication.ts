import { Context } from "openapi-backend";
import * as SinunaRequests from "../services/sinuna/SinunaRequests";
import { jsonResponseHeaders } from "../utils/default-headers";
import Settings from "../utils/Settings";
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
      location: await SinunaRequests.getLoginRequestUrl(appContext),
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
  const loginResponse = await SinunaRequests.parseAuthenticateResponse(context.request.query);
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

/**
 * GET->REDIRECT: The route for handling the logout flow
 *
 * @param context
 * @returns
 */
export async function LogoutRequest(context: Context) {
  const appContext = parseAppContext(context);

  return {
    statusCode: 307,
    headers: {
      location: await SinunaRequests.getLogoutRequestUrl(appContext),
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
export async function LogoutResponse(context: Context) {
  const redirectUrl = Settings.getAppContextFallbackURL();
  console.log("DEBUG: LogoutResponse");
  console.log(context.request);
  console.log(redirectUrl);
  return {
    statusCode: 307,
    headers: {
      location: redirectUrl,
    },
  };
}
