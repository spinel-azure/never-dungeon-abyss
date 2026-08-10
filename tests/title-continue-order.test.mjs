import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("main registers continue handlers before the title screen becomes interactive", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("js/main.js") < html.indexOf("js/title-screen.js"));
});

test("title actions wait for the main game ready handshake", async () => {
  const [titleSource, mainSource] = await Promise.all([
    readFile(new URL("../js/title-screen.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  assert.match(titleSource, /nda:main-ready/);
  assert.match(titleSource, /button\.disabled = !mainReady/);
  assert.match(mainSource, /dispatchEvent\(new CustomEvent\("nda:main-ready"\)\)/);
});
