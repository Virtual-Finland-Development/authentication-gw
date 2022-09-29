import { generateRequestHandlers } from "../utils/route-utils";

const defaultAuthProviderIdent = "suomifi";
const operationPrefix = "Saml2";
const operationNames = ["LoginRequest", "AuthenticateResponse", "LogoutRequest", "UserInfoRequest"];

export default generateRequestHandlers(operationNames, operationPrefix, defaultAuthProviderIdent);
