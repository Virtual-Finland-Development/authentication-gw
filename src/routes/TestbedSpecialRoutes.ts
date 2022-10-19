import axios from "axios";
import { Context } from "openapi-backend";
import { verifyConsent } from "../providers/testbed/TestbedAuthorizer";
import { getJSONResponseHeaders } from "../utils/default-headers";
import { AccessDeniedException } from "../utils/exceptions";
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

  /**
   * Browser app helper, reverse proxy
   *
   * @param context
   * @returns
   */
  async TestbedReverseProxy(context: Context) {
    const acl = ["https://consent.testbed.fi/", "https://gateway.testbed.fi/"];
    const aclMatches = acl.filter((aclUrl) => context.request.requestBody.url.startsWith(aclUrl));
    if (aclMatches.length === 0) {
      throw new AccessDeniedException();
    }

    const response = await axios.request({
      method: context.request.requestBody.method,
      url: context.request.requestBody.url,
      data: context.request.requestBody.data,
      headers: context.request.requestBody.headers,
    });
    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify(response.data),
    };
  },
};
