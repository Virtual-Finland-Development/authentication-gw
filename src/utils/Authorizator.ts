import { AccessDeniedException } from "./exceptions";
import SinunaSettings from "../providers/sinuna/Sinuna.config";

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
    if (provider === SinunaSettings.ident) {
      return await authorizeSinuna(appName, authData);
    } else {
      throw new Error("Unknown auth provider");
    }
  },
};
