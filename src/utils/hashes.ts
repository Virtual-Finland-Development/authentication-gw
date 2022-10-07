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
