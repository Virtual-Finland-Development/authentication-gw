import { APIGatewayProxyEventV2, Context as APIGatewayContext } from "aws-lambda";
import OpenAPIBackend from "openapi-backend";
import * as AuthenticationRoutes from "./routes/authentication";
import BaseRoutes, { InternalServerErrorHandler } from "./routes/base-routes";

// Setup the OpenAPI backend
const api = new OpenAPIBackend({ definition: "./openapi/authentication-gw.yml" });

// register your framework specific request handlers here
api.register({
  ...AuthenticationRoutes,
  ...BaseRoutes,
});

// initalize the backend
api.init();

// Lambda http event handler
export const handler = async (event: APIGatewayProxyEventV2, context: APIGatewayContext) => {
  try {
    // Handle options request
    if (event.requestContext.http.method === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      };
    }

    return await api.handleRequest(
      {
        method: event.requestContext.http.method,
        path: event.rawPath,
        // @ts-ignore, openapi-backend definition does not define undefined, witch is a valid value
        query: event.queryStringParameters,
        body: event.body,
        // @ts-ignore, openapi-backend definition does not define undefined, witch is a valid value
        headers: event.headers,
      },
      event,
      context
    );
  } catch (error) {
    return InternalServerErrorHandler(error);
  }
};
