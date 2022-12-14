import axios from "axios";
import AppSettings from "../../AppSettings";
export type ConsentSituation = { status: string; consentToken?: string; redirectUrl?: string };

export default class ConsentAPI {
  /**
   *
   * @param consentId
   * @param idToken
   * @param returnUrl
   * @returns
   */
  async getConsentSituation(consentId: string, idToken: string, returnUrl?: string): Promise<ConsentSituation> {
    // Request the consent: https://ioxio.com/guides/how-to-build-an-application#request-consent
    try {
      const response = await axios.post(`${AppSettings.testbedAPIHost}/testbed/reverse-proxy`, {
        method: "POST",
        url: `https://consent.testbed.fi/Consent/Request`,
        body: JSON.stringify({
          dataSource: consentId,
        }),
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
    } catch (error) {
      console.log("/Consent/Request error:", error);
    }
    return {
      status: "failed",
    };
  }

  /**
   *
   * @param consentToken
   * @param idToken
   * @returns
   */
  async testConsentIdRequest(dataSourceUrl: string, inputData: any, consentToken: string, idToken: string): Promise<any> {
    // Test with a request: https://ioxio.com/guides/how-to-build-an-application#using-the-consent-token
    const response = await axios.post(`${AppSettings.testbedAPIHost}/testbed/reverse-proxy`, {
      method: "POST",
      url: dataSourceUrl,
      body: JSON.stringify(inputData),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        "X-Consent-Token": consentToken,
      },
    });

    return response.data;
  }

  /**
   *
   * @param consentId
   * @param idToken
   * @returns
   */
  async verifyConsentToken(consentToken: string): Promise<any> {
    // Verify the consent token: https://ioxio.com/guides/verify-consent-in-a-data-source
    const response = await axios.post(`${AppSettings.authenticationGatewayHost}/consent/testbed/verify`, null, {
      headers: {
        "X-Consent-Token": consentToken,
      },
    });

    return response;
  }
}
