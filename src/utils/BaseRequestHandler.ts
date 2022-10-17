import { Context } from "openapi-backend";
import { AccessDeniedException } from "./exceptions";
import { debug } from "./logging";
import { prepareCookie, prepareErrorRedirectUrl } from "./route-utils";
import { HttpResponse } from "./types";
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

    const parsedAppContext = parseAppContext(context, this.identityProviderIdent); // throws
    const redirectUrl = prepareErrorRedirectUrl(parsedAppContext.object.redirectUrl, errorMessage, this.identityProviderIdent, "AuthenticateResponse");
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
  async getLogoutRequestFailedResponse(context: Context, error: any): Promise<HttpResponse> {
    debug(error);

    let errorMessage = "Logout failed";
    if (error instanceof AccessDeniedException) {
      errorMessage = "Already logged out";
    }

    const parsedAppContext = parseAppContext(context, this.identityProviderIdent); // throws
    const redirectUrl = prepareErrorRedirectUrl(parsedAppContext.object.redirectUrl, errorMessage, this.identityProviderIdent, "LogoutRequest");
    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
      },
      cookies: [prepareCookie("appContext", "")],
    };
  }
}
