import { Context } from "openapi-backend";
import { debug } from "./logging";
import { resolveProvider } from "./route-utils";
import { HttpResponse, IBaseRequestHandler } from "./types";

const operationMap: Record<string, (context: Context) => Promise<HttpResponse>> = {};
const handlerMap: Record<string, IBaseRequestHandler> = {};

function resolveRequestHandler(operationName: string, context: Context, defaultProvider: string): IBaseRequestHandler {
  const provider = resolveProvider(context, defaultProvider);
  const requestHandler = handlerMap[`${provider}::${operationName}`];
  if (!requestHandler) {
    throw new Error(`No request handler found for provider ${provider}`);
  }
  return requestHandler;
}

function generateOperation(operationName: string, provider: string): (context: Context) => Promise<HttpResponse> {
  return async (context: Context) => {
    const requestHandler = resolveRequestHandler(operationName, context, provider);
    await requestHandler.initialize();
    const response = await requestHandler[operationName](context);
    debug("Response", response);
    return response;
  };
}

/**
 * Maps the request handlers and generates operations mapping
 *
 * @param handlerGroups
 */
function initialize(handlerGroups: Array<{ handlers: Array<IBaseRequestHandler>; operationPrefix: string }>): void {
  const baseRequestHandlerMethods = ["constructor", "initialize", "getAuthenticateResponseFailedResponse", "getLogoutRequestFailedResponse"];

  for (const { handlers: requestsHandlers, operationPrefix } of handlerGroups) {
    for (const requestHandler of requestsHandlers) {
      const operationNames = Object.getOwnPropertyNames(Object.getPrototypeOf(requestHandler)).filter(
        (operationName) => !baseRequestHandlerMethods.includes(operationName) && typeof requestHandler[operationName] === "function"
      );
      const provider = requestHandler.identityProviderIdent.toLowerCase();

      for (const operationName of operationNames) {
        handlerMap[`${provider}::${operationName}`] = requestHandler; // Attach reference to handler
        operationMap[`${operationPrefix}${operationName}`] = generateOperation(operationName, provider); // operation template function
      }
    }
  }
}

/**
 *
 * @returns
 */
function getOperations(): Record<string, (context: Context) => Promise<HttpResponse>> {
  return operationMap;
}

export default { initialize, getOperations };
