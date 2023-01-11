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
      const response = await this.client.testbedConsentCheck({
        authorization: `Bearer ${idToken}`,
        requestBody: {
          appContext: this.generateAppContext(returnUrl),
          dataSources: [{ uri: dataSource }],
        },
      });

      const sitation = response.find((situation) => situation.dataSource === dataSource);
      if (!sitation) {
        throw new Error("Unexpected response: missing data source from the response");
      }
      return sitation;
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
    const response = await axios.post(`${AppSettings.getTestbedAPIHost()}/testbed/reverse-proxy`, {
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
    return await this.client.testbedConsentVerify({
      xConsentToken: consentToken,
    });
  }
}
