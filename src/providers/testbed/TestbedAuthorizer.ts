import { JwtPayload } from "jsonwebtoken";
import { AccessDeniedException } from "../../utils/exceptions";
import { verifyIdToken } from "../../utils/JWK-Utils";
import { debug } from "../../utils/logging";
import { AuthorizationHeaders, AuthorizerResponse } from "../../utils/types";
import TestbedConfig from "./Testbed.config";

/**
 *
 * @param provider
 * @returns
 */
export function isMatchingProvider(provider: string): boolean {
  return provider === TestbedConfig.ident || provider === "https://login.testbed.fi";
}

/**
 * @see: https://ioxio.com/guides/verify-id-token-in-a-data-source
 * @param authorizationHeaders
 */
export async function authorize(authorizationHeaders: AuthorizationHeaders): Promise<AuthorizerResponse> {
  const response: AuthorizerResponse = {
    authorization: null,
    consent: null,
  };

  try {
    // Verify token
    const verified = await verifyIdToken(authorizationHeaders.authorization, {
      issuer: "https://login.testbed.fi",
      openIdConfigUrl: "https://login.testbed.fi/.well-known/openid-configuration",
    });
    debug(verified);
    response.authorization = verified;
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }

  // Verify consent if requested
  if (authorizationHeaders.consentToken) {
    response.consent = await verifyConsent(authorizationHeaders.consentToken);
  }

  return response;
}

/**
 *
 * @param consentToken
 * @see: https://ioxio.com/guides/verify-consent-in-a-data-source
 */
export async function verifyConsent(consentToken: string): Promise<JwtPayload> {
  try {
    // Verify token
    const verified = await verifyIdToken(consentToken, { issuer: "https://consent.testbed.fi", jwksUri: "https://consent.testbed.fi/.well-known/jwks.json" });
    debug(verified);
    return verified;
  } catch (error) {
    debug(error);
    throw new AccessDeniedException("Unverified");
  }
}
