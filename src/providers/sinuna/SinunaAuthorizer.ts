import axios from "axios";
import { AccessDeniedException } from "../../utils/exceptions";
import { debug, logAxiosException } from "../../utils/logging";
import { leftTrim } from "../../utils/transformers";

/**
 *
 * @param token
 * @param context - which app source is requesting access
 */
export default async function authorize(token: string, context: string): Promise<void> {
  try {
    const response = await axios.get(`https://login.iam.qa.sinuna.fi/oxauth/restv1/userinfo`, {
      headers: {
        Authorization: `Bearer ${leftTrim(token, "Bearer ")}`,
      },
    });

    debug(response.data);
  } catch (error) {
    logAxiosException(error);
    throw new AccessDeniedException(String(error));
  }
}
