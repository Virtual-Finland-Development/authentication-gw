import axios from "axios";
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
 * @see: https://ioxio.com/guides/how-to-build-an-application#request-consent
 *
 * @param dataSourceUri
 * @param idToken
 * @returns
 */
export async function fetchConsentStatus(dataSourceUri: string, idToken: string): Promise<ISituationResponseData> {
  const response = await axios.post(
    "https://consent.testbed.fi/Consent/Request",
    JSON.stringify({
      dataSource: dataSourceUri,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      timeout: Settings.REQUEST_TIMEOUT_SECS,
    }
  );

  const consentStatus = response.data;
  debug("consentStatusType", consentStatus.type);

  if (consentStatus.type === "verifyUserConsent") {
    const returnUrl = Runtime.getAppUrl("/consents/testbed/consent-response");
    const redirectUrl = `${consentStatus.verifyUrl}?${new URLSearchParams({
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
  } else if (consentStatus.type === "consentGranted") {
    return {
      status: "consentGranted",
      dataSourceUri: dataSourceUri,
      idToken: idToken,
      data: {
        consentToken: consentStatus.consentToken,
      },
    };
  }
  throw new Error("Unexpected response");
}
