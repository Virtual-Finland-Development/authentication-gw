import { Context } from "openapi-backend";
import { engageTestbedConsentRequest } from "../providers/testbed/service/ConsentRequests";
import TestbedConfig from "../providers/testbed/Testbed.config";
import { verifyConsent } from "../providers/testbed/TestbedAuthorizer";
import { getJSONResponseHeaders } from "../utils/default-headers";
import { prepareCookie, prepareRedirectUrl } from "../utils/route-utils";
import Runtime from "../utils/Runtime";
import { HttpResponse } from "../utils/types";

/**
 *  POST: verify request consent
 *
 * @param context
 * @returns
 */
export async function TestbedConsentVerify(context: Context): Promise<HttpResponse> {
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
export async function TestbedConsentCheck(context: Context): Promise<HttpResponse> {
  const consentStatus = await engageTestbedConsentRequest(context);

  if (consentStatus.status === "verifyUserConsent") {
    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify({
        status: consentStatus.status,
        redirectUrl: Runtime.getAppUrl("/consent/testbed/request"),
      }),
    };
  } else if (consentStatus.status === "consentGranted") {
    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify({
        status: consentStatus.status,
        consentToken: consentStatus.data.consentToken,
      }),
    };
  }
  throw new Error("Unexpected response");
}

/**
 * GET: The route for handling the consent flow redirections
 *
 * @see: https://ioxio.com/guides/how-to-build-an-application#request-consent
 * @param context
 * @returns
 */
export async function TestbedConsentRequest(context: Context): Promise<HttpResponse> {
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
        Location: prepareRedirectUrl(parsedAppContext.object.redirectUrl, TestbedConfig.ident),
      },
      cookies: [prepareCookie("appContext")],
    };
  }
  throw new Error("Unexpected response");
}
