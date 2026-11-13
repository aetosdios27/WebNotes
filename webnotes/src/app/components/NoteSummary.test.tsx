// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

// Bun's native test runner does not read Vitest's environment directive.
if (typeof document === "undefined") {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>");
  for (const key of [
    "window",
    "document",
    "Node",
    "Element",
    "HTMLElement",
    "navigator",
  ] as const) {
    Object.defineProperty(globalThis, key, {
      value: key === "window" ? window : window[key],
      configurable: true,
      writable: true,
    });
  }
}
const { cleanup, render, screen } = await import("@testing-library/react");
import { NoteMiniature, NoteMeta, formatNoteTime } from "./NoteSummary";

afterEach(cleanup);

describe("note miniatures", () => {
  it("preserves paragraphs, headings, nested lists, task states and inert highlighted links", () => {
    const { container } = render(
      <NoteMiniature
        content={
          '<h2>Before we go</h2><p>Read <a data-note-id="packing" href="#">Packing list</a> and <a href="https://example.com">the guide</a>.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked></label><div><p>Passport</p></div></li><li data-type="taskItem" data-checked="false"><p>Camera</p><ul><li>Film<ul><li>Three rolls</li></ul></li></ul></li></ul>'
        }
      />,
    );
    expect(screen.getByText("Before we go").className).toBe("mini-heading");
    expect(screen.getByText("Packing list").className).toBe("mini-link");
    expect(screen.getByText("the guide").className).toBe("mini-link");
    expect(
      screen.getByLabelText("Checked task").parentElement?.textContent,
    ).toBe("Passport");
    expect(
      screen.getByLabelText("Unchecked task").parentElement?.textContent,
    ).toContain("Camera");
    expect(
      screen.getByText("Three rolls").parentElement?.parentElement?.textContent,
    ).toBe("FilmThree rolls");
    expect(container.querySelector("a,input,button")).toBeNull();
  });

  it("drops unsafe and unlisted subtrees and never copies stored attributes", () => {
    const { container } = render(
      <NoteMiniature
        content={
          '<p id="stolen" class="evil" style="color:red" onclick="alert(1)">Safe <a href="javascript:alert(1)" target="_blank" data-secret="secret">link</a><script>alert(1)</script><style>.evil{display:none}</style><img src="/payload" onerror="alert(1)"><iframe src="/payload">Hidden</iframe><svg><text>Hidden too</text></svg></p>'
        }
      />,
    );
    expect(container.textContent).toBe("Safe link");
    expect(
      container.querySelector(
        "script,style,img,iframe,svg,a,[id],[style],[onclick],[href],[src],[target],[data-secret]",
      ),
    ).toBeNull();
    expect(container.querySelector(".evil")).toBeNull();
  });

  it("keeps template delimiters from escaping the inert parse wrapper", () => {
    const { container } = render(
      <NoteMiniature
        content={
          '</template><img src="/escape"><p>Still safe</p><template><script>alert(1)</script></template>'
        }
      />,
    );
    expect(container.textContent).toBe("Still safe");
    expect(container.querySelector("img,script,template")).toBeNull();
  });

  it("renders Markdown headings, tasks, lists, bold and inert link text", () => {
    const { container } = render(
      <NoteMiniature
        content={
          "# One\n## Lisbon\n###### Six\n- [x] Passport\n- [ ] Camera\n* [X] Tickets\n* [ ] Film\n- Coat\n* Shoes\n1. Map\n[[Lisbon in April]] and [guide](https://example.com) **ready**\nBudget < 400 & > 100\nUnmatched [[title and **text"
        }
      />,
    );
    expect(
      Array.from(
        container.querySelectorAll(".mini-heading"),
        (node) => node.textContent,
      ),
    ).toEqual(["One", "Lisbon", "Six"]);
    expect(
      screen
        .getAllByLabelText("Checked task")
        .map((node) => node.parentElement?.textContent),
    ).toEqual(["Passport", "Tickets"]);
    expect(
      screen
        .getAllByLabelText("Unchecked task")
        .map((node) => node.parentElement?.textContent),
    ).toEqual(["Camera", "Film"]);
    expect(container.querySelectorAll(".mini-done")).toHaveLength(2);
    expect(
      Array.from(
        container.querySelectorAll(".mini-item"),
        (node) => node.textContent,
      ),
    ).toEqual(["Coat", "Shoes", "Map"]);
    expect(screen.getByText("Lisbon in April").className).toBe("mini-link");
    expect(screen.getByText("guide").className).toBe("mini-link");
    expect(screen.getByText("ready").className).toBe("mini-bold");
    expect(screen.getByText("Budget < 400 & > 100")).toBeTruthy();
    expect(screen.getByText("Unmatched [[title and **text")).toBeTruthy();
    expect(container.querySelector("a,[href],input")).toBeNull();
  });

  it("keeps crafted wrapper escapes inert and preserves visible text", () => {
    const { container } = render(
      <NoteMiniature
        content={
          '<</template>/template><img src="/escape" onerror="alert(1)"><p>Still safe</p>'
        }
      />,
    );
    expect(container.textContent).toBe("</template>Still safe");
    expect(
      container.querySelector("img,script,template,[src],[onerror]"),
    ).toBeNull();
  });

  it("updates when notes change", () => {
    const { container, rerender } = render(
      <NoteMiniature content="Plain text" />,
    );
    expect(container.textContent).toBe("Plain text");
    rerender(<NoteMiniature content="<p>Another note</p>" />);
    expect(container.textContent).toBe("Another note");
    rerender(<NoteMiniature content={null} />);
    expect(container.textContent).toBe("Empty note");
  });
});

describe("note times", () => {
  const now = new Date(2026, 9, 28, 12);
  const options = { now, locale: "en-GB" };
  it("uses local clock time today and includes context for preview headers", () => {
    const today = new Date(2026, 9, 28, 9, 41);
    expect(formatNoteTime(today, options)).toBe("9:41");
    expect(formatNoteTime(today, { ...options, preview: true })).toBe(
      "Today at 9:41",
    );
    expect(formatNoteTime(today, { ...options, locale: "en-US" })).toBe(
      "9:41 AM",
    );
  });
  it("uses calendar days for yesterday, including across midnight", () => {
    const yesterday = new Date(2026, 9, 27, 22, 10);
    expect(formatNoteTime(yesterday, options)).toBe("Yesterday");
    expect(formatNoteTime(yesterday, { ...options, preview: true })).toBe(
      "Yesterday at 22:10",
    );
    expect(
      formatNoteTime(yesterday, {
        ...options,
        now: new Date(2026, 9, 28, 0, 1),
      }),
    ).toBe("Yesterday");
  });
  it("shows weekday within seven days, then day/month and older years", () => {
    expect(formatNoteTime(new Date(2026, 9, 26), options)).toBe("Mon");
    expect(formatNoteTime(new Date(2026, 9, 22), options)).toBe("Thu");
    expect(formatNoteTime(new Date(2026, 9, 21), options)).toBe("21 Oct");
    expect(formatNoteTime(new Date(2026, 8, 24), options)).toBe("24 Sept");
    expect(formatNoteTime(new Date(2025, 9, 24), options)).toBe("24 Oct 2025");
  });
  it("includes last year across New Year while keeping Yesterday", () => {
    const options = { now: new Date(2026, 0, 2, 12), locale: "en-GB" };
    expect(formatNoteTime(new Date(2025, 11, 31), options)).toBe("31 Dec 2025");
    expect(
      formatNoteTime(new Date(2025, 11, 31), {
        ...options,
        now: new Date(2026, 0, 1, 12),
      }),
    ).toBe("Yesterday");
  });
  it("puts folder first on cards and last in the preview", () => {
    const date = new Date();
    const note = {
      id: "n",
      title: "Trip",
      content: "",
      folderId: "f",
      updatedAt: date,
      createdAt: date,
    };
    const folders = [{ id: "f", name: "Travel", createdAt: date }];
    const { container, rerender } = render(
      <NoteMeta note={note} folders={folders} />,
    );
    expect(container.textContent).toMatch(/^Travel · /);
    rerender(<NoteMeta note={note} folders={folders} preview />);
    expect(container.textContent).toMatch(/^Today at .* · Travel$/);
    rerender(<NoteMeta note={note} folders={[]} preview />);
    expect(container.textContent).not.toContain("·");
  });
});
