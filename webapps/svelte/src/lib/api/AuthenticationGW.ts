import { AUTH_GW_ENDPOINT } from "./APISettings";
import { DefaultService } from "./openapi/generated";
import { AuthGWClient } from "./openapi/generated/AuthGWClient";

export type AuthenticationProtocol = "openId" | "saml2";
export type AuthenticationGWProps = { appName: string; provider: string; protocol: AuthenticationProtocol; redirectUrl: string; logoutRedirectUrl?: string };

export default class AuthenticationGW {
  props: AuthenticationGWProps;
  client: DefaultService;

  redirectUrls: {
    LoginRequest: string;
    LogoutRequest: string;
  };

  constructor(props: AuthenticationGWProps) {
    this.props = props;
    if (!this.props.logoutRedirectUrl) {
      this.props.logoutRedirectUrl = this.props.redirectUrl;
    }

    // Create the openapi client
    this.client = new AuthGWClient({
      BASE: AUTH_GW_ENDPOINT,
      WITH_CREDENTIALS: true,
    }).default;

    // Setup the redirect urls
    const { provider, protocol } = this.props;
    this.redirectUrls = {
      LoginRequest: `${AUTH_GW_ENDPOINT}/auth/${protocol.toLowerCase()}/${provider}/login-request`,
      LogoutRequest: `${AUTH_GW_ENDPOINT}/auth/${protocol.toLowerCase()}/${provider}/logout-request`,
    };
  }

  /**
   *
   * @param redirectUrl
   * @returns
   */
  #generateAppContext(redirectUrl?: string): string {
    // App context generator
    return encodeURIComponent(btoa(JSON.stringify({ appName: this.props.appName, redirectUrl: redirectUrl || this.props.redirectUrl })));
  }

  /**
   *
   */
  login() {
    window.location.href = `${this.redirectUrls.LoginRequest}?appContext=${this.#generateAppContext()}`;
  }

  /**
   *
   * @param idToken
   */
  logout(idToken: string) {
    const urlParams = new URLSearchParams({
      appContext: this.#generateAppContext(),
      idToken: idToken,
    });

    window.location.href = `${this.redirectUrls.LogoutRequest}?${urlParams.toString()}`;
  }

  /**
   *
   * @param idToken
   */
  async authorize(idToken: string) {
    const { provider } = this.props;
    const response = await this.client.authorizeRequest(`Bearer ${idToken}`, provider, "demo app");
    window.alert(response.message);
  }

  /**
   *
   * @param accesToken
   * @returns
   */
  async getAuthTokens(loginCode: string) {
    const { provider, protocol } = this.props;
    const payload = { loginCode: loginCode, appContext: this.#generateAppContext() };

    switch (protocol) {
      case "openId":
        return this.client.openIdAuthTokenRequest(provider, payload);
      case "saml2":
        return this.client.saml2AuthTokenRequest(provider, payload);
      default:
        throw new Error(`Invalid protocol: ${protocol}`);
    }
  }

  /**
   *
   * @param accesToken
   * @returns
   */
  async getUserInfo(accessToken: string) {
    const { provider, protocol } = this.props;
    const payload = { accessToken: accessToken, appContext: this.#generateAppContext() };

    switch (protocol) {
      case "openId":
        return this.client.openIdUserInfoRequest(provider, payload);
      case "saml2":
        return this.client.saml2UserInfoRequest(provider, payload);
      default:
        throw new Error(`Invalid protocol: ${protocol}`);
    }
  }
}
