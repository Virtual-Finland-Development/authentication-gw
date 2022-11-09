import { decryptObject, encryptObject } from "../../../utils/hashes";
import { decodeIdToken } from "../../../utils/JWK-Utils";
import Settings from "../../../utils/Settings";
import { SuomiFiLoginState, SuomiFiProfile } from "./SuomifiTypes";

/**
 *
 * @param loggedInState
 * @returns
 */
export async function createSuomiFiLoggedInCode(loggedInState: SuomiFiLoginState): Promise<string> {
  return encryptObject(loggedInState, await Settings.getSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"));
}

/**
 *
 * @param loggedInCode
 * @returns
 */
export async function extractSuomiFiLoggedInState(loggedInCode: string): Promise<SuomiFiLoginState> {
  return decryptObject(loggedInCode, await Settings.getSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"));
}

/**
 *
 * @param idToken
 * @returns
 */
export function parseSuomiFiBasicProfileFromIdToken(idToken: string): SuomiFiProfile {
  const { decodedToken } = decodeIdToken(idToken);
  const { nameID, nameIDFormat, issuer } = decodedToken as any;
  return { nameID, nameIDFormat, issuer };
}
