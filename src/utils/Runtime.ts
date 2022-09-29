import { APIGatewayProxyEventHeaders } from "aws-lambda";

const runtimeState: { host: string } = {
  host: "",
};

export default {
  initializeRequest(headers: APIGatewayProxyEventHeaders): void {
    runtimeState.host = String(headers?.host);
  },
  getAppHost(): string {
    if (!runtimeState.host) {
      throw new Error("Runtime host is not initialized");
    }
    return runtimeState.host;
  },
  getAppUrl(path?: string): string {
    let postfix = "";
    if (path) {
      postfix = `/${path.startsWith("/") ? path.substring(1) : path}`;
    }
    return `https://${this.getAppHost()}${postfix}`;
  },
};
