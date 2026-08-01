import test from "node:test";
import assert from "node:assert/strict";

import {
  formatCompactQuickName,
  formatQuickJob,
  formatQuickLevel,
  formatQuickMoney
} from "../data/quick-status.js";

test("quick status keeps separate Japanese and English job labels", () => {
  assert.deepEqual(
    ["warrior", "thief", "priest", "mage"].map(formatQuickJob),
    ["【戦】", "【盗】", "【僧】", "【魔】"]
  );
  assert.deepEqual(
    ["warrior", "thief", "priest", "mage"].map(job => formatQuickJob(job, "en")),
    ["【W】", "【T】", "【P】", "【M】"]
  );
});

test("mobile quick status truncates only names of six or more characters", () => {
  assert.equal(formatCompactQuickName("じゅげむじ"), "じゅげむじ");
  assert.equal(formatCompactQuickName("じゅげむじゅ"), "じゅげむじ…");
  assert.equal(formatCompactQuickName("じゅげむじゅげむ"), "じゅげむじ…");
});

test("quick status level uses at least two digits without truncating high levels", () => {
  assert.equal(formatQuickLevel(1), "01");
  assert.equal(formatQuickLevel(197), "197");
});

test("quick status money is nonnegative and comma-separated", () => {
  assert.equal(formatQuickMoney(10000), "10,000");
  assert.equal(formatQuickMoney(1234567.9), "1,234,567");
  assert.equal(formatQuickMoney(-5), "0");
});
