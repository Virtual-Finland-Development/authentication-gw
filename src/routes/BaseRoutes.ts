import { Context } from "openapi-backend";
import Authorizator from "../utils/Authorizator";
import { getJSONResponseHeaders } from "../utils/default-headers";
import { HttpResponse } from "../utils/types";

export default {
  // Base handlers
  root: async () => ({
    statusCode: 307,
    headers: {
      location: "/docs/",
    },
  }),
  swagger: async () => ({
    statusCode: 307,
    headers: {
      location: "/docs/",
    },
  }),
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
    const authorizationProvider = context.request.headers["x-authorization-provider"];
    const authorizationContext = context.request.headers["x-authorization-context"];
    await Authorizator.authorize(authorization, authorizationProvider, authorizationContext); // Throws AccessDeniedException if access needs to be denied

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
