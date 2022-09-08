import { Context } from "openapi-backend";
import { ValidationError } from "./exceptions";
import { resolveBase64Hash, ifAllObjectKeysAreDefined } from "./transformers";
import { AppContext } from "./types";

/**
 *
 * @param context openapi-backend context
 * @throws ValidationError if invalid app context
 * @returns parsed app context
 */
export function parseAppContext(context: Context): AppContext {
  if (typeof context.request.query.appContext !== "string") {
    throw new ValidationError("No app context");
  }

  let appContext;

  try {
    appContext = JSON.parse(resolveBase64Hash(context.request.query.appContext));
  } catch (error) {
    throw new ValidationError("Bad app context");
  }

  if (!ifAllObjectKeysAreDefined(appContext, ["appName", "redirectUrl"])) {
    throw new ValidationError("Invalid app context");
  }

  return appContext;
}
