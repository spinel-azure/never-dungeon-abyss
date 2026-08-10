import test from "node:test";
import assert from "node:assert/strict";

import { getOwnedGalleryCards } from "../js/card-gallery.js";

test("card gallery lists only owned production cards", () => {
  const cards = getOwnedGalleryCards({
    ownedCardCounts: {
      common_hp_up: 2,
      rare_defense_up: 1,
      common_sp_up: 0,
      unknown_card: 99
    }
  });

  assert.deepEqual(cards.map(card => card.id), ["common_hp_up", "rare_defense_up"]);
  assert.equal(cards[0].footerText, cards[0].nameJa);
});

test("card gallery rarity filter keeps owned cards of the selected rarity", () => {
  const state = {
    ownedCardCounts: {
      common_hp_up: 1,
      rare_defense_up: 1
    }
  };

  assert.deepEqual(getOwnedGalleryCards(state, "C").map(card => card.id), ["common_hp_up"]);
  assert.deepEqual(getOwnedGalleryCards(state, "R").map(card => card.id), ["rare_defense_up"]);
  assert.deepEqual(getOwnedGalleryCards(state, "Z"), []);
});
