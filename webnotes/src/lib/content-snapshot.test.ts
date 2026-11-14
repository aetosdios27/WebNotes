import { describe, expect, test } from "bun:test";
import { createContentSnapshot } from "./content-snapshot";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("content snapshots", () => {
  test("coalesces local edits and reads once at flush, including intervening remote changes", async () => {
    const saved: string[] = [];
    let html = "<p>first</p>";
    let reads = 0;
    const snapshot = createContentSnapshot(() => {
      reads++;
      return html;
    }, (content) => saved.push(content), 20);
    snapshot.schedule();
    await wait(10);
    snapshot.schedule();
    expect(reads).toBe(0);
    html = "<p>latest remote body</p>";
    await wait(35);
    expect(reads).toBe(1);
    expect(saved).toEqual([html]);
  });

  test("close/hide flushes immediately and clears the pending timer", async () => {
    const saved: string[] = [];
    const snapshot = createContentSnapshot(() => "<p>before close</p>", (html) => saved.push(html), 20);
    snapshot.schedule();
    snapshot.flush();
    snapshot.flush();
    expect(saved).toEqual(["<p>before close</p>"]);
    await wait(30);
    expect(saved).toHaveLength(1);
  });

  test("does not read or write while clean, and preserves a cleared body", () => {
    const saved: string[] = [];
    let reads = 0;
    const snapshot = createContentSnapshot(() => { reads++; return ""; }, (html) => saved.push(html));
    snapshot.flush();
    expect(reads).toBe(0);
    expect(saved).toEqual([]);
    snapshot.schedule();
    snapshot.flush();
    expect(saved).toEqual([""]);
  });

  test("skips a destroyed editor at flush", () => {
    const saved: string[] = [];
    const snapshot = createContentSnapshot(() => undefined, (html) => saved.push(html));
    snapshot.schedule();
    snapshot.flush();
    expect(saved).toEqual([]);
  });
});
