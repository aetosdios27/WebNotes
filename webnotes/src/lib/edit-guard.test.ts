import { describe, expect, test } from "bun:test";
import { whenCurrent } from "./edit-guard";

describe("whenCurrent", () => {
  test("forwards a success while the context is still current", async () => {
    const done: string[] = [];
    await whenCurrent(
      async () => "ok",
      () => true,
      value => done.push(value),
      () => done.push("error"),
    );
    expect(done).toEqual(["ok"]);
  });

  test("ignores a slow success after the context is gone", async () => {
    let resolve: (value: string) => void = () => {};
    const run = () => new Promise<string>(r => { resolve = r; });
    let current = true;
    const done: string[] = [];
    const pending = whenCurrent(run, () => current, value => done.push(value), () => done.push("error"));
    current = false;
    resolve("ok");
    await pending;
    expect(done).toEqual([]);
  });

  test("ignores a slow failure after the context is gone", async () => {
    let reject: (error: unknown) => void = () => {};
    const run = () => new Promise<string>((_, r) => { reject = r; });
    let current = true;
    const done: string[] = [];
    const pending = whenCurrent(run, () => current, value => done.push(value), () => done.push("error"));
    current = false;
    reject(new Error("boom"));
    await pending;
    expect(done).toEqual([]);
  });

  test("forwards an error while still current", async () => {
    const done: string[] = [];
    await whenCurrent(
      () => Promise.reject(new Error("boom")),
      () => true,
      value => done.push(value),
      () => done.push("error"),
    );
    expect(done).toEqual(["error"]);
  });
});
