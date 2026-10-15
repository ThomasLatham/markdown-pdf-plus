import type { CheerioAPI } from "cheerio";

const TASK_MARKER = /^\[([ xX])\]\s+/;

/**
 * Turns GitHub-style task list items (`- [ ] todo`, `- [x] done`) into checkboxes. VS Code's
 * renderer leaves them as plain text unless an extension adds task list support, in which case
 * the items already contain checkboxes and are left alone.
 */
export const renderTaskLists = ($: CheerioAPI): void => {
  $("li").each((_, element) => {
    const $item = $(element);
    if ($item.find("input[type=checkbox]").length) {
      return;
    }

    // The marker is at the start of the item's first text, which may be wrapped in a <p> when
    // the list is "loose".
    let first = element.firstChild;
    if (first?.type === "tag" && first.tagName === "p") {
      first = first.firstChild;
    }
    if (first?.type !== "text") {
      return;
    }

    const match = TASK_MARKER.exec(first.data);
    if (!match) {
      return;
    }
    first.data = first.data.slice(match[0].length);
    const checked = match[1] !== " " ? " checked" : "";
    // Cheerio can't insert next to a text node, so prepend to its parent (the <li> or <p>).
    $(first.parent as typeof element).prepend(
      `<input type="checkbox" class="task-list-item-checkbox" disabled${checked}> `
    );
    $item.addClass("task-list-item");
    $item.parent("ul, ol").addClass("contains-task-list");
  });
};
