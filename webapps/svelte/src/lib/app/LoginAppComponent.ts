import LoginApp from "./LoginApp";

export default class LoginAppComponent {
  app: LoginApp = null;
  getName: any;
  log: any;
  UIState: any;
  AuthState: any;
  AuthService: any;

  constructor(app: LoginApp) {
    this.app = app;
    this.getName = this.app.getName.bind(app);
    this.log = this.app.log.bind(app);
  }

  initialize() {
    this.UIState = this.app.UIState;
    this.AuthState = this.app.AuthState;
    this.AuthService = this.app.AuthService;
  }
}
