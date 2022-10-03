import { describe, expect, test } from "@jest/globals";
import { SinunaStateAttributor } from "../src/providers/sinuna/utils/SinunaResponseParsers";
import { ValidationError } from "../src/utils/exceptions";
import { ensureUrlQueryParam, omitEmptyObjectKeys } from "../src/utils/transformers";

describe("Utils test", () => {
  test("Test ensureUrlQueryParam", () => {
    expect(ensureUrlQueryParam("http://localhost/", "test", "moi")).toBe("http://localhost/?test=moi");
    expect(ensureUrlQueryParam("http://localhost/?test=moi", "test", "moi")).toBe("http://localhost/?test=moi");
    expect(ensureUrlQueryParam("http://localhost/?test=tere", "test", "moi")).toBe("http://localhost/?test=moi");
    expect(ensureUrlQueryParam("http://localhost/?baz=baa&test=tere", "test", "moi")).toBe("http://localhost/?baz=baa&test=moi");
  });

  test("Test SinunaStateAttributor", async () => {
    await SinunaStateAttributor.initialize();

    const STATE = SinunaStateAttributor.generate({ appName: "test", redirectUrl: "url" });
    const parsedState = SinunaStateAttributor.parse(STATE);
    expect(parsedState.appName).toBe("test");

    expect(() => {
      SinunaStateAttributor.parse("STATE");
    }).toThrow(ValidationError);

    const STATE2 = SinunaStateAttributor.generate({ appName: "test2", redirectUrl: "url" });
    expect(STATE !== STATE2).toBe(true);
  });

  test("Test omitEmptyObjectKeys", () => {
    expect(
      Object.keys(
        omitEmptyObjectKeys({
          a: "a",
          b: undefined,
          c: false,
        })
      )
    ).toEqual(["a", "c"]);
  });
});
