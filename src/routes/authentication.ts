import { Context } from "openapi-backend";
import * as SinunaRequests from "../services/sinuna/SinunaRequests";
import { prepareLogoutRedirectUrl } from "../services/sinuna/SinunaRequests";
import { jsonResponseHeaders } from "../utils/default-headers";
import Settings from "../utils/Settings";
import { ifValidUrl } from "../utils/transformers";
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
      Location: await SinunaRequests.getLoginRequestUrl(appContext),
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
      Location: redirectUrl,
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
      Location: await SinunaRequests.getLogoutRequestUrl(),
      Referer: appContext.redirectUrl,
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
  console.log("DEBUG: LogoutResponse");
  console.log(context.request);

  const referrerUrl = String(context.request.headers.referer);
  const appContextUrl = ifValidUrl(referrerUrl) ? referrerUrl : Settings.getAppContextFallbackURL();
  const redirectUrl = prepareLogoutRedirectUrl(appContextUrl);
  console.log(redirectUrl);

  return {
    statusCode: 307,
    headers: {
      Location: redirectUrl,
    },
  };
}
