import { COMMON_CARDS } from "../cards/common/cards.js?v=20260717-3";
import { RARE_CARDS } from "../cards/rare/cards.js?v=20260717-3";
import { SUPER_RARE_CARDS } from "../cards/super-rare/cards.js?v=20260717-3";
import { LEGENDARY_CARDS } from "../cards/legendary/cards.js";
import { ZODIAC_CARDS } from "../cards/zodiac/cards.js";

export const CARD_DISPLAY_MODES = Object.freeze({
  GALLERY: "gallery",
  DECK: "deck",
});

export const CARD_RARITIES = Object.freeze({
  C: Object.freeze({
    id: "C",
    name: "Common",
    frameStyle: "common",
  }),
  R: Object.freeze({
    id: "R",
    name: "Rare",
    frameStyle: "rare",
  }),
  SR: Object.freeze({
    id: "SR",
    name: "Super Rare",
    frameStyle: "super-rare",
  }),
  L: Object.freeze({
    id: "L",
    name: "Legendary",
    defaultCost: 6,
    frameStyle: "legendary",
  }),
  Z: Object.freeze({
    id: "Z",
    name: "Zodiac",
    frameStyle: "zodiac",
  }),
});

export const CARDS = Object.freeze({
  ...COMMON_CARDS,
  ...RARE_CARDS,
  ...SUPER_RARE_CARDS,
  ...LEGENDARY_CARDS,
  ...ZODIAC_CARDS,
});
