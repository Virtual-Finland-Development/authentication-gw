import LoginApp from "./LoginApp";

export default class LoginAppComponent {
  parent: LoginApp = null;
  getName: any;
  log: any;
  UIState: any;
  AuthState: any;
  AuthService: any;

  constructor(parent: LoginApp) {
    this.parent = parent;
    this.getName = this.parent.getName.bind(parent);
    this.log = this.parent.log.bind(parent);
  }

  initialize() {
    this.UIState = this.parent.UIState;
    this.AuthState = this.parent.AuthState;
    this.AuthService = this.parent.AuthService;
  }
}
