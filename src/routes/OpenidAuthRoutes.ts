import SinunaSettings from "../providers/sinuna/Sinuna.config";
import { generateRouteRequestHandlers } from "../utils/route-utils";

const defaultAuthProviderIdent = SinunaSettings.ident;
const operationPrefix = "OpenId";
const operationNames = ["AuthenticationRequest", "AuthenticateResponse", "LoginRequest", "LogoutRequest", "LogoutResponse"];

export default generateRouteRequestHandlers(operationNames, operationPrefix, defaultAuthProviderIdent);
