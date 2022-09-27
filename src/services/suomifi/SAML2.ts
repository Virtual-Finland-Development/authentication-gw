import { readFileSync } from "fs";
const { SAML } = require("node-saml");

export default new SAML({
  path: "/auth/saml2/authenticate-response",
  entryPoint: "https://testi.apro.tunnistus.fi/idp/profile/SAML2/Redirect/SSO",
  issuer: "https://virtual-finland-development-auth-files.s3.eu-north-1.amazonaws.com",
  signatureAlgorithm: "sha512",
  privateKey: readFileSync("./certificates/virtual_finland_development.key", "utf-8"),
  cert: readFileSync("./certificates/virtual_finland_development.cert", "utf-8"),
});
