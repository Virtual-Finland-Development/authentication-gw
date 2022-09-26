import { APIGatewayProxyEventV2, Context as APIGatewayContext } from "aws-lambda";
import OpenAPIBackend from "openapi-backend";
import * as OpenIdAuthRoutes from "./routes/OpenidAuthRoutes";
import * as Saml2AuthRoutes from "./routes/Saml2AuthRoutes";
import BaseRoutes, { InternalServerErrorHandler } from "./routes/BaseRoutes";
import { CORSHeaders } from "./utils/default-headers";
import { log } from "./utils/logging";

// Setup the OpenAPI backend
const api = new OpenAPIBackend({ definition: "./openapi/authentication-gw.yml" });

// register your framework specific request handlers here
api.register({
  ...OpenIdAuthRoutes,
  ...Saml2AuthRoutes,
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
        headers: CORSHeaders,
      };
    }

    // Pass lambda event cookies to openapi-backend
    const headers = event.headers;
    if (event.cookies instanceof Array && event.cookies.length > 0) {
      headers["Cookie"] = event.cookies.join(";");
    }

    log(event.requestContext.http.method, event.rawPath);

    return await api.handleRequest(
      {
        method: event.requestContext.http.method,
        path: event.rawPath,
        // @ts-ignore, openapi-backend definition does not define undefined, witch is a valid value
        query: event.queryStringParameters,
        body: event.body,
        // @ts-ignore, openapi-backend definition does not define undefined, witch is a valid value
        headers: headers,
      },
      event,
      context
    );
  } catch (error) {
    return InternalServerErrorHandler(error);
  }
};
