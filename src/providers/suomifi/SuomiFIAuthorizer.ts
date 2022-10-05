import * as jwt from "jsonwebtoken";

import { AccessDeniedException } from "../../utils/exceptions";
import { createSecretHash, generateBase64Hash, resolveBase64Hash } from "../../utils/hashes";
import { debug } from "../../utils/logging";
import Settings from "../../utils/Settings";
import { leftTrim } from "../../utils/transformers";
import { ParsedAppContext } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import SuomiFIConfig from "./SuomiFI.config";

/**
 * Creates a relay state hash with a JWT token for the given user
 *
 * @param appContextHash
 * @returns RelayState
 */
export async function generateSaml2RelayState(parsedAppContext: ParsedAppContext): Promise<string> {
  const secretGuid = createSecretHash(parsedAppContext.object.guid, await Settings.getSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"));
  return generateBase64Hash({
    appContextHash: parsedAppContext.hash,
    accessToken: jwt.sign({ appContextHash: parsedAppContext.hash, secretGuid: secretGuid }, await Settings.getSecret("SUOMIFI_JWT_SECRET"), {
      algorithm: "HS256",
      expiresIn: "1h",
    }),
  });
}

/**
 * Parses the relay state hash and returns the app context hash and the access token
 *
 * @param RelayState
 * @returns
 */
export function parseSaml2RelayState(RelayState: string): { appContextHash: string; accessToken: string } {
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
    const secretGuid = createSecretHash(parsedAppContext.object.guid, await Settings.getSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"));
    if (secretGuid !== decoded.secretGuid) {
      throw new Error("Invalid secretGuid");
    }
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
