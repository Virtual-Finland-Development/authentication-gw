export default {
  appName: "authflow-test",
  authenticationGatewayHost: import.meta.env.AUTHGW_API_HOST || "http://localhost:3000",
  testbedAPIHost: import.meta.env.TESTBED_API_HOST || "http://localhost:3003",
};
