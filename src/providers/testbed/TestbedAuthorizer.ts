import axios from "axios";
import * as jwt from "jsonwebtoken";
import jwktopem from "jwk-to-pem";

import { AccessDeniedException } from "../../utils/exceptions";
import { debug } from "../../utils/logging";
import { leftTrim } from "../../utils/transformers";

const cacheService = {
  store: new Map<string, any>(),
  async get(key: string) {
    return this.store.get(key);
  },
  async set(key: string, value: any) {
    this.store.set(key, value);
  },
};

/**
 *
 * @param decodedToken
 * @returns
 */
async function getPublicKey(decodedToken: jwt.Jwt | null): Promise<{ pem: string; key: jwktopem.JWK }> {
  const keyId = decodedToken?.header.kid;
  const payload = decodedToken?.payload;

  // Verify input token
  if (typeof keyId !== "string" || typeof payload !== "object" || payload === null) {
    throw new Error("Bad request");
  }

  // Verify issuer pre-fetching the public key
  const { iss } = payload;
  if (iss !== "https://login.testbed.fi") {
    throw new Error("Invalid issuer");
  }

  const key = await getJwksKey(keyId);
  return { pem: jwktopem(key), key: key };
}

async function getJwksKey(keyId: string): Promise<jwktopem.JWK> {
  let key = await cacheService.get("jwks-key");
  if (!key) {
    debug("Fetching JWKS key..");
    const verifyConfig = await axios.get("https://login.testbed.fi/.well-known/openid-configuration");
    const jwksUri = verifyConfig.data.jwks_uri;
    const jwks = await axios.get(jwksUri);
    key = jwks.data.keys.find((key: any) => key.kid === keyId);
    await cacheService.set("jwks-key", key);
  }

  if (!key) {
    throw new Error("Public key not found in jwks.json");
  }
  return key;
}

/**
 *
 * @param idToken
 * @param context - which app source is requesting access
 * @see: https://ioxio.com/guides/verify-id-token-in-a-data-source
 */
export default async function authorize(idToken: string, context: string): Promise<void> {
  try {
    // Decode token
    const token = leftTrim(idToken, "Bearer ");
    const decodedToken = jwt.decode(token, { complete: true });

    // Validate token
    const publicKey = await getPublicKey(decodedToken);
    const verified = jwt.verify(token, publicKey.pem, { ignoreExpiration: false });
    debug(verified);
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
