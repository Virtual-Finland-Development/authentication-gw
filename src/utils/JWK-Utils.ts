// @see: https://github.com/auth0/node-jsonwebtoken

import axios from "axios";
import * as jwt from "jsonwebtoken";
import { decode as jwtDecode } from 'jsonwebtoken'; // @see: https://github.com/auth0/node-jsonwebtoken/issues/875#issuecomment-1375779641

import jwktopem from "jwk-to-pem";
import { Context } from "openapi-backend";
import CacheService from "./CacheService";
import { ValidationError } from "./exceptions";
import { debug } from "./logging";
import { leftTrim } from "./transformers";

/* ---------------Types------------------- */

type IssuerConfig = { issuer: string; openIdConfigUrl?: string; jwksUri?: string; jwks?: JWKS };

export type JWKS = {
  keys: JWK[];
};

type JWK = {
  alg: string;
  kty: string;
  use: string;
  n: string;
  e: string;
  kid: string;
  x5t?: string;
  x5c?: string[];
};

/* ---------------Public------------------- */

/**
 *
 * @param idToken
 * @returns
 */
export function decodeIdToken(idToken: string | null): { decodedToken: jwt.Jwt | null; token: string } {
  // Decode token
  if (!idToken) {
    throw new Error("Missing ID Token");
  }

  const token = parseAuthorizationHeaderValue(idToken);
  const decodedToken = jwtDecode(token, { complete: true });
  return {
    decodedToken: decodedToken,
    token: token,
  };
}

/**
 *
 * @param idToken
 * @param issuerConfig
 * @returns
 */
export async function verifyIdToken(idToken: string | null, issuerConfig: IssuerConfig): Promise<jwt.JwtPayload> {
  // Decode token
  const tokenResult = decodeIdToken(idToken);

  // Validate token
  const publicKey = await getPublicKey(tokenResult.decodedToken, issuerConfig);
  const verified = jwt.verify(tokenResult.token, publicKey.pem, { ignoreExpiration: false });
  return verified as jwt.JwtPayload;
}

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
    throw new ValidationError("Bad request");
  }

  // Verify issuer before fetching the public key
  const { iss } = payload;
  if (iss !== issuerConfig.issuer) {
    throw new ValidationError("Invalid issuer");
  }

  const key = await getJwksKey(keyId, issuerConfig);
  debug("Found public key");
  return { pem: jwktopem(key), key: key };
}

/**
 *
 * @param context
 * @returns
 */
export function parseAuthorizationFromContext(context: Context): string {
  return parseAuthorizationHeaderValue(String(context.request.headers.authorization));
}

/**
 *
 * @param authorization
 * @returns
 */
export function parseAuthorizationHeaderValue(authorization: string): string {
  return leftTrim(authorization, "Bearer ");
}

/* ---------------Private------------------- */

/**
 * Resolve the JWKS endpoint and fetch the public key
 *
 * @param keyId
 * @returns
 */
async function getJwksKey(keyId: string, issuerConfig: IssuerConfig): Promise<jwktopem.JWK> {
  const cacheKey = `jwks-key::${keyId}`;
  const ttlMs = 4 * 60 * 1000; // 4 hours
  let key = await CacheService.fetch(cacheKey);
  if (!key) {
    debug("Fetching JWKS key..");
    const jwks = await getJwks(issuerConfig);
    key = jwks.keys.find((key: jwt.JwtHeader) => key.kid === keyId);
    if (key) {
      await CacheService.save(cacheKey, key, ttlMs);
    }
  }

  if (!key) {
    throw new ValidationError("Public key not found in jwks endpoint");
  }
  return key;
}

/**
 * Gets / resolves the JWKS data
 *
 * @param issuerConfig
 * @returns
 */
async function getJwks(issuerConfig: IssuerConfig): Promise<JWKS> {
  if (issuerConfig.jwks?.keys instanceof Array) {
    return issuerConfig.jwks;
  }

  let jwksUri = issuerConfig.jwksUri;
  if (typeof jwksUri !== "string") {
    if (typeof issuerConfig.openIdConfigUrl !== "string") {
      throw new Error("Missing JWKS URI");
    }

    const verifyConfig = await axios.get(issuerConfig.openIdConfigUrl);
    jwksUri = String(verifyConfig.data.jwks_uri);
  }

  if (typeof jwksUri !== "string") {
    throw new Error("Missing JWKS Resource");
  }
  return (await axios.get(jwksUri)).data;
}
