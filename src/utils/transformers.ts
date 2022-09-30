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

export function ifObjectEmpty(obj: any): boolean {
  return !isObject(obj) || Object.keys(obj).length === 0;
}

/**
 *
 * @param obj
 * @param keys
 * @returns
 */
export function omitObjectKeys(obj: any, keys: string[]): any {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  );
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
export function exceptionToObject(error: any): {
  message: string;
  name?: string;
  stack?: any;
  statusCode?: number;
} {
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

/**
 *
 * @param url
 * @param param
 * @param value
 * @returns
 */
export function ensureUrlQueryParam(
  url: string,
  param: string,
  value: string
): string {
  const urlObj = new URL(url);
  urlObj.searchParams.set(param, value);
  return urlObj.toString();
}

/**
 *
 * @param url
 * @param params
 * @returns
 */
export function ensureUrlQueryParams(
  url: string,
  params: Array<{ param: string; value: string }>
): string {
  for (const group of params) {
    url = ensureUrlQueryParam(url, group.param, group.value);
  }
  return url;
}

/**
 *
 * @param url
 * @returns
 */
export function ifValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 *
 * @param text
 * @param minLength
 * @returns
 */
export function ifString(text: any, minLength = 1): boolean {
  return typeof text === "string" && text.length >= minLength;
}

/**
 *
 * @param body
 * @returns
 */
export function parseBase64XMLBody(body: string): { [attr: string]: any } {
  const uriComponent = resolveBase64Hash(body);
  const decoded = new URLSearchParams(uriComponent);
  return Object.fromEntries(decoded);
}

/**
 * Trims slashes from the beginning and end of a string
 *
 * @param str /url/path/
 * @returns url/path
 */
export function slashTrim(str: string): string {
  return str.replace(/^\/+|\/+$/g, "");
}
