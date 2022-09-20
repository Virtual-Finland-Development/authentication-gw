// @see: https://github.com/pulumi/examples/tree/master/aws-ts-apigatewayv2-http-api
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import Settings from "../src/utils/Settings";
import { createStack, createLambdaRoute, createApiEndpoint } from "./resources/LambdaApiGatewayV2";

const configuration = {
  name: "Authenticator",
  stage: "dev",
};

/**
 * Dependencies layer for lambda functions
 */
const nodeModulesLayer = new aws.lambda.LayerVersion("authentication-gw-dependenices-layer", {
  code: new pulumi.asset.AssetArchive({
    "./nodejs/node_modules": new pulumi.asset.FileArchive("./.lambda/layers/node_modules"),
  }),
  compatibleRuntimes: [aws.lambda.Runtime.NodeJS16dX],
  layerName: "authentication-gw-dependenices-layer",
});

/**
 * Stack
 */
const stack = createStack(`${configuration.stage}-authentication-gw`, configuration.name);

/**
 * Routes
 */
const appRoutes = [
  createLambdaRoute(
    stack,
    { name: "api-app", method: "ANY", path: "/{proxy+}" },
    {
      name: "authentication-gw-dev-api-app",
      handler: "api-app.handler",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist"),
        "./openapi": new pulumi.asset.FileArchive("../openapi"),
      }),
      environment: {
        STAGE: configuration.stage,
        AUTH_PROVIDER_REDIRECT_BACK_HOST: Settings.getEnv("AUTH_PROVIDER_REDIRECT_BACK_HOST"),
        APP_CONTEXT_REDIRECT_FALLBACK_URL: Settings.getEnv("APP_CONTEXT_REDIRECT_FALLBACK_URL"),
      },
      nodeModulesLayer: nodeModulesLayer,
    }
  ),
  createLambdaRoute(
    stack,
    { name: "api-docs", method: "GET", path: "/docs/{proxy+}" },
    {
      name: "ntication-gw-dev-api-docs",
      handler: "api-docs.handler",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist"),
        "./openapi": new pulumi.asset.FileArchive("../openapi"),
      }),
      environment: {},
      nodeModulesLayer: nodeModulesLayer,
    }
  ),
];

// Export the Api gateway endpoint
export const endpoint = createApiEndpoint(stack, appRoutes);
