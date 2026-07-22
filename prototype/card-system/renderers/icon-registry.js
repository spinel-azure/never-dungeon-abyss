import { drawQuarteredShieldIcon } from "./icons/quartered-shield.js";
import { drawStrengthIcon } from "./icons/strength.js?v=20260717-4";
import { drawTorchIcon } from "./icons/torch.js";
import { drawUnknownIcon } from "./icons/unknown.js";
import { drawVitalHeartIcon } from "./icons/vital-heart.js";

const iconDrawers = new Map([
  ["strength", drawStrengthIcon],
  ["quartered-shield", drawQuarteredShieldIcon],
  ["torch", drawTorchIcon],
  ["vital-heart", drawVitalHeartIcon],
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
