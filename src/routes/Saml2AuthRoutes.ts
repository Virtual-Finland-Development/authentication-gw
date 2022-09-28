import { Context } from "openapi-backend";
import SuomiFiSAML from "../services/suomifi/SAML2";
import { AccessDeniedException, ValidationError } from "../utils/exceptions";
import { debug } from "../utils/logging";
import Settings from "../utils/Settings";
import { generateBase64Hash, parseBase64XMLBody, resolveBase64Hash } from "../utils/transformers";

/**
 * GET -> REDIRECT: request to the suomifi auth
 *
 * @param context
 * @returns
 */
export async function Saml2LoginRequest(context: Context) {
  //const appContext = parseAppContext(context);
  const appContextHash = "ss:mem:12344aa";
  const authenticationUrl = await SuomiFiSAML.getAuthorizeUrlAsync(appContextHash, Settings.getRequestHost());
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
  const result = await SuomiFiSAML.validatePostResponseAsync(body); // throws
  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: {
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
  if (context.request.cookies?.loginState) {
    try {
      const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.loginState)));
      if (!loginState.profile) {
        throw new ValidationError("No profile info on the login state");
      }

      //const appContext = parseAppContext(context);
      const appContextHash = "ss:mem:12344aa";

      const logoutRequestUrl = await SuomiFiSAML.getLogoutUrlAsync(loginState.profile, appContextHash);
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
  const result = await SuomiFiSAML.validateRedirectAsync(body, originalQuery); // throws
  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: {
      "Set-Cookie": `loginState=''`,
    },
  };
}
