import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the quest notice reuses the bell layout with distinct blue presentation", () => {
  const html = read("index.html");
  const css = read("css/town.css");
  assert.match(html, /id="guildQuestNotification" class="rumor-notification guild-quest-notification"/);
  assert.match(html, /id="guildQuestNotificationBell"[^>]+images\/screenshots\/bell\.avif/);
  assert.match(html, /<strong>依頼新着<\/strong>/);
  assert.match(html, /id="guildQuestNotificationDetail">ギルド依頼が追加されました/);
  assert.match(css, /\.guild-quest-notification\{[^}]*border-color:#5fd7ff/);
  assert.match(css, /\.guild-quest-notification \.rumor-notification-copy strong\{color:#67dcff/);
  assert.match(css, /\.rumor-notification\{[^}]*pointer-events:none/);
});

test("persistent state changes, reload resume, and guild rendering recheck quest notices", () => {
  const main = read("js/main.js");
  const town = read("js/town.js");
  assert.match(main, /function handlePersistentStateChanged\(\)[\s\S]*?syncRumorNotifications\(\);[\s\S]*?syncQuestNotifications\(\);/);
  assert.match(main, /function resumePassiveNotifications[\s\S]*?syncRumorNotifications\(\);[\s\S]*?syncQuestNotifications\(\);/);
  assert.match(main, /function updateCharacterUi\(\)[\s\S]*?detectAchievementUnlocks\(\);[\s\S]*?syncRumorNotifications\(\);[\s\S]*?syncQuestNotifications\(\);/);
  assert.match(main, /createGuildQuestNotificationController\(\{[\s\S]*?coordinator: passiveNotificationCoordinator/);
  assert.match(main, /resetPassiveNotifications\(\)[\s\S]*?guildQuestNotificationController\.reset\(\)/);
  assert.match(town, /function renderFacility\(\)[\s\S]*?town\.onStateChanged\(\);/);
});

test("notification assets use the current cache revision", () => {
  const html = read("index.html");
  assert.match(html, /css\/town\.css\?v=20260911-1/);
  assert.match(html, /js\/main\.js\?v=20260912-2/);
});
