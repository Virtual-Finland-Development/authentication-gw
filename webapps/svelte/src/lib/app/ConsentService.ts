import ConsentAPI from "../api/ConsentAPI";
import LoginAppComponent from "./LoginAppComponent";

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
    const consentId = "dpp://digitalliving:v2@testbed.fi/draft/Company/Shareholders"; // @TODO: what is the context
    this.log("ConsentService", `getting consent for ${consentId}..`);
    const tokens = this.AuthState.getAuthTokens();

    const consentSituation = await this.consentApi.getConsentSituation(consentId, tokens?.idToken);
    if (consentSituation.status === "verifyUserConsent") {
      this.UIState.transitToUrl(consentSituation.redirectUrl, "consent");
    } else if (consentSituation.status === "consentGranted") {
      this.log("ConsentService", `Received consent token for ${consentId}`);
      this.app.ConsentState.setConsentTokenFor(consentId, consentSituation.consentToken);
      this.app.UIState.resetViewState("consent"); // reset view state
    }
  }

  /**
   *
   */
  async resolveConsentToken(): Promise<void> {
    const consentId = "dpp://digitalliving:v2@testbed.fi/draft/Company/Shareholders"; // @TODO: what is the context
    this.log("ConsentService", `getting consent token for ${consentId}..`);

    const tokens = this.AuthState.getAuthTokens();
    const consentToken = await this.consentApi.getConsentToken(consentId, tokens?.idToken);
    this.log("ConsentService", `Received consent token for ${consentId}`);
    this.app.ConsentState.setConsentTokenFor(consentId, consentToken);
    this.app.UIState.resetViewState("consent"); // reset view state
  }
}
