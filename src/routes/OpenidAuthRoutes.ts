import { generateRequestHandlers } from "../utils/route-utils";

const defaultAuthProviderIdent = "sinuna";
const operationPrefix = "OpenId";
const operationNames = ["LoginRequest", "AuthenticateResponse", "AuthTokenRequest", "LogoutRequest", "UserInfoRequest", "AuthorizeRequest"];

export default generateRequestHandlers(operationNames, operationPrefix, defaultAuthProviderIdent);
