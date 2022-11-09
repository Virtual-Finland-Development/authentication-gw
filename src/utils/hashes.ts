import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from "crypto";

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
export function encryptObject(data: any, secret: string): string {
  if (typeof data !== "string") {
    data = JSON.stringify(data);
  }
  return encrypt(data, secret);
}

/**
 *
 * @param data
 * @param key
 * @returns
 */
export function decryptObject(ecrypted_text: string, secret: string): any {
  const decrypted = decrypt(ecrypted_text, secret);
  return JSON.parse(decrypted);
}

/**
 *
 * @param data
 * @param key
 * @returns
 */
export function encrypt(text: string, secret: string): string {
  const iv = randomBytes(16);
  const key = scryptSync(secret, "salt", 32);

  let cipher = createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return generateUrlEncodedBase64Hash({ iv: iv.toString("hex"), content: encrypted.toString("hex") });
}

/**
 *
 * @param data
 * @param key
 * @returns
 */
export function decrypt(ecrypted_text: string, secret: string): any {
  const parsedData = resolveUrlEncodedBase64HashJSON(ecrypted_text);
  const key = scryptSync(secret, "salt", 32);

  let iv = Buffer.from(parsedData.iv, "hex");
  let encryptedText = Buffer.from(parsedData.content, "hex");
  let decipher = createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
