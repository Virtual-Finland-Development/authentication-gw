import AppSettings from "../../AppSettings";
import SimpleJSONStore from "../utils/SimpleJSONStore";
import LoginAppComponent from "./LoginAppComponent";

export type AuthStateFields = {
  idToken: string;
  profileData: any;
};

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
   * @param authFields
   */
  login(authFields: AuthStateFields) {
    this.UIState.setTransition("auth", true);

    if (typeof authFields === "object" && authFields !== null) {
      if (typeof authFields.idToken === "string") {
        this.log("AuthState", "logged in");
        this.#store.set("authFields", authFields);
      } else {
        throw new Error("Invalid token response");
      }
    } else {
      throw new Error("Invalid authFields");
    }
  }

  /**
   *
   */
  logout() {
    this.UIState.setTransition("auth", true);
    this.user.email = null;
    this.log("AuthState", "logged out");
    this.#store.clear("authFields");
    this.app.ConsentState.clear();
  }

  /**
   *
   * @returns
   */
  isLoggedIn(): boolean {
    return this.#store.has("authFields");
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
  getAuthFields(): AuthStateFields {
    return this.#store.get("authFields");
  }

  /**
   *
   */
  async handleLoggedIn(validate?: boolean): Promise<boolean> {
    let isLoggedIn = false;
    try {
      const authFields = this.getAuthFields();
      if (!authFields.profileData) {
        throw new Error("No profile data");
      }

      if (validate) {
        await this.app.AuthService.authorize(true); // throws error if not authorized
      }

      this.user = authFields.profileData;
      isLoggedIn = true;
    } catch (error) {
      // Auth invalidated
      this.log("AuthState", "login invalidated");
      this.logout();
      this.UIState.resetViewState("auth"); // reset view state
    }
    return isLoggedIn;
  }
}
