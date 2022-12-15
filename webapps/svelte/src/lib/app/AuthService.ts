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
  async authorize(validate: boolean = false) {
    try {
      this.log("AuthService", "authorizing..");
      const authFields = this.AuthState.getAuthFields();
      const response = await this.authApi.authorize(authFields?.idToken);
      if (!validate) {
        window.alert(response.message);
      }
    } catch (error) {
      if (!validate) {
        window.alert(error);
      } else {
        throw error;
      }
    }
  }
  logout() {
    this.log("AuthService", "loggin out..");
    const authFields = this.AuthState.getAuthFields();
    const idToken = authFields?.idToken;

    this.AuthState.logout(); // clear auth state early
    this.UIState.transitToUrl(this.authApi.getLogoutUrl(idToken), "auth");
  }
}
