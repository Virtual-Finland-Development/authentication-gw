import { Context } from "openapi-backend";
import SuomiFiSAML from "../services/suomifi/SAML2";
import { jsonResponseHeaders } from "../utils/default-headers";
import { AccessDeniedException, ValidationError } from "../utils/exceptions";
import { debug } from "../utils/logging";
import { ensureUrlQueryParam, generateBase64Hash, parseBase64XMLBody, resolveBase64Hash } from "../utils/transformers";
import { parseAppContext } from "../utils/validators";

/**
 * GET -> REDIRECT: request to the suomifi auth
 *
 * @param context
 * @returns
 */
export async function Saml2LoginRequest(context: Context) {
  const appContext = parseAppContext(context);
  const authenticationUrl = await SuomiFiSAML().getAuthorizeUrlAsync(appContext.hash);
  debug("Login redirect URL", authenticationUrl);
  return {
    statusCode: 307,
    headers: {
      Location: authenticationUrl,
    },
  };
}

/**
 * POST: response from suomifi auth
 *
 * @param context
 * @returns
 */
export async function Saml2AuthenticateResponse(context: Context) {
  const body = parseBase64XMLBody(context.request.body);
  const result = await SuomiFiSAML().validatePostResponseAsync(body); // throws
  const appContext = parseAppContext(body.RelayState);
  return {
    statusCode: 307,
    headers: {
      Location: `${appContext.object.redirectUrl}?suomifi-session-token=${result.profile.nameId}&authProvider=${result.authProvider}`,
      "Set-Cookie": `loginState=${generateBase64Hash(result)};`,
    },
  };
}

/**
 * GET -> REDIRECT: request to the suomifi logout
 *
 * @param context
 * @returns
 */
export async function Saml2LogoutRequest(context: Context) {
  const appContext = parseAppContext(context);
  if (context.request.cookies?.loginState) {
    try {
      const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.loginState)));
      if (!loginState.profile) {
        throw new ValidationError("No profile info on the login state");
      }

      const logoutRequestUrl = await SuomiFiSAML().getLogoutUrlAsync(loginState.profile, appContext.hash);
      debug("Logout redirect URL", logoutRequestUrl);
      return {
        statusCode: 307,
        headers: {
          Location: logoutRequestUrl,
        },
      };
    } catch (error) {
      throw new ValidationError("Bad login profile data");
    }
  }
  throw new AccessDeniedException("Not logged in");
}

/**
 * GET: response from the suomifi logout
 *
 * @param context
 * @returns
 */
export async function Saml2LogoutResponse(context: Context) {
  const body = context.request.query;
  const originalQuery = new URLSearchParams(body).toString();
  await SuomiFiSAML().validateRedirectAsync(body, originalQuery); // throws
  const appContext = parseAppContext(String(body.RelayState));
  return {
    statusCode: 307,
    headers: {
      Location: ensureUrlQueryParam(appContext.object.redirectUrl, "suomifi-logout", "success"),
      "Set-Cookie": `loginState=''`,
    },
  };
}

/**
 *  POST: get user info from with the access token
 *
 * @param context
 * @returns
 */
export async function Saml2UserInfoRequest(context: Context) {
  parseAppContext(context);
  if (context.request.cookies?.loginState) {
    try {
      const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.loginState)));
      if (!loginState.profile) {
        throw new ValidationError("No profile info on the login state");
      }
      return {
        statusCode: 200,
        headers: jsonResponseHeaders,
        body: JSON.stringify(loginState.profile),
      };
    } catch (error) {
      throw new ValidationError("Bad login profile data");
    }
  }
  throw new AccessDeniedException("Not logged in");
}
