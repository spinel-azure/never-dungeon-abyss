import { EffectEngine } from "./effects/effect-engine.js";

const PRESENTATION_URLS = Object.freeze({
  fire_ball: "data/effects/fire_ball.json"
});

const definitionPromises = new Map();
let activeEngine = null;

export function prepareBattleSkillEffect(definition, damage = 0) {
  const value = String(Math.max(0, Math.floor(Number(damage) || 0)));
  return {
    ...structuredClone(definition),
    parts: (definition?.parts || []).map(part => part.type === "popup" && part.valueSource === "damage"
      ? { ...part, valueSource: "fixed", text: String(part.text || "{damage}").replaceAll("{damage}", value) }
      : { ...part })
  };
}

export async function playBattleSkillPresentation({ root, presentationId, damage } = {}) {
  const url = PRESENTATION_URLS[presentationId];
  const canvas = root?.querySelector?.("#battleSkillEffectCanvas");
  if (!url || !canvas) return false;
  try {
    const definition = await loadDefinition(url);
    activeEngine?.stop(false);
    activeEngine = new EffectEngine(canvas, { transparent: true, backdrop: false });
    activeEngine.load(prepareBattleSkillEffect(definition, damage));
    canvas.hidden = false;
    await new Promise(resolve => activeEngine.play({ onComplete: resolve }));
    canvas.hidden = true;
    activeEngine.stop(false);
    return true;
  } catch {
    canvas.hidden = true;
    return false;
  }
}

function loadDefinition(url) {
  if (!definitionPromises.has(url)) {
    definitionPromises.set(url, fetch(url).then(response => {
      if (!response.ok) throw new Error(`Battle effect JSON request failed: ${response.status}`);
      return response.json();
    }));
  }
  return definitionPromises.get(url);
}
