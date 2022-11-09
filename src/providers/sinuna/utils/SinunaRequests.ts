import axios from "axios";
import { generateBase64Hash } from "../../../utils/hashes";
import { debug } from "../../../utils/logging";
import Runtime from "../../../utils/Runtime";
import Settings from "../../../utils/Settings";
import { transformExpiresInToExpiresAt_ISOString } from "../../../utils/transformers";
import SinunaSettings from "../Sinuna.config";

/**
 *
 * @param loggedInCode
 * @returns
 */
export async function getTokensWithLoginCode(loggedInCode: string): Promise<{ accessToken: string; idToken: string; expiresAt: string }> {
  const CLIENT_ID = await Settings.getSecret("SINUNA_CLIENT_ID");
  const CLIENT_SECRET = await Settings.getSecret("SINUNA_CLIENT_SECRET");
  const response = await axios.post(
    `https://login.iam.qa.sinuna.fi/oxauth/restv1/token`,
    new URLSearchParams({
      grant_type: "authorization_code",
      code: loggedInCode,
      scope: SinunaSettings.scope,
      redirect_uri: Runtime.getAppUrl("/auth/openid/sinuna/authenticate-response"),
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + generateBase64Hash(`${CLIENT_ID}:${CLIENT_SECRET}`),
      },
    }
  );
  debug(response.data);

  return {
    accessToken: response.data.access_token,
    idToken: response.data.id_token,
    expiresAt: transformExpiresInToExpiresAt_ISOString(response.data.expires_in),
  };
}

/**
 *
 * @param accessToken
 * @returns
 */
export async function getUserInfoWithAccessToken(accessToken: string) {
  const response = await axios.get(`https://login.iam.qa.sinuna.fi/oxauth/restv1/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  debug(response.data);

  return response;
}
