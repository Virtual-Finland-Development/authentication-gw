import { AccessDeniedException } from "../../utils/exceptions";
import { leftTrim } from "../../utils/transformers";

/**
 * @TODO: to be implemented,
 *
 * @param token
 * @param context - which app source is requesting access
 */
export default async function authorize(token: string, context: string): Promise<void> {
  try {
    const nameID = leftTrim(token, "Bearer ");
    if (!nameID) {
      throw new Error("No nameID found in token");
    }
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
