import { createHmac } from "crypto";

/**
 * sha256 encryption helper
 *
 * @param data
 * @param key
 * @returns
 */
export function createSecretHash(data: any, key: string): string {
  if (typeof data !== "string") {
    data = JSON.stringify(data);
  }
  return createHmac("sha256", key).update(data).digest("hex");
}

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
 * @param objJsonStr
 * @returns
 */
export function generateUrlEncodedBase64Hash(objJsonStr: string | any): string {
  return encodeURIComponent(generateBase64Hash(objJsonStr));
}

/**
 *
 * @param hash
 * @returns
 */
export function resolveUrlEncodedBase64Hash(hash: string): string {
  return resolveBase64Hash(decodeURIComponent(hash));
}

/**
 *
 * @param hash
 * @returns
 */
export function resolveUrlEncodedBase64HashJSON(hash: string): any {
  return JSON.parse(resolveUrlEncodedBase64Hash(hash));
}

/**
 *
 * @param key
 * @returns
 */
export function cleanPublicKeyForJWT(key: string): string {
  return key.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replace(/\s/g, "");
}
