import test from "node:test";
import assert from "node:assert/strict";

import { formatQuickJob, formatQuickMoney } from "../data/quick-status.js";

test("quick status uses the requested one-letter job labels", () => {
  assert.deepEqual(
    ["warrior", "thief", "priest", "mage"].map(formatQuickJob),
    ["【W】", "【T】", "【P】", "【M】"]
  );
});

test("quick status money is nonnegative and comma-separated", () => {
  assert.equal(formatQuickMoney(10000), "10,000");
  assert.equal(formatQuickMoney(1234567.9), "1,234,567");
  assert.equal(formatQuickMoney(-5), "0");
});
