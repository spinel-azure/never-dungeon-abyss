export const TRANSFER_DESTINATIONS = Object.freeze([
  destination(10, character => Boolean(character?.eventFlags?.transfer_portal_b10f_unlocked)),
  destination(20, character => Boolean(
    character?.eventFlags?.transfer_portal_b20f_unlocked
      || character?.eventFlags?.shop_stock_b20f_unlocked
      || Number(character?.highestDungeonDepthReached) >= 20
  )),
  destination(30, character => Boolean(
    character?.eventFlags?.transfer_portal_b30f_unlocked
      || character?.eventFlags?.shop_stock_b30f_unlocked
      || Number(character?.highestDungeonDepthReached) >= 30
  ))
]);

export function getUnlockedTransferDestinations(character) {
  return TRANSFER_DESTINATIONS.filter(entry => entry.isUnlocked(character));
}

export function isTransferDestinationUnlocked(character, depth) {
  const destination = TRANSFER_DESTINATIONS.find(entry => entry.depth === Math.floor(Number(depth)));
  return Boolean(destination?.isUnlocked(character));
}

function destination(depth, isUnlocked) {
  return Object.freeze({ depth, label: `B${depth}F`, isUnlocked });
}
