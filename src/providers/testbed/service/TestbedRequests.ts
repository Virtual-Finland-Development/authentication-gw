import axios from "axios";
import Runtime from "../../../utils/Runtime";
import Settings from "../../../utils/Settings";
import { generateBase64Hash } from "../../../utils/hashes";
import { debug } from "../../../utils/logging";
import { transformExpiresInToExpiresAt_ISOString } from "../../../utils/transformers";
import TestbedSettings from "../Testbed.config";

/**
 *
 * @param loginCode
 * @returns
 */
export async function getTokensWithLoginCode(loginCode: string): Promise<{ accessToken: string; idToken: string; expiresAt: string }> {
  const CLIENT_ID = await Settings.getSecret("TESTBED_CLIENT_ID");
  const CLIENT_SECRET = await Settings.getSecret("TESTBED_CLIENT_SECRET");

  debug("Retrieving testbed tokens with login code..", { loginCode });

  const response = await axios.post(
    `https://login.testbed.fi/api/oauth/token`,
    new URLSearchParams({
      grant_type: "authorization_code",
      code: loginCode,
      scope: TestbedSettings.scope,
      redirect_uri: Runtime.getAppUrl("/auth/openid/testbed/authenticate-response"),
    }).toString(),
    {
      headers: {
        Authorization: "Basic " + generateBase64Hash(`${CLIENT_ID}:${CLIENT_SECRET}`),
      },
      timeout: Settings.REQUEST_TIMEOUT_MSECS,
    }
  );

  debug("Testbed tokens retrieved", response.data);

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
  debug("Retrieving testbed user info..");

  const response = await axios.post(`https://login.testbed.fi/api/oauth/userinfo`, null, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: Settings.REQUEST_TIMEOUT_MSECS,
  });

  debug("Testbed user info retrieved", response.data);

  return response.data;
}
