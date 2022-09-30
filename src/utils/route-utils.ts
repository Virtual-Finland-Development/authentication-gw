import { Context } from "openapi-backend";
import SinunaRequestHandler from "../providers/sinuna/SinunaRequestHandler";
import SuomiFIRequestHandler from "../providers/suomifi/SuomiFIRequestHandler";
import { AccessDeniedException, ValidationError } from "../utils/exceptions";
import { log } from "../utils/logging";
import { ensureUrlQueryParams, exceptionToObject } from "../utils/transformers";
import { jsonResponseHeaders } from "./default-headers";
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
    headers: jsonResponseHeaders,
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
  if (context.request.query?.provider) {
    provider = String(context.request.query.provider);
  } else if (context.request.requestBody?.provider) {
    provider = String(context.request.requestBody.provider);
  } else if (context.request.headers?.["x-provider"]) {
    provider = String(context.request.headers["x-provider"]);
  } else {
    try {
      const appContext = parseAppContext(context, defaultProvider);
      provider = String(appContext.object.provider);
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

  switch (provider) {
    case SinunaRequestHandler.identityProviderIdent.toLowerCase():
      return new SinunaRequestHandler();
    case SuomiFIRequestHandler.identityProviderIdent.toLowerCase():
      return new SuomiFIRequestHandler();
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
      return handler[operationName](context);
    };
    return operations;
  }, {});
}
