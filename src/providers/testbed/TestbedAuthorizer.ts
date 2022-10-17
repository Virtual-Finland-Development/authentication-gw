import { AccessDeniedException } from "../../utils/exceptions";
import { debug } from "../../utils/logging";
import { verifyIdToken } from "../../utils/openId-JWKS";

/**
 *
 * @param idToken
 * @param context - which app source is requesting access
 * @see: https://ioxio.com/guides/verify-id-token-in-a-data-source
 */
export default async function authorize(idToken: string, context: string): Promise<void> {
  try {
    // Verify token
    const verified = await verifyIdToken(idToken, { issuer: "https://login.testbed.fi", openIdConfigUrl: "https://login.testbed.fi/.well-known/openid-configuration" });
    debug(verified);
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
