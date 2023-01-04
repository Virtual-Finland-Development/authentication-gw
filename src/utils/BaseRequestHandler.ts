import { Context } from "openapi-backend";
import { AccessDeniedException, NoticeException } from "./exceptions";
import { debug } from "./logging";
import { prepareCookie, prepareLoginErrorRedirectUrl, prepareLogoutErrorRedirectUrl } from "./route-utils";
import { HttpResponse, NotifyErrorType } from "./types";
import { parseAppContext } from "./validators";

export abstract class BaseRequestHandler {
  abstract identityProviderIdent: string;

  /**
   *
   */
  async initialize(): Promise<void> {}

  /**
   * Shared error handler for AuthenticateResponse errs
   *
   * @param context
   * @param error
   * @returns
   */
  async getAuthenticateResponseFailedResponse(context: Context, error: any): Promise<HttpResponse> {
    debug(error);

    let errorMessage = "Authentication failed";
    let errorType: NotifyErrorType = "danger";

    if (error instanceof NoticeException) {
      errorMessage = error.message;
      errorType = "info";
    } else if (error instanceof AccessDeniedException) {
      errorMessage = error.message;
      errorType = "warning";
    }

    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent }); // throws
    const redirectUrl = prepareLoginErrorRedirectUrl(parsedAppContext.object.redirectUrl, {
      error: errorMessage,
      provider: this.identityProviderIdent,
      type: errorType,
    });

    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
      },
      cookies: [prepareCookie("appContext", "")],
    };
  }

  /**
   * Shared error handler for LogoutRequest errs
   *
   * @param context
   * @param error
   * @param errorTypeOverride - override error type
   * @returns
   */
  async getLogoutRequestFailedResponse(context: Context | string, error: any, errorTypeOverride?: NotifyErrorType): Promise<HttpResponse> {
    debug(error);

    let errorMessage = "Logout failed";
    let errorType: NotifyErrorType = "danger";

    if (error instanceof NoticeException) {
      errorMessage = error.message;
      errorType = "info";
    } else if (error instanceof AccessDeniedException) {
      errorMessage = error.message;
      errorType = "warning";
    }

    if (typeof errorTypeOverride !== "undefined") {
      errorType = errorTypeOverride;
    }

    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent }); // throws
    const redirectUrl = prepareLogoutErrorRedirectUrl(parsedAppContext.object.redirectUrl, {
      error: errorMessage,
      provider: this.identityProviderIdent,
      type: errorType,
    });

    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
      },
      cookies: [prepareCookie("appContext", "")],
    };
  }
}
