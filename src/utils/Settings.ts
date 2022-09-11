export default {
  async getSecret(key: string, defaultValue: string): Promise<string> {
    return typeof process.env[key] === "undefined" ? defaultValue : String(process.env[key]);
  },
  getEnv(key: string, defaultValue: string): string {
    return typeof process.env[key] === "undefined" ? defaultValue : String(process.env[key]);
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
