export const OIL_ELEMENTS = Object.freeze(["fire", "ice", "lightning"]);
export const ELEMENT_LABELS = Object.freeze({ fire: "炎", ice: "氷", lightning: "雷", holy: "聖", dark: "闇" });
export function hasValidItemElements(item) {
  return (item?.effects || []).every(effect =>
    effect.id === "weapon_element_imbue" ? OIL_ELEMENTS.includes(effect.element)
      : effect.id === "element_barrier" ? ["fire", "ice"].includes(effect.element) : true);
}
