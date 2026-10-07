import {KARTE_SPECIAL_BOSSES} from './karte-special-bosses.js';
import {NORMAL_KARTE_BOSSES} from './karte-normal-bosses.js';
// Presentation assets only: this registry does not select or spawn enemies.
export const KARTE_BOSS_IMAGES = Object.freeze({
  ...Object.fromEntries(Object.values(NORMAL_KARTE_BOSSES).map(b=>[b.id,Object.freeze({id:b.id,imagePath:b.image,allowColorVariant:b.allowColorVariant})])),
  ...Object.fromEntries(Object.values(KARTE_SPECIAL_BOSSES).map(boss=>[boss.id,Object.freeze({id:boss.id,imagePath:boss.image,allowColorVariant:false})])),
});
