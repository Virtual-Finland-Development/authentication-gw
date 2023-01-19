import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export type LambdaApiGatewayV2Stack = {
  role: aws.iam.Role;
  apiGateway: aws.apigatewayv2.Api;
  tags: { [name: string]: string };
  config: StackConfig;
};

export type LambdaFunctionConfig = {
  name: string;
  handler: string;
  code: any;
  environment: { [name: string]: string | pulumi.Output<string> };
  nodeModulesLayer: aws.lambda.LayerVersion;
};

export type LambdaRouteConfig = {
  name: string;
  method: "ANY" | "POST" | "GET";
  path: string;
};

export type StackConfig = {
  name: string;
  stage: string;
  project: string;
  pulumiOrganization: string;
  getTags(): { [name: string]: string };
  generateResourceName(service: string): string;
};
