import axios from "axios";
import { AccessDeniedException } from "../../utils/exceptions";
import { debug, logAxiosException } from "../../utils/logging";

export default async function authorize(token: string, context: string): Promise<void> {
  const accessToken = token;

  try {
    const response = await axios.get(`https://login.iam.qa.sinuna.fi/oxauth/restv1/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    debug(response.data);
  } catch (error) {
    logAxiosException(error);
    throw new AccessDeniedException(String(error));
  }
}
