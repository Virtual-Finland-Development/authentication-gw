import { Context } from "openapi-backend";
import { ValidationError } from "./exceptions";
import { resolveBase64Hash, ifAllObjectKeysAreDefined } from "./transformers";
import { AppContext } from "./types";

/**
 *
 * @param context openapi-backend context
 * @throws ValidationError if invalid app context
 * @returns parsed app context, hash
 */
export function parseAppContext(context: Context): { object: AppContext; hash: string } {
  let appContextHash;

  if (typeof context.request.query?.appContext === "string") {
    appContextHash = context.request.query.appContext;
  } else if (typeof context.request.requestBody?.appContext === "string") {
    appContextHash = context.request.requestBody.appContext;
  }

  if (typeof appContextHash !== "string") {
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
