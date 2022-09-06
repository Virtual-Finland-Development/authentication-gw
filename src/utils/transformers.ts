/**
 * Generates a base64-hash string
 *
 * @param objJsonStr
 * @returns
 */
export function generateBase64Hash(objJsonStr: string | any): string {
  if (typeof objJsonStr !== "string") {
    objJsonStr = JSON.stringify(objJsonStr);
  }
  return Buffer.from(objJsonStr).toString("base64");
}

/**
 * Resolves a base64-hash string
 *
 * @param hash
 * @returns
 */
export function resolveBase64Hash(hash: string): string {
  const buffer = Buffer.from(hash, "base64");
  return buffer.toString("utf8");
}

/**
 *
 * @param obj
 * @returns
 */
export function isObject(value: any): boolean {
  return value !== null && typeof value === "object";
}

/**
 *
 * @param obj
 * @param keys
 * @returns
 */
export function omitObjectKeys(obj: any, keys: string[]): any {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));
}

/**
 *
 * @param obj
 * @param keys
 * @returns
 */
export function ifAllObjectKeysAreDefined(obj: any, keys: string[]): boolean {
  if (isObject(obj)) {
    return keys.every((key) => typeof obj[key] !== "undefined");
  }
  return false;
}

/**
 *
 * @param error
 */
export function exceptionToObject(error: any): { message: string; name?: string; stack?: any; statusCode?: number } {
  let name;
  let stack;
  let message;
  let statusCode;

  if (error instanceof Error) {
    name = error.name;
    message = error.message;
    stack = error.stack;
  } else {
    if (isObject(error) && typeof error.message === "string") {
      message = error.message;
      if (typeof error.statusCode !== "undefined") {
        statusCode = error.statusCode;
      }
    } else {
      message = typeof error === "string" ? error : "Unknown error";
    }
  }

  return {
    name: name,
    message: message,
    stack: stack,
    statusCode: statusCode,
  };
}
