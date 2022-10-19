import axios from "axios";
import AppSettings from "../../AppSettings";

export default class ConsentAPI {
  /**
   *
   * @param consentId
   * @param idToken
   * @param returnUrl
   * @returns
   */
  async getConsentSituation(consentId: string, idToken: string, returnUrl?: string): Promise<{ status: string; consentToken?: string; redirectUrl?: string }> {
    // Request the consent: https://ioxio.com/guides/how-to-build-an-application#request-consent
    const response = await axios.post(`${AppSettings.authenticationGatewayHost}/reverse-proxy`, {
      method: "POST",
      url: `https://consent.testbed.fi/Consent/Request`,
      data: {
        dataSource: consentId,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (response.data.type === "verifyUserConsent") {
      if (typeof returnUrl !== "string") {
        returnUrl = window.location.href;
      }
      const redirectUrl = `${response.data.verifyUrl}?${new URLSearchParams({
        returnUrl: returnUrl,
      }).toString()}`;

      return {
        status: "verifyUserConsent",
        redirectUrl: redirectUrl,
      };
    } else if (response.data.type === "consentGranted") {
      return {
        status: "consentGranted",
        consentToken: response.data.consentToken,
      };
    }
    throw new Error("Unexpected response");
  }

  /**
   *
   * @param consentId
   * @param idToken
   * @returns
   */
  async getConsentToken(consentId: string, idToken: string): Promise<string> {
    // Retrieve the consent token: https://ioxio.com/guides/how-to-build-an-application#request-the-consent-token
    const response = await axios.post(`${AppSettings.authenticationGatewayHost}/reverse-proxy`, {
      method: "POST",
      url: `https://consent.testbed.fi/Consent/Request`,
      data: {
        dataSource: consentId,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (response.data.type !== "consentGranted") {
      throw new Error("Consent not granted");
    }

    return response.data.consentToken;
  }
}
