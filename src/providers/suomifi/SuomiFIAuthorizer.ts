import { debug } from "console";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import { AccessDeniedException } from "../../utils/exceptions";
import Settings from "../../utils/Settings";
import { generateBase64Hash, leftTrim, resolveBase64Hash } from "../../utils/transformers";

export async function generateSaml2RelayState(appContextHash: string): Promise<string> {
  return generateBase64Hash({
    appContextHash: appContextHash,
    accessToken: jwt.sign({ hash: appContextHash, nonce: String(uuidv4()) }, await Settings.getSecret("SUOMIFI_JWT_SECRET"), { algorithm: "HS256", expiresIn: "1h" }),
  });
}

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

    const decoded = jwt.verify(token, await Settings.getSecret("SUOMIFI_JWT_SECRET"));
    debug(decoded);
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
