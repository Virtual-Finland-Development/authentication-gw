// @see: https://github.com/pulumi/examples/tree/master/aws-ts-apigatewayv2-http-api
import * as pulumi from "@pulumi/pulumi";

import { createApiGatewayV2, createApiGatewayV2Endpoint, createApiGatewayV2Route } from "./resources/ApiGatewayV2";
import { createDynamoDBCacheTable } from "./resources/DynamoDBCacheTable";
import { createLambdaFunction, createLambdaRole } from "./resources/LambdaFunction";
import { createStackConfig } from "./utils";

const stackConfig = createStackConfig({
  name: "authentication-gw",
  stage: pulumi.getStack(),
  project: pulumi.getOrganization(),
});

const apiGwV2 = createApiGatewayV2(stackConfig);
const lambdaExecRole = createLambdaRole(stackConfig);

const cacheTable = createDynamoDBCacheTable(stackConfig, lambdaExecRole);
const lambdaFunction = createLambdaFunction(stackConfig, lambdaExecRole, apiGwV2, cacheTable.name);
const route = createApiGatewayV2Route(stackConfig, apiGwV2, lambdaFunction);
export const endpoint = createApiGatewayV2Endpoint(apiGwV2, [route]);

// Export testbed api dependency endpoint url (for the demo webapp)
const testbedApiStackRef = new pulumi.StackReference(`${stackConfig.project}/testbed-api/${stackConfig.stage}`);
export const testbedApiEndpoint = testbedApiStackRef.getOutput("url");
