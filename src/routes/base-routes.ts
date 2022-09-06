import { Context, Document } from "openapi-backend";
import { jsonResponseHeaders } from "../utils/default-headers";

export default {
  healthCheck: async () => ({
    statusCode: 200,
    body: "OK",
    headers: { "Content-Type": "text/html" },
  }),

  // special handlers
  notFound: async () => ({
    statusCode: 404,
    body: JSON.stringify({ err: "Not found" }),
    headers: jsonResponseHeaders,
  }),
  validationFail: async (c: Context<Document>) => ({
    statusCode: 400,
    body: JSON.stringify({ err: c.validation.errors }),
    headers: jsonResponseHeaders,
  }),
};
