import { Context } from "openapi-backend";
import { ValidationError } from "./exceptions";
import { generateBase64Hash, resolveBase64Hash } from "./hashes";
import { debug } from "./logging";
import { ifAllObjectKeysAreDefined, ifString } from "./transformers";

import { ParsedAppContext } from "./types";

/**
 *
 * @param context openapi-backend context or app context hash string
 * @param provider default auth provider
 * @throws ValidationError if invalid app context
 * @returns parsed app context
 */
export function parseAppContext(context: Context | string, provider?: string, guid?: string): ParsedAppContext {
  let appContextHash;

  if (typeof context === "string") {
    appContextHash = context;
  } else if (ifString(context.request.query?.appContext)) {
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
    if (typeof appContext.provider !== "string") {
      appContext.provider = provider;
    }
    if (typeof appContext.guid !== "string") {
      appContext.guid = guid;
    }
    appContextHash = encodeURIComponent(generateBase64Hash(appContext));
  } catch (error) {
    debug(error, appContextHash);
    throw new ValidationError("Bad app context");
  }

  if (!ifAllObjectKeysAreDefined(appContext, ["appName", "provider"])) {
    throw new ValidationError("Invalid app context");
  }

  return {
    object: appContext,
    hash: appContextHash,
  };
}
