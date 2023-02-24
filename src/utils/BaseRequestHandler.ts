import { AxiosError } from "axios";
import { Context } from "openapi-backend";
import { AccessDeniedException, NoticeException } from "./exceptions";
import { debug } from "./logging";
import { prepareCookie, prepareLoginErrorRedirectUrl, prepareLogoutErrorRedirectUrl } from "./route-utils";
import { HttpResponse, IBaseRequestHandler, NotifyType, RedirectMessage } from "./types";
import { parseAppContext } from "./validators";

export abstract class BaseRequestHandler implements IBaseRequestHandler {
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
    let errorType: NotifyType = "danger";

    if (error instanceof NoticeException) {
      errorMessage = error.message;
      errorType = "info";
    } else if (error instanceof AccessDeniedException) {
      errorMessage = error.message;
      errorType = "warning";
    } else if (error instanceof AxiosError) {
      errorMessage = `External API: ${error.message}`;
      errorType = "warning";
    }

    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent }); // throws
    const redirectUrl = prepareLoginErrorRedirectUrl(parsedAppContext.object.redirectUrl, {
      message: errorMessage,
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
   * @param message - override message
   * @returns
   */
  async getLogoutRequestFailedResponse(context: Context | string, error: any, message?: RedirectMessage): Promise<HttpResponse> {
    debug(error);

    let errorMessage = "Logout failed";
    let errorType: NotifyType = "danger";
    let success: RedirectMessage["success"] = "0";

    if (error instanceof NoticeException) {
      errorMessage = error.message;
      errorType = "info";
    } else if (error instanceof AccessDeniedException) {
      errorMessage = error.message;
      errorType = "warning";
    }

    if (message && message.type) {
      errorType = message.type;
    } 
    if (message && typeof message.success !== "undefined") {
      success = message.success;
    } 


    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent }); // throws
    const redirectUrl = prepareLogoutErrorRedirectUrl(parsedAppContext.object.redirectUrl, {
      success: success,
      provider: this.identityProviderIdent,
      type: errorType,
      message: errorMessage,
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
