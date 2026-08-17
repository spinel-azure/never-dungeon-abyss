export const TRANSFER_DESTINATIONS = Object.freeze([
  checkpointDestination(10, "boss_strange_knight_statue_b9f_defeated", "transfer_portal_b10f_unlocked"),
  checkpointDestination(20, "boss_fallen_mage_b19f_defeated", "transfer_portal_b20f_unlocked"),
  checkpointDestination(30, "boss_iron_maiden_b29f_defeated", "transfer_portal_b30f_unlocked"),
  checkpointDestination(40, "boss_wicker_man_b39f_defeated", "transfer_portal_b40f_unlocked"),
  checkpointDestination(50, "boss_eiskoenigin_b49f_defeated", "transfer_portal_b50f_unlocked"),
  checkpointDestination(60, "boss_b59f_defeated", "transfer_portal_b60f_unlocked"),
  checkpointDestination(70, "boss_b69f_defeated", "transfer_portal_b70f_unlocked"),
  checkpointDestination(80, "boss_b79f_defeated", "transfer_portal_b80f_unlocked"),
  checkpointDestination(90, "boss_b89f_defeated", "transfer_portal_b90f_unlocked"),
  checkpointDestination(100, "boss_b99f_defeated", "transfer_portal_b100f_unlocked")
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

function checkpointDestination(depth, bossFlag, legacyFlag) {
  return destination(depth, character => Boolean(
    character?.eventFlags?.[bossFlag] || character?.eventFlags?.[legacyFlag]
  ));
}
