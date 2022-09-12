import { Context } from "openapi-backend";
import { ValidationError } from "./exceptions";
import { resolveBase64Hash, ifAllObjectKeysAreDefined, ifString } from "./transformers";
import { AppContext } from "./types";

/**
 *
 * @param context openapi-backend context
 * @throws ValidationError if invalid app context
 * @returns parsed app context
 */
export function parseAppContext(context: Context): { object: AppContext; hash: string } {
  let appContextHash;

  if (ifString(context.request.query?.appContext)) {
    appContextHash = context.request.query.appContext;
  } else if (ifString(context.request.requestBody?.appContext)) {
    appContextHash = context.request.requestBody.appContext;
  } else if (ifString(context.request.cookies?.appContext)) {
    appContextHash = context.request.cookies.appContext;
  }

  if (!ifString(appContextHash)) {
    throw new ValidationError("No app context");
  }

  let appContext;

  try {
    appContext = JSON.parse(resolveBase64Hash(decodeURIComponent(appContextHash)));
  } catch (error) {
    throw new ValidationError("Bad app context");
  }

  if (!ifAllObjectKeysAreDefined(appContext, ["appName", "redirectUrl"])) {
    throw new ValidationError("Invalid app context");
  }

  return {
    object: appContext,
    hash: appContextHash,
  };
}
