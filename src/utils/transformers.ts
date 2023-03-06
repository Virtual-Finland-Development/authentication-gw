import { AxiosError } from "axios";
import { resolveBase64Hash } from "./hashes";

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
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));
}

/**
 *
 * @param obj
 * @returns
 */
export function omitEmptyObjectKeys(obj: any): any {
  return omitObjectKeys(
    obj,
    Object.keys(obj).filter((key) => typeof obj[key] !== "boolean" && !obj[key])
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
    message = error.message || `Exception: ${error.name}`;
    stack = error.stack;
    if (error instanceof AxiosError) {
      message = `External API: ${message}`;
      if (error.response?.data?.detail) {
        message = `${message} - ${error.response.data.detail}`;
      }
      //console.log(error);
    }
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
  
  message = typeof message === "string" ? message : "Unknown error message";

  return {
    name: name,
    message: message,
    stack: stack,
    statusCode: statusCode,
  };
}

/**
 *
 * @param value
 * @returns
 */
export function ensureObject(value: any): any {
  if (isObject(value)) {
    return value;
  }
  return {};
}

/**
 *
 * @param value
 * @returns
 */
export function ensureArray(value: any): any[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

/**
 *
 * @param url
 * @param param
 * @param value
 * @returns
 */
export function ensureUrlQueryParam(url: string, key: string, value: string): string {
  const urlObj = new URL(url);
  urlObj.searchParams.set(key, value);
  return urlObj.toString();
}

/**
 *
 * @param url
 * @param params
 * @returns
 */
export function ensureUrlQueryParams(url: string, params: Array<{ key: string; value: string }>): string {
  for (const group of params) {
    url = ensureUrlQueryParam(url, group.key, group.value);
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

/**
 *
 * @param str
 * @param trim
 * @returns
 */
export function leftTrim(str: string, trim: string): string {
  return str.replace(new RegExp(`^${trim}`), "");
}

/**
 *
 * @param expiresIn
 * @returns Date.toIsoString
 */
export function transformExpiresInToExpiresAt_ISOString(expiresIn: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  return new Date(expiresAt * 1000).toISOString();
}

/**
 *
 * @param obj
 * @param keys
 * @returns
 */
export function omitObjectKeysOtherThan(obj: any, keys: string[]): any {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)));
}
