import {hasKeyItem} from '../data/key-items.js';
import {normalizeReincarnationCount} from '../data/reincarnation.js';
import {isSuperGoddess} from './goddess-superboss.js';

// Shared eligibility only. Applying the effect remains the battle engine's job.
export const canActivateHackingDevice=(character,enemy)=>isSuperGoddess(enemy)
 && normalizeReincarnationCount(character?.reincarnationCount)===3
 && hasKeyItem(character?.keyItems,'hacking_device');
