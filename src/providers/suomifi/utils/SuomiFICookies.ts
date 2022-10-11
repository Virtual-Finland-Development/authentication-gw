import { Context } from "openapi-backend";
import { prepareCookie } from "../../../utils/route-utils";

export default {
  create(suomiFiLoginStateHash: string): Array<string> {
    const suomiFiCookieChunks = suomiFiLoginStateHash.match(/.{1,4096}/g) || []; // split into chunks of 4096 chars
    const suomiFiCookies = suomiFiCookieChunks.map((chunk, index) => prepareCookie(`suomiFiLoginState_${index}`, String(chunk)));
    return suomiFiCookies;
  },
  resolve(context: Context): string {
    // Resolve the cookie names
    const suomiStateCookieNames = [];
    for (const cookieName in context.request.cookies) {
      if (cookieName.startsWith("suomiFiLoginState_")) {
        suomiStateCookieNames.push(cookieName);
      }
    }

    // Ensure the cookies are in the correct order
    suomiStateCookieNames.sort();

    // Combine the hash value
    const suomiFiLoginStateHash = suomiStateCookieNames.reduce((acc, cookieName) => {
      return acc + String(context.request.cookies[cookieName]);
    }, "");

    return suomiFiLoginStateHash;
  },
  hasSuomifiCookies(context: Context): boolean {
    for (const cookieName in context.request.cookies) {
      if (cookieName.startsWith("suomiFiLoginState_")) {
        return true;
      }
    }
    return false;
  },
};
