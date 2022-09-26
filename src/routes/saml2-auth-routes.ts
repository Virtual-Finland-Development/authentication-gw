import { Context } from "openapi-backend";

const { SAML } = require("node-saml");
const saml = new SAML({
  path: "/auth/saml2/login-request-callback",
  entryPoint: "https://openidp.feide.no/simplesaml/saml2/idp/SSOService.php",
  issuer: "passport-saml",
  cert: "fake cert", // cert must be provided
});

export async function Saml2LoginRequest(context: Context) {
  //const appContext = parseAppContext(context);
  return {
    statusCode: 307,
    headers: {
      Location: await saml.getAuthorizeUrlAsync(),
    },
  };
}

export async function Saml2LoginRequestCallback(context: Context) {
  return {
    statusCode: 307,
    headers: {
      Location: await saml.getLogoutUrlAsync(),
    },
  };
}
