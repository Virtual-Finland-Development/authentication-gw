import { ValidationError } from "../../../utils/exceptions";
import { createSecretHash, generateUrlEncodedBase64Hash, resolveUrlEncodedBase64HashJSON } from "../../../utils/hashes";
import Settings from "../../../utils/Settings";
import { isObject, omitObjectKeys } from "../../../utils/transformers";
import { AppContext } from "../../../utils/types";
import SinunaSettings from "../Sinuna.config";
import { SinunaAuthenticateResponse } from "./SinunaTypes";

/**
 *  Parses the state attribute from the Sinuna requests
 */
export const SinunaStateAttributor = new (class SinunaStateAttributor {
  runtimeToken: string = "";

  /**
   * Initializes the SinunaStateAttributor
   */
  async initialize() {
    if (!this.runtimeToken) {
      this.runtimeToken = await Settings.getSecret("AUTHENTICATION_GW_RUNTIME_TOKEN", "sinuna");
    }
  }

  #createCheckSum(appContext: AppContext) {
    if (!this.runtimeToken) {
      throw new Error("SinunaStateAttributor not initialized");
    }
    return createSecretHash(omitObjectKeys(appContext, ["checksum"]), this.runtimeToken);
  }
  #validateCheckSum(appContext: any) {
    if (!this.runtimeToken) {
      throw new Error("SinunaStateAttributor not initialized");
    }
    if (!isObject(appContext) || typeof appContext.checksum === "undefined" || appContext.checksum !== this.#createCheckSum(appContext)) {
      throw new ValidationError("Invalid state attribute");
    }
  }
  generate(appContext: AppContext): string {
    return generateUrlEncodedBase64Hash({
      ...appContext,
      checksum: this.#createCheckSum(appContext),
    });
  }
  parse(state: string): AppContext {
    let appContext;
    try {
      appContext = resolveUrlEncodedBase64HashJSON(state);
    } catch (error) {
      throw new ValidationError("Could not parse state attribute");
    }
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
  if (typeof queryParams.code !== "string" || typeof queryParams.state !== "string") {
    throw new ValidationError("Received invalid AuthenticateResponse");
  }

  const loginCode = queryParams.code;
  const appContextObj = SinunaStateAttributor.parse(queryParams.state); // Throws

  return {
    loginCode: loginCode,
    provider: SinunaSettings.ident,
    appContextObj: appContextObj,
  };
}
