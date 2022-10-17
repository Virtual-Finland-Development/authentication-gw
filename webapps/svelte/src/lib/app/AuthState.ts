import AppSettings from "../../AppSettings";
import { AuthTokens } from "../utils/types";
import LoginAppComponent from "./LoginAppComponent";

/**
 * Example app auth state
 */
export default class AuthState extends LoginAppComponent {
  storeKey = null;
  isInTransition = false;
  user = {
    email: null,
  };

  constructor(loginApp) {
    super(loginApp);
    this.storeKey = `${AppSettings.appName}_${loginApp.getName()}_authState`;
  }

  /**
   *
   * @param tokens
   */
  login(tokens: AuthTokens) {
    this.isInTransition = true;
    if (typeof tokens === "object" && tokens !== null) {
      if (typeof tokens.accessToken === "string" && typeof tokens.idToken === "string") {
        this.log("AuthState", "logged in");
        localStorage.setItem(this.storeKey, JSON.stringify(tokens));
      } else {
        throw new Error("Invalid token response");
      }
    } else {
      throw new Error("Invalid tokens");
    }
  }

  /**
   *
   */
  logout() {
    this.isInTransition = true;
    this.user.email = null;
    this.log("AuthState", "logged out");
    localStorage.removeItem(this.storeKey);
  }

  /**
   *
   * @returns
   */
  isLoggedIn(): boolean {
    return this.getAuthTokens() !== null;
  }

  /**
   *
   * @returns
   */
  isLoading(): boolean {
    return this.isInTransition || (this.isLoggedIn() && this.user.email === null);
  }

  /**
   *
   * @returns
   */
  getAuthTokens(): AuthTokens {
    try {
      return JSON.parse(localStorage.getItem(this.storeKey));
    } catch (error) {}
    return null;
  }

  /**
   *
   */
  async handleLoggedIn() {
    try {
      const tokens = this.getAuthTokens();
      this.user = await this.AuthService.fetchUserInfo(tokens);
    } catch (error) {
      // Auth invalidated
      this.log("AuthState", "login invalidated");
      this.logout();
      this.UIState.resetViewState(); // reset view state
    }
  }
}
