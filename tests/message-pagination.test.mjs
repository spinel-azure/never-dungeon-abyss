import test from "node:test";
import assert from "node:assert/strict";
import { paginateMessageToFit } from "../js/message-pagination.js";

function measuringElement({ columns = 12, rows = 4 } = {}) {
  return {
    clientHeight: rows * 10,
    value: "before",
    set textContent(value) { this.value = String(value); },
    get textContent() { return this.value; },
    get scrollHeight() {
      return this.value.split("\n").reduce((height, line) => height + Math.max(1, Math.ceil(line.length / columns)), 0) * 10;
    }
  };
}

test("message pagination uses rendered height and preserves every character", () => {
  const element = measuringElement({ columns: 8, rows: 3 });
  const source = "最初の文章です。次の文章は少し長くなっています。最後の文章です。";
  const formatPage = text => "話者「" + text + "」\n＊Aボタンで次へ";
  const pages = paginateMessageToFit({ element, text: source, formatPage });
  assert.ok(pages.length > 1);
  assert.equal(pages.join(""), source);
  assert.equal(element.textContent, "before");
  for (const page of pages) {
    element.textContent = formatPage(page);
    assert.ok(element.scrollHeight <= element.clientHeight + 1);
  }
});

test("message pagination keeps a fitting message on one page and handles a hidden element", () => {
  const element = measuringElement({ columns: 30, rows: 4 });
  assert.deepEqual(paginateMessageToFit({ element, text: "短い台詞。" }), ["短い台詞。"]);
  assert.deepEqual(paginateMessageToFit({ element: { clientHeight: 0 }, text: "表示前の台詞。" }), ["表示前の台詞。"]);
});
