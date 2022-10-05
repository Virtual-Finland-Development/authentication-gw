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
async function getPublicKey(keyId: string): Promise<string> {
  const verifyConfig = await axios.get("https://login.testbed.fi/.well-known/openid-configuration");
  const jwksUri = verifyConfig.data.jwks_uri;
  const jwks = await axios.get(jwksUri);
  return jwktopem(jwks.data.keys.find((key: any) => key.kid === keyId));
}

/**
 *
 * @param idToken
 * @param context - which app source is requesting access
 */
export default async function authorize(idToken: string, context: string): Promise<void> {
  try {
    const token = leftTrim(idToken, "Bearer ");
    // Validate token
    const decoded = jwt.decode(token, { complete: true });
    const keyId = decoded?.header.kid;
    if (!keyId) {
      throw new Error("No key id found");
    }
    const publicKey = await getPublicKey(keyId);
    const verified = jwt.verify(token, publicKey);
    debug(verified);
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
