import { AccessDeniedException } from "../../utils/exceptions";
import { verifyIdToken } from "../../utils/JWK-Utils";
import { debug } from "../../utils/logging";
import SinunaConfig from "./Sinuna.config";

export function isMatchingProvider(provider: string): boolean {
  return provider === SinunaConfig.ident || provider === "https://login.iam.qa.sinuna.fi";
}

/**
 *
 * @param idToken
 * @param context - which app source is requesting access
 */
export async function authorize(idToken: string, context: string): Promise<void> {
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
