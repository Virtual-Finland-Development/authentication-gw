import { Context } from "openapi-backend";
import * as SinunaRequests from "../services/sinuna/SinunaRequests";
import { prepareLogoutRedirectUrl } from "../services/sinuna/SinunaRequests";
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
      Location: await SinunaRequests.getLoginRequestUrl(appContext.object),
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
export async function AuthenticateResponse(context: Context) {
  const appContext = parseAppContext(context);
  const loginResponse = await SinunaRequests.parseAuthenticateResponse(context.request.query);
  const redirectUrl = `${appContext.object.redirectUrl}?loginCode=${loginResponse.loginCode}&authProvider=${loginResponse.authProvider}`;
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
export async function AuthTokenRequest(context: Context) {
  parseAppContext(context); // Valites app context
  const response = await SinunaRequests.fetchAccessToken(context.request.requestBody.loginCode); // request body already validated by openapi-backend
  return {
    statusCode: 200,
    headers: jsonResponseHeaders,
    body: JSON.stringify({ token: response.access_token, expiresIn: response.expires_in }),
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
export async function LogoutResponse(context: Context) {
  const appContext = parseAppContext(context);
  const redirectUrl = prepareLogoutRedirectUrl(appContext.object.redirectUrl);

  return {
    statusCode: 307,
    headers: {
      Location: redirectUrl,
      "Set-Cookie": `appContext='';`,
    },
  };
}

/**
 *  GET: get user info from with the access token
 *
 * @param context
 * @returns
 */
export async function UserInfoRequest(context: Context) {
  parseAppContext(context); // Valites app context
  const response = await SinunaRequests.fetchUserInfo(context.request.requestBody.token);
  return {
    statusCode: 200,
    headers: jsonResponseHeaders,
    body: JSON.stringify(response),
  };
}
