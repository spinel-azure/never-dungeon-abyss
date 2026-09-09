// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The shipped page, town UI, dungeon overlay renderer, battle UI, and production input
// handlers run against an isolated in-memory character; no player's save is touched.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.QUEST_031_TEST_URL || "http://127.0.0.1:4173";
const output = process.env.QUEST_031_TEST_OUTPUT
  || path.resolve(process.cwd(), "artifacts", "quest-031");
await mkdir(output, { recursive: true });

const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const playerSource = await readFile(new URL("../../js/player.js", import.meta.url), "utf8");

const playerHook = `
window.quest031PlayerQa = {
  startSpecialRoomContentEvent,
  startJohannaMedicineSpringResultEvent,
  overlayInput: handleOverlayEventInput,
  snapshot: () => structuredClone(state.overlayEvent)
};`;

const mainHook = `
function resetQuest031QaEffects() {
  knownAchievementIds = null;
  achievementNotificationQueue.length = 0;
  achievementNotificationRunning = false;
  [achievementUnlockedEffect, questCompleteEffect, cardGetEffect].forEach(element => {
    if (!element) return;
    element.classList.remove("is-active");
    element.hidden = true;
  });
}

window.quest031MainQa = {
  setupCharacter({ medicine = false, spring = false } = {}) {
    localStorage.clear();
    saveEnabled = false;
    worldLocation = spring ? "dungeon" : "town";
    currentDepth = spring ? 57 : 1;
    character = createInitialCharacter({ name: "QUEST 031 QA", job: "warrior" });
    character.hp = character.maxHp = 99999;
    character.sp = character.maxSp = 9999;
    character.eventFlags = {
      ...(character.eventFlags || {}),
      inn_visited: true,
      tavern_rumor_008_base_read: true,
      quest_031_anna_request_unlocked: true,
      ...(spring ? { quest_031_kirke_consulted: true } : {}),
      ...(medicine ? {
        quest_031_kirke_consulted: true,
        boss_fleischfresserknospe_b57f_defeated: true,
        quest_031_night_dew_flower_received: true,
        quest_031_medicine_brewed: true
      } : {})
    };
    character.quests = {
      ...(character.quests || {}),
      active: { ...(character.quests?.active || {}), guild_031: { progress: 0 } },
      completedQuestIds: [...(character.quests?.completedQuestIds || [])]
    };
    if (medicine) {
      character = {
        ...character,
        keyItems: grantKeyItem(character.keyItems, "johanna_medicine").keyItems
      };
    }
    document.querySelector("#titleScreen").hidden = true;
    document.body.classList.remove("title-active");
    setBgmOptions({ enabled: false });
    setSeOptions({ enabled: false });
    setTownTypewriterOptions({ enabled: false });
    setNpcTypewriterOptions({ enabled: false });
    updateCharacterUi();
  },
  setupLifecycle() {
    localStorage.clear();
    saveEnabled = false;
    worldLocation = "town";
    currentDepth = 1;
    character = createInitialCharacter({ name: "QUEST 031 FLOW QA", job: "warrior" });
    character.level = 100;
    character.experience = 1_600_000;
    character.gold = 100_000;
    character.eventFlags = {
      ...(character.eventFlags || {}),
      guild_registration_card: true,
      guild_first_request_unlocked: true,
      tavern_rumor_001_base_read: true,
      tavern_rumor_001_mikan_read: true,
      tavern_rumor_002_base_read: true,
      tavern_rumor_002_ghost_read: true,
      tavern_rumor_003_base_read: true,
      tavern_rumor_003_wisdom_read: true,
      tavern_rumor_004_base_read: true,
      tavern_rumor_004_medicine_read: true,
      tavern_rumor_005_base_read: true,
      tavern_rumor_005_outfit_read: true,
      tavern_rumor_006_base_read: true,
      tavern_rumor_006_perfume_read: true,
      tavern_rumor_007_base_read: true,
      tavern_rumor_007_delivered_read: true,
      guild_all_trial_quests_card: true
    };
    character.adventureStats = {
      ...(character.adventureStats || {}),
      innStayCount: 100
    };
    character.quests = {
      ...(character.quests || {}),
      active: {},
      completedQuestIds: [
        "guild_001_abyss_rat",
        "guild_002_cave_slime",
        "guild_003_b1f_survey",
        "guild_026"
      ]
    };
    resetQuest031QaEffects();
    document.querySelector("#titleScreen").hidden = true;
    document.body.classList.remove("title-active");
    setBgmOptions({ enabled: false });
    setSeOptions({ enabled: false });
    setTownTypewriterOptions({ enabled: false });
    setNpcTypewriterOptions({ enabled: false });
    updateCharacterUi();
  },
  openTavern() {
    closeTown();
    worldLocation = "town";
    openTown({ registrationRequired: false, facilityId: "tavern", mode: "facilityMenu" });
  },
  openInn() {
    closeTown();
    worldLocation = "town";
    openTown({ registrationRequired: false, facilityId: "inn", mode: "facilityMenu" });
  },
  openGuild() {
    closeTown();
    worldLocation = "town";
    openTown({ registrationRequired: false, facilityId: "guild", mode: "facilityMenu" });
  },
  prepareReadyReport() {
    character = {
      ...character,
      carriedExperience: 10_000,
      eventFlags: {
        ...(character.eventFlags || {}),
        tavern_rumor_008_base_read: true,
        quest_031_anna_request_unlocked: true,
        quest_031_medicine_delivered: true,
        quest_031_anna_recovery_completed: true
      },
      quests: {
        ...(character.quests || {}),
        active: {
          ...(character.quests?.active || {}),
          guild_031: { progress: 1 }
        }
      }
    };
    character.pendingExperienceSettlement = createDepthReturnSettlement(character, 80);
    updateCharacterUi();
    return structuredClone(character.pendingExperienceSettlement);
  },
  setupPostQuestKeeper() {
    character = {
      ...character,
      eventFlags: {
        ...(character.eventFlags || {}),
        quest_031_johanna_thanks_pending: false,
        quest_031_johanna_thanks_seen: true,
        johanna_bonus_unlocked: true
      },
      quests: {
        ...(character.quests || {}),
        active: Object.fromEntries(Object.entries(character.quests?.active || {})
          .filter(([id]) => id !== "guild_031")),
        completedQuestIds: [...new Set([
          ...(character.quests?.completedQuestIds || []),
          "guild_031"
        ])]
      }
    };
    resetQuest031QaEffects();
    updateCharacterUi();
  },
  openPostQuestInnAtRoll(roll) {
    const previousRandom = Math.random;
    Math.random = () => Number(roll);
    try {
      this.openInn();
    } finally {
      Math.random = previousRandom;
    }
  },
  openMedicineInn() {
    closeTown();
    worldLocation = "town";
    openTown({ registrationRequired: false, facilityId: "inn", mode: "facilityMenu" });
  },
  openSpring() {
    closeTown();
    worldLocation = "dungeon";
    currentDepth = 57;
    window.quest031PlayerQa.startSpecialRoomContentEvent(getSpecialRoomDefinition(57).content, 1, 1);
  },
  openSpringResult() {
    closeTown();
    worldLocation = "dungeon";
    currentDepth = 57;
    window.quest031PlayerQa.startJohannaMedicineSpringResultEvent({
      content: getSpecialRoomDefinition(57).content,
      fromGX: 1,
      fromGY: 1
    });
  },
  startBoss() {
    closeTown();
    worldLocation = "dungeon";
    return startBattle(createBossCombatant("fleischfresserknospe_b57f"), { playStartSe: false });
  },
  state: () => structuredClone(character),
  unreadRumor: () => structuredClone(getUnreadTavernRumor(character)),
  town: getTownState,
  townInput: handleTownInput,
  overlay: () => window.quest031PlayerQa.snapshot(),
  overlayInput: action => window.quest031PlayerQa.overlayInput(action)
};`;

function instrumentMain(source) {
  const anchor = '  document.documentElement.dataset.ndaMainReady = "true";';
  assert.equal(source.includes(anchor), true, "main QA hook anchor exists");
  return source.replace(anchor, `${mainHook}\n${anchor}`);
}

async function pressA(page, touch) {
  if (touch) {
    await page.dispatchEvent("#buttonA", "touchend", { bubbles: true, cancelable: true });
    return;
  }
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", {
    key: "x", code: "KeyX", bubbles: true, cancelable: true
  })));
}

async function pressB(page, touch) {
  if (touch) {
    await page.dispatchEvent("#buttonB", "touchend", { bubbles: true, cancelable: true });
    return;
  }
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", {
    key: "z", code: "KeyZ", bubbles: true, cancelable: true
  })));
}

async function activateFacilityCommand(page, command, touch) {
  const button = page.locator(`#dungeonCommands [data-facility-command="${command}"]`);
  await button.waitFor({ state: "visible" });
  if (touch) {
    await button.tap();
    return;
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await button.evaluate(node => node.classList.contains("is-selected"))) break;
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowRight", code: "ArrowRight", bubbles: true, cancelable: true
    })));
  }
  assert.equal(await button.evaluate(node => node.classList.contains("is-selected")), true);
  await pressA(page, false);
}

async function activateQuestEntry(page, number, touch) {
  const entry = page.locator("#guildQuestList .guild-quest-entry", { hasText: `${number}:` });
  for (let pageIndex = 0; pageIndex < 20 && !(await entry.isVisible().catch(() => false)); pageIndex += 1) {
    const next = page.locator('#guildQuestPager [data-quest-page="1"]');
    assert.equal(await next.isVisible(), true, `quest ${number}: next page is available; list=${await page.locator("#guildQuestList").textContent()}`);
    await next.evaluate(button => button.click());
    await page.waitForTimeout(40);
  }
  assert.equal(
    await entry.isVisible().catch(() => false),
    true,
    `quest ${number}: entry is visible; pager=${await page.locator("#guildQuestPager").textContent()} list=${await page.locator("#guildQuestList").textContent()}`
  );
  if (touch) {
    await entry.evaluate(button => button.click());
    await page.waitForTimeout(40);
    await entry.evaluate(button => button.click());
  } else {
    await entry.click();
    await entry.click();
  }
}

async function waitForEffectHidden(page, selector, timeout = 10_000) {
  await page.waitForFunction(
    target => document.querySelector(target)?.hidden === true,
    selector,
    { timeout }
  );
}

async function advanceOverlayUntil(page, predicate, label, maxInputs = 12) {
  for (let input = 0; input < maxInputs; input += 1) {
    if (await page.evaluate(predicate)) return;
    await page.evaluate(() => quest031MainQa.overlayInput("confirm"));
    await page.waitForTimeout(40);
  }
  assert.equal(await page.evaluate(predicate), true, `${label}: expected overlay state was not reached`);
}

async function assertMessageFits(page, label) {
  const metrics = await page.locator("#message").evaluate(node => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight
  }));
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${label}: message width ${JSON.stringify(metrics)}`);
  assert.ok(metrics.scrollHeight <= metrics.clientHeight + 2, `${label}: message height ${JSON.stringify(metrics)}`);
  return metrics;
}

async function snapshotInn(page) {
  return page.evaluate(() => {
    const root = document.querySelector("#townScreen");
    const portrait = document.querySelector("#townPortrait");
    const frame = document.querySelector(".town-portrait-frame").getBoundingClientRect();
    const image = portrait.getBoundingClientRect();
    return {
      message: document.querySelector("#message").textContent,
      portrait: portrait.getAttribute("src") || "",
      portraitLoaded: portrait.complete && portrait.naturalWidth > 0,
      blackout: root.classList.contains("is-inn-medicine-blackout"),
      viewportFits: frame.left >= -1 && frame.right <= innerWidth + 1
        && document.documentElement.scrollWidth <= innerWidth,
      portraitFits: image.left >= frame.left - 1 && image.right <= frame.right + 1
        && image.top >= frame.top - 1 && image.bottom <= frame.bottom + 1
    };
  });
}

const browser = await chromium.launch({
  channel: process.env.QUEST_031_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

try {
  for (const [layout, width, height, touch] of [["pc", 1280, 900, false], ["mobile", 390, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`${layout}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`${layout}: ${message.text()}`);
    });
    await page.route("**/js/player.js", route => route.fulfill({
      contentType: "text/javascript",
      body: `${playerSource}\n${playerHook}`
    }));
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentMain(mainSource)
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.quest031MainQa && window.quest031PlayerQa);

    await page.evaluate(() => {
      quest031MainQa.setupLifecycle();
      window.__quest031AchievementStarts = 0;
      const effect = document.querySelector("#achievementUnlockedEffect");
      let active = effect?.classList.contains("is-active") || false;
      window.__quest031AchievementObserver?.disconnect();
      window.__quest031AchievementObserver = new MutationObserver(() => {
        const next = effect?.classList.contains("is-active") || false;
        if (next && !active) window.__quest031AchievementStarts += 1;
        active = next;
      });
      window.__quest031AchievementObserver.observe(effect, {
        attributes: true,
        attributeFilter: ["class", "hidden"]
      });
      quest031MainQa.openTavern();
    });
    assert.equal((await page.evaluate(() => quest031MainQa.town())).facilityId, "tavern");
    assert.equal((await page.evaluate(() => quest031MainQa.state())).eventFlags.tavern_rumor_008_base_read, undefined);
    assert.equal((await page.evaluate(() => quest031MainQa.unreadRumor())).id, "rumor_008_base");
    await activateFacilityCommand(page, "rumors", touch);
    const rumorTownState = await page.evaluate(() => ({
      town: quest031MainQa.town(),
      message: document.querySelector("#message")?.textContent || "",
      commands: [...document.querySelectorAll("#dungeonCommands [data-facility-command]")]
        .map(button => ({ command: button.dataset.facilityCommand, text: button.textContent, hidden: button.hidden }))
    }));
    assert.equal(rumorTownState.town.mode, "tavernRumor", JSON.stringify(rumorTownState));
    assert.match(await page.locator("#message").textContent(), /最近ヨハンナの具合が悪いらしい/u);
    await assertMessageFits(page, `${layout} rumor 008 first page`);
    await page.screenshot({ path: path.join(output, `${layout}-rumor-008.png`), fullPage: true });
    await pressA(page, touch);
    assert.match(await page.locator("#message").textContent(), /娘も心配してるそうだ/u);
    await pressA(page, touch);
    assert.equal(
      (await page.evaluate(() => quest031MainQa.state())).eventFlags.tavern_rumor_008_base_read,
      true
    );

    await page.evaluate(() => quest031MainQa.openInn());
    await page.waitForFunction(() => /NPC_11e\.avif$/u.test(document.querySelector("#townPortrait")?.getAttribute("src") || ""));
    assert.match(await page.locator("#message").textContent(), /あっ…。いらっしゃいませ。/u);
    await activateFacilityCommand(page, "talk", touch);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).mode, "facilityTalk");
    assert.match(await page.locator("#message").textContent(), /わたしはアンナと言います/u);
    await assertMessageFits(page, `${layout} Anna first talk`);
    await page.screenshot({ path: path.join(output, `${layout}-anna-first-talk.png`), fullPage: true });
    await pressA(page, touch);
    assert.equal(
      (await page.evaluate(() => quest031MainQa.state())).eventFlags.quest_031_anna_request_unlocked,
      true
    );

    await page.evaluate(() => quest031MainQa.openGuild());
    await activateFacilityCommand(page, "accept", touch);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).mode, "questAcceptList");
    await activateQuestEntry(page, "031", touch);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).mode, "questAcceptDetail");
    const questDetail = await page.locator("#guildQuestDetail").textContent();
    assert.match(questDetail, /内容\s*ヨハンナの薬をアンナに届ける/u);
    assert.match(questDetail, /報酬\s*デッキカード×1/u);
    await page.screenshot({ path: path.join(output, `${layout}-quest-031-detail.png`), fullPage: true });

    const pendingBeforeThanks = await page.evaluate(() => quest031MainQa.prepareReadyReport());
    assert.equal(pendingBeforeThanks.finalSettlementExp, 14_000);
    assert.equal(pendingBeforeThanks.johannaBonusUnlocked, false);
    await page.evaluate(() => quest031MainQa.openGuild());
    await activateFacilityCommand(page, "report", touch);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).mode, "questReportList");
    await activateQuestEntry(page, "031", touch);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).mode, "questReportConfirm");
    await pressA(page, touch);
    await page.waitForFunction(() => document.querySelector("#achievementUnlockedEffect")?.classList.contains("is-active"));
    const reported = await page.evaluate(() => quest031MainQa.state());
    assert.equal(reported.quests.completedQuestIds.includes("guild_031"), true);
    assert.equal(reported.cards.ownedCardCounts.legendary_return_favor, 1);
    assert.equal(reported.eventFlags.quest_031_johanna_thanks_pending, true);
    await page.screenshot({ path: path.join(output, `${layout}-quest-031-achievement.png`), fullPage: true });
    await page.waitForFunction(() => document.querySelector("#questCompleteEffect")?.classList.contains("is-active"));
    await waitForEffectHidden(page, "#questCompleteEffect");
    await page.waitForFunction(() => document.querySelector("#cardGetEffect")?.classList.contains("is-active"));
    await page.screenshot({ path: path.join(output, `${layout}-return-favor-card.png`), fullPage: true });
    await waitForEffectHidden(page, "#cardGetEffect");
    await page.waitForFunction(() => window.__quest031AchievementStarts === 1);
    assert.equal(await page.evaluate(() => window.__quest031AchievementStarts), 1);

    await page.evaluate(() => quest031MainQa.openInn());
    assert.equal((await page.evaluate(() => quest031MainQa.town())).innKeeperId, "johanna");
    assert.match(await page.locator("#message").textContent(), /今回はあたしと娘が世話になったね/u);
    await assertMessageFits(page, `${layout} Johanna thanks`);
    await page.screenshot({ path: path.join(output, `${layout}-johanna-thanks.png`), fullPage: true });
    await pressA(page, touch);
    assert.match(await page.locator("#message").textContent(), /本当に感謝してるよ/u);
    await pressA(page, touch);
    assert.match(await page.locator("#message").textContent(), /ヨハンナボーナス/u);
    await pressA(page, touch);
    const afterThanks = await page.evaluate(() => quest031MainQa.state());
    assert.equal(afterThanks.eventFlags.quest_031_johanna_thanks_seen, true);
    assert.equal(afterThanks.eventFlags.johanna_bonus_unlocked, true);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).innKeeperId, "johanna");

    await activateFacilityCommand(page, "stay", touch);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).mode, "innStayConfirm");
    await pressA(page, touch);
    await page.waitForFunction(() => document.querySelector("#experienceSettlementOverlay")?.hidden === false, null, {
      timeout: 12_000
    });
    const settlementText = await page.locator("#experienceSettlementDetail").textContent();
    assert.match(settlementText, /獲得経験値\s+10,000/u);
    assert.match(settlementText, /深層帰還ボーナス\s+＋40％/u);
    assert.match(settlementText, /ボーナス経験値\s+4,000/u);
    assert.match(settlementText, /ヨハンナボーナス\s+＋10％/u);
    assert.match(settlementText, /ヨハンナ加算経験値\s+1,000/u);
    assert.match(settlementText, /精算経験値\s+15,000/u);
    const settledState = await page.evaluate(() => quest031MainQa.state());
    assert.equal(settledState.experience, 1_615_000);
    assert.equal(settledState.carriedExperience, 0);
    assert.equal(settledState.pendingExperienceSettlement, null);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).innKeeperId, "johanna");
    await page.screenshot({ path: path.join(output, `${layout}-johanna-settlement.png`), fullPage: true });
    const settlementOverlay = page.locator("#experienceSettlementOverlay");
    if (touch) await settlementOverlay.tap();
    else await settlementOverlay.click();

    await page.evaluate(() => {
      quest031MainQa.setupPostQuestKeeper();
      quest031MainQa.openPostQuestInnAtRoll(0.249999);
    });
    let keeper = await page.evaluate(() => quest031MainQa.town());
    assert.equal(keeper.innKeeperId, "anna_happy");
    assert.match(await page.locator("#townPortrait").getAttribute("src"), /NPC_11d\.avif$/u);
    await page.screenshot({ path: path.join(output, `${layout}-postquest-anna.png`), fullPage: true });
    await activateFacilityCommand(page, "talk", touch);
    assert.match(await page.locator("#message").textContent(), /今日はわたしがお店番/u);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).innKeeperId, "anna_happy");
    await activateFacilityCommand(page, "stay", touch);
    assert.equal((await page.evaluate(() => quest031MainQa.town())).mode, "innStayConfirm");
    await pressB(page, touch);
    keeper = await page.evaluate(() => quest031MainQa.town());
    assert.equal(keeper.innKeeperId, "anna_happy");
    assert.match(await page.locator("#message").textContent(), /またきてくださいねっ/u);

    await page.evaluate(() => quest031MainQa.openPostQuestInnAtRoll(0.25));
    keeper = await page.evaluate(() => quest031MainQa.town());
    assert.equal(keeper.innKeeperId, "johanna");
    assert.doesNotMatch(await page.locator("#townPortrait").getAttribute("src") || "", /NPC_11d\.avif$/u);
    await page.screenshot({ path: path.join(output, `${layout}-postquest-johanna.png`), fullPage: true });

    await page.evaluate(() => {
      quest031MainQa.setupCharacter({ medicine: true });
      quest031MainQa.openMedicineInn();
    });
    await page.waitForFunction(() => {
      const image = document.querySelector("#townPortrait");
      return image?.complete && image.naturalWidth > 0;
    });
    let inn = await snapshotInn(page);
    assert.match(inn.portrait, /images\/npc\/NPC_11e\.avif$/u);
    assert.match(inn.message, /あっ…。いらっしゃいませ。/u);
    assert.equal(inn.portraitLoaded, true);
    assert.equal(inn.viewportFits, true);
    assert.equal(inn.portraitFits, true);
    await assertMessageFits(page, `${layout} sad Anna greeting`);
    await page.screenshot({ path: path.join(output, `${layout}-anna-sad.png`), fullPage: true });

    await page.evaluate(() => quest031MainQa.townInput("right"));
    await pressA(page, touch);
    assert.match(await page.locator("#message").textContent(), /それは…おかあさんの薬/u);
    await assertMessageFits(page, `${layout} medicine dialogue`);
    await pressA(page, touch);
    await page.waitForFunction(() => document.querySelector("#townScreen").classList.contains("is-inn-medicine-blackout"));
    // Capture after the fade has visibly started but before the 360 ms portrait swap.
    await page.waitForTimeout(200);
    inn = await snapshotInn(page);
    assert.equal(inn.blackout, true);
    assert.match(inn.portrait, /images\/npc\/NPC_11e\.avif$/u);
    await page.screenshot({ path: path.join(output, `${layout}-medicine-blackout.png`), fullPage: true });

    await page.waitForFunction(() => /NPC_11d\.avif$/u.test(document.querySelector("#townPortrait")?.getAttribute("src") || ""));
    inn = await snapshotInn(page);
    assert.match(inn.message, /だいぶ落ち着いてきたみたい。本当にありがとう/u);
    assert.equal((await page.evaluate(() => quest031MainQa.state())).keyItems.owned.johanna_medicine, undefined);
    assert.equal((await page.evaluate(() => quest031MainQa.state())).eventFlags.quest_031_medicine_delivered, true);
    await page.waitForFunction(() => !document.querySelector("#townScreen").classList.contains("is-inn-medicine-blackout"));
    await page.waitForTimeout(400);
    inn = await snapshotInn(page);
    assert.equal(inn.blackout, false);
    assert.equal(inn.viewportFits, true);
    assert.equal(inn.portraitFits, true);
    await assertMessageFits(page, `${layout} happy Anna recovery`);
    await page.screenshot({ path: path.join(output, `${layout}-anna-happy.png`), fullPage: true });

    await page.evaluate(() => {
      quest031MainQa.setupCharacter({ spring: true });
      quest031MainQa.openSpring();
    });
    await page.waitForFunction(() => quest031MainQa.overlay()?.type === "johannaMedicineSpring");
    let overlay = await page.evaluate(() => quest031MainQa.overlay());
    assert.equal(overlay.backgroundImageId, "johanna_medicine_spring_b57f");
    assert.equal(overlay.pageIndex, 0);
    assert.match(await page.locator("#message").textContent(), /澄んだ水をたたえる泉/u);
    await page.waitForTimeout(250);
    const backgroundPixels = await page.locator("#eventOverlay").evaluate(canvas => {
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0;
      for (let index = 3; index < data.length; index += 400) if (data[index] > 0) opaque += 1;
      return opaque;
    });
    assert.ok(backgroundPixels > 100, `${layout}: spring background drawn`);
    await assertMessageFits(page, `${layout} spring introduction`);
    await page.screenshot({ path: path.join(output, `${layout}-spring.png`), fullPage: true });
    await advanceOverlayUntil(
      page,
      () => quest031MainQa.overlay()?.imageId === "maerchentiere_reaching_flower_b57f",
      `${layout} spring party image`
    );
    await page.waitForFunction(() => quest031MainQa.overlay()?.imageId === "maerchentiere_reaching_flower_b57f");
    overlay = await page.evaluate(() => quest031MainQa.overlay());
    assert.equal(overlay.imageFit, "cover");
    assert.match(await page.locator("#message").textContent(), /岩場へぴょんぴょん/u);
    await page.waitForTimeout(250);
    await assertMessageFits(page, `${layout} spring party image`);
    await page.screenshot({ path: path.join(output, `${layout}-spring-party.png`), fullPage: true });

    await page.evaluate(() => quest031MainQa.openSpringResult());
    await page.waitForFunction(() => quest031MainQa.overlay()?.type === "johannaMedicineSpringResult");
    await advanceOverlayUntil(
      page,
      () => quest031MainQa.overlay()?.imageId === "maerchentiere_offering_flower_b57f",
      `${layout} spring flower offering`
    );
    await page.waitForFunction(() => quest031MainQa.overlay()?.imageId === "maerchentiere_offering_flower_b57f");
    overlay = await page.evaluate(() => quest031MainQa.overlay());
    assert.equal(overlay.imageFit, "containFull");
    assert.match(await page.locator("#message").textContent(), /カニンヒェン「Ja……!」/u);
    await page.waitForTimeout(250);
    await assertMessageFits(page, `${layout} spring flower offering`);
    await page.screenshot({ path: path.join(output, `${layout}-spring-offering.png`), fullPage: true });

    assert.equal(await page.evaluate(() => quest031MainQa.startBoss()), true);
    const enemyImage = page.locator("#battleEnemyImage");
    await enemyImage.waitFor({ state: "attached" });
    await page.waitForFunction(() => {
      const image = document.querySelector("#battleEnemyImage");
      return image?.complete && image.naturalWidth > 0
        && document.querySelector(".battle-enemy-stage")?.classList.contains("has-enemy-deform");
    });
    await page.waitForTimeout(180);
    const boss = await page.evaluate(() => {
      const image = document.querySelector("#battleEnemyImage");
      const canvas = document.querySelector(".battle-enemy-ambient-front");
      const sourceStyle = getComputedStyle(image);
      const viewport = document.querySelector(".viewport").getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const nameRect = document.querySelector("#battleEnemyName").getBoundingClientRect();
      return {
        name: document.querySelector("#battleEnemyName").textContent,
        src: image.getAttribute("src"),
        canvas: Boolean(canvas),
        canvasVisible: canvas ? getComputedStyle(canvas).display !== "none" && !canvas.hidden : false,
        sourceOpacity: Number(sourceStyle.opacity),
        sourceVisibility: sourceStyle.visibility,
        stageClasses: image.parentElement?.className || "",
        fits: imageRect.left >= viewport.left - 1 && imageRect.right <= viewport.right + 1
          && imageRect.top >= viewport.top - 1 && imageRect.bottom <= viewport.bottom + 1,
        nameFits: nameRect.left >= viewport.left - 1 && nameRect.right <= viewport.right + 1
          && nameRect.top >= viewport.top - 1 && nameRect.bottom <= viewport.bottom + 1,
        nameBox: { left: nameRect.left, right: nameRect.right, top: nameRect.top, bottom: nameRect.bottom },
        viewportBox: { left: viewport.left, right: viewport.right, top: viewport.top, bottom: viewport.bottom },
        frame: canvas?.toDataURL() || ""
      };
    });
    assert.match(boss.name, /フライシュフレッサークスノペ/u);
    assert.match(boss.src, /images\/bosses\/boss_23\.avif$/u);
    assert.equal(boss.canvas, true);
    assert.equal(boss.canvasVisible, true);
    assert.ok(
      boss.sourceVisibility === "hidden" || boss.sourceOpacity <= 0.01,
      `${layout}: undeformed source is hidden (visibility=${boss.sourceVisibility}, opacity=${boss.sourceOpacity})`
    );
    assert.equal(boss.fits, true);
    assert.equal(
      boss.nameFits,
      true,
      `${layout}: boss name fits the viewport (${JSON.stringify({ name: boss.nameBox, viewport: boss.viewportBox })})`
    );
    await page.waitForTimeout(420);
    const nextFrame = await page.locator(".battle-enemy-ambient-front").evaluate(canvas => canvas.toDataURL());
    assert.notEqual(nextFrame, boss.frame, `${layout}: tentacle canvas updates`);
    await assertMessageFits(page, `${layout} boss message`);
    await page.screenshot({ path: path.join(output, `${layout}-boss.png`), fullPage: true });

    results.push({
      layout,
      viewport: `${width}x${height}`,
      rumorAndUnlock: "rumor_008 read -> Anna talk -> guild_031 visible",
      questDetail: "heading=内容; reward=デッキカード×1",
      report: "legendary_return_favor x1; achievement popup x1",
      johannaThanks: "mandatory Johanna visit; bonus unlocked before same-visit stay",
      settlement: "10,000 + 4,000 depth + 1,000 Johanna = 15,000",
      keeperBoundary: "0.249999=Anna; 0.25=Johanna; same-visit keeper retained",
      medicineTransition: "NPC_11e -> blackout -> NPC_11d",
      spring: "dungeon_event_14 + NPC_event_28 + NPC_event_29",
      boss: "boss_23.avif with animated tentacle canvas",
      messageFits: true
    });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, pageErrors, consoleErrors, screenshots: output }, null, 2));
