import { AccessDeniedException } from "../../utils/exceptions";
import { verifyIdToken } from "../../utils/JWK-Utils";
import { debug } from "../../utils/logging";

/**
 *
 * @param idToken
 * @param context - which app source is requesting access
 * @see: https://ioxio.com/guides/verify-id-token-in-a-data-source
 */
export default async function authorize(idToken: string, context?: string): Promise<void> {
  try {
    // Verify token
    const verified = await verifyIdToken(idToken, { issuer: "https://login.testbed.fi", openIdConfigUrl: "https://login.testbed.fi/.well-known/openid-configuration" });
    debug(verified);
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}

/**
 *
 * @param consentToken
 * @see: https://ioxio.com/guides/verify-consent-in-a-data-source
 */
export async function verifyConsent(consentToken: string): Promise<void> {
  try {
    // Verify token
    const verified = await verifyIdToken(consentToken, { issuer: "https://consent.testbed.fi", jwksUri: "https://consent.testbed.fi/.well-known/jwks.json" });
    debug(verified);
  } catch (error) {
    console.log(error);
    throw new AccessDeniedException("Unverified");
  }
}
