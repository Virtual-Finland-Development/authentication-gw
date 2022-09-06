import { ValidationError } from "../../utils/exceptions";
import Settings from "../../utils/Settings";
import { generateBase64Hash, omitObjectKeys, resolveBase64Hash, isObject } from "../../utils/transformers";
import { AppContext } from "../../utils/types";
import { SinunaAuthenticateResponse } from "./SinunaTypes";

/**
 *  Parses the state attribute from the Sinuna requests
 */
export const SinunaStateAttributor = new (class ___SinunaStateAttributor {
  hash = generateBase64Hash(Settings.getEnv("RUNTIME_TOKEN", "no-runtime-token-defined"));
  #createCheckSum(appContext: AppContext) {
    return generateBase64Hash({
      appContext: omitObjectKeys(appContext, ["checksum"]),
      hash: this.hash,
    });
  }
  #validateCheckSum(appContext: any) {
    if (!isObject(appContext) || typeof appContext.checksum === "undefined" || appContext.checksum !== this.#createCheckSum(appContext)) {
      throw new Error("Invalid state attribute");
    }
  }
  generate(appContext: AppContext): string {
    return generateBase64Hash({
      ...appContext,
      checksum: generateBase64Hash(appContext),
    });
  }
  parse(state: string): AppContext {
    const appContext: any = resolveBase64Hash(state);
    this.#validateCheckSum(appContext);
    delete appContext.checksum;
    return appContext;
  }
})();

/**
 *
 * @param queryParams
 * @throws ValidationError if invalid login response
 * @returns parsed login response
 */
export function parseSinunaAuthenticateResponse(queryParams: { [key: string]: string | string[] }): SinunaAuthenticateResponse {
  if (!isObject(queryParams)) {
    throw new ValidationError("Received bad AuthenticateResponse");
  }
  if (typeof queryParams.loginCode !== "string" || typeof queryParams.state !== "string") {
    throw new ValidationError("Received invalid AuthenticateResponse");
  }

  const loginCode = queryParams.loginCode;
  const appContext = SinunaStateAttributor.parse(queryParams.state);

  return {
    loginCode: loginCode,
    appContext: appContext,
  };
}
