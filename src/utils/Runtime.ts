import { APIGatewayProxyEventHeaders } from "aws-lambda";
import Settings from "./Settings";
import { slashTrim } from "./transformers";

const runtimeState = {
  appHost: "",
  requestOrigin: "",
};

export default {
  initializeRequest(headers: APIGatewayProxyEventHeaders): void {
    if (Settings.hasEnv("AUTHGW_ENDPOINT_URL_OVERRIDE")) {
      const url = new URL(Settings.getEnv("AUTHGW_ENDPOINT_URL_OVERRIDE"));
      runtimeState.appHost = url.host;
    } else {
      runtimeState.appHost = String(headers?.host);
    }
    runtimeState.requestOrigin = String(headers?.origin);
  },
  getAppHost(): string {
    if (!runtimeState.appHost) {
      throw new Error("Runtime host is not initialized");
    }
    return runtimeState.appHost;
  },
  getAppUrl(path?: string): string {
    const postfix = path ? `/${slashTrim(path)}` : "";
    return `https://${this.getAppHost()}${postfix}`;
  },
  getRequestOrigin(): string {
    return runtimeState.requestOrigin;
  },
};
