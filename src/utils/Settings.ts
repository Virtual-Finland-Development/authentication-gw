import { getSecretParameter } from "./libs/AWS/SecretsManager";

export default {
  async getSecret(key: string, defaultValue?: string): Promise<string> {
    // Skip aws parameter store on test and local environment
    if (this.getEnv("NODE_ENV") === "test" || (this.getStage() === "local" && this.hasEnv(key))) {
      return this.getEnv(key, defaultValue);
    }

    try {
      return await getSecretParameter(key);
    } catch (error) {
      if (typeof defaultValue !== "string") {
        throw new Error(`Secret ${key} could not be retrieved`);
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
  getStage(): string {
    return this.getEnv("STAGE", "local");
  },
  isStage(stage: string): boolean {
    return this.getStage() === stage;
  },
  REQUEST_TIMEOUT_MSECS: 15000,
};
