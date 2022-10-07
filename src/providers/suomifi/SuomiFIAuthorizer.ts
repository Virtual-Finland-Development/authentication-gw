/**
 * @see: https://github.com/auth0/node-jsonwebtoken
 * @see: https://jwt.io/
 */
import * as jwt from "jsonwebtoken";

import { AccessDeniedException, ValidationError } from "../../utils/exceptions";
import { createSecretHash, generateBase64Hash, resolveBase64Hash } from "../../utils/hashes";
import { debug } from "../../utils/logging";
import Settings from "../../utils/Settings";
import { leftTrim } from "../../utils/transformers";
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
 * Creates a relay state hash with a JWT token for the given user
 *
 * @param appContextHash
 * @returns RelayState
 */
export async function generateSaml2RelayState(parsedAppContext: ParsedAppContext): Promise<string> {
  const secretGuid = await generateSecretGuid(parsedAppContext.object.guid);
  const expiresIn = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  return generateBase64Hash({
    appContextHash: parsedAppContext.hash,
    accessToken: parsedAppContext.object.guid,
    idToken: jwt.sign({ appContextHash: parsedAppContext.hash, secretGuid: secretGuid }, await Settings.getSecret("SUOMIFI_JWT_SECRET"), {
      algorithm: "HS256",
      expiresIn: expiresIn,
    }),
    expiresIn: expiresIn,
  });
}

/**
 * Parses the relay state hash and returns the app context hash and the access token
 *
 * @param RelayState
 * @returns
 */
export function parseSaml2RelayState(RelayState: string): { appContextHash: string; accessToken: string; idToken: string; expiresIn: string } {
  return JSON.parse(resolveBase64Hash(RelayState));
}

/**
 * @param accessToken
 * @param context - which app source is requesting access
 */
export default async function authorize(accessToken: string, context: string): Promise<void> {
  try {
    const token = leftTrim(accessToken, "Bearer ");
    if (!token) {
      throw new Error("No nameID found in token");
    }

    const decoded = jwt.verify(token, await Settings.getSecret("SUOMIFI_JWT_SECRET"), { ignoreExpiration: false }) as jwt.JwtPayload;
    debug(decoded);

    // Validate rest of the fields
    const parsedAppContext = parseAppContext(decoded.appContextHash, SuomiFIConfig.ident); // Throws
    const secretGuid = await generateSecretGuid(parsedAppContext.object.guid);
    if (secretGuid !== decoded.secretGuid) {
      throw new Error("Invalid secretGuid");
    }
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
