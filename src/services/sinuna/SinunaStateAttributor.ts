import Settings from "../../utils/Settings";
import { generateBase64Hash, omitObjectKeys, resolveBase64Hash, isObject } from "../../utils/transformers";
import { AppContext } from "../../utils/types";

class SinunaStateAttributor {
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
}

export default new SinunaStateAttributor();
