import AWS from "aws-sdk";

//
// --> public <--
//

export async function scanForDynamoDBItems(tableName: string, filterExpression: string, expressionAttributeValues: any, limit?: number) {
  const dynamoDB = await getDynamoDBClient();
  const params: any = {
    TableName: tableName,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  if (limit) {
    params["Limit"] = limit;
  }

  const { Items } = await dynamoDB.scan(params).promise();
  return Items;
}

export async function getDynamoDBItem(tableName: string, key: string): Promise<string | number | boolean | null> {
  const dynamoDB = await getDynamoDBClient();
  const params = {
    TableName: tableName,
    Key: {
      key: key,
    },
  };
  const { Item } = await dynamoDB.get(params).promise();
  return Item;
}

export async function putDynamoDBItem(tableName: string, item: Record<string, string | number | boolean | null>) {
  const dynamoDB = await getDynamoDBClient();
  const params = {
    TableName: tableName,
    Item: item,
  };
  await dynamoDB.put(params).promise();
}

export async function deleteDynamoDBItem(tableName: string, key: string) {
  const dynamoDB = await getDynamoDBClient();
  const params = {
    TableName: tableName,
    Key: {
      key: key,
    },
  };
  await dynamoDB.delete(params).promise();
}

//
// --> private <--
//
let dynamoDBClient: any;

export async function getDynamoDBClient() {
  if (!dynamoDBClient) {
    dynamoDBClient = new AWS.DynamoDB.DocumentClient();
  }
  return dynamoDBClient;
}
