import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { Output } from "@pulumi/pulumi";
import Settings from "../../src/utils/Settings";
import { StackConfig } from "../types";

export function createLambdaRole(stackConfig: StackConfig) {
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

export function createLambdaFunction(stackConfig: StackConfig, execRole: aws.iam.Role, dynamoDBCacheTableName: Output<string>): aws.lambda.Function {
  // Dependencies layer for lambda functions
  const nodeModulesLayerName = stackConfig.generateResourceName("nodeModulesLayer");
  const nodeModulesLayer = new aws.lambda.LayerVersion(nodeModulesLayerName, {
    code: new pulumi.asset.AssetArchive({
      "./nodejs/node_modules": new pulumi.asset.FileArchive("./.lambda/layers/node_modules"),
    }),
    compatibleRuntimes: [aws.lambda.Runtime.NodeJS16dX],
    layerName: nodeModulesLayerName,
  });

  // Lambda function
  const functionName = stackConfig.generateResourceName("lambdaFunction");
  const lamdaFunction = new aws.lambda.Function(functionName, {
    runtime: "nodejs18.x",
    role: execRole.arn,
    handler: "app.handler",
    code: new pulumi.asset.AssetArchive({
      ".": new pulumi.asset.FileArchive("../dist"),
      "./openapi": new pulumi.asset.FileArchive("../openapi"),
    }),
    layers: [nodeModulesLayer.arn],
    environment: {
      variables: {
        STAGE: stackConfig.stage,
        DEBUG_MODE: Settings.getEnv("DEBUG_MODE", "false"),
        DYNAMODB_CACHE_TABLE_NAME: dynamoDBCacheTableName,
      },
    },
    timeout: 20,
    memorySize: 1024,
    tags: stackConfig.getTags(),
  });

  return lamdaFunction;
}
