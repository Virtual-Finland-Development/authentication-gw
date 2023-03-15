import { dialogs } from "svelte-dialogs";
import AppSettings from "../../AppSettings";
import SimpleJSONStore from "../utils/SimpleJSONStore";
import LoginAppComponent from "./LoginAppComponent";

type UIStateElements = {
  [elementName: string]: { disabled?: boolean; text?: string | null; textStyleClass?: string | null };
};

type KnownTransitionNames = "auth" | "consent";

/**
 * Example app UI state, interactions handler
 */
export default class UIState extends LoginAppComponent {
  states: UIStateElements;

  #transitions: SimpleJSONStore;

  constructor(loginApp) {
    super(loginApp);
    this.states = {
      login: { disabled: true },
      logout: { disabled: true },
      authorize: { disabled: true },
      consentify: { disabled: true },
      info: { text: "...", textStyleClass: "is-loading" },
    };
  }

  initialize() {
    super.initialize();
    this.#transitions = new SimpleJSONStore(`${AppSettings.appName}_${this.app.getName()}_transitions`, { auth: "variableStorage", consent: "sessionStorage" });
  }

  /**
   *
   */
  handleCurrentState(): void {
    if (this.AuthState.isLoading()) {
      this.states.login.disabled = true;
      this.states.logout.disabled = true;
      this.states.authorize.disabled = true;
      this.states.consentify.disabled = true;
      this.states.info.text = "Loading...";
      this.states.info.textStyleClass = "is-loading";
    } else if (this.AuthState.isLoggedIn()) {
      this.states.login.disabled = true;
      this.states.logout.disabled = false;
      this.states.authorize.disabled = false;
      this.states.consentify.disabled = false;
      this.states.info.text = this.AuthState.user.email ? `logged in as ${this.AuthState.user.email}` : "Logged in";
      this.states.info.textStyleClass = "is-logged-in";
    } else {
      this.states.login.disabled = false;
      this.states.logout.disabled = true;
      this.states.authorize.disabled = false;
      this.states.consentify.disabled = true;
      this.states.info.text = "Logged out";
      this.states.info.textStyleClass = "is-logged-out";
    }
  }

  flagTransition(transitionName: KnownTransitionNames) {
    this.#transitions.set(transitionName, true);
    this.handleCurrentState();
  }

  transitToUrl(url, transitionName: KnownTransitionNames) {
    this.flagTransition(transitionName);
    window.location.href = url;
  }

  resetViewState(transitionName: KnownTransitionNames, refresh: boolean = false) {
    this.clearUrlParams();
    this.#transitions.set(transitionName, false);
    if (refresh) {
      window.location.reload();
    } else {
      this.handleCurrentState();
    }
  }

  setTransition(transitionName: KnownTransitionNames, value: boolean) {
    this.#transitions.set(transitionName, value);
  }

  ifInTransition(transitionName: KnownTransitionNames): boolean {
    return Boolean(this.#transitions.get(transitionName));
  }

  notify(notification: { message: string; type: string } | string | Error) {
    console.log("[app:notify]", notification);

    if (notification instanceof Error) {
      notification = { message: notification.message, type: "error" };
    }

    if (typeof notification === "string") {
      notification = { message: notification, type: "info" };
    }

    switch (notification.type) {
      case "danger":
      case "error":
        dialogs.error({ text: notification.message, title: notification.type });
        break;
      case "warning":
        dialogs.warning({ text: notification.message, title: notification.type });
        break;
      case "info":
      case "success":
        dialogs.success({ text: notification.message, title: notification.type });
        break;
    }
  }

  clearUrlParams() {
    window.history.replaceState({}, document.title, window.location.pathname); // clear url params
  }
}
