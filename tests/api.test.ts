import { describe, expect, test } from "@jest/globals";
import { testRequestEvent } from "./__mocks__/mockApiApp";

describe("Requests test", () => {
  test("Test health", async () => {
    const response = await testRequestEvent("GET", "/health");
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("OK");
  });
});
