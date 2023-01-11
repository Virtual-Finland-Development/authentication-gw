import TestbedConsentRequestsHandler from "../../../providers/testbed/TestbedConsentRequestsHandler";
import { generateRouteRequestHandlers } from "../../../utils/route-utils";
export default generateRouteRequestHandlers(
  ["TestbedConsentVerify", "TestbedConsentCheck", "TestbedConsentRequest", "TestbedConsentResponse"], // @TODO: dynamically generate this
  "",
  undefined,
  TestbedConsentRequestsHandler
);
