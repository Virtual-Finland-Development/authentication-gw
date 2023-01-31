import { APIGatewayProxyEventV2, Context as APIGatewayContext } from "aws-lambda";
import OpenAPIBackend from "openapi-backend";

import AppRoutes from "./routes/AppRoutes";
import BaseRoutes from "./routes/BaseRoutes";

import { getCORSHeaders } from "./utils/default-headers";
import { debug, log } from "./utils/logging";
import { InternalServerErrorHandler } from "./utils/route-utils";
import Runtime from "./utils/Runtime";
const { promises: fs } = require("fs");

// Setup the OpenAPI backend
const api = new OpenAPIBackend({
  definition: "./openapi/swagger.yml",
  ajvOpts: {
    formats: {
      "date-time": (data: string) => {
        return !isNaN(Date.parse(data));
      },
      uri: (data: string) => {
        return data.includes("://");
      },
    },
  },
});

// register your framework specific request handlers here
api.register({
  ...AppRoutes,
  ...BaseRoutes,
});

// initalize the backend
api.init();

// Lambda http event handler
export const handler = async (event: APIGatewayProxyEventV2, context: APIGatewayContext) => {
  try {
    // Initialize Runtime for the request
    const headers = event.headers;
    Runtime.initializeRequest(headers);

    // Handle options request
    if (event.requestContext.http.method === "OPTIONS") {
      return {
        statusCode: 202, // Accepted
        headers: getCORSHeaders(),
      };
    }

    log(event.requestContext.http.method, event.rawPath);

    // Handle the special, backend overriding routes
    if (event.rawPath.startsWith("/docs") && event.requestContext.http.method === "GET") {
      return handleSwaggerDocsRequest(event);
    }

    // Pass lambda event cookies to openapi-backend
    if (event.cookies instanceof Array && event.cookies.length > 0) {
      debug("Cookies", JSON.stringify(event.cookies));
      headers["Cookie"] = event.cookies.join(";");
    }

    // Exec request handling
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
    return InternalServerErrorHandler(error, event);
  }
};

/**
 * Swagger docs handler
 *
 * @param event
 * @returns
 */
async function handleSwaggerDocsRequest(event: APIGatewayProxyEventV2) {
  if (event.rawPath === "/docs/openapi/swagger.yml") {
    return {
      statusCode: 200,
      body: await fs.readFile("./openapi/swagger.yml", "utf8"),
      headers: {
        "Content-Type": "text/yaml",
      },
    };
  } else if (event.rawPath === "/docs/" || event.rawPath === "/docs" || event.rawPath === "/docs/index.html") {
    return {
      statusCode: 200,
      body: await fs.readFile("./openapi/index.html", "utf-8"),
      headers: { "Content-Type": "text/html" },
    };
  }

  return {
    statusCode: 404,
    body: "Not found",
  };
}
