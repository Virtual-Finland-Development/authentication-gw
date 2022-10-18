import axios from "axios";
import { Context } from "openapi-backend";
import TestbedConfig from "../providers/testbed/Testbed.config";
import { ValidationError } from "../utils/exceptions";
import { debug, logAxiosException } from "../utils/logging";
import { prepareCookie, prepareErrorRedirectUrl } from "../utils/route-utils";
import Runtime from "../utils/Runtime";
import { HttpResponse } from "../utils/types";
import { parseAppContext } from "../utils/validators";

export default {
  /**
   * GET->REDIRECT: TestbedConsentRequest
   *
   * @param context
   * @returns
   */
  async TestbedConsentRequest(context: Context): Promise<HttpResponse> {
    const idToken = String(context.request.query.idToken);
    const dataSource = String(context.request.query.consentId);
    const parsedAppContext = parseAppContext(context, { provider: TestbedConfig.ident, meta: { dataSource: dataSource, idToken: idToken } });

    try {
      // Request the consent: https://ioxio.com/guides/how-to-build-an-application#request-consent
      const response = await axios.post(
        `https://consent.testbed.fi/Consent/Request`,
        {
          dataSource: dataSource,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      debug(response.data);

      const redirectUrl = `${response.data.verifyUrl}?${new URLSearchParams({
        returnUrl: Runtime.getAppUrl("/consent/testbed/consent-response"),
      }).toString()}`;

      return {
        statusCode: 303,
        headers: {
          Location: redirectUrl,
        },
        cookies: [prepareCookie("appContext", parsedAppContext.hash)],
      };
    } catch (error) {
      logAxiosException(error);
      throw error;
    }
  },

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   *
   * @param context
   * @returns
   */
  async TestbedConsentResponse(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context);
    const shouldBeSuccessful = String(context.request.query?.status) === "success";

    if (shouldBeSuccessful) {
      const dataSource = parsedAppContext.object.meta?.dataSource;
      const idToken = parsedAppContext.object.meta?.idToken;
      if (!dataSource || !idToken) {
        throw new ValidationError("Missing dataSource or idToken");
      }

      // Retrieve the consent token: https://ioxio.com/guides/how-to-build-an-application#request-the-consent-token
      const response = await axios.post(
        `https://consent.testbed.fi/Consent/Request`,
        {
          dataSource: dataSource,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      debug(response.data);

      const redirectUrl = `${parsedAppContext.object.redirectUrl}?${new URLSearchParams({
        consentToken: response.data.consentToken,
      }).toString()}`;

      return {
        statusCode: 303,
        headers: {
          Location: redirectUrl,
        },
        cookies: [prepareCookie("appContext", "")],
      };
    } else {
      const redirectUrl = prepareErrorRedirectUrl(parsedAppContext.object.redirectUrl, {
        provider: TestbedConfig.ident,
        error: "Consent Denied",
        intent: "ConsentRequest",
        type: "info",
      });

      return {
        statusCode: 303,
        headers: {
          Location: redirectUrl,
        },
        cookies: [prepareCookie("appContext", "")],
      };
    }
  },
};
