import axios from "axios";
import { parseXml2JsFromString } from "node-saml/lib/xml";
const { SAML } = require("node-saml");
import Runtime from "../../../utils/Runtime";
import Settings from "../../../utils/Settings";

let suomiSaml: typeof SAML;

/**
 * @see: https://github.com/node-saml/node-saml
 * @returns
 */
export const getSuomiFISAML2Client = async function (): Promise<typeof SAML> {
  if (!suomiSaml) {
    const privateKey = await Settings.getSecret("SUOMIFI_PRIVATE_KEY");
    suomiSaml = new SAML({
      entryPoint: "https://testi.apro.tunnistus.fi/idp/profile/SAML2/Redirect/SSO",
      callbackUrl: Runtime.getAppUrl("/auth/saml2/authenticate-response"),
      logoutUrl: "https://testi.apro.tunnistus.fi/idp/profile/SAML2/Redirect/SLO",
      logoutCallbackUrl: Runtime.getAppUrl("/auth/saml2/logout"),
      issuer: Runtime.getAppUrl(),
      signMetadata: true,
      signatureAlgorithm: "sha256",
      digestAlgorithm: "sha256",
      privateKey: privateKey,
      cert: async function (callback: (err: any, certs?: Array<string>) => void) {
        try {
          const response = await axios.get("https://testi.apro.tunnistus.fi/static/metadata/idp-metadata.xml");
          const xmljsDoc = await parseXml2JsFromString(response.data);
          const certs = [
            xmljsDoc.EntityDescriptor?.Signature?.[0]?.KeyInfo?.[0]?.X509Data?.[0]?.X509Certificate?.[0]?._,
            xmljsDoc?.EntityDescriptor?.IDPSSODescriptor?.[0]?.KeyDescriptor?.[0]?.KeyInfo?.[0]?.X509Data?.[0]?.X509Certificate?.[0]?._,
            xmljsDoc?.EntityDescriptor?.IDPSSODescriptor?.[0]?.KeyDescriptor?.[1]?.KeyInfo?.[0]?.X509Data?.[0]?.X509Certificate?.[0]?._,
          ]
            .filter((cert) => typeof cert === "string")
            .map((cert) => cert.replace(/\s/g, ""));
          callback(null, certs);
        } catch (error) {
          callback(error);
        }
      },
      decryptionPvk: privateKey,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true,
      samlAuthnRequestExtensions: {
        vetuma: {
          "@xmlns": "urn:vetuma:SAML:2.0:extensions",
          LG: {
            "#text": "fi",
          },
        },
      },
      disableRequestedAuthnContext: true,
      identifierFormat: null,
    });
  }
  return suomiSaml;
};
