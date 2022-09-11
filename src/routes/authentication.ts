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
      location: await SinunaRequests.getLoginRequestUrl(appContext.object),
      "Set-Cookie": `appContext=${appContext.hash}`,
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
  console.log("AuthenticateResponse", context.request);
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
  const token = await SinunaRequests.fetchAccessToken(context.request.requestBody.loginCode); // request body already validated by openapi-backend
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
      location: await SinunaRequests.getLogoutRequestUrl(appContext.object),
    },
    "Set-Cookie": `appContext=${appContext.hash}`,
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
  console.log("LogoutResponse");
  console.log(context);

  const referrerUrl = String(context.request.headers.referer);
  const appContextUrl = ifValidUrl(referrerUrl) ? referrerUrl : Settings.getAppContextFallbackURL();
  const redirectUrl = prepareLogoutRedirectUrl(appContextUrl);
  console.log(redirectUrl);

  return {
    statusCode: 307,
    headers: {
      location: redirectUrl,
    },
  };
}
