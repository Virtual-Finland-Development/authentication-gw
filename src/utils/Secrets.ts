export default {
  async getSecret(key: string, defaultValue: string): Promise<string> {
    return typeof process.env[key] === "undefined" ? defaultValue : String(process.env[key]);
  },
};
