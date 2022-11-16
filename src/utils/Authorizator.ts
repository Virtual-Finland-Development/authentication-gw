import * as SinunaAuthorizer from "../providers/sinuna/SinunaAuthorizer";
import * as SuomiFIAuthorizer from "../providers/suomifi/SuomiFIAuthorizer";
import * as TestbedAuthorizer from "../providers/testbed/TestbedAuthorizer";
import { ValidationError } from "./exceptions";

import { omitEmptyObjectKeys } from "./transformers";
import { Authorizer } from "./types";

function getAuthorizator(authHeaders: { provider: string; [attr: string]: string }): Authorizer {
  const provider = authHeaders.provider?.toLowerCase();
  if (SinunaAuthorizer.isMatchingProvider(provider)) {
    return SinunaAuthorizer;
  } else if (SuomiFIAuthorizer.isMatchingProvider(provider)) {
    return SuomiFIAuthorizer;
  } else if (TestbedAuthorizer.isMatchingProvider(provider)) {
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
    return await authorizator.authorize(authHeaders.authorization, authHeaders.context);
  },
};
