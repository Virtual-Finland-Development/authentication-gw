import { readFileSync } from "fs";
const { SAML } = require("node-saml");

export default new SAML({
  path: "/auth/saml2/login-request-callback",
  entryPoint: "https://openidp.feide.no/simplesaml/saml2/idp/SSOService.php",
  issuer: "passport-saml",
  signatureAlgorithm: "sha512",
  privateKey: readFileSync("./certificates/urn_suomifi_virtualfinland.key", "utf-8"),
  cert: readFileSync("./certificates/urn_suomifi_virtualfinland.cert", "utf-8"),
});
