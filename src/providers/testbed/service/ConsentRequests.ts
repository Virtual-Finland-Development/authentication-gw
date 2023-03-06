import axios from "axios";
import { debug } from "../../../utils/logging";
import Runtime from "../../../utils/Runtime";
import Settings from "../../../utils/Settings";
import { createConsentRequestToken } from "../TestbedAuthorizer";

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
    
    const tokenResponseData = tokenResponse.data;

    debug("consent token response", {
      status: tokenResponse.status,
      type: tokenResponseData.type
    });

    if (tokenResponse.status !== 200 || tokenResponseData.type !== "consentGranted") {
      throw new Error("Unexpected consent token response");
    }

    return {
      status: "consentGranted",
      dataSourceUri: dataSourceUri,
      idToken: idToken,
      data: {
        consentToken: tokenResponseData.consentToken,
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

/**
 * 
 * @param idToken 
 * @param consentToken 
 * @param dataSourceUri 
 * @returns 
 */
export async function verifyConsent(idToken: string, consentToken: string, dataSourceUri: string): Promise<boolean> {
  const response = await axios.post(
    "https://consent.testbed.fi/Consent/Verify",
    JSON.stringify({
      dataSource: dataSourceUri
    }),
    {
      headers: {
        "Authorization": `Bearer ${idToken}`,
        "X-Consent-Token": consentToken,
        "Content-Type": "application/json",
      },
      timeout: Settings.REQUEST_TIMEOUT_MSECS,
    }
  );

  const consentStatus = response.data;
  debug("consent status response", {
    status: response.status,
    verified: consentStatus.verified
  });

  return consentStatus.verified;
}