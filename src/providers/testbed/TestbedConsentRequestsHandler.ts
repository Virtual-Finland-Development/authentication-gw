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
import { fetchConsentStatus, fetchConsentStatuses } from "./service/ConsentRequests";
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
      consentUserId: context.request.headers["x-consent-user-id"] as string
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

    const consentResponses: Array<{
      consentStatus: string;
      dataSource: string;
      consentToken?: string;
      redirectUrl?: string;
    }> = [];

    const verifiableDataSources = dataSources.filter((dataSource: { consentToken: any; }) => dataSource.consentToken);
    const resolvableDataSource = dataSources.filter((dataSource: { consentToken: any; }) => !dataSource.consentToken);

    // Verify verifiable consent requests
    for (const dataSource of verifiableDataSources) {
      try {
        await verifyConsent(dataSource.consentToken);
        consentResponses.push({
          consentStatus: "consentGranted",
          consentToken: dataSource.consentToken,
          dataSource: dataSource.uri,
        });
      } catch (error) {
        resolvableDataSource.push(dataSource);
      }
    }

    // Fetch consent status for fetchable/unverified consent requests
    const consentSituations = await fetchConsentStatuses(resolvableDataSource.map((ds: { uri: string; }) => ds.uri), idToken);
    for (const consentStatus of consentSituations) {
      if (consentStatus.status === "verifyUserConsent") {
        const dataSourceUri = consentStatus.data.missingConsents[0].dataSource;
        consentResponses.push({
          consentStatus: consentStatus.status,
          dataSource: dataSourceUri,
          redirectUrl: ensureUrlQueryParams(Runtime.getAppUrl("/consents/testbed/consent-request"), [
            { key: "appContext", value: parsedAppContext.hash }, // Or maybe provide these at the frontend?
            { key: "idToken", value: consentStatus.idToken },
            { key: "dataSource", value: dataSourceUri },
          ]),
        });
      } else if (consentStatus.status === "consentGranted") {
        consentResponses.push({
          consentStatus: consentStatus.status,
          dataSource: consentStatus.dataSourceUri as string,
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
