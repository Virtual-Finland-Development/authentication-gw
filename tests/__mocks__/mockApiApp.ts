import { handler } from "../../src/api-app";
export async function testRequestEvent(method: string, rawPath: string, queryStringParameters?: any, body?: any, headers?: any) {
  const event = {
    routeKey: `${method} ${rawPath}`,
    rawPath: rawPath,
    queryStringParameters: queryStringParameters,
    body: body,
    headers: headers,
    requestContext: { http: { method: method } },
  };
  const context = {};
  // @ts-ignore
  const result = await handler(event, context);
  return result;
}
