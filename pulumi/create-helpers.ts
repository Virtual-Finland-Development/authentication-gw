import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ifObjectEmpty } from "../src/utils/transformers";

const projectTag = { Project: "Authenticator" };
const stack = pulumi.getStack();

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
  role: lambdaRole,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

export const apigw = new aws.apigatewayv2.Api("httpApiGateway", {
  protocolType: "HTTP",
});

export function createLambdaFunction(name: string, handler: string, code: any, environment: { [name: string]: string } = {}): aws.lambda.Function {
  const lamdaFunction = new aws.lambda.Function(name, {
    architectures: ["x86_64"],
    runtime: "nodejs16.x",
    role: lambdaRole.arn,
    handler: handler,
    code: code,
    tags: projectTag,
    environment: ifObjectEmpty(environment) ? undefined : { variables: environment },
  });

  // Create permission
  new aws.lambda.Permission(
    `${name}-lambdaPermission`,
    {
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      function: lamdaFunction,
      sourceArn: pulumi.interpolate`${apigw.executionArn}/*/*`,
    },
    { dependsOn: [apigw, lamdaFunction] }
  );

  return lamdaFunction;
}

export function createLambdaRoute(name: string, lambdaFunction: aws.lambda.Function, method: "ANY" | "POST" | "GET", path: string): aws.apigatewayv2.Route {
  const integration = new aws.apigatewayv2.Integration(`${name}-lambdaIntegration`, {
    apiId: apigw.id,
    integrationType: "AWS_PROXY",
    integrationUri: lambdaFunction.arn,
    integrationMethod: method,
    payloadFormatVersion: "2.0",
    passthroughBehavior: "WHEN_NO_MATCH",
  });

  return new aws.apigatewayv2.Route(`${name}-apiRoute`, {
    apiId: apigw.id,
    routeKey: `${method} ${path}`,
    target: pulumi.interpolate`integrations/${integration.id}`,
  });
}

export function createStage(apiStage: string, appRoutes: Array<aws.apigatewayv2.Route>) {
  return new aws.apigatewayv2.Stage(
    apiStage,
    {
      apiId: apigw.id,
      name: stack,
      routeSettings: appRoutes.map((appRoute) => {
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
