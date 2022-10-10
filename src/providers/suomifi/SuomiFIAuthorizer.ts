/**
 * @see: https://github.com/auth0/node-jsonwebtoken
 * @see: https://jwt.io/
 */
import * as jwt from "jsonwebtoken";

import { AccessDeniedException, ValidationError } from "../../utils/exceptions";
import { createSecretHash, generateBase64Hash, resolveBase64Hash } from "../../utils/hashes";
import { debug } from "../../utils/logging";
import Settings from "../../utils/Settings";
import { leftTrim, transformExpiresInToExpiresAt_ISOString } from "../../utils/transformers";
import { ParsedAppContext } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import SuomiFIConfig from "./SuomiFI.config";

async function generateSecretGuid(guid: string | undefined): Promise<string> {
  if (!guid) {
    throw new ValidationError("Missing guid");
  }
  return createSecretHash(guid, await Settings.getSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"));
}

/**
 * Signs the app context
 *
 * @param parsedAppContext
 * @param secretGuid
 * @returns
 */
async function signAppContext(parsedAppContext: ParsedAppContext, secretGuid: string): Promise<{ idToken: string; expiresAt: string }> {
  const expiresIn = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  return {
    idToken: jwt.sign({ appContextHash: parsedAppContext.hash, secretGuid: secretGuid }, await Settings.getSecret("SUOMIFI_JWT_SECRET"), {
      algorithm: "HS256",
      expiresIn: expiresIn,
    }),
    expiresAt: transformExpiresInToExpiresAt_ISOString(expiresIn),
  };
}

/**
 * Creates a relay state hash with a JWT token for the given user
 *
 * @param appContextHash
 * @returns RelayState
 */
export async function generateSaml2RelayState(parsedAppContext: ParsedAppContext): Promise<string> {
  const secretGuid = await generateSecretGuid(parsedAppContext.object.guid);
  return generateBase64Hash({
    appContextHash: parsedAppContext.hash,
    secretGuid: secretGuid,
  });
}

/**
 * Parses the relay state hash and returns the app context hash and the access token
 *
 * @param RelayState
 * @returns
 */
export async function parseSaml2RelayState(RelayState: string): Promise<{ parsedAppContext: ParsedAppContext; accessToken: string; idToken: string; expiresAt: string }> {
  const { appContextHash, secretGuid } = JSON.parse(resolveBase64Hash(RelayState));
  const parsedAppContext = parseAppContext(appContextHash);
  const parsedSecretGuid = await generateSecretGuid(parsedAppContext.object.guid);
  if (parsedSecretGuid !== secretGuid) {
    throw new AccessDeniedException("Invalid secret guid");
  }

  // Sign the authentication for later authorization checks
  const { idToken, expiresAt } = await signAppContext(parsedAppContext, secretGuid);
  const accessToken = String(parsedAppContext.object.guid); // access to the userInfo endpoint is granted with the guid

  return {
    parsedAppContext: parsedAppContext,
    accessToken: accessToken,
    idToken: idToken,
    expiresAt: expiresAt,
  };
}

/**
 * @param idToken
 * @param context - which app source is requesting access
 */
export default async function authorize(idToken: string, context: string): Promise<void> {
  try {
    const token = leftTrim(idToken, "Bearer ");
    if (!token) {
      throw new Error("No token");
    }

    const decoded = jwt.verify(token, await Settings.getSecret("SUOMIFI_JWT_SECRET"), { ignoreExpiration: false }) as jwt.JwtPayload;
    debug(decoded);

    // Validate rest of the fields
    const parsedAppContext = parseAppContext(decoded.appContextHash, SuomiFIConfig.ident); // Throws
    const secretGuid = await generateSecretGuid(parsedAppContext.object.guid);
    if (secretGuid !== decoded.secretGuid) {
      throw new Error("Invalid secret guid");
    }
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
