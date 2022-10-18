import LoginAppComponent from "./LoginAppComponent";

type UIStateElements = {
  [elementName: string]: { disabled?: boolean; text?: string | null; textStyleClass?: string | null };
};

/**
 * Example app UI state, interactions handler
 */
export default class UIState extends LoginAppComponent {
  states: UIStateElements = {
    login: { disabled: true },
    logout: { disabled: true },
    authorize: { disabled: true },
    consentify: { disabled: true },
    info: { text: "...", textStyleClass: "is-loading" },
  };

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

  flagTransition() {
    this.AuthState.isInTransition = true;
    this.handleCurrentState();
  }
  transitToUrl(url) {
    this.flagTransition();
    window.location.href = url;
  }
  resetViewState() {
    window.history.replaceState({}, document.title, window.location.pathname); // clear url params
    this.AuthState.isInTransition = false;
    this.handleCurrentState();
  }
}
