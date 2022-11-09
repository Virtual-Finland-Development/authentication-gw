import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const CRYPT_ALGORITHM = "aes-256-cbc";

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

/**
 *
 * @param data
 * @param key
 * @returns
 */
export function encrypt(data: any, key: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(CRYPT_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return generateUrlEncodedBase64Hash({
    iv: iv.toString("hex"),
    content: encrypted.toString("hex"),
  });
}

/**
 *
 * @param data
 * @param key
 * @returns
 */
export function decrypt(data: string, key: string): any {
  const { iv, content } = resolveUrlEncodedBase64HashJSON(data);
  const decipher = createDecipheriv(CRYPT_ALGORITHM, key, Buffer.from(iv, "hex"));
  const decrpyted = Buffer.concat([decipher.update(Buffer.from(content, "hex")), decipher.final()]);
  return decrpyted.toString();
}
