/**
 * @see: https://github.com/auth0/node-jsonwebtoken
 * @see: https://jwt.io/
 */
import * as jwt from "jsonwebtoken";

import { AccessDeniedException, ValidationError } from "../../utils/exceptions";
import { createSecretHash, generateBase64Hash, resolveBase64Hash } from "../../utils/hashes";
import { JWKS, verifyIdToken } from "../../utils/JWK-Utils";
import { debug } from "../../utils/logging";
import Runtime from "../../utils/Runtime";
import Settings from "../../utils/Settings";
import { transformExpiresInToExpiresAt_ISOString } from "../../utils/transformers";
import { ParsedAppContext } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";

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
async function signAsLoggedIn(parsedAppContext: ParsedAppContext, nameID: string, nonce: string): Promise<{ idToken: string; expiresAt: string }> {
  const expiresIn = 60 * 60; // 1 hour
  return {
    idToken: jwt.sign({ appContextHash: parsedAppContext.hash, nameID: nameID, nonce: nonce }, await Settings.getStageSecret("SUOMIFI_JWT_PRIVATE_KEY"), {
      algorithm: "RS256",
      expiresIn: expiresIn,
      issuer: Runtime.getAppUrl(),
      keyid: `vfd:authgw:${Settings.getStage()}:suomifi:jwt`,
    }),
    expiresAt: transformExpiresInToExpiresAt_ISOString(expiresIn),
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
 * @param nameID - The user's unique identifier
 * @returns
 */
export async function createSignedInTokens(
  RelayState: string,
  nameID: string
): Promise<{ parsedAppContext: ParsedAppContext; accessToken: string; idToken: string; expiresAt: string }> {
  const { appContextHash, nonce } = JSON.parse(resolveBase64Hash(RelayState));
  const parsedAppContext = parseAppContext(appContextHash);
  const parsedNonce = await generateNonce(parsedAppContext);
  if (parsedNonce !== nonce) {
    throw new AccessDeniedException("Invalid sign-in context secret");
  }

  // Sign the authentication for later authorization checks
  const { idToken, expiresAt } = await signAsLoggedIn(parsedAppContext, nameID, nonce);
  const accessToken = String(parsedAppContext.object.guid); // access to the userInfo endpoint is granted with the guid

  return {
    parsedAppContext: parsedAppContext,
    accessToken: accessToken,
    idToken: idToken,
    expiresAt: expiresAt,
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
 * @param idToken
 * @param context - which app source is requesting access
 */
export default async function authorize(idToken: string, context: string): Promise<void> {
  try {
    // Verify token
    const verified = await verifyIdToken(idToken, { issuer: Runtime.getAppUrl(), jwks: await getJKWSJsonConfiguration() });

    // Validate rest of the fields
    const parsedAppContext = parseAppContext(verified.appContextHash); // Throws
    const nonce = await generateNonce(parsedAppContext);
    if (nonce !== verified.nonce) {
      throw new AccessDeniedException("Invalid authorizing context secret");
    }
  } catch (error) {
    debug(error);
    throw new AccessDeniedException(String(error));
  }
}
