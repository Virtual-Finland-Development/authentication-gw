import { Context } from "openapi-backend";

export type AppContext = { appName: string; redirectUrl: string; guid?: string; provider?: string };

export interface AuthenticateResponse {
  provider: string;
}

export type HttpResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
};

export interface AuthRequestHandler {
  /**
   * Must have an init
   */
  initialize(): Promise<void>;

  /**
   * GET->REDIRECT: The route for handling the auth flow initiating process
   *
   * @param context
   * @returns
   */
  LoginRequest(context: Context): Promise<HttpResponse>;

  /**
   * GET->REDIRECT: The route for handling the auth flow callback, redirecting back to the frontend app
   *
   * @param context
   * @returns AuthenticateResponse -> LoginResponse
   */
  AuthenticateResponse(context: Context): Promise<HttpResponse>;

  /**
   *  POST: The route for the access token exchange: loginCode -> accessToken
   *
   * @param context
   * @returns
   */
  AuthTokenRequest?(context: Context): Promise<HttpResponse>;

  /**
   * GET->REDIRECT: The route for handling the logout flow
   *
   * @param context
   * @returns
   */
  LogoutRequest(context: Context): Promise<HttpResponse>;

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   * (not used, but required by the Sinuna logout flow)
   *
   * @param context
   * @returns
   */
  LogoutResponse(context: Context): Promise<HttpResponse>;

  /**
   *  POST: get user info from with the access token
   *
   * @param context
   * @returns
   */
  UserInfoRequest(context: Context): Promise<HttpResponse>;

  /**
   *  POST: authorize request using the access token and app context
   *
   * @param context
   * @returns
   */
  AuthorizeRequest?(context: Context): Promise<HttpResponse>;
}
