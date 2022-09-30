import { Context } from "openapi-backend";
import { getJSONResponseHeaders } from "../utils/default-headers";

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
