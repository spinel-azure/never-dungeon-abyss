import {KARTE_SPECIAL_BOSSES} from './karte-special-bosses.js';
// Presentation assets only: this registry does not select or spawn enemies.
export const KARTE_BOSS_IMAGES = Object.freeze({
  ...Object.fromEntries(Object.values(KARTE_SPECIAL_BOSSES).map(boss=>[boss.id,Object.freeze({id:boss.id,imagePath:boss.image,allowColorVariant:false})])),
  karte_boss_001: Object.freeze({
    id: 'karte_boss_001',
    imagePath: 'images/karte_bosses/karte_boss_001.avif',
    allowColorVariant: true,
  }),
});
