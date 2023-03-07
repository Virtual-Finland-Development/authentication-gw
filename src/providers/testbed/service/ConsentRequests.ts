import axios from "axios";
import { debug } from "../../../utils/logging";
import Runtime from "../../../utils/Runtime";
import Settings from "../../../utils/Settings";
import { createConsentRequestToken } from "../TestbedAuthorizer";

type ISituationResponseDataPair<T, K extends keyof T = keyof T> = K extends keyof T ? { status: K; data: T[K]; idToken: string; dataSourceUri?: string } : never;
type ISituationResponseData = ISituationResponseDataPair<{
  verifyUserConsent: {
    redirectUrl: string;
    missingConsents: Array<{ dataSource: string; required: boolean }>;
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
export async function fetchConsentStatuses(dataSourceUris: Array<string>, idToken: string): Promise<Array<ISituationResponseData>> {

  // Create consent request token
  const consentRequestToken = await createConsentRequestToken(idToken);
  const consentsResponse = await axios.post(
    "https://consent.testbed.fi/Consent/RequestConsents",
    {
      consentRequests: dataSourceUris.map(dataSourceUri => {
        return {
          dataSource: dataSourceUri,
          required: true,
        };
      },
    )},
    {
      headers: {
        "X-Consent-Request-Token": consentRequestToken,
        "Content-Type": "application/json",
      },
      timeout: Settings.REQUEST_TIMEOUT_MSECS,
    }
  );

  const consentsResponseData = consentsResponse.data;
  debug("consent status response", {
    status: consentsResponse.status,
    type: consentsResponseData.type
  });

  let greantedConsentUris = [];
  const consentResponses: Array<ISituationResponseData> = [];

  if (consentsResponse.status === 200 && consentsResponseData.type === "allConsentsGranted") {
    greantedConsentUris = dataSourceUris
  } else if (consentsResponse.status === 201 && consentsResponseData.type === "requestUserConsent") {
    const returnUrl = Runtime.getAppUrl("/consents/testbed/consent-response");
    const redirectUrl = `${consentsResponseData.requestUrl}?${new URLSearchParams({
      returnUrl: returnUrl,
    }).toString()}`;

    return [
      {
        status: "verifyUserConsent",
        idToken: idToken,
        data: {
          redirectUrl: redirectUrl,
          missingConsents: consentsResponseData.missingConsents,
        },
      }
    ];
  } else {
    throw new Error("Unexpected response");
  }

  // For all consents granted, fetch the approved consent token
  for (const dataSourceUri of greantedConsentUris) {
    const tokenResponse = await axios.post(
      "https://consent.testbed.fi/Consent/GetToken ",
      {
        "dataSource": dataSourceUri
      },
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

    consentResponses.push({
      status: "consentGranted",
      dataSourceUri: dataSourceUri,
      idToken: idToken,
      data: {
        consentToken: tokenResponseData.consentToken,
      },
    });
  }

  return consentResponses;
}

/**
 * 
 * @param dataSourceUri 
 * @param idToken 
 * @returns 
 */
export async function fetchConsentStatus(dataSourceUri: string, idToken: string): Promise<ISituationResponseData> {
  const consentStatuses = await fetchConsentStatuses([dataSourceUri], idToken);
  return consentStatuses[0];
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
    {
      dataSource: dataSourceUri
    },
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