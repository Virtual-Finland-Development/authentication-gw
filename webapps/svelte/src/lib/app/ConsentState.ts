import AppSettings from "../../AppSettings";
import SimpleJSONStore from "../utils/SimpleJSONStore";
import LoginAppComponent from "./LoginAppComponent";

export type ConsentSituation = { status: string; consentToken?: string; redirectUrl?: string };

/**
 * Example app consent state
 */
export default class ConsentState extends LoginAppComponent {
  #consentStore: SimpleJSONStore;
  #consentSituation: ConsentSituation;

  constructor(loginApp) {
    super(loginApp);
    this.#consentStore = new SimpleJSONStore(`${AppSettings.appName}_${loginApp.getName()}_consentsState`);
    this.#consentSituation = null;
  }

  /**
   *
   * @param consentId
   * @returns
   */
  hasConsentFor(consentId: string): boolean {
    const store = this.#consentStore.get();
    return typeof store[consentId] !== "undefined";
  }

  /**
   *
   * @param consentId
   * @param consentToken
   */
  setConsentTokenFor(consentId: string, consentToken: string) {
    this.#consentStore.set(consentId, consentToken);
  }

  /**
   *
   * @param consentId
   */
  clear() {
    this.#consentStore.clear();
  }

  /**
   *
   * @param consentId
   */
  clearConsentTokenFrom(consentId: string) {
    this.#consentStore.clear(consentId);
  }

  /**
   *
   * @param consentId
   * @returns
   */
  getConsentTokenFor(consentId: string): string {
    const store = this.#consentStore.get();
    return store[consentId];
  }

  /**
   *
   * @returns
   */
  hasConsents(): boolean {
    return this.#consentStore.has();
  }

  /**
   *
   * @returns
   */
  getConsentIds(): string[] {
    const store = this.#consentStore.get();
    return Object.keys(store);
  }

  getConsentSituation(): ConsentSituation {
    return this.#consentSituation;
  }
  setConsentSituation(consentSituation: ConsentSituation): void {
    this.#consentSituation = consentSituation;
  }

  /**
   *
   */
  async handleLoggedIn() {
    await this.app.ConsentService.prepareConsentSituation(true);
  }
}
