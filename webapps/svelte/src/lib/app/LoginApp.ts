import AppSettings from "../../AppSettings";
import { AuthenticationProtocol } from "../api/AuthenticationGW";
import { log } from "../utils/helpers";
import AuthService from "./AuthService";
import AuthState from "./AuthState";
import ConsentEventListener from "./ConsentEventListener";
import ConsentService from "./ConsentService";
import ConsentState from "./ConsentState";
import LoginEventListener from "./LoginEventListener";
import UIState from "./UIState";

export default class LoginApp {
  name = null;
  authProtocol = null;
  UIState: UIState;
  AuthState: AuthState;
  AuthService: AuthService;

  ConsentState: ConsentState;
  ConsentService: ConsentService;

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

    this.ConsentState = new ConsentState(this);
    this.ConsentService = new ConsentService(this);
  }

  initializeComponents() {
    this.UIState.initialize();
    this.AuthState.initialize();
    this.AuthService.initialize();

    this.ConsentState.initialize();
    this.ConsentService.initialize();
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
    await LoginEventListener(this); // Listen for auth events
    await ConsentEventListener(this); // Listen for consent events
  }

  /**
   *
   * @param feature
   * @returns
   */
  ifHasFeature(feature: string): boolean {
    if (feature === "consents") {
      return this.getName() === "Testbed";
    }
    return true;
  }

  /**
   *
   */
  async handleLoggedIn(validate?: boolean) {
    const success = await this.AuthState.handleLoggedIn(validate); // Validate login
    if (success && this.ifHasFeature("consents")) {
      await this.ConsentState.handleLoggedIn();
    }
  }
}
