import axios from "axios";
import { debug } from "console";
import * as jwt from "jsonwebtoken";
import jwktopem from "jwk-to-pem";
import { AccessDeniedException } from "../../utils/exceptions";
import { leftTrim } from "../../utils/transformers";

/**
 * @see: https://ioxio.com/guides/verify-id-token-in-a-data-source
 * @returns
 */
async function getPublicKey(decodedToken: jwt.Jwt | null): Promise<{ pem: string; key: { kid: string; kty: string; use: string; alg: string; n: string; e: string } }> {
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

  const verifyConfig = await axios.get("https://login.testbed.fi/.well-known/openid-configuration");
  const jwksUri = verifyConfig.data.jwks_uri;
  const jwks = await axios.get(jwksUri);
  const key = jwks.data.keys.find((key: any) => key.kid === keyId);
  return { pem: jwktopem(key), key: key };
}

/**
 *
 * @param idToken
 * @param context - which app source is requesting access
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
