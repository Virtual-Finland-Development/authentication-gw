import { Context } from "openapi-backend";
import { ValidationError } from "./exceptions";
import { generateUrlEncodedBase64Hash, resolveUrlEncodedBase64HashJSON } from "./hashes";
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
export function parseAppContext(context: Context | string, fillers?: { provider?: string; guid?: string; meta?: Record<string, string> }): ParsedAppContext {
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
    appContext = resolveUrlEncodedBase64HashJSON(appContextHash);
    if (typeof appContext.provider !== "string") {
      appContext.provider = fillers?.provider;
    }
    if (typeof appContext.guid !== "string") {
      appContext.guid = fillers?.guid;
    }
    if (typeof appContext.meta === "undefined") {
      appContext.meta = fillers?.meta;
    }
    appContextHash = generateUrlEncodedBase64Hash(appContext);
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
