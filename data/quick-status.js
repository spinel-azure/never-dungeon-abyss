const QUICK_JOB_CODES_EN = Object.freeze({
  warrior: "W",
  thief: "T",
  priest: "P",
  mage: "M"
});

const QUICK_JOB_CODES_JA = Object.freeze({
  warrior: "戦",
  thief: "盗",
  priest: "僧",
  mage: "魔"
});

export function formatQuickJob(job, language = "ja") {
  const codes = String(language).toLowerCase().startsWith("en")
    ? QUICK_JOB_CODES_EN
    : QUICK_JOB_CODES_JA;
  return `【${codes[String(job || "").toLowerCase()] || "-"}】`;
}

export function formatCompactQuickName(name) {
  const characters = Array.from(String(name || "NO_NAME"));
  return characters.length >= 6
    ? `${characters.slice(0, 5).join("")}…`
    : characters.join("");
}

export function formatQuickLevel(level) {
  return String(Math.max(1, Math.floor(Number(level) || 1))).padStart(2, "0");
}

export function formatQuickMoney(gold) {
  return Math.max(0, Math.floor(Number(gold) || 0)).toLocaleString("en-US");
}

export function isCriticalHp(hp, maxHp) {
  const current = Math.max(0, Number(hp) || 0);
  const maximum = Math.max(0, Number(maxHp) || 0);
  return maximum > 0 && current / maximum < 0.1;
}
