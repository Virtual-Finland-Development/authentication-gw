import { createHmac } from "crypto";
import { ValidationError } from "../../../utils/exceptions";
import Settings from "../../../utils/Settings";
import { generateBase64Hash, omitObjectKeys, resolveBase64Hash, isObject } from "../../../utils/transformers";
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
      this.runtimeToken = await Settings.getSecret("AUTHENTICATION_GW_RUNTIME_TOKEN", "no-runtime-token-defined");
    }
  }

  #createCheckSum(appContext: AppContext) {
    if (!this.runtimeToken) {
      throw new Error("SinunaStateAttributor not initialized");
    }
    return createHmac("sha256", this.runtimeToken)
      .update(JSON.stringify(omitObjectKeys(appContext, ["checksum"])))
      .digest("hex");
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
    return encodeURIComponent(
      generateBase64Hash({
        ...appContext,
        checksum: this.#createCheckSum(appContext),
      })
    );
  }
  parse(state: string): AppContext {
    let appContext;
    try {
      appContext = JSON.parse(resolveBase64Hash(decodeURIComponent(state)));
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
