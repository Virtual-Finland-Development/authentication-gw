import { Context, Document } from "openapi-backend";
import { jsonResponseHeaders } from "../utils/default-headers";

export const LoginRequest = async (c: Context<Document>) => {
  return {
    statusCode: 307,
    headers: {
      location: "https://example.com",
    },
  };
};

export const AuthenticateResponse = async (c: Context<Document>) => {
  return {
    statusCode: 307,
    headers: {
      location: "https://example.com",
    },
  };
};

export const AuthTokenRequest = async (c: Context<Document>) => {
  return {
    statusCode: 200,
    headers: jsonResponseHeaders,
    body: JSON.stringify({ token: "token" }),
  };
};
