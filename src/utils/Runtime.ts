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
  getAppUrl(): string {
    return `https://${this.getAppHost()}`;
  },
};
