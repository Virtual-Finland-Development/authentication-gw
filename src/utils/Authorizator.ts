import SinunaConfig from "../providers/sinuna/Sinuna.config";
import SinunaAuthorizer from "../providers/sinuna/SinunaAuthorizer";
import SuomiFIConfig from "../providers/suomifi/SuomiFI.config";
import SuomiFIAuthorizer from "../providers/suomifi/SuomiFIAuthorizer";
import TestbedConfig from "../providers/testbed/Testbed.config";
import TestbedAuthorizer from "../providers/testbed/TestbedAuthorizer";
import { ValidationError } from "./exceptions";

import { omitEmptyObjectKeys } from "./transformers";
import { AuthorizeFunc } from "./types";

function getAuthorizator(authHeaders: { provider: string; [attr: string]: string }): AuthorizeFunc {
  const provider = authHeaders.provider?.toLowerCase();
  if (provider === SinunaConfig.ident.toLowerCase()) {
    return SinunaAuthorizer;
  } else if (provider === SuomiFIConfig.ident.toLowerCase()) {
    return SuomiFIAuthorizer;
  } else if (provider === TestbedConfig.ident.toLowerCase()) {
    return TestbedAuthorizer;
  } else {
    throw new ValidationError("Unknown auth provider");
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
  async authorize(authorization: string | string[], authorizationProvider: string | string[], authorizationContext: string | string[]): Promise<void> {
    const authHeaders = omitEmptyObjectKeys({
      authorization: String(authorization),
      provider: String(authorizationProvider),
      context: String(authorizationContext),
    });

    const authorizator = getAuthorizator(authHeaders);
    return await authorizator(authHeaders.authorization, authHeaders.context);
  },
};
