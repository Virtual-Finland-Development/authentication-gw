import AuthenticationGW, { AuthenticationGWProps } from "../api/AuthenticationGW";
import { AuthTokens } from "../utils/types";
import LoginAppComponent from "./LoginAppComponent";

/**
 * Example app auth service
 */
export default class AuthService extends LoginAppComponent {
  authApi: AuthenticationGW;

  constructor(loginApp, configuration: AuthenticationGWProps) {
    super(loginApp);
    this.authApi = new AuthenticationGW(configuration);
  }

  login() {
    this.log("AuthService", "logging in..");
    this.UIState.transitToUrl(this.authApi.getLoginUrl(), "auth");
  }
  async fetchAuthTokens(loginCode) {
    this.log("AuthService", "fetching auth tokens..");
    return this.authApi.getAuthTokens(loginCode);
  }
  async fetchUserInfo(tokens: AuthTokens) {
    this.log("AuthService", "fetching user info..");
    return this.authApi.getUserInfo(tokens.accessToken);
  }
  async authorize() {
    this.log("AuthService", "authorizing..");
    const tokens = this.AuthState.getAuthTokens();
    this.authApi.authorize(tokens?.idToken);
  }
  logout() {
    this.log("AuthService", "loggin out..");
    const tokens = this.AuthState.getAuthTokens();
    this.UIState.transitToUrl(this.authApi.getLogoutUrl(tokens?.idToken), "auth");
  }
}
