import { Context } from "openapi-backend";
import { BaseRequestHandler } from "../../utils/BaseRequestHandler";
import { getJSONResponseHeaders } from "../../utils/default-headers";
import { NoticeException } from "../../utils/exceptions";
import { parseAuthorizationFromContext } from "../../utils/JWK-Utils";
import { prepareCookie, prepareRedirectUrl } from "../../utils/route-utils";
import Runtime from "../../utils/Runtime";
import { ensureUrlQueryParams } from "../../utils/transformers";
import { HttpResponse } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import { fetchConsentStatus } from "./service/ConsentRequests";
import TestbedConfig from "./Testbed.config";
import { verifyConsent } from "./TestbedAuthorizer";

export default new (class TestbedConsentRequestsHandler extends BaseRequestHandler {
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
    await verifyConsent(consentToken, {
      idToken: parseAuthorizationFromContext(context), // Optional
      dataSource: context.request.headers["x-consent-data-source"] as string, // Optional
    }); // Throws AccessDeniedException if access needs to be denied

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
    const parsedAppContext = parseAppContext(context, {
      provider: TestbedConfig.ident,
    });
    const idToken = parseAuthorizationFromContext(context);

    const dataSources = context.request.requestBody.dataSources;
    const consentResponses = [];
    for (const dataSource of dataSources) {
      let consentStatus = {
        status: "",
        data: {} as any,
        idToken: idToken,
        dataSourceUri: dataSource.uri,
      };

      if (dataSource.consentToken) {
        try {
          await verifyConsent(dataSource.consentToken);
          consentStatus.status = "consentGranted";
          consentStatus.data.consentToken = dataSource.consentToken;
        } catch (error) {
          consentStatus.status = "verifyUserConsent";
        }
      } else {
        const consentSituationData = await fetchConsentStatus(dataSource.uri, idToken);
        consentStatus.status = consentSituationData.status;
        consentStatus.data = consentSituationData.data;
      }

      if (consentStatus.status === "verifyUserConsent") {
        consentResponses.push({
          consentStatus: consentStatus.status,
          dataSource: consentStatus.dataSourceUri,
          redirectUrl: ensureUrlQueryParams(Runtime.getAppUrl("/consents/testbed/consent-request"), [
            { key: "appContext", value: parsedAppContext.hash }, // Or maybe provide these at the frontend?
            { key: "idToken", value: consentStatus.idToken },
            { key: "dataSource", value: consentStatus.dataSourceUri },
          ]),
        });
      } else if (consentStatus.status === "consentGranted") {
        consentResponses.push({
          consentStatus: consentStatus.status,
          dataSource: consentStatus.dataSourceUri,
          consentToken: consentStatus.data.consentToken,
        });
      }
    }

    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify(consentResponses),
    };
  }

  /**
   * GET -> REDIRECT: Transition to the testbed consent page
   *
   * @param context
   * @returns
   */
  async TestbedConsentRequest(context: Context): Promise<HttpResponse> {
    try {
      const idToken = String(context.request.query.idToken);
      const dataSourceUri = String(context.request.query.dataSource);
      const parsedAppContext = parseAppContext(context, {
        provider: TestbedConfig.ident,
        meta: {
          dataSource: dataSourceUri,
          idToken: idToken,
        },
      });

      const consentStatus = await fetchConsentStatus(dataSourceUri, idToken);
      if (consentStatus.status === "verifyUserConsent") {
        // Transit to the testbed consent page
        return {
          statusCode: 303,
          headers: {
            Location: consentStatus.data.redirectUrl,
          },
          cookies: [prepareCookie("appContext", parsedAppContext.hash)],
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
      const parsedAppContext = parseAppContext(context);
      const idToken = parsedAppContext.object.meta?.idToken;
      const dataSourceUri = parsedAppContext.object.meta?.dataSource;

      if (!idToken || !dataSourceUri) {
        throw new Error("Missing idToken or dataSourceUri");
      }

      const responseStatusFlag = String(context.request.query.status);
      if (responseStatusFlag === "success") {
        const consentStatus = await fetchConsentStatus(dataSourceUri, idToken);
        if (consentStatus.status === "consentGranted") {
          return {
            statusCode: 303,
            headers: {
              Location: prepareRedirectUrl(parsedAppContext.object.redirectUrl, TestbedConfig.ident, [
                { key: "consentStatus", value: "consentGranted" },
                { key: "consentToken", value: consentStatus.data.consentToken },
                { key: "dataSource", value: consentStatus.dataSourceUri },
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
