import { Context } from "openapi-backend";
import { jsonResponseHeaders } from "../utils/default-headers";
import { ValidationError } from "../utils/exceptions";
import { exceptionToObject } from "../utils/transformers";

export function InternalServerErrorHandler(error: any) {
  const exception = exceptionToObject(error);

  let statusCode = 500;
  if (exception.statusCode) {
    statusCode = exception.statusCode;
  } else if (error instanceof ValidationError) {
    statusCode = 422;
  }

  return {
    statusCode: statusCode,
    body: JSON.stringify({ err: exception.message }),
    headers: jsonResponseHeaders,
  };
}

export default {
  healthCheck: async () => ({
    statusCode: 200,
    body: "OK",
    headers: { "Content-Type": "text/plain" },
  }),

  // special handlers
  notFound: async () => ({
    statusCode: 404,
    body: JSON.stringify({ err: "Not found" }),
    headers: jsonResponseHeaders,
  }),
  methodNotAllowed: async () => ({
    statusCode: 405,
    body: JSON.stringify({ err: "Method not allowed" }),
    headers: jsonResponseHeaders,
  }),
  validationFail: async (context: Context) => ({
    statusCode: 400,
    body: JSON.stringify({ err: context.validation.errors }),
    headers: jsonResponseHeaders,
  }),
};
