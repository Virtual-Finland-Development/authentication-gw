import SinunaRequestHandler from "../providers/sinuna/SinunaRequestHandler";
import SuomiFIRequestHandler from "../providers/suomifi/SuomiFIRequestHandler";
import TestbedConsentRequestsHandler from "../providers/testbed/TestbedConsentRequestsHandler";
import TestbedRequestHandler from "../providers/testbed/TestbedRequestHandler";

import RouteMapper from "../utils/RouteMapper";

RouteMapper.initialize([
  {
    operationPrefix: "OpenId",
    handlers: [SinunaRequestHandler, TestbedRequestHandler],
  },
  {
    operationPrefix: "Saml2",
    handlers: [SuomiFIRequestHandler],
  },
  {
    operationPrefix: "",
    handlers: [TestbedConsentRequestsHandler],
  },
]);

export default RouteMapper.getOperations();
