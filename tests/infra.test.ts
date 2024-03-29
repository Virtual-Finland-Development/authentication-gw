import { beforeAll, describe, expect, test } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import { createStack } from "../infra/resources/LambdaApiGatewayV2";
import { LambdaApiGatewayV2Stack } from "../infra/types";
import { createStackConfig } from "../infra/utils";

// Pulumi testing mode setup
function pulumiTestModeEngager() {
  pulumi.runtime.setMocks({
    newResource: function (args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
      return {
        id: args.inputs.name + "_id",
        state: args.inputs,
      };
    },
    call: function (args: pulumi.runtime.MockCallArgs) {
      return args.inputs;
    },
  });
}

describe("Api Gateway V2 Stack", () => {
  let stack: LambdaApiGatewayV2Stack;

  // Pulumi testing mode setup
  beforeAll(pulumiTestModeEngager);

  // Prep test
  beforeAll(async function () {
    // It's important to import the program _after_ the mocks are defined.
    stack = createStack(createStackConfig({ name: "Authenticator", stage: "test", project: "Virtual Finland", pulumiOrganization: "virtualfinland" }));
  });

  describe("Api Gateway V2", () => {
    test("Should be defined", async () => {
      expect(stack.apiGateway).toBeDefined();
    });
  });
});
