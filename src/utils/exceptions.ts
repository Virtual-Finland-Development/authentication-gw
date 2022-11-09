import { exceptionToObject } from "./transformers";

/**
 *
 * @param message
 * @returns
 */
function parseErrorMessage(message: any): string {
  if (message instanceof Error) {
    return exceptionToObject(message).message;
  }
  return String(message);
}

/**
 * Helps with logging syntax
 */
class BaseError extends Error {
  constructor(...args: any) {
    if (args.length >= 1 && typeof args[0] !== "string") {
      args[0] = parseErrorMessage(args[0]);
    }
    super(...args);
  }
}

export class ValidationError extends BaseError {}
export class AccessDeniedException extends BaseError {}
export class NoticeException extends BaseError {}
