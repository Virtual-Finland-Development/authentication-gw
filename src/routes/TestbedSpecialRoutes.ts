import { Context } from "openapi-backend";
import { verifyConsent } from "../providers/testbed/TestbedAuthorizer";
import { getJSONResponseHeaders } from "../utils/default-headers";
import { HttpResponse } from "../utils/types";

export default {
  /**
   *  POST: verify request consent
   *
   * @param context
   * @returns
   */
  async TestbedConsentVerify(context: Context): Promise<HttpResponse> {
    const consentToken = String(context.request.headers["x-consent-token"]);
    await verifyConsent(consentToken); // Throws AccessDeniedException if access needs to be denied

    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify({
        message: "Verified",
      }),
    };
  },
};
