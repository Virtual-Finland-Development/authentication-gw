import { describe, expect, test } from "@jest/globals";
import { ensureUrlQueryParam } from "../src/utils/transformers";
import { testRequestEvent } from "./__mocks__/mockApiApp";

describe("Requests test", () => {
  test("Test health", async () => {
    const response = await testRequestEvent("GET", "/health");
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("OK");
  });
});

describe("Utils test", () => {
  test("Test ensureUrlQueryParam", async () => {
    expect(ensureUrlQueryParam("http://localhost/", "test", "moi")).toBe("http://localhost/?test=moi");
    expect(ensureUrlQueryParam("http://localhost/?test=moi", "test", "moi")).toBe("http://localhost/?test=moi");
    expect(ensureUrlQueryParam("http://localhost/?test=tere", "test", "moi")).toBe("http://localhost/?test=moi");
    expect(ensureUrlQueryParam("http://localhost/?baz=baa&test=tere", "test", "moi")).toBe("http://localhost/?baz=baa&test=moi");
  });
});
