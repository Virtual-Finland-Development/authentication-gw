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

  login() {
    this.log("AuthService", "logging in..");
    this.api.login();
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
    this.api.authorize(tokens.idToken);
  }
  logout() {
    const tokens = this.AuthState.getAuthTokens();
    this.api.logout(tokens.idToken);
  }
}
