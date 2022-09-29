import { AccessDeniedException } from "./exceptions";

async function authorizeSinuna(appName: string, authData: any): Promise<void> {
  // Authorize
  if (!appName || !authData?.email) {
    throw new AccessDeniedException();
  }
}

export default {
  /**
   * Throws AccessDeniedException if access needs to be denied
   *
   * @param provider
   * @param appName
   * @param authData
   * @returns
   */
  async authorize(provider: string, appName: string, authData: any): Promise<void> {
    if (provider === "sinuna") {
      return await authorizeSinuna(appName, authData);
    } else {
      throw new Error("Unknown auth provider");
    }
  },
};
