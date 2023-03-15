import { parseXml2JsFromString } from "@node-saml/node-saml/lib/xml";
import { resolveBase64Hash } from "../../../utils/hashes";
import { debug } from "../../../utils/logging";
import Runtime from "../../../utils/Runtime";
import Settings from "../../../utils/Settings";
const { SAML } = require("@node-saml/node-saml");

/**
 * @see: https://github.com/node-saml/node-saml
 * @returns
 */
export const getSuomiFISAML2Client = async function (samlResponse?: string): Promise<typeof SAML> {
  const privateKey = await Settings.getStageSecret("SUOMIFI_PRIVATE_KEY");
  return new SAML({
    entryPoint: "https://testi.apro.tunnistus.fi/idp/profile/SAML2/Redirect/SSO",
    callbackUrl: Runtime.getAppUrl("/auth/saml2/suomifi/authenticate-response"),
    logoutUrl: "https://testi.apro.tunnistus.fi/idp/profile/SAML2/Redirect/SLO",
    logoutCallbackUrl: Runtime.getAppUrl("/auth/saml2/suomifi/logout"),
    issuer: Runtime.getAppUrl(),
    signMetadata: true,
    signatureAlgorithm: "sha256",
    digestAlgorithm: "sha256",
    privateKey: privateKey,
    cert: async (callback: (err: any, certs?: Array<string>) => void) => {
      try {
        if (typeof samlResponse !== "string") {
          throw new Error("No SAMLResponse provided");
        }

        const xmljsDoc = (await parseXml2JsFromString(resolveBase64Hash(samlResponse))) as any;
        debug(xmljsDoc);

        const certs = [xmljsDoc.Response?.Signature?.[0]?.KeyInfo?.[0]?.X509Data?.[0]?.X509Certificate?.[0]?._]
          .filter((cert) => typeof cert === "string")
          .map((cert) => cert.replace(/\s/g, ""));

        if (certs.length === 0) {
          throw new Error("No certificates found");
        }
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
};
