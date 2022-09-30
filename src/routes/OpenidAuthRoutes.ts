import SinunaSettings from "../providers/sinuna/Sinuna.config";
import { generateRequestHandlers } from "../utils/route-utils";

const defaultAuthProviderIdent = SinunaSettings.ident;
const operationPrefix = "OpenId";
const operationNames = [
  "LoginRequest",
  "AuthenticateResponse",
  "AuthTokenRequest",
  "LogoutRequest",
  "LogoutResponse",
  "UserInfoRequest",
  "AuthorizeRequest",
];

export default generateRequestHandlers(
  operationNames,
  operationPrefix,
  defaultAuthProviderIdent
);
