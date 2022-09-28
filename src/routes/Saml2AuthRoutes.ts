import { Context } from "openapi-backend";
import SuomiFiSAML from "../services/suomifi/SAML2";
import { AccessDeniedException, ValidationError } from "../utils/exceptions";
import Settings from "../utils/Settings";
import { generateBase64Hash, parseBase64XMLBody, resolveBase64Hash } from "../utils/transformers";

export async function Saml2LoginRequest(context: Context) {
  //const appContext = parseAppContext(context);
  const authenticationUrl = await SuomiFiSAML.getAuthorizeUrlAsync("ss:mem:12344aa", Settings.getRequestHost());
  console.log("MOI", authenticationUrl);
  return {
    statusCode: 307,
    headers: {
      Location: authenticationUrl,
    },
  };
}

/**
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

export async function Saml2LogoutRequest(context: Context) {
  if (context.request.cookies?.loginState) {
    try {
      const loginState = JSON.parse(resolveBase64Hash(String(context.request.cookies.loginState)));
      if (!loginState.profile) {
        throw new ValidationError("No profile info on the login state");
      }
      const logoutRequestUrl = await SuomiFiSAML.getLogoutUrlAsync(loginState.profile, "ss:mem:12344aa");
      console.log("PAI", logoutRequestUrl);
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

export async function Saml2LogoutResponse(context: Context) {
  const body = context.request.query;
  const result = await SuomiFiSAML.validateRedirectAsync(body); // throws
  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: {
      "Set-Cookie": `loginState=''`,
    },
  };
}
