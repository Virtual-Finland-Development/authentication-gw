// @see: https://www.pulumi.com/docs/guides/crosswalk/aws/api-gateway/
import * as aws from "@pulumi/aws";
import pulumi from "@pulumi/pulumi";

import Settings from "../src/utils/Settings";

const compiledAppPath = "../dist";
const projectTag = { Project: "Authenticator" };
const apiStage = "dev";

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

const lambdaRoleAttachment = new aws.iam.RolePolicyAttachment("lambdaRoleAttachment", {
  role: lambdaRole,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

const apigw = new aws.apigatewayv2.Api("httpApiGateway", {
  protocolType: "HTTP",
});

const apiAppLambdaFunction = new aws.lambda.Function(`authentication-gw-dev-api-app`, {
  architectures: ["arm64"],
  runtime: "nodejs16.x",
  role: lambdaRole.arn,
  handler: "api-app.handler",
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive(compiledAppPath),
  }),
  tags: projectTag,
  environment: {
    variables: {
      STAGE: apiStage,
      AUTH_PROVIDER_REDIRECT_BACK_HOST: Settings.getEnv("AUTH_PROVIDER_REDIRECT_BACK_HOST"),
      APP_CONTEXT_REDIRECT_FALLBACK_URL: Settings.getEnv("APP_CONTEXT_REDIRECT_FALLBACK_URL"),
    },
  },
});

const lambdaPermission = new aws.lambda.Permission(
  "lambdaPermission",
  {
    action: "lambda:InvokeFunction",
    principal: "apigateway.amazonaws.com",
    function: apiAppLambdaFunction,
    sourceArn: pulumi.interpolate`${apigw.executionArn}/*/*`,
  },
  { dependsOn: [apigw, apiAppLambdaFunction] }
);

/* const apiDocsLambdaFunction = new aws.lambda.Function(`authentication-gw-dev-api-docs`, {
  architectures: ["arm64"],
  runtime: "nodejs16.x",
  role: lambdaRole.arn,
  handler: "api-docs.handler",
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive(compiledAppPath),
  }),
  tags: projectTag,
}); */

const integration = new aws.apigatewayv2.Integration("lambdaIntegration", {
  apiId: apigw.id,
  integrationType: "AWS_PROXY",
  integrationUri: apiAppLambdaFunction.arn,
  integrationMethod: "ANY",
  payloadFormatVersion: "2.0",
  passthroughBehavior: "WHEN_NO_MATCH",
});

const route = new aws.apigatewayv2.Route("apiRoute", {
  apiId: apigw.id,
  routeKey: "$default",
  target: pulumi.interpolate`integrations/${integration.id}`,
});

const stage = new aws.apigatewayv2.Stage(
  apiStage,
  {
    apiId: apigw.id,
    name: stack,
    routeSettings: [
      {
        routeKey: route.routeKey,
        throttlingBurstLimit: 5000,
        throttlingRateLimit: 10000,
      },
    ],
    autoDeploy: true,
  },
  { dependsOn: [route] }
);

export const endpoint = pulumi.interpolate`${apigw.apiEndpoint}/${stage.name}`;
