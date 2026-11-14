// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, act } from "@testing-library/react";
import { LoadingRegion } from "./skeleton";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("loading regions", () => {
  it("keeps quick local reads invisible and shows slow reads only after 150ms", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <LoadingRegion pending skeleton={<div>Waiting</div>}>
        Ready
      </LoadingRegion>,
    );
    const placeholder = () => container.querySelector(".loading-placeholder");
    act(() => vi.advanceTimersByTime(149));
    expect(placeholder()?.getAttribute("data-visible")).toBe("false");
    rerender(
      <LoadingRegion pending={false} skeleton={<div>Waiting</div>}>
        Ready
      </LoadingRegion>,
    );
    act(() => vi.advanceTimersByTime(200));
    expect(placeholder()?.getAttribute("data-visible")).toBe("false");
    rerender(
      <LoadingRegion pending skeleton={<div>Waiting</div>}>
        Ready
      </LoadingRegion>,
    );
    act(() => vi.advanceTimersByTime(150));
    expect(placeholder()?.getAttribute("data-visible")).toBe("true");
    rerender(
      <LoadingRegion pending={false} skeleton={<div>Waiting</div>}>
        Ready
      </LoadingRegion>,
    );
    expect(
      container.querySelector(".loading-content")?.getAttribute("data-visible"),
    ).toBe("true");
    expect(placeholder()).not.toBeNull();
  });
});
