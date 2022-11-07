import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ifObjectEmpty } from "../../src/utils/transformers";

/* ---------------Types------------------- */

export type LambdaApiGatewayV2Stack = {
  role: aws.iam.Role;
  apiGateway: aws.apigatewayv2.Api;
  tags: { [name: string]: string };
};

type LambdaFunctionConfig = {
  name: string;
  handler: string;
  code: any;
  environment: { [name: string]: string };
  nodeModulesLayer: aws.lambda.LayerVersion;
};

type LambdaRouteConfig = {
  name: string;
  method: "ANY" | "POST" | "GET";
  path: string;
};

export type StackConfig = {
  name: string;
  stage: string;
  project: string;
};

/* ---------------Public------------------- */

/**
 *
 * @param apiGatewayName
 * @returns
 */
export function createStack(apiGatewayName: string, configuration: StackConfig): LambdaApiGatewayV2Stack {
  const apiGw = getApiGateway(apiGatewayName);
  const role = getLambdaRole();

  return {
    apiGateway: apiGw,
    role: role,
    tags: { Name: configuration.name, Environment: configuration.stage, Project: configuration.project },
  };
}

/**
 *
 * @param stack
 * @param configuration
 * @returns
 */
export function createLambdaRoute(
  stack: LambdaApiGatewayV2Stack,
  configuration: {
    route: LambdaRouteConfig;
    lambdaFunction: LambdaFunctionConfig;
  }
) {
  const lambdaFunction = createLambdaFunction(stack, configuration.lambdaFunction);
  const route = createApiGatewayRoute(stack, lambdaFunction, configuration.route);
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

function getLambdaRole() {
  const lambdaRole = new aws.iam.Role("lambdaRole", {
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

  new aws.iam.RolePolicyAttachment("lambdaRoleAttachment", {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicyAttachment("lambdaRoleSSMAccessAttachment", {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicy.AmazonSSMFullAccess,
  });

  return lambdaRole;
}

function getApiGateway(name: string) {
  return new aws.apigatewayv2.Api(`${name}-api-gw`, {
    protocolType: "HTTP",
  });
}

function createLambdaFunction(
  stack: LambdaApiGatewayV2Stack,
  configuration: {
    name: string;
    handler: string;
    code: any;
    environment: { [name: string]: string };
    nodeModulesLayer: aws.lambda.LayerVersion;
  }
): aws.lambda.Function {
  const lamdaFunction = new aws.lambda.Function(configuration.name, {
    runtime: "nodejs16.x",
    role: stack.role.arn,
    handler: configuration.handler,
    code: configuration.code,
    tags: stack.tags,
    environment: ifObjectEmpty(configuration.environment) ? undefined : { variables: configuration.environment },
    layers: [configuration.nodeModulesLayer.arn],
    timeout: 15,
    memorySize: 1024,
  });

  // Create permission
  new aws.lambda.Permission(
    `${configuration.name}-lambdaPermission`,
    {
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      function: lamdaFunction.name,
      sourceArn: pulumi.interpolate`${stack.apiGateway.executionArn}/*/*`,
    },
    { dependsOn: [stack.apiGateway, lamdaFunction] }
  );

  return lamdaFunction;
}

function createApiGatewayRoute(stack: LambdaApiGatewayV2Stack, lambdaFunction: aws.lambda.Function, configuration: LambdaRouteConfig): aws.apigatewayv2.Route {
  const integration = new aws.apigatewayv2.Integration(`${configuration.name}-lambdaIntegration`, {
    apiId: stack.apiGateway.id,
    integrationType: "AWS_PROXY",
    integrationUri: lambdaFunction.arn,
    integrationMethod: configuration.method,
    payloadFormatVersion: "2.0",
    passthroughBehavior: "WHEN_NO_MATCH",
  });

  return new aws.apigatewayv2.Route(`${configuration.name}-apiRoute`, {
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
