import * as SinunaAuthorizer from "../providers/sinuna/SinunaAuthorizer";
import * as SuomiFIAuthorizer from "../providers/suomifi/SuomiFIAuthorizer";
import * as TestbedAuthorizer from "../providers/testbed/TestbedAuthorizer";
import { AccessDeniedException } from "./exceptions";
import { decodeIdToken } from "./JWK-Utils";
import { debug } from "./logging";
import { omitEmptyObjectKeys } from "./transformers";
import { AuthorizationHeaders, Authorizer, AuthorizerResponse } from "./types";

/**
 * Resolve authorization provider from authorization header
 *
 * @param authorization
 * @returns
 */
function resolveAuthProvider(authorization: string): string {
  try {
    const result = decodeIdToken(authorization);
    if (typeof result.decodedToken?.payload === "object" && typeof result.decodedToken.payload?.iss === "string") {
      return result.decodedToken.payload.iss;
    }
  } catch (error) {
    debug(error);
  }
  throw new AccessDeniedException("Invalid authorization header");
}

/**
 * Resolve the authorization handler
 *
 * @param authHeaders
 * @returns
 */
function getAuthorizator(authHeaders: AuthorizationHeaders): Authorizer {
  const provider = resolveAuthProvider(authHeaders.authorization);
  if (SinunaAuthorizer.isMatchingProvider(provider)) {
    return SinunaAuthorizer;
  } else if (SuomiFIAuthorizer.isMatchingProvider(provider)) {
    return SuomiFIAuthorizer;
  } else if (TestbedAuthorizer.isMatchingProvider(provider)) {
    return TestbedAuthorizer;
  } else {
    throw new AccessDeniedException("Unknown authorization provider");
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
  async authorize(authorization: string | string[], authorizationContext: string | string[], consentToken: string | string[]): Promise<AuthorizerResponse> {
    const authHeaders = omitEmptyObjectKeys({
      authorization: String(authorization),
      context: authorizationContext ? String(authorizationContext) : "",
      consentToken: consentToken ? String(consentToken) : "",
    });

    const authorizator = getAuthorizator(authHeaders);
    return await authorizator.authorize(authHeaders);
  },
};
