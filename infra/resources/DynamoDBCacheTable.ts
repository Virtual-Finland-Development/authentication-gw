import * as aws from "@pulumi/aws";
import { StackConfig } from "../types";

export function createDynamoDBCacheTable(stackConfig: StackConfig, lambdaFunctionExecRole: aws.iam.Role) {
  const tableName = stackConfig.generateResourceName("CacheTable");
  const cacheTable = new aws.dynamodb.Table(tableName, {
    name: tableName,
    attributes: [{ name: "CacheKey", type: "S" }],
    hashKey: "CacheKey",
    ttl: {
      attributeName: "TimeToLive",
      enabled: true,
    },
    billingMode: "PAY_PER_REQUEST",
    tags: stackConfig.getTags(),
  });

  const policyName = stackConfig.generateResourceName("dynamoDBPolicy");
  const dynamoDBPolicy = new aws.iam.Policy(policyName, {
    name: policyName,
    description: "DynamoDB policy for authentication-gw",
    policy: cacheTable.arn.apply((arn) => {
      return JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["dynamodb:UpdateItem", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:DescribeTable", "dynamodb:Scan"],
            Resource: [arn],
          },
        ],
      });
    }),
  });

  // Attach to role
  const rolePolicyAttachmentName = stackConfig.generateResourceName("dynamoDBPolicyAttachment");
  new aws.iam.RolePolicyAttachment(rolePolicyAttachmentName, {
    role: lambdaFunctionExecRole.name,
    policyArn: dynamoDBPolicy.arn,
  });

  return cacheTable;
}
