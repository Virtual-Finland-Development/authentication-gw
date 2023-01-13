import { describe, expect, test } from "@jest/globals";
import { SinunaStateAttributor } from "../src/providers/sinuna/service/SinunaResponseParsers";
import { ValidationError } from "../src/utils/exceptions";
import { createSecretHash, decrypt, encrypt } from "../src/utils/hashes";
import { ensureUrlQueryParam, omitEmptyObjectKeys, omitObjectKeysOtherThan } from "../src/utils/transformers";

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

  test("Test omitObjectKeysOtherThan", () => {
    expect(Object.keys(omitObjectKeysOtherThan({ a: "a", b: "b", c: "c" }, ["a", "c"]))).toEqual(["a", "c"]);
  });

  test("Test hashes", () => {
    const value = "test";
    const secret = "testtesttesttesttesttesttestteasdsadasdasdasdasd";
    const secretIv = "testtesttesttest";
    const encrypted = encrypt(value, secret, secretIv);
    const decrypted = decrypt(encrypted, secret, secretIv);
    expect(decrypted).toEqual(value);

    const hash = createSecretHash(value, secret, "sha512");
    expect(hash).toEqual(createSecretHash(value, secret, "sha512"));
  });
});
