import ConsentAPI, { ConsentSituation } from "../api/ConsentAPI";
import LoginAppComponent from "./LoginAppComponent";

const CONSENT_ID = "dpp://openweather@testbed.fi/draft/Weather/Current/Metric"; // @TODO: what is the context

/**
 * Example app auth service
 */
export default class ConsentService extends LoginAppComponent {
  consentApi: ConsentAPI;
  #consentSituation: ConsentSituation;

  constructor(loginApp) {
    super(loginApp);
    this.consentApi = new ConsentAPI();
  }
  /* ---------------consent requests------------------- */

  /**
   * Prepares consent situation
   */
  async initializeConsentService(handleGrantedConsent: boolean = false): Promise<ConsentSituation> {
    this.log("ConsentService", `Preparing consent situation for ${CONSENT_ID}..`);
    const authFields = this.AuthState.getAuthFields();
    this.#consentSituation = await this.consentApi.getConsentSituation(CONSENT_ID, authFields?.idToken);

    if (handleGrantedConsent && this.#consentSituation.status === "consentGranted") {
      this.log("ConsentService", `Received consent token for ${CONSENT_ID}`);
      this.app.ConsentState.setConsentTokenFor(CONSENT_ID, this.#consentSituation.consentToken);
    }

    return this.#consentSituation;
  }

  /**
   * Consent flow initiator
   */
  async consentify() {
    this.log("ConsentService", `Resolving the consent for ${CONSENT_ID}..`);

    if (!this.#consentSituation) {
      throw new Error("Consent service state not initialized");
    }

    if (this.#consentSituation.status === "verifyUserConsent") {
      this.UIState.transitToUrl(this.#consentSituation.redirectUrl, "consent");
    } else if (this.#consentSituation.status === "consentGranted") {
      this.log("ConsentService", `Received consent token for ${CONSENT_ID}`);
      this.app.ConsentState.setConsentTokenFor(CONSENT_ID, this.#consentSituation.consentToken);
      this.app.UIState.resetViewState("consent", true); // reset view state
    }
  }

  /* ---------------testing requests------------------- */

  /**
   *
   * @param consentId
   */
  async testConsentIdRequest(consentId: string): Promise<void> {
    this.log("ConsentService", `Testing consent request with: ${consentId}..`);
    const authFields = this.AuthState.getAuthFields();
    const consentToken = this.app.ConsentState.getConsentTokenFor(consentId);
    try {
      const results = await this.consentApi.testConsentIdRequest(
        `https://gateway.testbed.fi/draft/Weather/Current/Metric?source=openweather`,
        {
          lat: 60.192059,
          lon: 24.945831,
        },
        consentToken,
        authFields?.idToken
      );
      window.alert(`Received valid data: ${JSON.stringify(results, null, 2)}`);
    } catch (error) {
      window.alert(`Received a request error: ${JSON.stringify(error, null, 2)}`);
    }
  }

  /**
   *
   * @param consentId
   */
  async verifyConsentId(consentId: string): Promise<void> {
    try {
      this.log("ConsentService", `Verifying consent id: ${consentId}..`);
      const consentToken = this.app.ConsentState.getConsentTokenFor(consentId);
      const response = await this.consentApi.verifyConsentToken(consentToken);
      window.alert(`Received good validation: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      window.alert(`Received a request error: ${JSON.stringify(error, null, 2)}`);
    }
  }
}
