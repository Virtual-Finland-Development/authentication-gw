import AppSettings from "../../AppSettings";
import SimpleJSONStore from "../utils/SimpleJSONStore";
import { AuthTokens } from "../utils/types";
import LoginAppComponent from "./LoginAppComponent";

/**
 * Example app auth state
 */
export default class AuthState extends LoginAppComponent {
  #store: SimpleJSONStore;

  user = {
    email: null,
  };

  constructor(loginApp) {
    super(loginApp);
    this.#store = new SimpleJSONStore(`${AppSettings.appName}_${loginApp.getName()}_authState`);
  }

  /**
   *
   * @param tokens
   */
  login(tokens: AuthTokens) {
    this.UIState.setTransition("auth", true);

    if (typeof tokens === "object" && tokens !== null) {
      if (typeof tokens.accessToken === "string" && typeof tokens.idToken === "string") {
        this.log("AuthState", "logged in");
        this.#store.set("tokens", tokens);
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
    this.UIState.setTransition("auth", true);
    this.user.email = null;
    this.log("AuthState", "logged out");
    this.#store.clear("tokens");
    this.app.ConsentState.clear();
  }

  /**
   *
   * @returns
   */
  isLoggedIn(): boolean {
    return this.#store.has("tokens");
  }

  /**
   *
   * @returns
   */
  isLoading(): boolean {
    return this.UIState.ifInTransition("auth") || (this.isLoggedIn() && this.user.email === null);
  }

  /**
   *
   * @returns
   */
  getAuthTokens(): AuthTokens {
    return this.#store.get("tokens");
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
      this.UIState.resetViewState("auth"); // reset view state
    }
  }
}
