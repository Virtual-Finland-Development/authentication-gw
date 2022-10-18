import AppSettings from "../../AppSettings";
import { AuthenticationProtocol } from "../api/AuthenticationGW";
import { log } from "../utils/helpers";
import AuthService from "./AuthService";
import AuthState from "./AuthState";
import LoginEventListener from "./LoginEventListener";
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
    await LoginEventListener(this); // Listen for auth events
  }
}
