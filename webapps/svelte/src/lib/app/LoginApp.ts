import AppSettings from "../../AppSettings";
import { AuthenticationProtocol } from "../api/AuthenticationGW";
import { log } from "../helpers";
import AuthService from "./AuthService";
import AuthState from "./AuthState";
import UIState from "./UIState";

export default class LoginApp {
  name = null;
  authProtocol = null;
  UIState: UIState;
  AuthState: AuthState;
  AuthService: AuthService;

  constructor(configuration: { name: string; protocol: AuthenticationProtocol }) {
    this.name = configuration.name;

    this.UIState = new UIState(this);
    this.AuthState = new AuthState(this);
    this.AuthService = new AuthService(this, {
      appName: AppSettings.appName,
      provider: configuration.name.toLowerCase(),
      protocol: configuration.protocol,
      redirectUrl: window.location.origin + window.location.pathname, // the url without query params etc
    });
  }

  initializeComponents() {
    this.UIState.initialize();
    this.AuthState.initialize();
    this.AuthService.initialize();
  }

  getName() {
    if (!this.name) {
      throw new Error("name is not defined");
    }
    return this.name;
  }

  log(...messages: any[]) {
    log(`[${this.getName()}]`, ...messages);
  }

  async engage() {
    this.initializeComponents();
    await this.engageLoginFlowEventsListener();
  }

  /**************************************************************************
  * 
  * Event listeners
  * 
  /**************************************************************************/
  async engageLoginFlowEventsListener() {
    const urlParams = new URLSearchParams(window.location.search);

    const affectsThisApp = urlParams.has("provider") && urlParams.get("provider").toLowerCase() === this.getName().toLowerCase();
    if (!this.AuthState.isLoggedIn()) {
      if (affectsThisApp && urlParams.has("loginCode")) {
        this.log("LoginFlowEventsListener", "Login code received, fetching auth token..");
        //
        // Handle login response
        //
        const loginCode = urlParams.get("loginCode");
        try {
          const tokens = await this.AuthService.fetchAuthTokens(loginCode);
          this.AuthState.login(tokens); // Store token in local storage
          await this.AuthState.handleLoggedIn(); // Fetch user info
          this.UIState.resetViewState(); // reset view state
        } catch (error) {
          this.log("LoginFlowEventsListener", "Failed to fetch auth token", error);
        }
      } else {
        this.UIState.handleCurrentState(); // Init UI
      }
    } else if (affectsThisApp && urlParams.has("logout")) {
      this.log("LoginFlowEventsListener", "Logout event received, logging out");
      //
      // Handle logout response
      //
      const logoutResponse = urlParams.get("logout");
      if (logoutResponse === "success") {
        this.AuthState.logout();
        this.UIState.resetViewState(); // reset view state
      }
    } else {
      await this.AuthState.handleLoggedIn(); // Validate login
      this.UIState.handleCurrentState(); // Update UI
    }
  }
}
