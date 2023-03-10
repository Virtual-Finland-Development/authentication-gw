// @see: https://github.com/pulumi/examples/tree/master/aws-ts-apigatewayv2-http-api
import * as pulumi from "@pulumi/pulumi";

import { createDynamoDBCacheTable } from "./resources/DynamoDBCacheTable";
import { createLambdaFunction, createLambdaRole } from "./resources/LambdaFunction";
import { createLambdaFunctionUrl } from "./resources/LambdaFunctionUrl";
import { createStackConfig } from "./utils";

const stackConfig = createStackConfig({
  name: "authentication-gw",
  stage: pulumi.getStack(),
  project: pulumi.getOrganization(),
});

const lambdaExecRole = createLambdaRole(stackConfig);

const cacheTable = createDynamoDBCacheTable(stackConfig, lambdaExecRole);
const lambdaFunction = createLambdaFunction(stackConfig, lambdaExecRole, cacheTable.name);
const lambdaFunctionUrl = createLambdaFunctionUrl(stackConfig, lambdaFunction);
export const endpoint = lambdaFunctionUrl.functionUrl;

// Export testbed api dependency endpoint url (for the demo webapp)
const testbedApiStackRef = new pulumi.StackReference(`${stackConfig.project}/testbed-api/${stackConfig.stage === "test" ? "dev" : stackConfig.stage}`);
export const testbedApiEndpoint = testbedApiStackRef.getOutput("url");
