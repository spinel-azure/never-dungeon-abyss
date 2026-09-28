import { getStatusEffect } from "../data/status-effects.js";

export function resolveDefeatRecovery({
  character,
  battle = null,
  recoveryResolvers = []
} = {}) {
  const original = character && typeof character === "object" ? character : null;
  if (!original || (original.hp > 0 && original.alive !== false)) {
    return { recovered: Boolean(original), character: original, sourceId: null };
  }
  for (const resolver of recoveryResolvers) {
    if (typeof resolver !== "function") continue;
    const result = resolver({ character: original, battle });
    const recoveredCharacter = result?.character;
    if (recoveredCharacter?.hp > 0 && recoveredCharacter.alive !== false) {
      return {
        recovered: true,
        character: recoveredCharacter,
        sourceId: result.sourceId || null
      };
    }
  }
  return { recovered: false, character: original, sourceId: null };
}

const CLASS_DEFEAT_RECOVERY = Object.freeze({
  mage: Object.freeze({ skillId: "causality_alteration", name: "因果律改変" }),
  priest: Object.freeze({ skillId: "reincarnation", name: "リィンカーネーション" })
});

function isNegativeStatus(status) {
  const statusId = status?.statusId || status?.id;
  const kind = getStatusEffect(statusId)?.kind;
  return kind === "ailment" || kind === "debuff";
}

export function resolveClassDefeatRecovery({ character, battle = null } = {}) {
  const original = character && typeof character === "object" ? character : null;
  const recovery = CLASS_DEFEAT_RECOVERY[original?.job];
  const recoveryBlocked = Boolean(
    battle?.scriptedNonlethal
    || battle?.scriptedBattleType
    || battle?.defeatRecoveryDisabled
    || battle?.unrevivableDefeat
  );
  if (!original || original.hp > 0 || recoveryBlocked
    || original.adventureDefeatRecoveryUsed
    || !original.skillIds?.includes(recovery?.skillId)) {
    return { recovered: false, character: original, sourceId: null, sourceName: null };
  }
  const recoveredCharacter = structuredClone(original);
  recoveredCharacter.hp = Math.max(1, Math.floor(Math.max(1, Number(original.maxHp) || 1) * 0.5));
  recoveredCharacter.statuses = (original.statuses || []).filter(status => !isNegativeStatus(status));
  recoveredCharacter.condition = "GOOD";
  recoveredCharacter.alive = true;
  recoveredCharacter.adventureDefeatRecoveryUsed = true;
  return {
    recovered: true,
    character: recoveredCharacter,
    sourceId: recovery.skillId,
    sourceName: recovery.name
  };
}
