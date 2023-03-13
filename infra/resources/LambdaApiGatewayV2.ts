import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ifObjectEmpty } from "../../src/utils/transformers";
import { LambdaApiGatewayV2Stack, LambdaFunctionConfig, LambdaRouteConfig, StackConfig } from "../types";

/* ---------------Public------------------- */

/**
 *
 * @param apiGatewayName
 * @returns
 */
export function createStack(stackConfig: StackConfig): LambdaApiGatewayV2Stack {
  const apiGw = getApiGateway(stackConfig);
  const role = getLambdaRole(stackConfig);

  return {
    apiGateway: apiGw,
    role: role,
    tags: stackConfig.getTags(),
    config: stackConfig,
  };
}

/**
 *
 * @param stack
 * @param configuration
 * @returns
 */
export function createLambdaRoute(
  apiV2stack: LambdaApiGatewayV2Stack,
  configuration: {
    route: LambdaRouteConfig;
    lambdaFunction: LambdaFunctionConfig;
  }
) {
  const lambdaFunction = createLambdaFunction(apiV2stack, configuration.lambdaFunction);
  const route = createApiGatewayRoute(apiV2stack, lambdaFunction, configuration.route);
  return route;
}

/**
 *
 * @param stack
 * @param routes
 * @returns
 */
export function createApiEndpoint(stack: LambdaApiGatewayV2Stack, routes: Array<aws.apigatewayv2.Route>): pulumi.Output<string> {
  // Api gateway stage
  createApiGatewayDefaultStage(stack.apiGateway, routes);

  // Export the endpoint
  return pulumi.interpolate`${stack.apiGateway.apiEndpoint}`;
}

/* ---------------Private------------------- */

function getLambdaRole(stackConfig: StackConfig) {
  const roleName = stackConfig.generateResourceName("lambdaRole");
  const lambdaRole = new aws.iam.Role(roleName, {
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Effect: "Allow",
          Sid: "",
        },
      ],
    },
  });

  const lambdaRoleAttachmentName = stackConfig.generateResourceName("lambdaRoleAttachment");
  new aws.iam.RolePolicyAttachment(lambdaRoleAttachmentName, {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
  });

  const lambdaRoleSSMAccessAttachmentName = stackConfig.generateResourceName("lambdaRoleSSMAccessAttachment");
  new aws.iam.RolePolicyAttachment(lambdaRoleSSMAccessAttachmentName, {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicy.AmazonSSMFullAccess,
  });

  return lambdaRole;
}

function getApiGateway(stackConfig: StackConfig) {
  const apiGwName = stackConfig.generateResourceName("apiGateway");
  return new aws.apigatewayv2.Api(apiGwName, {
    protocolType: "HTTP",
  });
}

function createLambdaFunction(apiV2stack: LambdaApiGatewayV2Stack, configuration: LambdaFunctionConfig): aws.lambda.Function {
  const functionName = apiV2stack.config.generateResourceName(`${configuration.name}-lambdaFunction`);
  const lamdaFunction = new aws.lambda.Function(functionName, {
    runtime: "nodejs16.x",
    role: apiV2stack.role.arn,
    handler: configuration.handler,
    code: configuration.code,
    tags: apiV2stack.tags,
    environment: ifObjectEmpty(configuration.environment) ? undefined : { variables: configuration.environment },
    layers: [configuration.nodeModulesLayer.arn],
    timeout: 20,
    memorySize: 1024,
  });

  // Create permission
  const permissionName = apiV2stack.config.generateResourceName("invokePermission");
  new aws.lambda.Permission(
    permissionName,
    {
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      function: lamdaFunction.name,
      sourceArn: pulumi.interpolate`${apiV2stack.apiGateway.executionArn}/*/*`,
    },
    { dependsOn: [apiV2stack.apiGateway, lamdaFunction] }
  );

  return lamdaFunction;
}

function createApiGatewayRoute(stack: LambdaApiGatewayV2Stack, lambdaFunction: aws.lambda.Function, configuration: LambdaRouteConfig): aws.apigatewayv2.Route {
  const integrationName = stack.config.generateResourceName("lambdaIntegration");
  const integration = new aws.apigatewayv2.Integration(integrationName, {
    apiId: stack.apiGateway.id,
    integrationType: "AWS_PROXY",
    integrationUri: lambdaFunction.arn,
    integrationMethod: configuration.method,
    payloadFormatVersion: "2.0",
    passthroughBehavior: "WHEN_NO_MATCH",
  });

  const routeName = stack.config.generateResourceName("apiRoute");
  return new aws.apigatewayv2.Route(routeName, {
    apiId: stack.apiGateway.id,
    routeKey: `${configuration.method} ${configuration.path}`,
    target: pulumi.interpolate`integrations/${integration.id}`,
  });
}

function createApiGatewayDefaultStage(apigw: aws.apigatewayv2.Api, appRoutes: Array<aws.apigatewayv2.Route>) {
  return new aws.apigatewayv2.Stage(
    "$default",
    {
      apiId: apigw.id,
      name: "$default",
      routeSettings: appRoutes.map((appRoute, index: number) => {
        return {
          routeKey: appRoute.routeKey,
          throttlingBurstLimit: 5000,
          throttlingRateLimit: 10000,
        };
      }),
      autoDeploy: true,
    },
    { dependsOn: appRoutes }
  );
}
