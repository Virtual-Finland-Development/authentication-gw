import axios from "axios";
import { Context } from "openapi-backend";
import { AccessDeniedException, ValidationError } from "../../../utils/exceptions";
import { debug } from "../../../utils/logging";
import Runtime from "../../../utils/Runtime";
import { leftTrim } from "../../../utils/transformers";
import { ParsedAppContext } from "../../../utils/types";
import { parseAppContext } from "../../../utils/validators";
import TestbedConfig from "../Testbed.config";

type ISituationResponseDataPair<T, K extends keyof T = keyof T> = K extends keyof T
  ? { status: K; data: T[K]; parsedAppContext: ParsedAppContext; idToken: string; dataSource: string }
  : never;
type ISituationResponseData = ISituationResponseDataPair<{
  verifyUserConsent: {
    redirectUrl: string;
  };
  consentGranted: {
    consentToken: string;
  };
}>;

/**
 * @see: https://ioxio.com/guides/how-to-build-an-application#request-consent
 * @param context
 * @returns
 */
export async function engageTestbedConsentRequest(context: Context): Promise<ISituationResponseData> {
  const parsedAppContext = parseAppContext(context, {
    provider: TestbedConfig.ident,
    meta: {
      dataSource: context.request.requestBody?.dataSource || context.request.query?.dataSource,
      idToken: context.request.requestBody?.idToken || context.request.query?.idToken,
    },
  });

  let idToken = parsedAppContext.object.meta?.idToken || context.request.requestBody?.idToken || context.request.query?.idToken;
  if (!idToken) {
    if (!context.request.headers.authorization) throw new AccessDeniedException("Missing authorization header");
    idToken = leftTrim(String(context.request.headers.authorization), "Bearer ");
  } else {
    idToken = String(idToken);
  }

  const dataSource = parsedAppContext.object.meta?.dataSource || context.request.requestBody?.dataSource || context.request.query?.dataSource;
  if (!dataSource) throw new ValidationError("Missing dataSource in request body or app context meta");

  const response = await axios.post(
    "https://consent.testbed.fi/Consent/Request",
    JSON.stringify({
      dataSource: dataSource,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    }
  );

  debug("consentStatus", response.data.type);

  if (response.data.type === "verifyUserConsent") {
    const returnUrl = Runtime.getAppUrl("/consents/testbed/consent-response");
    const redirectUrl = `${response.data.verifyUrl}?${new URLSearchParams({
      returnUrl: returnUrl,
    }).toString()}`;

    return {
      status: "verifyUserConsent",
      parsedAppContext: parsedAppContext,
      idToken: idToken,
      dataSource: dataSource,
      data: {
        redirectUrl: redirectUrl,
      },
    };
  } else if (response.data.type === "consentGranted") {
    return {
      status: "consentGranted",
      parsedAppContext: parsedAppContext,
      dataSource: dataSource,
      idToken: idToken,
      data: {
        consentToken: response.data.consentToken,
      },
    };
  }
  throw new Error("Unexpected response");
}
