import { hasKeyItem } from "./key-items.js";

export const SHOP_DISCOUNT_PASS_ID = "discount_pass";
export const SHOP_DISCOUNT_RATE = 0.5;

export function hasShopDiscount(character) {
  return hasKeyItem(character?.keyItems, SHOP_DISCOUNT_PASS_ID);
}

export function getShopBuyPrice(character, price) {
  const base = Math.max(0, Math.floor(Number(price) || 0));
  return hasShopDiscount(character) ? Math.floor(base * SHOP_DISCOUNT_RATE) : base;
}

export function getShopSellPrice(character, definition) {
  const normal = Math.max(0, Math.floor(Number(definition?.sellPrice ?? definition?.buyPrice / 2) || 0));
  if (!hasShopDiscount(character)) return normal;
  return Math.min(normal, getShopBuyPrice(character, definition?.buyPrice));
}
