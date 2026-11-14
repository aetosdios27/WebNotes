import { describe, expect, test } from "bun:test";
import { signInDestination, signInError } from "./signin";

describe("sign-in destinations", () => {
  test("returns to a local app path", () => {
    expect(signInDestination("/?note=abc#body")).toBe("/?note=abc#body");
  });
  test("rejects external URLs and auth loops", () => {
    for (const path of ["https://evil.example/", "//evil.example/", "/signin?error=Callback", "/api/auth/signin", "javascript:alert(1)"]) {
      expect(signInDestination(path)).toBe("/");
    }
  });
  test("accepts an absolute callback on this origin", () => {
    expect(signInDestination("http://localhost:3132/?note=abc", "http://localhost:3132")).toBe("/?note=abc");
  });
  test("unknown errors have a useful fallback", () => {
    expect(signInError("future-code")).toContain("device notes are safe");
  });
});
