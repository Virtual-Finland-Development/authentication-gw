import { describe, expect, test } from "@jest/globals";
import CacheService from "../src/utils/CacheService";
import Runtime from "../src/utils/Runtime";

describe("Cache service tests", () => {
  test("Test setter getter", async () => {
    const baseLine = { test: "test" };
    expect(await CacheService.fetch("test")).toBe(undefined);
    await CacheService.save("test", baseLine);
    expect(await CacheService.fetch("test")).toEqual(baseLine);
  });

  test("Test ttl", async () => {
    const baseLine = { test: "test" };
    await CacheService.save("test", baseLine, 10);
    expect(await CacheService.fetch("test")).toEqual(baseLine);
    await Runtime.sleep(250);
    expect(await CacheService.fetch("test")).toBe(undefined);
  });
});
