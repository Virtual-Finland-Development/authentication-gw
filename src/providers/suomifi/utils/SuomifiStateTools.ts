import { ValidationError } from "../../../utils/exceptions";
import { createSecretHash, decrypt, decryptObject, encrypt, encryptObject, generateUrlEncodedBase64Hash, resolveUrlEncodedBase64Hash } from "../../../utils/hashes";
import { decodeIdToken } from "../../../utils/JWK-Utils";
import Settings from "../../../utils/Settings";
import { omitObjectKeys } from "../../../utils/transformers";
import { SuomiFiLoginState, SuomiFiProfile } from "./SuomifiTypes";

/**
 *
 * @param loggedInState
 * @returns
 */
export async function createSuomiFiLoggedInCode(loggedInState: SuomiFiLoginState): Promise<string> {
  return generateUrlEncodedBase64Hash({
    ...loggedInState,
    profileData: {
      ...loggedInState.profileData,
      profile: encryptObject(
        omitObjectKeys(loggedInState.profileData.profile, ["nameID", "nameIDFormat", "issuer", "sessionIndex", "inResponseTo", "nameQualifier", "spNameQualifier", "attributes"]),
        await Settings.getStageSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"),
        await Settings.getStageSecret("AUTHENTICATION_GW_SECRET_IV")
      ),
      email: loggedInState.profileData.email
        ? encrypt(loggedInState.profileData.email, await Settings.getStageSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"), await Settings.getStageSecret("AUTHENTICATION_GW_SECRET_IV"))
        : "",
    },
  });
}

/**
 *
 * @param loginCode
 * @returns
 */
export async function extractSuomiFiLoggedInState(loginCode: string): Promise<SuomiFiLoginState> {
  const loggedInState = JSON.parse(resolveUrlEncodedBase64Hash(loginCode));
  return {
    ...loggedInState,
    profileData: {
      ...loggedInState.profileData,
      profile: decryptObject(
        loggedInState.profileData.profile,
        await Settings.getStageSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"),
        await Settings.getStageSecret("AUTHENTICATION_GW_SECRET_IV")
      ),
      email: loggedInState.profileData.email
        ? decrypt(loggedInState.profileData.email, await Settings.getStageSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"), await Settings.getStageSecret("AUTHENTICATION_GW_SECRET_IV"))
        : "",
    },
  };
}

/**
 *
 * @param idToken
 * @returns
 */
export function parseSuomiFiBasicProfileFromIdToken(idToken: string): SuomiFiProfile {
  const response = decodeIdToken(idToken);
  if (!response.decodedToken) {
    throw new ValidationError("Bad id_token");
  }
  const payload = response.decodedToken.payload;
  const { nameID, nameIDFormat, issuer, sessionIndex } = payload as any;
  return { nameID, nameIDFormat, issuer, sessionIndex };
}

/**
 * @see: https://palveluhallinta.suomi.fi/fi/tuki/artikkelit/590ad07b14bbb10001966f50
 *
 * @param profileData
 * @returns encrypted sotu, pid or other id
 */
export async function resolveSuomiFiUserIdFromProfileData(profileData: SuomiFiProfile): Promise<string> {
  const getIdentifier = (profileData: SuomiFiProfile) => {
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
    return profileData.email || profileData.mail;
  };

  const identifier = getIdentifier(profileData);

  if (!identifier) {
    throw new ValidationError("Could not resolve the user identifier from the Suomi.fi profile data");
  }

  return createSecretHash(identifier, await Settings.getStageSecret("AUTHENTICATION_GW_RUNTIME_TOKEN"), "sha512");
}
