import Runtime from "./Runtime";

export function getDefaultHeaders() {
  return {
    "Access-Control-Allow-Origin": Runtime.getRequestOrigin(),
    "Access-Control-Allow-Credentials": true,
  };
}

export function getJSONResponseHeaders() {
  return {
    ...getDefaultHeaders(),
    "Content-Type": "application/json",
  };
}

export function getCORSHeaders() {
  return {
    "Access-Control-Allow-Origin": Runtime.getRequestOrigin(),
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}
