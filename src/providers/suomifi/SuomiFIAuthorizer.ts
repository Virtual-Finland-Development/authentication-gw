/**
 * @see: https://github.com/auth0/node-jsonwebtoken
 * @see: https://jwt.io/
 */
import * as jwt from "jsonwebtoken";

import { AccessDeniedException, ValidationError } from "../../utils/exceptions";
import { createSecretHash, generateBase64Hash, resolveBase64Hash } from "../../utils/hashes";
import { JWKS, verifyIdToken } from "../../utils/JWK-Utils";
import { debug } from "../../utils/logging";
import Settings from "../../utils/Settings";
import { transformExpiresInToExpiresAt_ISOString } from "../../utils/transformers";
import { AuthorizationHeaders, AuthorizerResponse, ParsedAppContext } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import { resolveSuomiFiUserIdFromProfileData } from "./service/SuomifiStateTools";
import { SuomiFiProfile } from "./service/SuomifiTypes";
import SuomiFIConfig from "./SuomiFI.config";

const SUOMIFI_ISSUER = "virtual-finland/authentication-gw/suomifi";

/**
 *
 * @param parsedAppContext
 * @returns
 */
async function generateNonce(parsedAppContext: ParsedAppContext): Promise<string> {
  if (!parsedAppContext.object.guid) {
    throw new ValidationError("Missing guid from app context");
  }
  return createSecretHash(parsedAppContext.object.guid, await Settings.getStageSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"));
}

/**
 * Signs the app context
 *
 * @param parsedAppContext
 * @param nameId
 * @param nonce
 * @returns
 */
async function signAsLoggedIn(parsedAppContext: ParsedAppContext, nonce: string, suomifiProfile: SuomiFiProfile): Promise<{ idToken: string; expiresAt: string; userId: string }> {
  const expiresIn = 60 * 60; // 1 hour
  const { nameID, nameIDFormat, issuer, sessionIndex } = suomifiProfile;
  const email = suomifiProfile.email || suomifiProfile.mail;
  const userId = await resolveSuomiFiUserIdFromProfileData(suomifiProfile);
  const suomifiKeyPayload = { appContextHash: parsedAppContext.hash, nonce: nonce, ...{ nameID, nameIDFormat, issuer, sessionIndex, userId, email } };

  return {
    idToken: jwt.sign(suomifiKeyPayload, await Settings.getStageSecret("SUOMIFI_JWT_PRIVATE_KEY"), {
      algorithm: "RS256",
      expiresIn: expiresIn,
      issuer: SUOMIFI_ISSUER,
      keyid: `vfd:authgw:${Settings.getStage()}:suomifi:jwt`,
    }),
    expiresAt: transformExpiresInToExpiresAt_ISOString(expiresIn),
    userId: userId,
  };
}

/**
 * Creates a relay state hash for the login initiation flow
 *
 * @param appContextHash
 * @returns RelayState
 */
export async function generateSaml2RelayState(parsedAppContext: ParsedAppContext): Promise<string> {
  const nonce = await generateNonce(parsedAppContext);
  return generateBase64Hash({
    appContextHash: parsedAppContext.hash,
    nonce: nonce,
  });
}

/**
 * Parses and validates the relay state hash, create logged in tokens
 *
 * @param RelayState
 * @param suomifiProfile
 * @returns
 */
export async function createSignedInTokens(
  RelayState: string,
  suomifiProfile: SuomiFiProfile
): Promise<{ parsedAppContext: ParsedAppContext; idToken: string; expiresAt: string; userId: string }> {
  const { appContextHash, nonce } = JSON.parse(resolveBase64Hash(RelayState));
  const parsedAppContext = parseAppContext(appContextHash);
  const parsedNonce = await generateNonce(parsedAppContext);
  if (parsedNonce !== nonce) {
    throw new AccessDeniedException("Invalid sign-in context secret");
  }

  // Sign the authentication for later authorization checks
  const { idToken, expiresAt, userId } = await signAsLoggedIn(parsedAppContext, nonce, suomifiProfile);

  return {
    parsedAppContext: parsedAppContext,
    idToken: idToken,
    expiresAt: expiresAt,
    userId: userId,
  };
}

/**
 *
 * @returns
 */
export async function getJKWSJsonConfiguration(): Promise<JWKS> {
  return {
    keys: [JSON.parse(await Settings.getStageSecret("SUOMIFI_JWK"))],
  };
}

/**
 *
 * @param provider
 * @returns
 */
export function isMatchingProvider(provider: string): boolean {
  return provider === SuomiFIConfig.ident || provider === SUOMIFI_ISSUER;
}

/**
 *
 * @param authorizationHeaders
 */
export async function authorize(authorizationHeaders: AuthorizationHeaders): Promise<AuthorizerResponse> {
  try {
    // Verify token
    const { payload } = await verifyIdToken(authorizationHeaders.authorization, { issuer: SUOMIFI_ISSUER, jwks: await getJKWSJsonConfiguration() });

    // Validate rest of the fields
    const parsedAppContext = parseAppContext(payload.appContextHash); // Throws
    const nonce = await generateNonce(parsedAppContext);
    if (nonce !== payload.nonce) {
      throw new AccessDeniedException("Invalid authorizing context secret");
    }

    return {
      message: "Access granted",
      authorization: {
        userId: payload.userId,
        email: payload.email,
        issuer: SUOMIFI_ISSUER,
        expiresAt: payload.exp,
        issuedAt: payload.iat,
      },
    };
  } catch (error) {
    debug(error);
    throw new AccessDeniedException(String(error));
  }
}
