import * as jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";
import { AccessDeniedException } from "../../utils/exceptions";
import { decodeIdToken, verifyIdToken } from "../../utils/JWK-Utils";
import { debug } from "../../utils/logging";
import Settings from "../../utils/Settings";
import { ifString } from "../../utils/transformers";
import { AuthorizationHeaders, AuthorizerResponse } from "../../utils/types";
import { verifyConsent as verifyConsentFromService } from "./service/ConsentRequests";
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
    message: "Access denied",
    authorization: null,
  };

  try {
    // Verify token
    const verified = await verifyIdToken(authorizationHeaders.authorization, {
      issuer: "https://login.testbed.fi",
      openIdConfigUrl: "https://login.testbed.fi/.well-known/openid-configuration",
    });
    debug(verified);

    response.message = "Access granted";
    response.authorization = {
      userId: verified.sub,
      email: verified.email,
      issuer: verified.iss,
      expiresAt: verified.exp,
      issuedAt: verified.iat,
    };
    
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }

  // Verify consent if requested
  if (authorizationHeaders.consentToken) {
    const verifiedConsent = await verifyConsent(authorizationHeaders.consentToken, {
      idToken: authorizationHeaders.authorization,
      dataSource: authorizationHeaders.consentDataSource,
      consentUserId: authorizationHeaders.consentUserId,
    });
    
    response.consent = {
      dataSource: authorizationHeaders.consentDataSource,
      userId: verifiedConsent.sub,
      email: verifiedConsent.email,
      issuer: verifiedConsent.iss,
      expiresAt: verifiedConsent.exp,
      issuedAt: verifiedConsent.iat,
    };
  }

  return response;
}

/**
 *
 * @param consentToken
 * @see: https://ioxio.com/guides/verify-consent-in-a-data-source
 */
export async function verifyConsent(consentToken: string, comparePackage?: { idToken?: string, dataSource?: string, consentUserId?: string}): Promise<JwtPayload> {
  try {
    // Verify token
    const verified = await verifyIdToken(consentToken, { issuer: "https://consent.testbed.fi", jwksUri: "https://consent.testbed.fi/.well-known/jwks.json" });
    debug(verified);

    // Verify consent
    if (ifString(comparePackage?.dataSource)) {
      if (verified.dsi !== comparePackage?.dataSource) {
        throw new AccessDeniedException("Invalid dsi");
      }
    }

    if (ifString(comparePackage?.idToken)) {
      const { decodedToken } = decodeIdToken(comparePackage?.idToken as string);
      if (decodedToken === null || typeof decodedToken.payload !== "object") {
        console.log(comparePackage?.idToken, decodedToken);
        throw new Error("Invalid idToken");
      }
      if (verified.acr !== decodedToken.payload.acr) {
        throw new AccessDeniedException("Token mismatch: acr");
      }
      if (verified.appiss !== decodedToken.payload.iss) {
        throw new AccessDeniedException("Token mismatch: appiss");
      }
      if (verified.app !== decodedToken.payload.aud) {
        throw new AccessDeniedException("Token mismatch: app");
      }
      if (verified.v !== "0.2") {
        throw new AccessDeniedException("Token mismatch: v");
      }
      if (verified.subiss !== decodedToken.payload.iss) {
        throw new AccessDeniedException("Token mismatch: subiss");
      }

      // User verification
      if (verified.sub !== decodedToken.payload.sub) {
        throw new AccessDeniedException("Token mismatch: sub");
      }
      if (ifString(comparePackage?.consentUserId)) {
        if (verified.sub !== comparePackage?.consentUserId) {
          throw new AccessDeniedException("Input mismatch: sub");
        }
      }
      // @TODO: Verify user identity against the users-api service
    }

    if (typeof comparePackage?.dataSource === "string" && typeof comparePackage?.idToken === "string") {
      const verified = await verifyConsentFromService(comparePackage?.idToken, consentToken, comparePackage?.idToken);
      if (!verified) {
        throw new AccessDeniedException("Consent unverified by the authentication provider service");
      }
    }

    return verified;
  } catch (error) {
    if (error instanceof AccessDeniedException) {
      throw error;
    }
    
    debug(error);
    throw new AccessDeniedException("Consent unverified");
  }
}

/**
 * 
 * @param idToken 
 * @returns 
 */
export async function createConsentRequestToken(idToken: string): Promise<string> {
  const { decodedToken } = decodeIdToken(idToken);

  if (decodedToken === null || typeof decodedToken.payload !== "object") {
    throw new Error("Invalid idToken");
  }

  const expiresIn = 60 * 60; // 1 hour
  const keyId = `vfd:authgw:${Settings.getStage()}:testbed:jwt`;
  const keyIssuer = "https://virtual-finland-development-auth-files.s3.eu-north-1.amazonaws.com";
  
  const payload = {
    sub: decodedToken.payload.sub,
    subiss: decodedToken.payload.subiss || "https://login.testbed.fi",
    acr: decodedToken.payload.acr,
    app: await Settings.getSecret("TESTBED_CLIENT_ID"),
    appiss: "https://login.testbed.fi",
    aud: "https://consent.testbed.fi",
  };
  
  const customHeader = {
    kid: keyId,
    alg: "RS256",
    typ: "JWT",
    v: "0.2",
  };

  const key = await Settings.getStageSecret("TESTBED_CONSENT_JWKS_PRIVATE_KEY");
  
  return jwt.sign(payload, key, {
    header: customHeader,
    algorithm: "RS256",
    expiresIn: expiresIn,
    issuer: keyIssuer,
    keyid: keyId,
  })
}