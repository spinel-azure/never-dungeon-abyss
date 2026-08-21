import { drawQuarteredShieldIcon } from "./icons/quartered-shield.js";
import { drawStrengthIcon } from "./icons/strength.js";
import { drawKnowledgeIcon } from "./icons/knowledge.js";
import { drawLuckIcon } from "./icons/luck.js";
import { drawTorchIcon } from "./icons/torch.js";
import { drawUnknownIcon } from "./icons/unknown.js";
import { drawVitalHeartIcon } from "./icons/vital-heart.js";
import { drawAgilityIcon } from "./icons/agility.js";
import { drawHealthPulseIcon } from "./icons/health-pulse.js";
import { drawManaCoreIcon } from "./icons/mana-core.js";
import { drawGoddessSilhouetteIcon } from "./icons/goddess-silhouette.js";
import { drawAlertnessIcon } from "./icons/alertness.js";
import { drawDexterityIcon } from "./icons/dexterity.js";
import { drawBandageIcon } from "./icons/bandage.js";
import { drawPowerPoseIcon } from "./icons/power-pose.js";
import { drawStairsDetectionIcon } from "./icons/stairs-detection.js";
import { drawPersonDetectionIcon } from "./icons/person-detection.js";
import { drawTreasureDetectionIcon } from "./icons/treasure-detection.js";
import { drawFlameSwordIcon, drawIceSwordIcon, drawLightningSwordIcon } from "./icons/elemental-sword.js";

const iconDrawers = new Map([
  ["strength", drawStrengthIcon],
  ["knowledge", drawKnowledgeIcon],
  ["luck", drawLuckIcon],
  ["quartered-shield", drawQuarteredShieldIcon],
  ["torch", drawTorchIcon],
  ["vital-heart", drawVitalHeartIcon],
  ["agility", drawAgilityIcon],
  ["health-pulse", drawHealthPulseIcon],
  ["mana-core", drawManaCoreIcon],
  ["goddess-silhouette", drawGoddessSilhouetteIcon],
  ["alertness", drawAlertnessIcon],
  ["dexterity", drawDexterityIcon],
  ["bandage", drawBandageIcon],
  ["power-pose", drawPowerPoseIcon],
  ["stairs-detection", drawStairsDetectionIcon],
  ["person-detection", drawPersonDetectionIcon],
  ["treasure-detection", drawTreasureDetectionIcon],
  ["flame-sword", drawFlameSwordIcon],
  ["ice-sword", drawIceSwordIcon],
  ["lightning-sword", drawLightningSwordIcon],
  ["unknown", drawUnknownIcon],
]);

export function registerIconDrawer(iconId, drawer) {
  if (typeof iconId !== "string" || !iconId) {
    throw new TypeError("iconId must be a non-empty string.");
  }
  if (typeof drawer !== "function") {
    throw new TypeError(`Icon drawer for ${iconId} must be a function.`);
  }
  iconDrawers.set(iconId, drawer);
}

export function getIconDrawer(iconId) {
  return iconDrawers.get(iconId) ?? null;
}

export function getUnknownIconDrawer() {
  return drawUnknownIcon;
}

export function getRegisteredIconCount() {
  return iconDrawers.size;
}
