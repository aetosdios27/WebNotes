import { describe, expect, test } from "bun:test";
import { createContentSnapshot } from "./content-snapshot";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("content snapshots", () => {
  test("coalesces rapid edits into the latest captured HTML", async () => {
    const saved: string[] = [];
    const snapshot = createContentSnapshot((html) => saved.push(html), 20);
    snapshot.schedule("<p>first</p>");
    await wait(10);
    snapshot.schedule("<p>latest</p>");
    await wait(10);
    expect(saved).toEqual([]);
    await wait(25);
    expect(saved).toEqual(["<p>latest</p>"]);
  });

  test("close/hide flushes immediately and clears the pending timer", async () => {
    const saved: string[] = [];
    const snapshot = createContentSnapshot((html) => saved.push(html), 20);
    snapshot.schedule("<p>before close</p>");
    snapshot.flush();
    snapshot.flush();
    expect(saved).toEqual(["<p>before close</p>"]);
    await wait(30);
    expect(saved).toHaveLength(1);
  });

  test("does not write on open, and preserves a cleared body", () => {
    const saved: string[] = [];
    const snapshot = createContentSnapshot((html) => saved.push(html));
    snapshot.flush();
    expect(saved).toEqual([]);
    snapshot.schedule("");
    snapshot.flush();
    expect(saved).toEqual([""]);
  });
});
