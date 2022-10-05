import { AccessDeniedException } from "../../utils/exceptions";
import { leftTrim } from "../../utils/transformers";

/**
 *
 * @param idToken
 * @param context - which app source is requesting access
 */
export default async function authorize(idToken: string, context: string): Promise<void> {
  try {
    const token = leftTrim(idToken, "Bearer ");

    // Validate token
  } catch (error) {
    throw new AccessDeniedException(String(error));
  }
}
