import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

  it("keeps Markdown-ish plain text as text and updates when notes change", () => {
    const content =
      "## Trip\n- [x] Passport\n[[Packing list]]\nBudget < 400 & > 100";
    const { container, rerender } = render(<NoteMiniature content={content} />);
    expect(container.textContent).toBe(content);
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
