import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ifObjectEmpty } from "../src/utils/transformers";

const projectTag = { Project: "Authenticator" };

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

new aws.iam.RolePolicyAttachment("lambdaRoleSSMAccessAttachment", {
  role: lambdaRole,
  policyArn: aws.iam.ManagedPolicy.AmazonSSMFullAccess,
});

export function getApiGateway(name: string) {
  return new aws.apigatewayv2.Api(`${name}-api-gw`, {
    protocolType: "HTTP",
  });
}

export function createLambdaFunction(
  apigw: aws.apigatewayv2.Api,
  name: string,
  handler: string,
  code: any,
  environment: { [name: string]: string },
  nodeModulesLayer: aws.lambda.LayerVersion
): aws.lambda.Function {
  const lamdaFunction = new aws.lambda.Function(name, {
    runtime: "nodejs16.x",
    role: lambdaRole.arn,
    handler: handler,
    code: code,
    tags: projectTag,
    environment: ifObjectEmpty(environment) ? undefined : { variables: environment },
    layers: [nodeModulesLayer.arn],
    timeout: 15,
    memorySize: 1024,
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

export function createLambdaRoute(
  apigw: aws.apigatewayv2.Api,
  name: string,
  lambdaFunction: aws.lambda.Function,
  method: "ANY" | "POST" | "GET",
  path: string
): aws.apigatewayv2.Route {
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

export function createDefaultStage(apigw: aws.apigatewayv2.Api, appRoutes: Array<aws.apigatewayv2.Route>) {
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
