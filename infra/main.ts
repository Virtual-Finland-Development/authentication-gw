// @see: https://github.com/pulumi/examples/tree/master/aws-ts-apigatewayv2-http-api
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import Settings from "../src/utils/Settings";
import { createDynamoDBCacheTable } from "./resources/DynamoDBCacheTable";
import { createApiEndpoint, createLambdaRoute, createStack } from "./resources/LambdaApiGatewayV2";
import { createStackConfig } from "./utils";

const configuration = createStackConfig({
  name: "authentication-gw",
  stage: pulumi.getStack(),
  project: "Virtual Finland",
  pulumiOrganization: pulumi.getOrganization(),
});

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
 * DynamoDB table
 */
const cacheTable = createDynamoDBCacheTable(configuration, stack.role);
export const dynamoDBCacheTableName = cacheTable.name; // For pulumi output

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
        DYNAMODB_CACHE_TABLE_NAME: dynamoDBCacheTableName,
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
