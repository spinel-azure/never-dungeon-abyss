import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findJavaScriptFiles(target));
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(target);
  }
  return files;
}

test("internal ES module imports never use cache-busting query strings", async () => {
  const offenders = [];
  for (const file of await findJavaScriptFiles(ROOT)) {
    const source = await readFile(file, "utf8");
    if (/\bfrom\s*["'][^"']+\.js\?v=|\bimport\s*["'][^"']+\.js\?v=|\bimport\s*\(\s*["'][^"']+\.js\?v=/.test(source)) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  assert.deepEqual(offenders, []);
});

test("dungeon state resolves to one shared ES module instance", async () => {
  const first = await import("../js/dungeon.js");
  const second = await import("../js/dungeon.js");
  assert.strictEqual(first.cells, second.cells);
  assert.strictEqual(first.explored, second.explored);
});
