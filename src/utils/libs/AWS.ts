export const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const parameterStore = new AWS.SSM();

export const getSecretParameter = async (name: string) => {
  const { Parameter } = await parameterStore.getParameter({ Name: name, WithDecryption: true }).promise();
  return Parameter?.Value;
};
