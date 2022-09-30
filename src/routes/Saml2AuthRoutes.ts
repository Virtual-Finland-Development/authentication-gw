import SuomiFISettings from "../providers/suomifi/SuomiFI.config";
import { generateRequestHandlers } from "../utils/route-utils";

const defaultAuthProviderIdent = SuomiFISettings.ident;
const operationPrefix = "Saml2";
const operationNames = [
  "LoginRequest",
  "AuthenticateResponse",
  "LogoutRequest",
  "LogoutResponse",
  "UserInfoRequest",
];

export default generateRequestHandlers(
  operationNames,
  operationPrefix,
  defaultAuthProviderIdent
);
