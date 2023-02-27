import { JwtPayload } from "jsonwebtoken";
import { Context } from "openapi-backend";

export type AppContext = {
  appName: string;
  redirectUrl: string;
  guid?: string;
  provider?: string;
  meta?: Record<string, string>; // Additional metadata
};

export type ParsedAppContext = { object: AppContext; hash: string };

export interface AuthenticateResponse {
  provider: string;
}

export type HttpResponse = {
  statusCode: number;
  headers?: Record<string, string | string[] | boolean | number>;
  body?: string;
  cookies?: Array<string>; // v2: cookies, https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
};

/**
 * Output error message level
 */
export type NotifyType = "info" | "warning" | "danger";

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
  AuthenticationRequest(context: Context): Promise<HttpResponse>;

  /**
   * GET->REDIRECT: The route for handling the auth flow callback, redirecting back to the frontend app
   *
   * @param context
   * @returns AuthenticateResponse -> LoginResponse
   */
  AuthenticateResponse(context: Context): Promise<HttpResponse>;

  /**
   * POST: transform loginCode to LoginResponse
   *
   * @param context
   * @returns
   */
  LoginRequest(context: Context): Promise<HttpResponse>;

  /**
   * GET->REDIRECT: The route for handling the logout flow
   *
   * @param context
   * @returns
   */
  LogoutRequest(context: Context): Promise<HttpResponse>;

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   *
   * @param context
   * @returns
   */
  LogoutResponse(context: Context): Promise<HttpResponse>;
}

export type Authorizer = {
  /**
   * POST: Then /authorize request implementation for the provider
   *
   * @param token
   * @throws AccessDeniedException - if access is denied
   */
  authorize: (authorizationHeaders: AuthorizationHeaders) => Promise<AuthorizerResponse>;

  /**
   * Matches the provider to the authorizer
   */
  isMatchingProvider: (provider: string) => boolean;
};

export type AuthorizerResponse = { message: string; authorization: { userId?: string, email?: string, expiresAt?: number, issuedAt?: number, issuer?: string } | null; consent?: JwtPayload | null };

export type AuthorizationHeaders = {
  authorization: string;
  context?: string;
  consentToken?: string;
};

export interface IBaseRequestHandler {
  identityProviderIdent: string;
  initialize(): Promise<void>;
  getAuthenticateResponseFailedResponse(context: Context, error: any): Promise<HttpResponse>;
  getLogoutRequestFailedResponse(context: Context | string, error: any, message?: RedirectMessage): Promise<HttpResponse>;
  [attr: string]: any;
}

export type RedirectMessage = { 
  success?: boolean, 
  message?: string; 
  provider?: string; 
  type?: NotifyType,
  event?: string, 
}