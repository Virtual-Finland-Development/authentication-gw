export default {
  getEnv(key: string, defaultValue: string): string {
    return typeof process.env[key] === "undefined" ? defaultValue : String(process.env[key]);
  },
  getAuthRedirectUrl(): string {
    const accessPoint = "auth/openid/authenticate-response";
    return `${this.getEnv("AUTH_PROVIDER_REDIRECT_BACK_HOST", "http://localhost:3000")}/${accessPoint}`;
  },
};
