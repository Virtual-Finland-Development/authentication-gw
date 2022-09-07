import { APIGatewayProxyEventV2 } from "aws-lambda";

const swaggerUi = require("aws-serverless-swagger-ui");
const swaggerHandler = swaggerUi.setup("./openapi/authentication-gw.yml");

const fsPromises = require("fs/promises");

export const handler = async (event: APIGatewayProxyEventV2) => {
  const files = await fsPromises.readdir("./");
  console.log(files);
  let eventPath = event.rawPath;
  if (eventPath === "/docs") {
    eventPath = "/docs/index.html";
  }
  return (await swaggerHandler)({
    path: eventPath,
  });
};
