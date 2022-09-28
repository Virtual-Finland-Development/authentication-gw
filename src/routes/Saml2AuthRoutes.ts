import { Context } from "openapi-backend";
import SuomiFiSAML from "../services/suomifi/SAML2";
import Settings from "../utils/Settings";
import { parseBase64XMLBody } from "../utils/transformers";

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
  };
}

export async function Saml2LogoutRequest(context: Context) {
  const logoutRequestUrl = await SuomiFiSAML.getLogoutUrlAsync("ss:mem:12344aa", Settings.getRequestHost());
  console.log("Bye", logoutRequestUrl);
  return {
    statusCode: 307,
    headers: {
      Location: logoutRequestUrl,
    },
  };
}

export async function Saml2LogoutResponse(context: Context) {
  const body = context.request.query;
  const result = await SuomiFiSAML.validateRedirectAsync(body); // throws
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}
