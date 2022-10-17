import { Context } from "openapi-backend";
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
    const parsedAppContext = parseAppContext(context, this.identityProviderIdent); // throws
    const redirectUrl = prepareErrorRedirectUrl(parsedAppContext.object.redirectUrl, "Authentication failed", this.identityProviderIdent);
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
    const parsedAppContext = parseAppContext(context, this.identityProviderIdent); // throws
    const redirectUrl = prepareErrorRedirectUrl(parsedAppContext.object.redirectUrl, "Logout failed", this.identityProviderIdent);
    return {
      statusCode: 303,
      headers: {
        Location: redirectUrl,
      },
      cookies: [prepareCookie("appContext", "")],
    };
  }
}
