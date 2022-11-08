import Runtime from "./Runtime";

export function getDefaultHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || Runtime.getRequestOrigin(),
    "Access-Control-Allow-Credentials": true,
  };
}

export function getJSONResponseHeaders(origin?: string) {
  return {
    ...getDefaultHeaders(origin),
    "Content-Type": "application/json",
  };
}

export function getCORSHeaders(origin?: string) {
  return {
    ...getDefaultHeaders(origin),
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Origin, Content-type, Accept, Authorization, X-Authorization-Provider, X-Authorization-Context, X-Consent-Token",
    "Access-Control-Max-Age": 86400,
  };
}
