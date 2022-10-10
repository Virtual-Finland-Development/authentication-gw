import axios from "axios";
import * as jwt from "jsonwebtoken";
import jwktopem from "jwk-to-pem";
import { debug } from "./logging";

type IssuerConfig = { issuer: string; openIdConfigUrl?: string; jwksUri?: string };

/**
 * Fetch the public key from the JWKS endpoint
 *
 * @param decodedToken
 * @param issuerConfig - iss, .well-known/openid-configuration url(s)
 * @returns
 */
export async function getPublicKey(decodedToken: jwt.Jwt | null, issuerConfig: IssuerConfig): Promise<{ pem: string; key: jwktopem.JWK }> {
  const keyId = decodedToken?.header.kid;
  const payload = decodedToken?.payload;

  // Verify input token
  if (typeof keyId !== "string" || typeof payload !== "object" || payload === null) {
    throw new Error("Bad request");
  }

  // Verify issuer before fetching the public key
  const { iss } = payload;
  if (iss !== issuerConfig.issuer) {
    throw new Error("Invalid issuer");
  }

  const key = await getJwksKey(keyId, issuerConfig);
  return { pem: jwktopem(key), key: key };
}

/**
 * Resolve the JWKS endpoint and fetch the public key
 *
 * @param keyId
 * @returns
 */
async function getJwksKey(keyId: string, issuerConfig: IssuerConfig): Promise<jwktopem.JWK> {
  const cacheKey = `jwks-key::${keyId}`;
  let key = await cacheService.get(cacheKey);
  if (!key) {
    debug("Fetching JWKS key..");

    let jwksUri = issuerConfig.jwksUri;
    if (typeof jwksUri !== "string") {
      if (typeof issuerConfig.openIdConfigUrl !== "string") {
        throw new Error("Missing JWKS URI");
      }

      const verifyConfig = await axios.get(issuerConfig.openIdConfigUrl);
      jwksUri = String(verifyConfig.data.jwks_uri);
    }

    const jwks = await axios.get(jwksUri);
    key = jwks.data.keys.find((key: any) => key.kid === keyId);
    await cacheService.set(cacheKey, key);
  }

  if (!key) {
    throw new Error("Public key not found in jwks endpoint");
  }
  return key;
}

/**
 * Simple in-memory cache service snub
 */
const cacheService = {
  store: new Map<string, any>(),
  async get(key: string) {
    return this.store.get(key);
  },
  async set(key: string, value: any) {
    this.store.set(key, value);
  },
};
