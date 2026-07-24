export const TRAPS = Object.freeze({
  falling_stones: Object.freeze({
    id: "falling_stones",
    name: "石つぶて",
    baseSaveRate: 0.2,
    saveSuccessEffect: "avoid"
  }),
  crossbow: Object.freeze({
    id: "crossbow",
    name: "石弓",
    baseSaveRate: 0.15,
    saveSuccessEffect: "halfDamage"
  }),
  poison_needle: Object.freeze({
    id: "poison_needle",
    name: "毒針",
    baseSaveRate: 0.2,
    saveSuccessEffect: "negateStatus"
  }),
  theft: Object.freeze({
    id: "theft",
    name: "盗難罠",
    baseSaveRate: 0.1,
    saveSuccessEffect: "protectItem"
  })
});
