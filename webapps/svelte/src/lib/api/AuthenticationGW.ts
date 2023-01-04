import { default as AppSettings } from "../../AppSettings";

import { DefaultService } from "./openapi/generated";
import { AuthGWClient } from "./openapi/generated/AuthGWClient";

export type AuthenticationProtocol = "openId" | "saml2";
export type AuthenticationGWProps = { appName: string; provider: string; protocol: AuthenticationProtocol; redirectUrl: string; logoutRedirectUrl?: string };

export default class AuthenticationGW {
  props: AuthenticationGWProps;
  client: DefaultService;
  provider: string;
  protocol: string;

  redirectUrls: {
    AuthenticationRequest: string;
    LogoutRequest: string;
  };

  constructor(props?: AuthenticationGWProps) {
    this.props = props || ({ appName: "default", redirectUrl: window.location.origin + window.location.pathname } as AuthenticationGWProps);

    const { provider, protocol } = this.props;
    this.provider = provider?.toLowerCase();
    this.protocol = protocol?.toLowerCase();

    if (!this.props.logoutRedirectUrl) {
      this.props.logoutRedirectUrl = this.props.redirectUrl;
    }

    const baseURL = AppSettings.getAuthenticationGatewayHost();

    // Create the openapi client
    this.client = new AuthGWClient({
      BASE: baseURL,
      WITH_CREDENTIALS: true,
    }).default;

    // Setup the redirect urls
    this.redirectUrls = {
      AuthenticationRequest: `${baseURL}/auth/${this.protocol}/${this.provider}/authentication-request`,
      LogoutRequest: `${baseURL}/auth/${this.protocol}/${this.provider}/logout-request`,
    };
  }

  /**
   *
   * @param redirectUrl
   * @returns
   */
  generateAppContext(redirectUrl?: string): string {
    // App context generator
    return encodeURIComponent(btoa(JSON.stringify({ appName: this.props.appName, redirectUrl: redirectUrl || this.props.redirectUrl })));
  }

  /**
   *
   */
  getLoginUrl(): string {
    return `${this.redirectUrls.AuthenticationRequest}?appContext=${this.generateAppContext()}`;
  }

  /**
   *
   * @param idToken
   */
  getLogoutUrl(idToken: string): string {
    const urlParams = new URLSearchParams({
      appContext: this.generateAppContext(),
      idToken: idToken,
    });

    return `${this.redirectUrls.LogoutRequest}?${urlParams.toString()}`;
  }

  /**
   *
   * @param idToken
   */
  async authorize(idToken: string) {
    const response = await this.client.authorizeRequest({
      authorization: `Bearer ${idToken}`,
      xAuthorizationContext: "demo app",
    });
    return response;
  }

  /**
   *
   * @param accesToken
   * @returns
   */
  async getLoggedInState(loginCode: string) {
    const { provider, protocol } = this.props;
    const payload = { loginCode: loginCode, appContext: this.generateAppContext() };

    switch (protocol) {
      case "openId":
        return this.client.openIdLoginRequest({
          provider: provider,
          requestBody: payload,
        });
      case "saml2":
        return this.client.saml2LoginRequest({
          provider: provider,
          requestBody: payload,
        });
      default:
        throw new Error(`Invalid protocol: ${protocol}`);
    }
  }
}
