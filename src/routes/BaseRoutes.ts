import { debug } from "console";
import { Context } from "openapi-backend";
import Authorizator from "../utils/Authorizator";
import { getJSONResponseHeaders } from "../utils/default-headers";
import { log } from "../utils/logging";
import { prepareCookie, prepareLogoutErrorRedirectUrl } from "../utils/route-utils";
import { ifString } from "../utils/transformers";
import { HttpResponse } from "../utils/types";
import { parseAppContext } from "../utils/validators";

export default {
  // Base handlers
  root: async (context: Context) => {
    // Check for bad login flow redirects
    if (ifString(context.request.cookies?.appContext)) {
      log("Bad login flow redirect");
      try {
        const parsedAppContext = parseAppContext(context);
        const redirectUrl = prepareLogoutErrorRedirectUrl(parsedAppContext.object.redirectUrl, {
          error: "Cancelled",
          provider: parsedAppContext.object.provider,
          type: "info",
        });

        return {
          statusCode: 303,
          headers: {
            Location: redirectUrl,
          },
          cookies: [prepareCookie("appContext", "")],
        };
      } catch (error) {
        debug(error);
      }
    }

    return {
      statusCode: 307,
      headers: {
        location: "/docs/",
      },
    };
  },
  swagger: async () => {}, // This is handled by the api-app.ts
  healthCheck: async () => ({
    statusCode: 200,
    body: "OK",
    headers: { "Content-Type": "text/plain" },
  }),
  /**
   *  POST: authorize request using the access token and app context
   *
   * @param context
   * @returns
   */
  async AuthorizeRequest(context: Context): Promise<HttpResponse> {
    const authorization = context.request.headers.authorization;
    const authorizationContext = context.request.headers["x-authorization-context"];
    await Authorizator.authorize(authorization, authorizationContext); // Throws AccessDeniedException if access needs to be denied

    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify({
        message: "Access Granted",
      }),
    };
  },
  // openapi-backend special handlers
  notFound: async () => ({
    statusCode: 404,
    body: JSON.stringify({ message: "Not found" }),
    headers: getJSONResponseHeaders(),
  }),
  methodNotAllowed: async () => ({
    statusCode: 405,
    body: JSON.stringify({ message: "Method not allowed" }),
    headers: getJSONResponseHeaders(),
  }),
  validationFail: async (context: Context) => ({
    statusCode: 400,
    body: JSON.stringify({ message: context.validation.errors }),
    headers: getJSONResponseHeaders(),
  }),
};
