import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync } from "crypto";

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
export function encryptObject(data: any, secret: string, secretIV: string): string {
  if (typeof data !== "string") {
    data = JSON.stringify(data);
  }
  return encrypt(data, secret, secretIV);
}

/**
 *
 * @param data
 * @param key
 * @returns
 */
export function decryptObject(ecrypted_text: string, secret: string, secretIV: string): any {
  const decrypted = decrypt(ecrypted_text, secret, secretIV);
  return JSON.parse(decrypted);
}

/**
 *
 * @param text
 * @param secret
 * @returns
 */
export function encrypt(text: string, secret: string, secretIV: string): string {
  const encIv = createHash("sha512").update(secretIV).digest("hex").substring(0, 16);
  const salt = randomBytes(16).toString("base64");
  const key = scryptSync(secret, salt, 32);

  const cipher = createCipheriv("aes-256-cbc", Buffer.from(key), encIv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return generateUrlEncodedBase64Hash({ content: encrypted.toString("hex"), salt: salt });
}

/**
 *
 * @param ecrypted_text
 * @param secret
 * @returns
 */
export function decrypt(ecrypted_text: string, secret: string, secretIV: string): any {
  const parsedData = resolveUrlEncodedBase64HashJSON(ecrypted_text);
  const encIv = createHash("sha512").update(secretIV).digest("hex").substring(0, 16);
  const salt = parsedData.salt;
  const key = scryptSync(secret, salt, 32);

  const encryptedText = Buffer.from(parsedData.content, "hex");
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(key), encIv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
