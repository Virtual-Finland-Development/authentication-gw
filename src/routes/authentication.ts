import { Context } from "openapi-backend";
import * as SinunaRequests from "../services/sinuna/SinunaRequests";
import { jsonResponseHeaders } from "../utils/default-headers";
import { parseAppContext } from "../utils/validators";

export const LoginRequest = async (context: Context) => {
  const appContext = parseAppContext(context);

  return {
    statusCode: 307,
    headers: {
      location: SinunaRequests.getLoginRequestUrl(appContext),
    },
  };
};

export const AuthenticateResponse = async (context: Context) => {
  return {
    statusCode: 307,
    headers: {
      location: "https://example.com",
    },
  };
};

export const AuthTokenRequest = async (context: Context) => {
  parseAppContext(context); // Valites app context
  const token = await SinunaRequests.getAccessToken(context.request.requestBody.loginCode); // request body already validated by openapi-backend
  return {
    statusCode: 200,
    headers: jsonResponseHeaders,
    body: JSON.stringify({ token: token }),
  };
};
