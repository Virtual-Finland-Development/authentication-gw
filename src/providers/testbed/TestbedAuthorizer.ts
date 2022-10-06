import * as jwt from "jsonwebtoken";

import { AccessDeniedException } from "../../utils/exceptions";
import { debug } from "../../utils/logging";
import { getPublicKey } from "../../utils/openId-JWKS";
import { leftTrim } from "../../utils/transformers";

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
    const publicKey = await getPublicKey(decodedToken, { issuer: "https://login.testbed.fi", openIdConfigUrl: "https://login.testbed.fi/.well-known/openid-configuration" });
    const verified = jwt.verify(token, publicKey.pem, { ignoreExpiration: false });
    debug(verified);
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
