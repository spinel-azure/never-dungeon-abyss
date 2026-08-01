const QUICK_JOB_CODES = Object.freeze({
  warrior: "W",
  thief: "T",
  priest: "P",
  mage: "M"
});

export function formatQuickJob(job) {
  return `【${QUICK_JOB_CODES[String(job || "").toLowerCase()] || "-"}】`;
}

export function formatQuickMoney(gold) {
  return Math.max(0, Math.floor(Number(gold) || 0)).toLocaleString("en-US");
}
