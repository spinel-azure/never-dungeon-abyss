const CONFIG_URL = new URL("../data/effects/player_charge_skills.json", import.meta.url);
const DEFAULT_PRESENTATION = Object.freeze({
  effect: "standard",
  cssClass: "",
  durationMs: 0,
  image: "",
  soundId: ""
});

let presentationConfigPromise = null;

export async function getPlayerChargePresentation(skillId) {
  const config = await loadPresentationConfig();
  return normalizePlayerChargePresentation(config?.skills?.[skillId]);
}

export function normalizePlayerChargePresentation(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    effect: String(source.effect || DEFAULT_PRESENTATION.effect),
    cssClass: String(source.cssClass || ""),
    durationMs: Math.max(0, Math.min(10000, Math.floor(Number(source.durationMs) || 0))),
    image: String(source.image || ""),
    soundId: String(source.soundId || "")
  };
}

export async function playPlayerChargePresentation({ root, skillId, playSe } = {}) {
  if (!root || !skillId) return DEFAULT_PRESENTATION;
  const presentation = await getPlayerChargePresentation(skillId);
  if (presentation.soundId) playSe?.(presentation.soundId);
  if (!presentation.cssClass) return presentation;
  const stage = root.querySelector(".battle-enemy-stage");
  if (!stage) return presentation;
  stage.classList.add(presentation.cssClass);
  if (presentation.durationMs > 0) await delay(presentation.durationMs);
  stage.classList.remove(presentation.cssClass);
  return presentation;
}

async function loadPresentationConfig() {
  if (!presentationConfigPromise) {
    presentationConfigPromise = fetch(CONFIG_URL)
      .then(response => response.ok ? response.json() : null)
      .catch(() => null);
  }
  return presentationConfigPromise;
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
