import { Context } from "openapi-backend";
import Authorizator from "../utils/Authorizator";
import { getJSONResponseHeaders } from "../utils/default-headers";
import { HttpResponse } from "../utils/types";

export default {
  // Base handlers
  root: async (_context: Context) => {
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

    const response = await Authorizator.authorize({
      authorization: context.request.headers.authorization as string,
      context: context.request.headers["x-consent-data-source"] as string,
      consentToken: context.request.headers["x-consent-token"] as string,
      consentDataSource: context.request.headers["x-consent-data-source"] as string,
      consentUserId: context.request.headers["x-consent-user-id"] as string,
    }); // Throws AccessDeniedException if access needs to be denied

    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify(response),
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
