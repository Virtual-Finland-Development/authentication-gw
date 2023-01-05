import { getSecretParameter } from "./libs/AWS";

export default {
  async getSecret(key: string, defaultValue?: string): Promise<string> {
    // Skip aws parameter store on test and local environment
    if (this.getEnv("NODE_ENV") === "test" || (this.getStage() === "offline" && this.hasEnv(key))) {
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
  async getStageSecret(key: string, defaultValue?: string): Promise<string> {
    return this.getSecret(`${this.getStage()}_${key}`, defaultValue);
  },
  hasEnv(key: string): boolean {
    return typeof process.env[key] !== "undefined" && process.env[key] !== "";
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
  getAppContextFallbackURL(): string {
    return `${this.getEnv("APP_CONTEXT_REDIRECT_FALLBACK_URL", "http://localhost:8000")}`;
  },
  getStage(): string {
    return this.getEnv("STAGE");
  },
};
