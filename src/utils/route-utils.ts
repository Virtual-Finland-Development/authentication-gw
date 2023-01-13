import { AxiosError } from "axios";
import { Context } from "openapi-backend";

import SinunaRequestHandler from "../providers/sinuna/SinunaRequestHandler";
import SuomiFIRequestHandler from "../providers/suomifi/SuomiFIRequestHandler";
import TestbedRequestHandler from "../providers/testbed/TestbedRequestHandler";

import { AccessDeniedException, ValidationError } from "../utils/exceptions";
import { debug, log } from "../utils/logging";
import { ensureArray, ensureUrlQueryParams, exceptionToObject } from "../utils/transformers";
import { getJSONResponseHeaders } from "./default-headers";
import { AuthRequestHandler, HttpResponse, NotifyErrorType } from "./types";
import { parseAppContext } from "./validators";

/**
 *
 * @param redirectUrl
 * @param providerIdent
 * @returns
 */
export function prepareRedirectUrl(redirectUrl: string, providerIdent: string, params?: Array<{ key: string; value: any }>): string {
  return ensureUrlQueryParams(redirectUrl, [{ key: "provider", value: providerIdent }, ...ensureArray(params)]);
}

/**
 *
 * @param redirectUrl
 * @param loginCode
 * @param providerIdent
 * @returns
 */
export function prepareLoginRedirectUrl(redirectUrl: string, loginCode: string, providerIdent: string): string {
  return ensureUrlQueryParams(redirectUrl, [
    { key: "loginCode", value: loginCode },
    { key: "provider", value: providerIdent },
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
    { key: "logout", value: "success" },
    { key: "provider", value: providerIdent },
  ]);
}

/**
 *
 * @param redirectUrl
 * @param errorMessage
 * @param providerIdent
 * @returns
 */
export function prepareErrorRedirectUrl(redirectUrl: string, message: { error: string; provider?: string; intent: string; type: NotifyErrorType }): string {
  return ensureUrlQueryParams(redirectUrl, [
    { key: "error", value: message.error },
    { key: "provider", value: message.provider || "unknown" },
    { key: "intent", value: message.intent },
    { key: "type", value: message.type },
  ]);
}

/**
 *
 * @param redirectUrl
 * @param message
 * @returns
 */
export function prepareLoginErrorRedirectUrl(redirectUrl: string, message: { error: string; provider?: string; type: NotifyErrorType }): string {
  return prepareErrorRedirectUrl(redirectUrl, {
    error: message.error,
    provider: message.provider,
    intent: "LoginRequest",
    type: message.type,
  });
}

/**
 *
 * @param redirectUrl
 * @param message
 * @returns
 */
export function prepareLogoutErrorRedirectUrl(redirectUrl: string, message: { error: string; provider?: string; type: NotifyErrorType }): string {
  return prepareErrorRedirectUrl(redirectUrl, {
    error: message.error,
    provider: message.provider,
    intent: "LogoutRequest",
    type: message.type,
  });
}

/**
 *
 * @param name
 * @param value
 * @returns
 */
export function prepareCookie(name: string, value: string = ""): string {
  return `${name}=${value}; SameSite=None; Secure; HttpOnly`;
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
  } else if (error instanceof AxiosError) {
    statusCode = error.response?.status || 500;
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
      const parsedAppContext = parseAppContext(context, { provider: defaultProvider });
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
export function generateRouteRequestHandlers(operationNames: Array<string>, operationPrefix: string, defaultAuthProviderIdent?: string, requestsHandler?: any): any {
  return operationNames.reduce((operations: Record<string, (context: Context) => Promise<HttpResponse>>, operationName: string) => {
    operations[`${operationPrefix}${operationName}`] = generateRequestHandlerOperation(operationName, defaultAuthProviderIdent, requestsHandler);
    return operations;
  }, {});
}

export function generateRequestHandlerOperation(operationName: string, defaultAuthProviderIdent?: string, requestsHandler?: any): (context: Context) => Promise<HttpResponse> {
  return async (context: Context) => {
    if (!requestsHandler) {
      requestsHandler = getAuthProviderRequestHandler(context, defaultAuthProviderIdent);
    }
    await requestsHandler.initialize();
    const response = await requestsHandler[operationName](context);
    debug("Response", response);
    return response;
  };
}
