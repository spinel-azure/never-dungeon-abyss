import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  RARE_REVIVAL_GODDESS_IMAGE,
  REVIVAL_GODDESS_IMAGE,
  selectRevivalGoddessImage
} from "../data/revival-presentation.js";

test("revival prayer selects Lumina at exactly the five-percent boundary", () => {
  assert.equal(selectRevivalGoddessImage(() => 0), RARE_REVIVAL_GODDESS_IMAGE);
  assert.equal(selectRevivalGoddessImage(() => 0.049999), RARE_REVIVAL_GODDESS_IMAGE);
  assert.equal(selectRevivalGoddessImage(() => 0.05), REVIVAL_GODDESS_IMAGE);
  assert.equal(selectRevivalGoddessImage(() => 0.999999), REVIVAL_GODDESS_IMAGE);
});

test("revival prayer chooses its image once before the existing animation starts", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  const start = source.indexOf("async function runRevivalPrayer()");
  const end = source.indexOf("function prepareRevivalBlackout()", start);
  const prayer = source.slice(start, end);
  assert.ok(prayer.indexOf("selectRevivalGoddessImage()") < prayer.indexOf('classList.add("is-active")'));
});
