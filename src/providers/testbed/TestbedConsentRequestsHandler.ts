import { Context } from "openapi-backend";
import { BaseRequestHandler } from "../../utils/BaseRequestHandler";
import { getJSONResponseHeaders } from "../../utils/default-headers";
import { NoticeException } from "../../utils/exceptions";
import { prepareCookie, prepareRedirectUrl } from "../../utils/route-utils";
import Runtime from "../../utils/Runtime";
import { ensureUrlQueryParams } from "../../utils/transformers";
import { HttpResponse } from "../../utils/types";
import { engageTestbedConsentRequest } from "./service/ConsentRequests";
import TestbedConfig from "./Testbed.config";
import { verifyConsent } from "./TestbedAuthorizer";

export default new (class TestbedConsentsHandler extends BaseRequestHandler {
  identityProviderIdent = TestbedConfig.ident;

  /**
   * POST: verify request consent
   *
   * @see: https://ioxio.com/guides/verify-consent-in-a-data-source
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
    const consentStatus = await engageTestbedConsentRequest(context);
    if (consentStatus.status === "verifyUserConsent") {
      return {
        statusCode: 200,
        headers: getJSONResponseHeaders(),
        body: JSON.stringify({
          consentStatus: consentStatus.status,
          redirectUrl: ensureUrlQueryParams(Runtime.getAppUrl("/consents/testbed/consent-request"), [
            { key: "appContext", value: consentStatus.parsedAppContext.hash }, // Or maybe provide these at the frontend?
            { key: "idToken", value: consentStatus.idToken },
            { key: "dataSource", value: consentStatus.dataSource },
          ]),
        }),
      };
    } else if (consentStatus.status === "consentGranted") {
      return {
        statusCode: 200,
        headers: getJSONResponseHeaders(),
        body: JSON.stringify({
          consentStatus: consentStatus.status,
          consentToken: consentStatus.data.consentToken,
          dataSource: consentStatus.dataSource,
        }),
      };
    }
    throw new Error("Unexpected response");
  }

  /**
   * GET -> REDIRECT: Transition to the testbed consent page
   *
   * @param context
   * @returns
   */
  async TestbedConsentRequest(context: Context): Promise<HttpResponse> {
    try {
      const consentStatus = await engageTestbedConsentRequest(context);
      const parsedAppContext = consentStatus.parsedAppContext;
      if (consentStatus.status === "verifyUserConsent") {
        // Transit to the testbed consent page
        return {
          statusCode: 303,
          headers: {
            Location: consentStatus.data.redirectUrl,
          },
          cookies: [prepareCookie("appContext", parsedAppContext.hash)],
        };
      } else if (consentStatus.status === "consentGranted") {
        // Transit back to the app
        return {
          statusCode: 303,
          headers: {
            Location: prepareRedirectUrl(parsedAppContext.object.redirectUrl, TestbedConfig.ident, [
              { key: "consentStatus", value: "consentGranted" },
              { key: "consentToken", value: consentStatus.data.consentToken },
              { key: "dataSource", value: consentStatus.dataSource },
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

  /**
   * GET -> REDIRECT: Transition from the testbed consent page back to the app
   *
   * @param context
   * @returns
   */
  async TestbedConsentResponse(context: Context): Promise<HttpResponse> {
    try {
      const responseStatusFlag = String(context.request.query.status);
      if (responseStatusFlag === "success") {
        const consentStatus = await engageTestbedConsentRequest(context);
        const parsedAppContext = consentStatus.parsedAppContext;
        if (consentStatus.status === "consentGranted") {
          return {
            statusCode: 303,
            headers: {
              Location: prepareRedirectUrl(parsedAppContext.object.redirectUrl, TestbedConfig.ident, [
                { key: "consentStatus", value: "consentGranted" },
                { key: "consentToken", value: consentStatus.data.consentToken },
                { key: "dataSource", value: consentStatus.dataSource },
              ]),
            },
            cookies: [prepareCookie("appContext")],
          };
        }
        throw new Error("Unexpected response");
      }
      throw new NoticeException("Consent denied");
    } catch (error) {
      return this.getAuthenticateResponseFailedResponse(context, error);
    }
  }
})();
