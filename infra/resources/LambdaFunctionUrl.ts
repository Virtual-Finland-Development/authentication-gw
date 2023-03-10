import * as aws from "@pulumi/aws";
import * as awsnative from "@pulumi/aws-native";
import { local } from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import { StackConfig } from "../types";

export function createLambdaFunctionUrl(stackConfig: StackConfig, lambdaFunction: aws.lambda.Function) {
  const lambdaFunctionUrl = new awsnative.lambda.Url(stackConfig.generateResourceName("lambdaFunctionUrl"), {
    targetFunctionArn: lambdaFunction.arn,
    authType: awsnative.lambda.UrlAuthType.None,
  });

  new local.Command(
    stackConfig.generateResourceName("addFunctionUrlPermissionCommand"),
    {
      create: pulumi.interpolate`aws lambda add-permission --function-name ${lambdaFunction.name} --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE --statement-id FunctionURLAllowPublicAccess`,
    },
    { deleteBeforeReplace: true, dependsOn: [lambdaFunction] }
  );

  return lambdaFunctionUrl;
}
