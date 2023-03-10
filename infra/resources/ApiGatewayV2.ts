import * as aws from "@pulumi/aws";
import * as awsNative from "@pulumi/aws-native";
import * as pulumi from "@pulumi/pulumi";
import { StackConfig } from "../types";

export function createApiGatewayV2(stackConfig: StackConfig) {
  const apiGwName = stackConfig.generateResourceName("apiGateway");
  return new aws.apigatewayv2.Api(apiGwName, {
    protocolType: "HTTP",
  });
}

export function createApiGatewayV2Route(stackConfig: StackConfig, apiGatewayV2: aws.apigatewayv2.Api, lambdaFunction: awsNative.lambda.Function): aws.apigatewayv2.Route {
  const integrationName = stackConfig.generateResourceName("lambdaIntegration");
  const integration = new aws.apigatewayv2.Integration(integrationName, {
    apiId: apiGatewayV2.id,
    integrationType: "AWS_PROXY",
    integrationUri: lambdaFunction.arn,
    integrationMethod: "ANY",
    payloadFormatVersion: "2.0",
    passthroughBehavior: "WHEN_NO_MATCH",
  });

  const routeName = stackConfig.generateResourceName("apiRoute");
  return new aws.apigatewayv2.Route(routeName, {
    apiId: apiGatewayV2.id,
    routeKey: "ANY /{proxy+}",
    target: pulumi.interpolate`integrations/${integration.id}`,
  });
}

export function createApiGatewayV2Endpoint(apiGatewayV2: aws.apigatewayv2.Api, routes: Array<aws.apigatewayv2.Route>): pulumi.Output<string> {
  // Api gateway stage
  createApiGatewayDefaultStage(apiGatewayV2, routes);

  // Export the endpoint
  return pulumi.interpolate`${apiGatewayV2.apiEndpoint}`;
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
