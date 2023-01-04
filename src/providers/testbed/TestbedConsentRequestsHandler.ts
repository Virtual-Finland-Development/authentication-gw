import { debug } from "console";
import { Context } from "openapi-backend";
import { BaseRequestHandler } from "../../utils/BaseRequestHandler";
import { getJSONResponseHeaders } from "../../utils/default-headers";
import { prepareCookie, prepareRedirectUrl } from "../../utils/route-utils";
import Runtime from "../../utils/Runtime";
import { HttpResponse } from "../../utils/types";
import { engageTestbedConsentRequest } from "./service/ConsentRequests";
import TestbedConfig from "./Testbed.config";
import { verifyConsent } from "./TestbedAuthorizer";

export default new (class TestbedConsentsHandler extends BaseRequestHandler {
  identityProviderIdent = TestbedConfig.ident;

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
  }

  /**
   * POST: check if consent is granted
   *
   * @param context
   */
  async TestbedConsentCheck(context: Context): Promise<HttpResponse> {
    try {
      const consentStatus = await engageTestbedConsentRequest(context);
      debug("consentStatus: ", consentStatus);

      if (consentStatus.status === "verifyUserConsent") {
        return {
          statusCode: 200,
          headers: getJSONResponseHeaders(),
          body: JSON.stringify({
            consentStatus: consentStatus.status,
            redirectUrl: Runtime.getAppUrl("/consent/testbed/request"),
          }),
        };
      } else if (consentStatus.status === "consentGranted") {
        return {
          statusCode: 200,
          headers: getJSONResponseHeaders(),
          body: JSON.stringify({
            consentStatus: consentStatus.status,
            consentToken: consentStatus.data.consentToken,
          }),
        };
      }
      throw new Error("Unexpected response");
    } catch (error) {
      return this.getAuthenticateResponseFailedResponse(context, error);
    }
  }

  /**
   * GET -> REDIRECT: The route for handling the consent flow redirections
   *
   * @see: https://ioxio.com/guides/how-to-build-an-application#request-consent
   * @param context
   * @returns
   */
  async TestbedConsentRequest(context: Context): Promise<HttpResponse> {
    try {
      const consentStatus = await engageTestbedConsentRequest(context);
      const parsedAppContext = consentStatus.parsedAppContext;
      if (consentStatus.status === "verifyUserConsent") {
        return {
          statusCode: 303,
          headers: {
            Location: consentStatus.data.redirectUrl,
          },
          cookies: [prepareCookie("appContext", parsedAppContext.hash)],
        };
      } else if (consentStatus.status === "consentGranted") {
        return {
          statusCode: 303,
          headers: {
            Location: prepareRedirectUrl(parsedAppContext.object.redirectUrl, TestbedConfig.ident, [
              { key: "consentStatus", value: "consentGranted" },
              { key: "consentToken", value: consentStatus.data.consentToken },
            ]),
          },
          cookies: [prepareCookie("appContext")],
        };
      }
      throw new Error("Unexpected response");
    } catch (error) {
      return this.getAuthenticateResponseFailedResponse(context, error);
    }
  }
})();
