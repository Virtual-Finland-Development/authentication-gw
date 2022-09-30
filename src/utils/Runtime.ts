import { APIGatewayProxyEventHeaders } from "aws-lambda";
import { slashTrim } from "./transformers";

const runtimeState = {
  host: "",
  origin: "",
};

export default {
  initializeRequest(headers: APIGatewayProxyEventHeaders): void {
    runtimeState.host = String(headers?.host);
    runtimeState.origin = String(headers?.origin);
  },
  getAppHost(): string {
    if (!runtimeState.host) {
      throw new Error("Runtime host is not initialized");
    }
    return runtimeState.host;
  },
  getAppUrl(path?: string): string {
    const postfix = path ? `/${slashTrim(path)}` : "";
    return `https://${this.getAppHost()}${postfix}`;
  },
  getRequestOrigin(): string {
    return runtimeState.origin;
  },
};
