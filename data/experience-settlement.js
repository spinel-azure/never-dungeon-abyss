import { DEEP_FLOOR_PROOF_CARD_ID, GODDESS_GRACE_CARD_ID, GODDESS_MERCY_CARD_ID } from "./cards.js";

export const DEPTH_BONUS_DIVISOR = 200;

export function calculateDepthReturnSettlement({
  baseSettlementExp = 0,
  returnFloor = 0,
  isGoddessGraceEquipped = false,
  goddessProtectionName = "",
  depthBonusPoints = 0
} = {}) {
  const base = nonnegativeInteger(baseSettlementExp);
  const floor = nonnegativeInteger(returnFloor);
  const goddessEquipped = Boolean(isGoddessGraceEquipped);
  const bonusPoints = goddessEquipped ? 0 : Math.max(0, Number(depthBonusPoints) || 0);
  const depthBonusRate = goddessEquipped
    ? 0
    : Math.round((floor / DEPTH_BONUS_DIVISOR + bonusPoints) * 10000) / 10000;
  const depthBonusExp = goddessEquipped
    ? 0
    : Math.floor(base * depthBonusRate);
  return {
    baseSettlementExp: base,
    returnFloor: floor,
    depthBonusRate,
    depthBonusExp,
    finalSettlementExp: base + depthBonusExp,
    isGoddessGraceEquipped: goddessEquipped,
    ...(goddessEquipped && goddessProtectionName ? { goddessProtectionName } : {})
  };
}

export function createDepthReturnSettlement(character, returnFloor) {
  const deckSlots = Array.isArray(character?.cards?.deckSlots)
    ? character.cards.deckSlots
    : [];
  const mercyEquipped = deckSlots.includes(GODDESS_MERCY_CARD_ID);
  return calculateDepthReturnSettlement({
    baseSettlementExp: character?.carriedExperience,
    returnFloor,
    isGoddessGraceEquipped: deckSlots.includes(GODDESS_GRACE_CARD_ID) || mercyEquipped,
    goddessProtectionName: mercyEquipped ? "女神の慈愛" : "",
    depthBonusPoints: deckSlots.includes(DEEP_FLOOR_PROOF_CARD_ID) ? 0.1 : 0
  });
}

export function normalizeDepthReturnSettlement(candidate, carriedExperience) {
  if (!candidate || typeof candidate !== "object") return null;
  const normalized = calculateDepthReturnSettlement(candidate);
  const carried = nonnegativeInteger(carriedExperience);
  if (normalized.baseSettlementExp !== carried) return null;
  return normalized;
}

export function formatDepthReturnSettlement(settlement) {
  const value = amount => nonnegativeInteger(amount).toLocaleString("ja-JP");
  const lines = [
    `獲得経験値　　　　${value(settlement.baseSettlementExp)}`
  ];
  if (settlement.isGoddessGraceEquipped) {
    lines.push("深層帰還ボーナス　適用なし");
    lines.push(settlement.goddessProtectionName === "女神の慈愛"
      ? "女神の慈愛セット中"
      : "女神の恩寵セット中");
  } else {
    const percentValue = Math.max(0, Number(settlement.depthBonusRate) || 0) * 100;
    const percent = Number.isInteger(percentValue) ? String(percentValue) : percentValue.toFixed(1);
    lines.push(
      `深層帰還ボーナス　＋${percent}％`,
      `ボーナス経験値　　${value(settlement.depthBonusExp)}`
    );
  }
  lines.push(
    "────────────────",
    `精算経験値　　　　${value(settlement.finalSettlementExp)}`
  );
  return lines.join("\n");
}

function nonnegativeInteger(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}
