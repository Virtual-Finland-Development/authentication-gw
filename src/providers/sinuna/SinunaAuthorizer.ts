import { AccessDeniedException } from "../../utils/exceptions";
import { debug } from "../../utils/logging";
import { verifyIdToken } from "../../utils/openId-JWKS";

/**
 *
 * @param idToken
 * @param context - which app source is requesting access
 */
export default async function authorize(idToken: string, context: string): Promise<void> {
  try {
    // Verify token
    const verified = await verifyIdToken(idToken, {
      issuer: "https://login.iam.qa.sinuna.fi",
      openIdConfigUrl: "https://login.iam.qa.sinuna.fi/oxauth/.well-known/openid-configuration",
    });
    debug(verified);
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
