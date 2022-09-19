// @see: https://github.com/pulumi/examples/tree/master/aws-ts-apigatewayv2-http-api
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import Settings from "../src/utils/Settings";
import { apigw, createLambdaFunction, createLambdaRoute, createStage } from "./create-helpers";

const apiStage = "dev";

const nodeModulesLayer = new aws.lambda.LayerVersion("authentication-gw-dependenices-layer", {
  code: new pulumi.asset.AssetArchive({
    "./node_modules": new pulumi.asset.FileArchive("./.lambda/layers/node_modules"),
  }),
  compatibleRuntimes: [aws.lambda.Runtime.NodeJS16dX],
  layerName: "nodeModulesLayer",
});

/**
 * Api app lambda
 */
const apiAppLambdaFunction = createLambdaFunction(
  "authentication-gw-dev-api-app",
  "api-app.handler",
  new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../dist"),
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
  "authentication-gw-dev-api-docs",
  "api-docs.handler",
  new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../dist"),
  }),
  {},
  nodeModulesLayer
);

// routes
const appRoutes = [createLambdaRoute("api-app", apiAppLambdaFunction, "ANY", "/{proxy+}"), createLambdaRoute("api-docs", apiDocsLambdaFunction, "GET", "/docs/{proxy+}")];

// Api gateway endpoint
const stage = createStage(apiStage, appRoutes);

// Export the endpoint
export const endpoint = pulumi.interpolate`${apigw.apiEndpoint}/${stage.name}`;
