export const CARD_DISPLAY_MODES = Object.freeze({
  GALLERY: "gallery",
  DECK: "deck",
});

export const CARD_RARITIES = Object.freeze({
  C: Object.freeze({ id: "C", name: "Common", frameStyle: "common" }),
  R: Object.freeze({ id: "R", name: "Rare", frameStyle: "rare" }),
  SR: Object.freeze({ id: "SR", name: "Super Rare", frameStyle: "super-rare" }),
  L: Object.freeze({ id: "L", name: "Legendary", defaultCost: 6, frameStyle: "legendary" }),
  Z: Object.freeze({ id: "Z", name: "Zodiac", frameStyle: "zodiac" }),
});
