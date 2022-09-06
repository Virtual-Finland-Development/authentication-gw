import { Context, Document } from "openapi-backend";

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
