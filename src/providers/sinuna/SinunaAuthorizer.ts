import { AccessDeniedException } from "../../utils/exceptions";
import { verifyIdToken } from "../../utils/JWK-Utils";
import { debug } from "../../utils/logging";
import { AuthorizationHeaders, AuthorizerResponse } from "../../utils/types";
import SinunaConfig from "./Sinuna.config";

export function isMatchingProvider(provider: string): boolean {
  return provider === SinunaConfig.ident || provider === "https://login.iam.qa.sinuna.fi";
}

/**
 *
 * @param authorizationHeaders
 */
export async function authorize(authorizationHeaders: AuthorizationHeaders): Promise<AuthorizerResponse> {
  try {
    // Verify token
    const verified = await verifyIdToken(authorizationHeaders.authorization, {
      issuer: "https://login.iam.qa.sinuna.fi",
      openIdConfigUrl: "https://login.iam.qa.sinuna.fi/oxauth/.well-known/openid-configuration",
    });
    debug(verified);

    return {
      authorization: verified,
      consent: null,
    };
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
