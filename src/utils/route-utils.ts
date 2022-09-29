import { AccessDeniedException, ValidationError } from "../utils/exceptions";
import { log } from "../utils/logging";
import { ensureUrlQueryParams, exceptionToObject } from "../utils/transformers";
import { jsonResponseHeaders } from "./default-headers";

/**
 *
 * @param redirectUrl
 * @param providerIdent
 * @returns
 */
export function prepareLogoutRedirectUrl(redirectUrl: string, providerIdent: string): string {
  return ensureUrlQueryParams(redirectUrl, [
    { param: "logout", value: "success" },
    { param: "provider", value: providerIdent },
  ]);
}

/**
 *
 * @param error
 * @returns
 */
export function InternalServerErrorHandler(error: any) {
  const exception = exceptionToObject(error);
  log(exception);

  let statusCode = 500;
  if (exception.statusCode) {
    statusCode = exception.statusCode;
  } else if (error instanceof ValidationError) {
    statusCode = 422;
  } else if (error instanceof AccessDeniedException) {
    statusCode = 401;
  }

  return {
    statusCode: statusCode,
    body: JSON.stringify({ message: exception.message }),
    headers: jsonResponseHeaders,
  };
}
