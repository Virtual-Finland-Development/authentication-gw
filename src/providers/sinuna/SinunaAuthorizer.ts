import * as jwt from "jsonwebtoken";

import { AccessDeniedException } from "../../utils/exceptions";
import { debug } from "../../utils/logging";
import { getPublicKey } from "../../utils/openId-JWKS";
import { leftTrim } from "../../utils/transformers";

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
    const publicKey = await getPublicKey(decodedToken, {
      issuer: "https://login.iam.qa.sinuna.fi",
      openIdConfigUrl: "https://login.iam.qa.sinuna.fi/oxauth/.well-known/openid-configuration",
    });
    const verified = jwt.verify(token, publicKey.pem, { ignoreExpiration: false });
    debug(verified);
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
