export default {
  appName: "authflow-test",
  getAuthenticationGatewayHost: () => import.meta.env.VITE_AUTHGW_API_URL || "http://localhost:4078",
  getTestbedAPIHost: () => import.meta.env.VITE_TESTBED_API_URL || "http://localhost:3003",
};
