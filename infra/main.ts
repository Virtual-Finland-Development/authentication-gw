// @see: https://github.com/pulumi/examples/tree/master/aws-ts-apigatewayv2-http-api
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import Settings from "../src/utils/Settings";
import { createApiEndpoint, createLambdaRoute, createStack, StackConfig } from "./resources/LambdaApiGatewayV2";

const configuration: StackConfig = {
  name: "Authenticator",
  stage: pulumi.getStack(),
  project: "Virtual Finland",
  pulumiOrganization: pulumi.getOrganization(),
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
const stack = createStack(`${configuration.stage}-authentication-gw`, configuration);

/**
 * Routes
 */
const appRoutes = [
  createLambdaRoute(stack, {
    route: { name: "api-app", method: "ANY", path: "/{proxy+}" },
    lambdaFunction: {
      name: "authentication-gw-dev-api-app",
      handler: "app.handler",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist"),
        "./openapi": new pulumi.asset.FileArchive("../openapi"),
      }),
      environment: {
        STAGE: configuration.stage,
        DEBUG_MODE: Settings.getEnv("DEBUG_MODE", "false"),
      },
      nodeModulesLayer: nodeModulesLayer,
    },
  }),
];

// Export the Api gateway endpoint
export const endpoint = createApiEndpoint(stack, appRoutes);

// Export testbed api dependency endpoint url (for the demo webapp)
const testbedApiStackRef = new pulumi.StackReference(`${configuration.pulumiOrganization}/testbed-api/${configuration.stage}`);
export const testbedApiEndpoint = testbedApiStackRef.getOutput("url");
