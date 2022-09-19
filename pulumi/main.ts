// @see: https://github.com/pulumi/examples/tree/master/aws-ts-apigatewayv2-http-api
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import Settings from "../src/utils/Settings";
import { getApiGateway, createLambdaFunction, createLambdaRoute, createDefaultStage } from "./pulumi-helpers";

const apiStage = "dev";

const apiGw = getApiGateway(`${apiStage}-authentication-gw`);

const nodeModulesLayer = new aws.lambda.LayerVersion("authentication-gw-dependenices-layer", {
  code: new pulumi.asset.AssetArchive({
    "./nodejs/node_modules": new pulumi.asset.FileArchive("./.lambda/layers/node_modules"),
  }),
  compatibleRuntimes: [aws.lambda.Runtime.NodeJS16dX],
  layerName: "authentication-gw-dependenices-layer",
});

/**
 * Api app lambda
 */
const apiAppLambdaFunction = createLambdaFunction(
  apiGw,
  "authentication-gw-dev-api-app",
  "api-app.handler",
  new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../dist"),
    "./openapi": new pulumi.asset.FileArchive("../openapi"),
  }),
  {
    STAGE: apiStage,
    AUTH_PROVIDER_REDIRECT_BACK_HOST: Settings.getEnv("AUTH_PROVIDER_REDIRECT_BACK_HOST"),
    APP_CONTEXT_REDIRECT_FALLBACK_URL: Settings.getEnv("APP_CONTEXT_REDIRECT_FALLBACK_URL"),
  },
  nodeModulesLayer
);

/**
 * Api docs lambda
 */
const apiDocsLambdaFunction = createLambdaFunction(
  apiGw,
  "authentication-gw-dev-api-docs",
  "api-docs.handler",
  new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../dist"),
    "./openapi": new pulumi.asset.FileArchive("../openapi"),
  }),
  {},
  nodeModulesLayer
);

// routes
const appRoutes = [
  createLambdaRoute(apiGw, "api-app", apiAppLambdaFunction, "ANY", "/{proxy+}"),
  createLambdaRoute(apiGw, "api-docs", apiDocsLambdaFunction, "GET", "/docs/{proxy+}"),
];

// Api gateway endpoint
createDefaultStage(apiGw, appRoutes);

// Export the endpoint
export const endpoint = pulumi.interpolate`${apiGw.apiEndpoint}`;
