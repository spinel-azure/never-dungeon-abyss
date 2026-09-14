import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import {
  getPastTavernRumors,
  getTavernRumorTypewriterParts,
  getUnreadTavernRumor,
  getUnreadTavernRumors,
  markTavernRumorRead
} from "../data/tavern-rumors.js";

test("tavern rumor typewriter isolates only customer and Rosa dialogue", () => {
  assert.deepEqual(
    getTavernRumorTypewriterParts("あなたはカウンターから耳を澄ます……。\n客「おい、知ってるか？」\n＊Aボタンで次へ"),
    {
      prefix: "あなたはカウンターから耳を澄ます……。\n客「",
      dialogue: "おい、知ってるか？",
      suffix: "」\n＊Aボタンで次へ"
    }
  );
  assert.equal(getTavernRumorTypewriterParts("あなたはカウンターから耳を澄ます……。"), null);
});

test("tavern rumor becomes read and is unavailable until its Mikan update", () => {
  let character = createInitialCharacter("噂好き", "thief");
  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_001_base");
  character = markTavernRumorRead(character, base);
  assert.equal(getUnreadTavernRumor(character), null);
  const updated = getUnreadTavernRumor(character, { mikanEncountered: true });
  assert.equal(updated.id, "rumor_001_mikan");
  assert.match(updated.dialogue.at(-1), /みかんにゃんこ/);
  character = markTavernRumorRead(character, updated);
  assert.equal(getUnreadTavernRumor(character, { mikanEncountered: true }), null);
});

test("meeting Mikan before hearing the rumor starts with the updated version", () => {
  let character = createInitialCharacter("猫好き", "mage");
  const updated = getUnreadTavernRumor(character, { mikanEncountered: true });
  character = markTavernRumorRead(character, updated);
  assert.equal(getUnreadTavernRumor(character), null);
});

test("B2 unlocks the lingering ghost rumor and victory unlocks its update", () => {
  let character = createInitialCharacter("亡霊見物", "priest");
  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  character.highestDungeonDepthReached = 2;

  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_002_base");
  assert.match(base.dialogue[0], /地下2階に亡霊/);
  character = markTavernRumorRead(character, base);
  assert.equal(getUnreadTavernRumor(character), null);

  const updated = getUnreadTavernRumor(character, { lingeringGhostDefeated: true });
  assert.equal(updated.id, "rumor_002_ghost");
  assert.match(updated.dialogue.at(-1), /何度も出てくる/);
  character = markTavernRumorRead(character, updated);
  assert.equal(getUnreadTavernRumor(character, { lingeringGhostDefeated: true }), null);
});

test("unread tavern rumors are returned in registration order", () => {
  const character = createInitialCharacter("聞き込み屋", "warrior");
  character.highestDungeonDepthReached = 2;
  assert.equal(getUnreadTavernRumor(character).id, "rumor_001_base");
});

test("past rumors list only heard topics without a current unread update", () => {
  let character = createInitialCharacter("噂の記録係", "thief");
  assert.deepEqual(getPastTavernRumors(character), []);

  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  assert.deepEqual(
    getPastTavernRumors(character).map(entry => `${entry.number} ${entry.title}`),
    ["001 喋る猫の噂"]
  );

  assert.deepEqual(getPastTavernRumors(character, { mikanEncountered: true }), []);
  const update = getUnreadTavernRumor(character, { mikanEncountered: true });
  character = markTavernRumorRead(character, update);
  const history = getPastTavernRumors(character, { mikanEncountered: true });
  assert.equal(history.length, 1);
  assert.equal(history[0].title, "喋る猫の噂");
  assert.match(history[0].description.at(-1), /みかんにゃんこ/);
});

test("past rumor descriptions preserve the two customers and Rosa", () => {
  let character = createInitialCharacter("聞き書き", "priest");
  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  const [entry] = getPastTavernRumors(character);
  assert.equal(entry.description.length, 3);
  assert.match(entry.description[0], /^客：/);
  assert.match(entry.description[1], /^客：/);
  assert.match(entry.description[2], /^ローザ：/);
});

test("B4 unlocks the terrifying presence rumor and Otherworldly Wisdom adds Rosa's follow-up", () => {
  let character = createInitialCharacter("生還者", "warrior");
  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  character.highestDungeonDepthReached = 4;
  character = markTavernRumorRead(character, getUnreadTavernRumor(character, { lingeringGhostDefeated: false }));

  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_003_base");
  assert.equal(base.dialogue[0].includes("\u304a\u3044\u3001\u77e5\u3063\u3066\u308b\u304b\uff1f"), false);
  assert.equal(base.dialogue[1].includes("\u3042\u3042\u3002\u3042\u3042\u3002"), false);
  assert.match(base.dialogue[0], /地下4階に恐ろしい何か/);
  assert.equal(base.dialogue.length, 3);
  character = markTavernRumorRead(character, base);
  assert.equal(getUnreadTavernRumor(character), null);

  const updated = getUnreadTavernRumor(character, { otherworldlyWisdomDefeated: true });
  assert.equal(updated.id, "rumor_003_wisdom");
  assert.equal(updated.dialogue.length, 4);
  assert.match(updated.dialogue.at(-1), /あなた…よく生きて/);
  assert.deepEqual(updated.readFlags, ["tavern_rumor_003_base_read", "tavern_rumor_003_wisdom_read"]);
  character = markTavernRumorRead(character, updated);

  const history = getPastTavernRumors(character, { otherworldlyWisdomDefeated: true });
  const rumor = history.find(entry => entry.id === "rumor_003");
  assert.equal(rumor.number, "003");
  assert.equal(rumor.title, "恐ろしい何かの噂");
  assert.equal(rumor.description.length, 4);
});

test("priest rumor requires quest 019 plus one hundred donations and updates after quest 016", () => {
  let character = createInitialCharacter("寄進者", "priest");
  character.eventFlags = {
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true,
    tavern_rumor_009_base_read: true,
    tavern_rumor_010_base_read: true
  };
  character.highestDungeonDepthReached = 50;
  character.adventureStats.templeDonationCount = 100;
  assert.equal(getUnreadTavernRumor(character), null);

  character.quests.completedQuestIds.push("guild_019");
  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_004_base");
  assert.match(base.dialogue[0], /司祭様が腰を痛められて/);
  assert.match(base.dialogue[1], /若い助祭/);
  character = markTavernRumorRead(character, base);
  assert.equal(character.eventFlags.tavern_rumor_004_base_read, true);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_004")?.title, "司祭様の噂");

  character.quests.completedQuestIds.push("guild_016");
  assert.equal(getPastTavernRumors(character).some(entry => entry.id === "rumor_004"), false);
  const update = getUnreadTavernRumor(character);
  assert.equal(update.id, "rumor_004_medicine");
  assert.match(update.dialogue.at(-1), /特効薬の材料/);
  character = markTavernRumorRead(character, update);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_004")?.description.length, 4);
});


test("acolyte rumor unlocks at five hundred donations and continues after the hidden temple event", () => {
  let character = createInitialCharacter("祝祭見物", "mage");
  character.eventFlags = {
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true,
    tavern_rumor_004_medicine_read: true
  };
  character.adventureStats.templeDonationCount = 499;
  assert.equal(getUnreadTavernRumor(character), null);
  character.adventureStats.templeDonationCount = 500;
  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_005_base");
  assert.match(base.dialogue[0], /大胆な格好/);
  character = markTavernRumorRead(character, base);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_005")?.title, "助祭の噂");

  character.eventFlags.anastasia_festival_outfit_unlocked = true;
  assert.equal(getPastTavernRumors(character).some(entry => entry.id === "rumor_005"), false);
  const update = getUnreadTavernRumor(character);
  assert.equal(update.id, "rumor_005_outfit");
  assert.match(update.dialogue.at(-1), /とても大胆な格好だった/);
  character = markTavernRumorRead(character, update);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_005")?.description.length, 4);
});

test("acolyte rumor stays hidden at five hundred donations until the priest rumor is complete", () => {
  const character = createInitialCharacter("先行寄進者", "priest");
  character.eventFlags = {
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true
  };
  character.adventureStats.templeDonationCount = 500;
  assert.equal(getUnreadTavernRumor(character), null);
  character.eventFlags.tavern_rumor_004_medicine_read = true;
  assert.equal(getUnreadTavernRumor(character)?.id, "rumor_005_base");
});

test("Johanna rumor requires one hundred inn stays and reported Maerchentiere, then preserves two exact customer pages", () => {
  const character = createInitialCharacter({ name: "宿屋の常連", job: "priest" });
  character.eventFlags.tavern_rumor_001_base_read = true;
  character.quests.completedQuestIds.push("guild_026");
  character.adventureStats.innStayCount = 99;
  assert.equal(getUnreadTavernRumor(character), null);

  character.adventureStats.innStayCount = 100;
  let rumor = getUnreadTavernRumor(character);
  assert.equal(rumor.id, "rumor_008_base");
  assert.deepEqual(rumor.dialogue, [
    "客「おい、知ってるか？最近ヨハンナの具合が悪いらしい。」\n＊Aボタンで次へ",
    "客「宿屋の女将だよ。働きすぎなんじゃないかねぇ。娘も心配してるそうだ。」\n＊Aボタンで戻る"
  ]);

  const missingPrerequisite = createInitialCharacter({ name: "宿泊者", job: "mage" });
  missingPrerequisite.eventFlags.tavern_rumor_001_base_read = true;
  missingPrerequisite.adventureStats.innStayCount = 100;
  assert.equal(getUnreadTavernRumor(missingPrerequisite), null);

  const heard = markTavernRumorRead(character, rumor);
  assert.equal(heard.eventFlags.tavern_rumor_008_base_read, true);
  assert.equal(getUnreadTavernRumor(heard), null);
  const history = getPastTavernRumors(heard).find(entry => entry.id === "rumor_008");
  assert.deepEqual(history.description, [
    "客：おい、知ってるか？最近ヨハンナの具合が悪いらしい。",
    "客：宿屋の女将だよ。働きすぎなんじゃないかねぇ。娘も心配してるそうだ。"
  ]);
});

test("B40 unlocks the marathon rumor and a B42 marathon completion adds its follow-up", () => {
  let character = createInitialCharacter({ name: "長距離走者", job: "warrior" });
  character.highestDungeonDepthReached = 39;
  assert.equal(getUnreadTavernRumors(character).some(rumor => rumor.rumorId === "rumor_009"), false);

  character.highestDungeonDepthReached = 40;
  const base = getUnreadTavernRumors(character).find(rumor => rumor.rumorId === "rumor_009");
  assert.equal(base?.id, "rumor_009_base");
  assert.deepEqual(base?.dialogue, [
    "あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？長距離走る事をマラソンって言うらしいな？」\n＊Aボタンで次へ",
    "客「ああ。お前も「奈落の入口」からマラソンしてみたらどうだ？」\n＊Aボタンで次へ",
    "ローザ「マラソンって42キロも走るのよね？私には無理だわ…。」\n＊Aボタンで戻る"
  ]);
  assert.equal(base.dialogue.every(message => getTavernRumorTypewriterParts(message)), true);

  character = markTavernRumorRead(character, base);
  let history = getPastTavernRumors(character).find(entry => entry.id === "rumor_009");
  assert.equal(history?.number, "009");
  assert.equal(history?.title, "マラソンの噂");
  assert.deepEqual(history?.description, [
    "客：おい、知ってるか？長距離走る事をマラソンって言うらしいな？",
    "客：ああ。お前も「奈落の入口」からマラソンしてみたらどうだ？",
    "ローザ：マラソンって42キロも走るのよね？私には無理だわ…。"
  ]);

  character.eventFlags.b1_b42_marathon_completed = true;
  const completed = getUnreadTavernRumors(character).find(rumor => rumor.rumorId === "rumor_009");
  assert.equal(completed?.id, "rumor_009_marathon");
  assert.deepEqual(completed?.readFlags, [
    "tavern_rumor_009_base_read",
    "tavern_rumor_009_marathon_read"
  ]);
  assert.deepEqual(completed?.dialogue, [
    "あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？長距離走る事をマラソンって言うらしいな？」\n＊Aボタンで次へ",
    "客「ああ。お前も「奈落の入口」からマラソンしてみたらどうだ？」\n＊Aボタンで次へ",
    "ローザ「マラソンって42キロも走るのよね？私には無理だわ…。」\n＊Aボタンで次へ",
    "ローザ「えっ！？あなた完走したの！？スゴいわ…！」\n＊Aボタンで戻る"
  ]);
  assert.equal(completed.dialogue.every(message => getTavernRumorTypewriterParts(message)), true);
  assert.equal(getPastTavernRumors(character).some(entry => entry.id === "rumor_009"), false);

  character = markTavernRumorRead(character, completed);
  history = getPastTavernRumors(character).find(entry => entry.id === "rumor_009");
  assert.deepEqual(history?.description, [
    "客：おい、知ってるか？長距離走る事をマラソンって言うらしいな？",
    "客：ああ。お前も「奈落の入口」からマラソンしてみたらどうだ？",
    "ローザ：マラソンって42キロも走るのよね？私には無理だわ…。",
    "ローザ：えっ！？あなた完走したの！？スゴいわ…！"
  ]);
});

test("an existing save that already completed the B42 marathon receives only the latest rumor stage", () => {
  const character = createInitialCharacter({ name: "完走済み", job: "thief" });
  character.highestDungeonDepthReached = 42;
  character.eventFlags.b1_b42_marathon_completed = true;

  const rumor = getUnreadTavernRumors(character).find(entry => entry.rumorId === "rumor_009");
  assert.equal(rumor?.id, "rumor_009_marathon");
  const heard = markTavernRumorRead(character, rumor);
  assert.equal(heard.eventFlags.tavern_rumor_009_base_read, true);
  assert.equal(heard.eventFlags.tavern_rumor_009_marathon_read, true);
});

test("B50 unlocks the relic weapon rumor and any four-relic ownership location unlocks its follow-up", () => {
  const makeRelicRumorCharacter = () => {
    const character = createInitialCharacter({ name: "遺物探し", job: "warrior" });
    character.highestDungeonDepthReached = 50;
    return character;
  };
  const getRelicRumor = character => getUnreadTavernRumors(character)
    .find(entry => entry.rumorId === "rumor_010");

  const locked = makeRelicRumorCharacter();
  locked.highestDungeonDepthReached = 49;
  assert.equal(getRelicRumor(locked), undefined);

  let character = makeRelicRumorCharacter();
  const base = getRelicRumor(character);
  assert.equal(base?.id, "rumor_010_base");
  assert.deepEqual(base?.dialogue, [
    "あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？密林区域で『遺物武器』が見つかったらしい。」\n＊Aボタンで次へ",
    "客「ああ。普段なら黒い箱のハズが金色の箱だったらしいぞ？」\n＊Aボタンで次へ",
    "ローザ「『遺物武器』、ですって。そんなモノ本当にあるのかしら？」\n＊Aボタンで戻る"
  ]);
  assert.equal(base.dialogue.every(message => getTavernRumorTypewriterParts(message)), true);

  character = markTavernRumorRead(character, base);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_010")?.number, "010");
  character.equipmentInventory.instances.push({ equipmentId: "musashi_blade", slot: "rightArmId" });
  assert.equal(getPastTavernRumors(character).some(entry => entry.id === "rumor_010"), false);

  const found = getRelicRumor(character);
  assert.equal(found?.id, "rumor_010_relic");
  assert.deepEqual(found?.readFlags, [
    "tavern_rumor_010_base_read",
    "tavern_rumor_010_relic_read"
  ]);
  assert.match(found?.dialogue.at(-1) || "", /本当にあったのね/);
  character = markTavernRumorRead(character, found);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_010")?.description.length, 4);

  const ownershipCases = [
    candidate => { candidate.equipment.rightArmId = "musashi_blade"; },
    candidate => { candidate.equipmentInventory.instances.push({ equipmentId: "the_five_star" }); },
    candidate => { candidate.warehouse.equipmentInstances.push({ equipmentId: "sylvan_emera" }); },
    candidate => { candidate.lootBag.equipmentInstances.push({ equipmentId: "comet_booster" }); }
  ];
  ownershipCases.forEach(placeRelic => {
    const candidate = makeRelicRumorCharacter();
    placeRelic(candidate);
    assert.equal(getRelicRumor(candidate)?.id, "rumor_010_relic");
  });
});

test("B80 plus the B42 marathon unlocks the second marathon rumor and B84 adds its follow-up", () => {
  const character = createInitialCharacter({ name: "倍距離走者", job: "thief" });
  const getSecondRumor = () => getUnreadTavernRumors(character)
    .find(entry => entry.rumorId === "rumor_011");

  character.highestDungeonDepthReached = 80;
  assert.equal(getSecondRumor(), undefined);
  character.eventFlags.b1_b42_marathon_completed = true;
  character.highestDungeonDepthReached = 79;
  assert.equal(getSecondRumor(), undefined);

  character.highestDungeonDepthReached = 80;
  const base = getSecondRumor();
  assert.equal(base?.id, "rumor_011_base");
  assert.deepEqual(base?.dialogue, [
    "あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？例の『マラソン』をやり遂げたヤツがいるらしい。」\n＊Aボタンで次へ",
    "客「ああ。とんでもねえよな！倍の距離もいけるんじゃねえか？」\n＊Aボタンで次へ",
    "ローザ「とんでもないわ…！倍の距離なんて、とても無理よ…。」\n＊Aボタンで戻る"
  ]);

  const heardBase = markTavernRumorRead(character, base);
  character.eventFlags = heardBase.eventFlags;
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_011")?.number, "011");

  character.eventFlags.b1_b84_long_march_completed = true;
  const completed = getSecondRumor();
  assert.equal(completed?.id, "rumor_011_long_march");
  assert.match(completed?.dialogue.at(-1) || "", /やり遂げたの/);
  assert.equal(completed?.dialogue.every(message => getTavernRumorTypewriterParts(message)), true);
  assert.equal(getPastTavernRumors(character).some(entry => entry.id === "rumor_011"), false);
});

test("B100 plus the B84 long march unlocks the final rumor and final completion adds its follow-up", () => {
  let character = createInitialCharacter({ name: "前人未踏", job: "priest" });
  const getFinalRumor = value => getUnreadTavernRumors(value)
    .find(entry => entry.rumorId === "rumor_012");

  character.eventFlags.b1_b84_long_march_completed = true;
  character.highestDungeonDepthReached = 99;
  assert.equal(getFinalRumor(character), undefined);
  character.highestDungeonDepthReached = 100;
  const base = getFinalRumor(character);
  assert.equal(base?.id, "rumor_012_base");
  assert.deepEqual(base?.dialogue, [
    "あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？例の『マラソン』、倍の距離を成し遂げたヤツがいるらしい」\n＊Aボタンで次へ",
    "客「ああ。いっその事、最後まで行ってもらいたいよな！」\n＊Aボタンで次へ",
    "ローザ「倍の距離でも凄いのに、最後まで行くなんて絶対無理よ…！」\n＊Aボタンで戻る"
  ]);

  character = markTavernRumorRead(character, base);
  character.eventFlags.b1_b100_final_long_march_completed = true;
  const completed = getFinalRumor(character);
  assert.equal(completed?.id, "rumor_012_final_long_march");
  assert.deepEqual(completed?.readFlags, [
    "tavern_rumor_012_base_read",
    "tavern_rumor_012_final_long_march_read"
  ]);
  assert.equal(completed?.dialogue.every(message => getTavernRumorTypewriterParts(message)), true);
  assert.match(completed?.dialogue.at(-1) || "", /あなた、逞しいのね。素敵よ/);

  character = markTavernRumorRead(character, completed);
  const history = getPastTavernRumors(character).find(entry => entry.id === "rumor_012");
  assert.equal(history?.number, "012");
  assert.equal(history?.title, "前人未踏の噂");
  assert.equal(history?.description.length, 4);
});

test("legacy saves that already meet all conditions receive only the latest new rumor stages", () => {
  const character = createInitialCharacter({ name: "既達成者", job: "mage" });
  character.highestDungeonDepthReached = 100;
  character.eventFlags.b1_b42_marathon_completed = true;
  character.eventFlags.b1_b84_long_march_completed = true;
  character.eventFlags.b1_b100_final_long_march_completed = true;
  character.warehouse.equipmentInstances.push({ equipmentId: "comet_booster" });

  const latest = getUnreadTavernRumors(character)
    .filter(entry => ["rumor_010", "rumor_011", "rumor_012"].includes(entry.rumorId));
  assert.deepEqual(latest.map(entry => entry.id), [
    "rumor_010_relic",
    "rumor_011_long_march",
    "rumor_012_final_long_march"
  ]);
});

test('Verfolger rumor unlocks at B90, follows first defeat, and preserves latest-stage history',()=>{
 let c=createInitialCharacter({name:'噂',job:'warrior'});
 const current=()=>getUnreadTavernRumors(c).find(r=>r.rumorId==='rumor_013');
 const past=()=>getPastTavernRumors(c).find(r=>r.id==='rumor_013');
 c.highestDungeonDepthReached=89;assert.equal(current(),undefined);
 c.highestDungeonDepthReached=90;const base=current();assert.equal(base.id,'rumor_013_base');
 assert.deepEqual(base.dialogue,[
  'あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？漆黒区域で執拗に追いかけてくる魔物が出るらしいぞ！」\n＊Aボタンで次へ',
  '客「ああ。もしも出会っちまったら、「逃げる」のもアリかもな！」\n＊Aボタンで次へ',
  'ローザ「まあ…！追いかけてくるなんて、恐ろしいわ…！」\n＊Aボタンで戻る']);
 assert.ok(base.dialogue.every(s=>getTavernRumorTypewriterParts(s)));assert.equal(past(),undefined);
 c=markTavernRumorRead(c,base);assert.equal(current(),undefined);assert.equal(past().title,'暗闇から忍び寄る追跡者の噂');
 c.eventFlags.achievement_verfolger_defeated=true;const next=current();assert.equal(next.id,'rumor_013_defeated');assert.equal(past(),undefined);
 assert.equal(next.dialogue.at(-1),'ローザ「ええっ！？返り討ちにしたですって！？あなたには驚かされっぱなしね…。」\n＊Aボタンで戻る');
 assert.ok(next.dialogue.every(s=>getTavernRumorTypewriterParts(s)));
 c=markTavernRumorRead(c,next);assert.equal(current(),undefined);assert.equal(past().description.length,4);
 assert.equal(past().number,'013');c=JSON.parse(JSON.stringify(c));assert.equal(current(),undefined);assert.ok(past());
});
test('Verfolger already defeated old saves offer only the latest unread stage',()=>{
 const c=createInitialCharacter({name:'既達成',job:'mage'});c.highestDungeonDepthReached=98;c.eventFlags.achievement_verfolger_defeated=true;
 const rumors=getUnreadTavernRumors(c).filter(r=>r.rumorId==='rumor_013');assert.equal(rumors.length,1);assert.equal(rumors[0].stageId,'defeated');
 assert.equal(rumors[0].notificationId,'rumor_013:defeated');assert.deepEqual(rumors[0].readFlags,['tavern_rumor_013_base_read','tavern_rumor_013_defeated_read']);
});
 test('nested dialogue quotes remain inside typewriter text',()=>{assert.equal(getTavernRumorTypewriterParts('客「ああ。「逃げる」のもアリかもな！」\n＊Aボタンで次へ').dialogue,'ああ。「逃げる」のもアリかもな！');});

test('Lichtbringer rumor uses B90, real ownership, exact dialogue and latest history',()=>{
 let c=createInitialCharacter({name:'光',job:'mage'});c.highestDungeonDepthReached=89;
 const current=()=>getUnreadTavernRumors(c).find(r=>r.rumorId==='rumor_014');const past=()=>getPastTavernRumors(c).find(r=>r.id==='rumor_014');
 assert.equal(current(),undefined);c.highestDungeonDepthReached=90;const base=current();assert.equal(base.id,'rumor_014_base');
 assert.deepEqual(base.dialogue,[
 'あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？漆黒区域のどこかでまばゆい光を見たヤツがいるらしい。」\n＊Aボタンで次へ',
 '客「ああ。どこだったかな？確か、噴水のある階じゃねえかな…？」\n＊Aボタンで次へ',
 'ローザ「まぁ、まばゆい光ですって。一体何かしらね？」\n＊Aボタンで戻る']);
 c=markTavernRumorRead(c,base);assert.equal(current(),undefined);assert.equal(past().title,'「光もたらすもの」の噂');
 c.eventFlags.lichtbringer_b95f_found=true;assert.equal(current(),undefined);
 c.keyItems={owned:{lichtbringer:{acquiredAt:1,count:1}},acquisitionOrder:['lichtbringer']};const next=current();assert.equal(next.id,'rumor_014_lichtbringer');assert.equal(past(),undefined);
 assert.equal(next.dialogue.at(-1),'ローザ「ええっ！？あなた、そのまばゆい光を手に入れたの！？きゃっ！眩しいわ…！」\n＊Aボタンで戻る');assert.ok(next.dialogue.every(s=>getTavernRumorTypewriterParts(s)));
 c=markTavernRumorRead(c,next);c=JSON.parse(JSON.stringify(c));assert.equal(current(),undefined);assert.equal(past().description.length,4);assert.equal(past().number,'014');
 delete c.eventFlags.tavern_rumor_014_base_read;delete c.eventFlags.tavern_rumor_014_lichtbringer_read;assert.equal(current().stageId,'lichtbringer');
});
test('Johanna cat rumor requires B69 and quest 027; only borrowed cat plus peaceful solution continues',()=>{
 let c=createInitialCharacter({name:'三毛猫',job:'priest'});
 const current=()=>getUnreadTavernRumors(c).find(r=>r.rumorId==='rumor_015');const history=()=>getPastTavernRumors(c).find(r=>r.id==='rumor_015');
 c.highestDungeonDepthReached=69;assert.equal(current(),undefined);c.quests.active.guild_027={progress:0};c.highestDungeonDepthReached=68;assert.equal(current(),undefined);
 c.highestDungeonDepthReached=69;const base=current();assert.equal(base.stageId,'base');assert.deepEqual(base.dialogue,[
 'あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？宿屋の女将の飼い猫、捜し物が得意らしいな？」\n＊Aボタンで次へ',
 '客「ああ。何でもすぐに見つけちまうんだってな。驚きだぜ！」\n＊Aボタンで次へ',
 'ローザ「ヨハンナさんの三毛猫ちゃんにそんな特技があるなんて…。」\n＊Aボタンで戻る']);
 c=markTavernRumorRead(c,base);assert.equal(history().title,'ヨハンナの愛猫の噂');
 c.eventFlags.johanna_cat_borrow_transition=true;assert.equal(current(),undefined);
 c.eventFlags.sphinx_b69f_defeated=true;c.eventFlags.boss_b69f_defeated=true;assert.equal(current(),undefined);
 c.eventFlags.sphinx_b69f_peaceful=true;const solved=current();assert.equal(solved.stageId,'solved');assert.equal(history(),undefined);
 assert.equal(solved.dialogue.at(-1),'ローザ「えっ！？ヨハンナさんの三毛猫ちゃんを借りたですって！？借りてどうしたのかしら？」\n＊Aボタンで戻る');assert.ok(solved.dialogue.every(s=>getTavernRumorTypewriterParts(s)));
 delete c.quests.active.guild_027;c.quests.completedQuestIds.push('guild_027');assert.equal(current().stageId,'solved');
 c=markTavernRumorRead(c,solved);c=JSON.parse(JSON.stringify(c));assert.equal(current(),undefined);assert.equal(history().description.length,4);
});
test('cat rumor preserves read base after combat-route report and uses owned cat for legacy peaceful saves',()=>{
 let c=createInitialCharacter({name:'旧記録',job:'mage'});c.highestDungeonDepthReached=69;c.quests.active.guild_027={progress:0};
 let r=getUnreadTavernRumors(c).find(r=>r.rumorId==='rumor_015');c=markTavernRumorRead(c,r);delete c.quests.active.guild_027;c.quests.completedQuestIds.push('guild_027');
 assert.ok(getPastTavernRumors(c).some(r=>r.id==='rumor_015'));assert.equal(getUnreadTavernRumors(c).some(r=>r.rumorId==='rumor_015'),false);
 c.eventFlags.sphinx_b69f_peaceful=true;assert.equal(getUnreadTavernRumors(c).some(r=>r.rumorId==='rumor_015'),false);
 c.keyItems={owned:{johanna_calico_cat:{count:1,acquiredAt:1}},acquisitionOrder:['johanna_calico_cat']};assert.equal(getUnreadTavernRumors(c).find(r=>r.rumorId==='rumor_015').stageId,'solved');
});