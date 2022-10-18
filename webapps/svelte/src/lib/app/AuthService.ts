import AuthenticationGW, { AuthenticationGWProps } from "../api/AuthenticationGW";
import { AuthTokens } from "../utils/types";
import LoginAppComponent from "./LoginAppComponent";

/**
 * Example app auth service
 */
export default class AuthService extends LoginAppComponent {
  api: AuthenticationGW;

  constructor(loginApp, configuration: AuthenticationGWProps) {
    super(loginApp);
    this.api = new AuthenticationGW(configuration);
  }

  /**
   *
   * @param featureName
   * @returns
   */
  hasFeat(featureName: string): boolean {
    if (featureName === "consentify") {
      const hasConsents = {
        testbed: true,
      };
      return hasConsents[this.api.provider] === true;
    }
    return true; // defaults all-in
  }

  login() {
    this.log("AuthService", "logging in..");
    this.UIState.transitToUrl(this.api.getLoginUrl());
  }
  async fetchAuthTokens(loginCode) {
    this.log("AuthService", "fetching auth tokens..");
    return this.api.getAuthTokens(loginCode);
  }
  async fetchUserInfo(tokens: AuthTokens) {
    this.log("AuthService", "fetching user info..");
    return this.api.getUserInfo(tokens.accessToken);
  }
  async authorize() {
    this.log("AuthService", "authorizing..");
    const tokens = this.AuthState.getAuthTokens();
    this.api.authorize(tokens?.idToken);
  }
  logout() {
    this.log("AuthService", "loggin out..");
    const tokens = this.AuthState.getAuthTokens();
    this.UIState.transitToUrl(this.api.getLogoutUrl(tokens?.idToken));
  }

  /**
   * Extra services
   */
  consentify() {
    const consentId = "moro"; // @TODO: what is the context
    this.log("AuthService", `getting consent for ${consentId}..`);
    const tokens = this.AuthState.getAuthTokens();
    this.UIState.transitToUrl(this.api.getConsentRequestUrl(consentId, tokens?.idToken));
  }
}
