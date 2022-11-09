import SinunaSettings from "../providers/sinuna/Sinuna.config";
import { generateRequestHandlers } from "../utils/route-utils";

const defaultAuthProviderIdent = SinunaSettings.ident;
const operationPrefix = "OpenId";
const operationNames = ["LoginRequest", "AuthenticateResponse", "LoggedInRequest", "LogoutRequest", "LogoutResponse"];

export default generateRequestHandlers(operationNames, operationPrefix, defaultAuthProviderIdent);
