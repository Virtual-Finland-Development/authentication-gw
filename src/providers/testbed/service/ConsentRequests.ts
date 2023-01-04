import axios from "axios";
import { Context } from "openapi-backend";
import { AccessDeniedException, ValidationError } from "../../../utils/exceptions";
import Runtime from "../../../utils/Runtime";
import { ParsedAppContext } from "../../../utils/types";
import { parseAppContext } from "../../../utils/validators";
import TestbedConfig from "../Testbed.config";

type ISituationResponseDataPair<T, K extends keyof T = keyof T> = K extends keyof T ? { status: K; data: T[K]; parsedAppContext: ParsedAppContext } : never;
type ISituationResponseData = ISituationResponseDataPair<{
  verifyUserConsent: {
    redirectUrl: string;
  };
  consentGranted: {
    consentToken: string;
  };
}>;

/**
 *
 * @param context
 * @returns
 */
export async function engageTestbedConsentRequest(context: Context): Promise<ISituationResponseData> {
  const parsedAppContext = parseAppContext(context, { provider: TestbedConfig.ident, meta: { dataSource: context.request.requestBody?.dataSource } });
  const authorization = context.request.headers.authorization;
  if (!authorization) throw new AccessDeniedException("Missing authorization header");
  const dataSource = parsedAppContext.object.meta?.dataSource || context.request.requestBody?.dataSource || context.request.query?.dataSource;
  if (!dataSource) throw new ValidationError("Missing dataSource in request body or app context meta");

  const response = await axios.post("https://consent.testbed.fi/Consent/Request", {
    body: JSON.stringify({
      dataSource: dataSource,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
  });

  if (response.data.type === "verifyUserConsent") {
    const returnUrl = Runtime.getAppUrl("/consent/testbed/request");
    const redirectUrl = `${response.data.verifyUrl}?${new URLSearchParams({
      returnUrl: returnUrl,
    }).toString()}`;

    return {
      status: "verifyUserConsent",
      parsedAppContext: parsedAppContext,
      data: {
        redirectUrl: redirectUrl,
      },
    };
  } else if (response.data.type === "consentGranted") {
    return {
      status: "consentGranted",
      parsedAppContext: parsedAppContext,
      data: {
        consentToken: response.data.consentToken,
      },
    };
  }
  throw new Error("Unexpected response");
}
