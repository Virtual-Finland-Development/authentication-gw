import { Context } from "openapi-backend";

import SinunaRequestHandler from "../providers/sinuna/SinunaRequestHandler";
import SuomiFIRequestHandler from "../providers/suomifi/SuomiFIRequestHandler";
import TestbedRequestHandler from "../providers/testbed/TestbedRequestHandler";

import { AccessDeniedException, ValidationError } from "../utils/exceptions";
import { debug, log } from "../utils/logging";
import { ensureUrlQueryParams, exceptionToObject } from "../utils/transformers";
import { getJSONResponseHeaders } from "./default-headers";
import { AuthRequestHandler, HttpResponse } from "./types";
import { parseAppContext } from "./validators";

/**
 *
 * @param redirectUrl
 * @param providerIdent
 * @returns
 */
export function prepareLoginRedirectUrl(redirectUrl: string, loginCode: string, providerIdent: string): string {
  return ensureUrlQueryParams(redirectUrl, [
    { param: "loginCode", value: loginCode },
    { param: "provider", value: providerIdent },
  ]);
}

/**
 *
 * @param redirectUrl
 * @param providerIdent
 * @returns
 */
export function prepareLogoutRedirectUrl(redirectUrl: string, providerIdent: string): string {
  return ensureUrlQueryParams(redirectUrl, [
    { param: "logout", value: "success" },
    { param: "provider", value: providerIdent },
  ]);
}

/**
 *
 * @param redirectUrl
 * @param errorMessage
 * @param providerIdent
 * @returns
 */
export function prepareErrorRedirectUrl(redirectUrl: string, errorMessage: string, providerIdent: string): string {
  return ensureUrlQueryParams(redirectUrl, [
    { param: "error", value: errorMessage },
    { param: "provider", value: providerIdent },
  ]);
}

/**
 *
 * @param error
 * @returns
 */
export function InternalServerErrorHandler(error: any) {
  const exception = exceptionToObject(error);
  log(exception);

  let statusCode = 500;
  if (exception.statusCode) {
    statusCode = exception.statusCode;
  } else if (error instanceof ValidationError) {
    statusCode = 422;
  } else if (error instanceof AccessDeniedException) {
    statusCode = 401;
  }

  return {
    statusCode: statusCode,
    body: JSON.stringify({ message: exception.message }),
    headers: getJSONResponseHeaders(),
  };
}

/**
 *
 * @param context
 * @param defaultProvider
 * @returns
 */
export function resolveProvider(context: Context, defaultProvider: string | undefined) {
  let provider = defaultProvider;
  if (context.request.params?.provider) {
    // Url path params
    provider = String(context.request.params.provider);
  } else if (context.request.query?.provider) {
    // Query params
    provider = String(context.request.query.provider);
  } else if (context.request.requestBody?.provider) {
    // JSON body
    provider = String(context.request.requestBody.provider);
  } else if (context.request.headers?.["x-authentication-provider"]) {
    // Header
    provider = String(context.request.headers["x-authentication-provider"]);
  } else {
    try {
      const parsedAppContext = parseAppContext(context, defaultProvider);
      provider = String(parsedAppContext.object.provider);
    } catch (error) {}
  }

  if (!provider) {
    throw new ValidationError("Provider not specified");
  }

  return provider;
}

/**
 * Utility function for selecting the correct request handler based on the provider ident.
 *
 * @param context
 * @param defaultProvider
 * @returns
 */
export function getAuthProviderRequestHandler(context: Context, defaultProvider?: string): AuthRequestHandler {
  const provider = resolveProvider(context, defaultProvider);

  switch (provider.toLowerCase()) {
    case SinunaRequestHandler.identityProviderIdent.toLowerCase():
      return SinunaRequestHandler;
    case SuomiFIRequestHandler.identityProviderIdent.toLowerCase():
      return SuomiFIRequestHandler;
    case TestbedRequestHandler.identityProviderIdent.toLowerCase():
      return TestbedRequestHandler;
    default:
      throw new ValidationError(`Unknown auth provider: ${provider}`);
  }
}

/**
 * Utility function for generating request handlers for auth routes.
 *
 * @param operationNames
 * @param operationPrefix
 * @param defaultAuthProviderIdent
 * @returns
 */
export function generateRequestHandlers(operationNames: Array<string>, operationPrefix: string, defaultAuthProviderIdent?: string): any {
  return operationNames.reduce((operations: Record<string, (context: Context) => Promise<HttpResponse>>, operationName: string) => {
    operations[`${operationPrefix}${operationName}`] = async (context: Context) => {
      const handler: any = getAuthProviderRequestHandler(context, defaultAuthProviderIdent); // @TODO: fix this any by defining the operationName type
      await handler.initialize();
      const response = await handler[operationName](context);
      debug("Response", response);
      return response;
    };
    return operations;
  }, {});
}
