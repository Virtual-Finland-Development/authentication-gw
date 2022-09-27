import { Context } from "openapi-backend";
import SuomiFiSAML from "../services/suomifi/SAML2";

export async function Saml2LoginRequest(context: Context) {
  //const appContext = parseAppContext(context);
  const authenticationUrl = await SuomiFiSAML.getAuthorizeUrlAsync("relayStateString", "https://q88uo5prmh.execute-api.eu-north-1.amazonaws.com");
  console.log(authenticationUrl);
  return {
    statusCode: 307,
    headers: {
      Location: authenticationUrl,
    },
  };
}

export async function Saml2AuthenticateResponse(context: Context) {
  return {
    statusCode: 200,
    body: JSON.stringify(context),
  };
}

export async function Saml2LogoutRequest(context: Context) {
  const logoutRequestUrl = await SuomiFiSAML.getLogoutUrlAsync("relayStateString", "https://q88uo5prmh.execute-api.eu-north-1.amazonaws.com");

  return {
    statusCode: 307,
    headers: {
      Location: logoutRequestUrl,
    },
  };
}

export async function Saml2LogoutResponse(context: Context) {
  return {
    statusCode: 200,
    body: JSON.stringify(context),
  };
}
