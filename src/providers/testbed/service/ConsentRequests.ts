import axios from "axios";
import * as jwt from "jsonwebtoken";
import { decodeIdToken } from "../../../utils/JWK-Utils";
import { debug } from "../../../utils/logging";
import Runtime from "../../../utils/Runtime";
import Settings from "../../../utils/Settings";

type ISituationResponseDataPair<T, K extends keyof T = keyof T> = K extends keyof T ? { status: K; data: T[K]; idToken: string; dataSourceUri: string } : never;
type ISituationResponseData = ISituationResponseDataPair<{
  verifyUserConsent: {
    redirectUrl: string;
  };
  consentGranted: {
    consentToken: string;
  };
}>;

/**
 * 
 * @param idToken 
 * @returns 
 */
async function createConsentRequestToken(idToken: string): Promise<string> {
  const { decodedToken } = decodeIdToken(idToken);

  if (decodedToken === null || typeof decodedToken.payload !== "object") {
    throw new Error("Invalid idToken");
  }

  const expiresIn = 60 * 60; // 1 hour
  const keyId = `vfd:authgw:${Settings.getStage()}:testbed:jwt`;

  const payload = {
    sub: decodedToken.payload.sub,
    subiss: decodedToken.payload.subiss || "https://login.testbed.fi",
    acr: decodedToken.payload.acr,
    app: await Settings.getSecret("TESTBED_CLIENT_ID"),
    appiss: "https://login.testbed.fi",
    aud: "https://consent.testbed.fi",
  };
  
  const customHeader = {
    kid: keyId,
    alg: "RS256",
    typ: "JWT",
    v: "0.2",
  };

  const key = await Settings.getStageSecret("TESTBED_CONSENT_JWKS_PRIVATE_KEY");
  
  return jwt.sign(payload, key, {
    header: customHeader,
    algorithm: "RS256",
    expiresIn: expiresIn,
    issuer: "https://virtual-finland-development-auth-files.s3.eu-north-1.amazonaws.com",
    keyid: keyId,
  })
}


/**
 * @see: https://ioxio.com/guides/how-to-build-an-application#request-consent
 *
 * @param dataSourceUri
 * @param idToken
 * @returns
 */
export async function fetchConsentStatus(dataSourceUri: string, idToken: string): Promise<ISituationResponseData> {

  // Create consent request token
  const consentRequestToken = await createConsentRequestToken(idToken);
  debug("consentRequestToken", consentRequestToken);
  
  const response = await axios.post(
    "https://consent.testbed.fi/Consent/RequestConsents",
    JSON.stringify({
      consentRequests: [
        {
          dataSource: dataSourceUri,
          required: true,
        }
      ],
    }),
    {
      headers: {
        "X-Consent-Request-Token": consentRequestToken,
        "Content-Type": "application/json",
      },
      timeout: Settings.REQUEST_TIMEOUT_MSECS,
    }
  );
  
  const consentStatus = response.data;
  debug("consent status response", {
    status: response.status,
    type: consentStatus.type
  });

  if (response.status === 200 && consentStatus.type === "allConsentsGranted") {

    // All consents granted, fetch the approved consent token
    const tokenResponse = await axios.post(
      "https://consent.testbed.fi/Consent/GetToken ",
      JSON.stringify({
        "dataSource": dataSourceUri
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Consent-Request-Token": consentRequestToken,
        },
        timeout: Settings.REQUEST_TIMEOUT_MSECS,
      }
    );
    
    const tokenResponseStatus = response.data;

    debug("consent token response", {
      status: response.status,
      type: tokenResponseStatus.type
    });

    if (tokenResponse.status !== 200 || tokenResponseStatus.type !== "allConsentsGranted") {
      throw new Error("Unexpected consent token response");
    }

    return {
      status: "consentGranted",
      dataSourceUri: dataSourceUri,
      idToken: idToken,
      data: {
        consentToken: tokenResponseStatus.consentToken,
      },
    };
  } else if (response.status === 201 && consentStatus.type === "requestUserConsent") {
    const returnUrl = Runtime.getAppUrl("/consents/testbed/consent-response");
    const redirectUrl = `${consentStatus.requestUrl}?${new URLSearchParams({
      returnUrl: returnUrl,
    }).toString()}`;

    return {
      status: "verifyUserConsent",
      idToken: idToken,
      dataSourceUri: dataSourceUri,
      data: {
        redirectUrl: redirectUrl,
      },
    };
  }
  throw new Error("Unexpected response");
}
