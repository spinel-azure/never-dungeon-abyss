export const REVIVAL_GODDESS_IMAGE = "images/npc/NPC_19.avif";
export const RARE_REVIVAL_GODDESS_IMAGE = "images/npc/NPC_19b.avif";
export const RARE_REVIVAL_GODDESS_RATE = 0.05;

export function selectRevivalGoddessImage(rng = Math.random) {
  return Number(rng()) < RARE_REVIVAL_GODDESS_RATE
    ? RARE_REVIVAL_GODDESS_IMAGE
    : REVIVAL_GODDESS_IMAGE;
}
