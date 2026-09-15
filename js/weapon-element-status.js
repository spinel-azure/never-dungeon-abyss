import { getEquippedWeaponElement } from "../combat/weapon-element.js";
import { ELEMENT_LABELS } from "../combat/item-elements.js";
const ICONS = { fire: "01", ice: "02", lightning: "03", holy: "04", dark: "05" };
export function renderWeaponElementStatus(character) {
  const job = document.getElementById("quickJob");
  if (!job) return;
  let icon = document.getElementById("quickWeaponElement");
  if (!icon) {
    icon = document.createElement("img"); icon.id = "quickWeaponElement";
    icon.style.cssText = "width:1em;height:1em;object-fit:contain;flex:0 0 1em;margin-left:.15em;align-self:center";
    job.after(icon);
  }
  const element = getEquippedWeaponElement(character);
  icon.hidden = !ICONS[element];
  if (!icon.hidden) {
    icon.src = `images/ui/effect_${ICONS[element]}.webp`;
    icon.alt = `${ELEMENT_LABELS[element]}属性`; icon.title = `物理攻撃：${icon.alt}`;
  }
}
