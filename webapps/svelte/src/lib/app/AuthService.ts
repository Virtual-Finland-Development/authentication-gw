import AuthenticationGW, { AuthenticationGWProps } from "../api/AuthenticationGW";
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
  async fetchLoggedInState(loginCode) {
    this.log("AuthService", "fetching logged in state..");
    return this.authApi.getLoggedInState(loginCode);
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
