import { Context } from "openapi-backend";
import { AccessDeniedException, NoticeException } from "./exceptions";
import { debug } from "./logging";
import { prepareCookie, prepareErrorRedirectUrl } from "./route-utils";
import { HttpResponse, NotifyErrorType } from "./types";
import { parseAppContext } from "./validators";

export abstract class BaseRequestHandler {
  abstract identityProviderIdent: string;

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
    const redirectUrl = prepareErrorRedirectUrl(parsedAppContext.object.redirectUrl, {
      error: errorMessage,
      provider: this.identityProviderIdent,
      intent: "LoginRequest",
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
   * @returns
   */
  async getLogoutRequestFailedResponse(context: Context | string, error: any): Promise<HttpResponse> {
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

    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent }); // throws
    const redirectUrl = prepareErrorRedirectUrl(parsedAppContext.object.redirectUrl, {
      error: errorMessage,
      provider: this.identityProviderIdent,
      intent: "LogoutRequest",
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
