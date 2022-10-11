import { Context } from "openapi-backend";
import { AccessDeniedException, ValidationError } from "../../../utils/exceptions";
import { generateBase64Hash, resolveBase64Hash } from "../../../utils/hashes";
import { debug } from "../../../utils/logging";
import { prepareCookie } from "../../../utils/route-utils";
import { SuomiFiLoginState } from "./SuomifiTypes";

export default {
  getLoginCookies(suomiFiLoginState: SuomiFiLoginState): Array<string> {
    const suomiFiLoginStateHash = generateBase64Hash(JSON.stringify(suomiFiLoginState));
    const suomiFiCookieChunks = suomiFiLoginStateHash.match(/.{1,2048}/g) || []; // split into chunks of 2048 chars
    const suomiFiCookies = suomiFiCookieChunks.map((chunk, index) => prepareCookie(`suomiFiLoginState_${index}`, String(chunk)));
    return suomiFiCookies;
  },

  getLogoutCookies(context: Context): Array<string> {
    const suomiStateCookieNames = this.getLoginCookieKeys(context);
    return suomiStateCookieNames.map((cookieName) => prepareCookie(cookieName, ""));
  },

  isLoggedIn(context: Context): boolean {
    for (const cookieName in context.request.cookies) {
      if (cookieName.startsWith("suomiFiLoginState_")) {
        return true;
      }
    }
    return false;
  },

  resolveLoginState(context: Context, authorize: boolean = true): SuomiFiLoginState {
    if (!this.isLoggedIn(context)) {
      throw new AccessDeniedException("Not logged in");
    }

    const suomiFiLoginStateHash = this.resolveLoginStateHash(context);
    const loginState = JSON.parse(resolveBase64Hash(suomiFiLoginStateHash));

    if (!loginState.profile) {
      throw new ValidationError("No profile info on the login state");
    }
    if (!loginState.accessToken) {
      throw new ValidationError("No accessToken info on the login state");
    }

    if (authorize) {
      const requestAccessToken = context.request.requestBody?.accessToken || context.request.requestBody?.loginCode;
      if (loginState.accessToken !== requestAccessToken) {
        debug(loginState, context.request);
        throw new AccessDeniedException("Invalid session token");
      }
    }
    return loginState;
  },

  getLoginCookieKeys(context: Context): Array<string> {
    // Resolve the cookie names
    const suomiStateCookieNames = [];
    for (const cookieName in context.request.cookies) {
      if (cookieName.startsWith("suomiFiLoginState_")) {
        suomiStateCookieNames.push(cookieName);
      }
    }

    // Ensure the cookies are in the correct order
    suomiStateCookieNames.sort();
    return suomiStateCookieNames;
  },

  resolveLoginStateHash(context: Context): string {
    const suomiStateCookieNames = this.getLoginCookieKeys(context);

    // Combine the hash value
    const suomiFiLoginStateHash = suomiStateCookieNames.reduce((acc, cookieName) => {
      return acc + String(context.request.cookies[cookieName]);
    }, "");

    return suomiFiLoginStateHash;
  },
};
