import { getSecretParameter } from "./libs/AWS";

export default {
  async getSecret(key: string, defaultValue?: string): Promise<string> {
    // Skip aws parameter store on test and local environment
    if (this.getEnv("NODE_ENV") === "test" || this.getEnv("STAGE") === "offline") {
      return this.getEnv(key, defaultValue);
    }

    try {
      return await getSecretParameter(key);
    } catch (error) {
      if (typeof defaultValue !== "string") {
        throw error;
      }
      return defaultValue;
    }
  },
  getEnv(key: string, defaultValue: string = ""): string {
    return this.getEnvironmentValue(key, defaultValue);
  },
  getEnvironmentValue(key: string, defaultValue: string = ""): string {
    return typeof process.env[key] === "undefined" ? defaultValue : String(process.env[key]);
  },
  getEnvironmentBoolean(key: string, defaultValue?: boolean): boolean {
    return typeof process.env[key] === "undefined" ? Boolean(defaultValue) : process.env[key]?.toLowerCase() === "true" || process.env[key] === "1";
  },
  getLoginRedirectUrl(): string {
    const accessPoint = "auth/openid/authenticate-response";
    return `${this.getEnv("AUTH_PROVIDER_REDIRECT_BACK_HOST", "http://localhost:3000")}/${accessPoint}`;
  },
  getLogoutRedirectUrl(): string {
    const accessPoint = "auth/openid/logout-response";
    return `${this.getEnv("AUTH_PROVIDER_REDIRECT_BACK_HOST", "http://localhost:3000")}/${accessPoint}`;
  },
  getAppContextFallbackURL(): string {
    return `${this.getEnv("APP_CONTEXT_REDIRECT_FALLBACK_URL", "http://localhost:8000")}`;
  },
};
