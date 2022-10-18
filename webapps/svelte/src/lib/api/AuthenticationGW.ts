import { default as AppSettings } from "../../AppSettings";

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
      BASE: AppSettings.authenticationGatewayHost,
      WITH_CREDENTIALS: true,
    }).default;

    // Setup the redirect urls
    const { provider, protocol } = this.props;
    this.redirectUrls = {
      LoginRequest: `${AppSettings.authenticationGatewayHost}/auth/${protocol.toLowerCase()}/${provider}/login-request`,
      LogoutRequest: `${AppSettings.authenticationGatewayHost}/auth/${protocol.toLowerCase()}/${provider}/logout-request`,
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
    try {
      const response = await this.client.authorizeRequest({
        authorization: `Bearer ${idToken}`,
        xAuthorizationProvider: provider,
        xAuthorizationContext: "demo app",
      });
      window.alert(response.message);
    } catch (error) {
      window.alert(error.statusText);
    }
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
        return this.client.openIdAuthTokenRequest({
          provider: provider,
          requestBody: payload,
        });
      case "saml2":
        return this.client.saml2AuthTokenRequest({
          provider: provider,
          requestBody: payload,
        });
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
        return this.client.openIdUserInfoRequest({
          provider: provider,
          requestBody: payload,
        });
      case "saml2":
        return this.client.saml2UserInfoRequest({
          provider: provider,
          requestBody: payload,
        });
      default:
        throw new Error(`Invalid protocol: ${protocol}`);
    }
  }
}
