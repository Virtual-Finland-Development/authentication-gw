import ConsentAPI from "../api/ConsentAPI";
import LoginAppComponent from "./LoginAppComponent";

const CONSENT_ID = "dpp://openweather@testbed.fi/draft/Weather/Current/Metric"; // @TODO: what is the context

/**
 * Example app auth service
 */
export default class ConsentService extends LoginAppComponent {
  consentApi: ConsentAPI;

  constructor(loginApp) {
    super(loginApp);
    this.consentApi = new ConsentAPI();
  }

  /**
   * Consent flow initiator
   */
  async consentify() {
    this.log("ConsentService", `getting consent for ${CONSENT_ID}..`);
    const tokens = this.AuthState.getAuthTokens();

    const consentSituation = await this.consentApi.getConsentSituation(CONSENT_ID, tokens?.idToken);
    if (consentSituation.status === "verifyUserConsent") {
      this.UIState.transitToUrl(consentSituation.redirectUrl, "consent");
    } else if (consentSituation.status === "consentGranted") {
      this.log("ConsentService", `Received consent token for ${CONSENT_ID}`);
      this.app.ConsentState.setConsentTokenFor(CONSENT_ID, consentSituation.consentToken);
      this.app.UIState.resetViewState("consent", true); // reset view state
    }
  }

  /**
   *
   */
  async resolveConsentToken(): Promise<void> {
    this.log("ConsentService", `getting consent token for ${CONSENT_ID}..`);
    const tokens = this.AuthState.getAuthTokens();
    const consentToken = await this.consentApi.getConsentToken(CONSENT_ID, tokens?.idToken);
    this.log("ConsentService", `Received consent token for ${CONSENT_ID}`);
    this.app.ConsentState.setConsentTokenFor(CONSENT_ID, consentToken);
    this.app.UIState.resetViewState("consent", true); // reset view state
  }

  /**
   *
   * @param consentId
   */
  async testConsentIdRequest(consentId: string): Promise<void> {
    this.log("ConsentService", `Testing consent request with: ${consentId}..`);
    const tokens = this.AuthState.getAuthTokens();
    const consentToken = this.app.ConsentState.getConsentTokenFor(consentId);
    try {
      const results = await this.consentApi.testConsentIdRequest(
        `https://gateway.testbed.fi/draft/Weather/Current/Metric?source=openweather`,
        {
          lat: 60.192059,
          lon: 24.945831,
        },
        consentToken,
        tokens.idToken
      );
      window.alert(`Received valid data: ${JSON.stringify(results, null, 2)}`);
    } catch (error) {
      window.alert(`Received a request error: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async verifyConsentId(consentId: string): Promise<void> {
    this.log("ConsentService", `Verifying consent id: ${consentId}..`);
    const tokens = this.AuthState.getAuthTokens();
    const results = await this.consentApi.verifyConsentId(consentId, tokens.idToken);
  }
}
