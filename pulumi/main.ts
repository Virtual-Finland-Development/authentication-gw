// @see: https://github.com/pulumi/examples/tree/master/aws-ts-apigatewayv2-http-api
import pulumi from "@pulumi/pulumi";

import Settings from "../src/utils/Settings";
import { apigw, createLambdaFunction, createLambdaRoute, createStage } from "./create-helpers";

const apiStage = "dev";

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
  }
);

/**
 * Api docs lambda
 */
const apiDocsLambdaFunction = createLambdaFunction(
  "authentication-gw-dev-api-docs",
  "api-docs.handler",
  new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../dist"),
  })
);

// routes
const appRoutes = [createLambdaRoute(apiAppLambdaFunction, "ANY", "/{proxy+}"), createLambdaRoute(apiDocsLambdaFunction, "GET", "/docs/{proxy+}")];

// Api gateway endpoint
const stage = createStage(apiStage, appRoutes);

// Export the endpoint
export const endpoint = pulumi.interpolate`${apigw.apiEndpoint}/${stage.name}`;
