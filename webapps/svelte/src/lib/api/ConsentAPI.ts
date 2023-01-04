import axios from "axios";
import AppSettings from "../../AppSettings";
import AuthenticationGW from "./AuthenticationGW";
export type ConsentSituation = { consentStatus: string; consentToken?: string; redirectUrl?: string };

export default class ConsentAPI extends AuthenticationGW {
  /**
   *
   * @param dataSource
   * @param idToken
   * @param returnUrl
   * @returns
   */
  async getConsentSituation(dataSource: string, idToken: string, returnUrl?: string) {
    try {
      return await this.client.testbedConsentCheck({
        authorization: `Bearer ${idToken}`,
        appContext: this.generateAppContext(returnUrl),
        dataSource: dataSource,
      });
    } catch (error) {
      console.log("ConsentAPI.getConsentSituation", error);
      return {
        consentStatus: "failed",
      };
    }
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
