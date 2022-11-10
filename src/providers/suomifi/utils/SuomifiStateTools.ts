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
 * @param loginCode
 * @returns
 */
export async function extractSuomiFiLoggedInState(loginCode: string): Promise<SuomiFiLoginState> {
  return decryptObject(loginCode, await Settings.getSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"));
}

/**
 *
 * @param idToken
 * @returns
 */
export function parseSuomiFiBasicProfileFromIdToken(idToken: string): SuomiFiProfile {
  const { decodedToken } = decodeIdToken(idToken);
  const { nameID, nameIDFormat, issuer, sessionIndex } = decodedToken as any;
  return { nameID, nameIDFormat, issuer, sessionIndex };
}

/**
 * @see: https://palveluhallinta.suomi.fi/fi/tuki/artikkelit/590ad07b14bbb10001966f50
 *
 * @param profileData
 * @returns
 */
export function parseSuomiFiUserIdFromProfileData(profileData: SuomiFiProfile): string {
  if (profileData["http://eidas.europa.eu/attributes/naturalperson/PersonIdentifier"]) {
    // Eidas
    return profileData["http://eidas.europa.eu/attributes/naturalperson/PersonIdentifier"];
  }
  if (profileData["urn:oid:1.2.246.21"]) {
    // nationalIdentificationNumber
    return profileData["urn:oid:1.2.246.21"];
  }
  if (profileData["urn:oid:1.2.246.517.3002.111.17"]) {
    // foreignPersonIdentifier, suppea
    return profileData["urn:oid:1.2.246.517.3002.111.17"];
  }
  return profileData.email;
}
