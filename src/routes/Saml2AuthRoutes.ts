import { Context } from "openapi-backend";
import SuomiFiSAML from "../services/suomifi/SAML2";

export async function Saml2LoginRequest(context: Context) {
  //const appContext = parseAppContext(context);
  const authenticationUrl = await SuomiFiSAML.getAuthorizeUrlAsync();

  return {
    statusCode: 307,
    headers: {
      Location: authenticationUrl,
    },
  };
}

export async function Saml2LoginRequestCallback(context: Context) {
  return {
    statusCode: 307,
    headers: {
      Location: await SuomiFiSAML.getLogoutUrlAsync(),
    },
  };
}
