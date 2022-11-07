import { beforeAll, describe, expect, test } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import { createStack, LambdaApiGatewayV2Stack } from "../infra/resources/LambdaApiGatewayV2";

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
    stack = createStack("api-gw-test", { name: "Authenticator", stage: "test", project: "Virtual Finland" });
  });

  describe("Api Gateway V2", () => {
    test("Should be defined", async () => {
      expect(stack.apiGateway).toBeDefined();
    });
  });
});

describe("Pulumi Infrastucture", () => {
  let infra: typeof import("../infra/main");

  // Pulumi testing mode setup
  beforeAll(pulumiTestModeEngager);

  // Prep test
  beforeAll(async function () {
    infra = await import("../infra/main");
  });

  describe("Endpoint URL", () => {
    test("Should be defined", async () => {
      expect(infra.endpoint).toBeDefined();
    });
  });
});
