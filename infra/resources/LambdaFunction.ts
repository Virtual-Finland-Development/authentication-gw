import * as aws from "@pulumi/aws";
import * as awsNative from "@pulumi/aws-native";
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

export function createLambdaFunction(
  stackConfig: StackConfig,
  execRole: aws.iam.Role,
  apiGatewayV2: aws.apigatewayv2.Api,
  dynamoDBCacheTableName: Output<string>
): awsNative.lambda.Function {
  // Dependencies layer for lambda functions
  const nodeModulesLayerName = stackConfig.generateResourceName("nodeModulesLayer");
  const nodeModulesLayer = new aws.lambda.LayerVersion(nodeModulesLayerName, {
    code: new pulumi.asset.AssetArchive({
      "./nodejs/node_modules": new pulumi.asset.FileArchive("./.lambda/layers/node_modules"),
    }),
    compatibleRuntimes: [aws.lambda.Runtime.NodeJS16dX],
    layerName: nodeModulesLayerName,
  });

  const snapStartBucketName = stackConfig.generateResourceName("snapstart-bucket");
  const snapStartBucket = new aws.s3.Bucket(snapStartBucketName, {
    versioning: {
      enabled: true,
    },
  });

  const snapStartFunctionCodeName = stackConfig.generateResourceName("function-code");
  const snapStartFunctionCode = new aws.s3.BucketObject(snapStartFunctionCodeName, {
    bucket: snapStartBucket.bucket,
    source: new pulumi.asset.AssetArchive({
      ".": new pulumi.asset.FileArchive("../dist"),
      "./openapi": new pulumi.asset.FileArchive("../openapi"),
    }),
  });

  // Lambda function
  const functionName = stackConfig.generateResourceName("lambdaFunction");
  const lamdaFunction = new awsNative.lambda.Function(functionName, {
    runtime: "nodejs18.x",
    role: execRole.arn,
    handler: "app.handler",
    code: {
      s3Bucket: snapStartFunctionCode.bucket,
      s3Key: snapStartFunctionCode.key,
      s3ObjectVersion: snapStartFunctionCode.versionId,
    },
    snapStart: {
      applyOn: "PublishedVersions",
    },
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
    //tags: stackConfig.getTags(), // @TODO: Fix this
  });

  // Create permission
  const permissionName = stackConfig.generateResourceName("invokePermission");
  new aws.lambda.Permission(
    permissionName,
    {
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      function: lamdaFunction.arn,
      sourceArn: pulumi.interpolate`${apiGatewayV2.executionArn}/*/*`,
    },
    { dependsOn: [apiGatewayV2, lamdaFunction] }
  );

  return lamdaFunction;
}
