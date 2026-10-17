import {isSuperGoddess} from '../../combat/goddess-superboss.js';

// Preserve both actors together: charges, items, Pisces, moon, pending heal and uses.
export function goddessCheckpoint(battle,context){
 if(!isSuperGoddess(battle?.enemy)||!context?.battleUuid||battle.explorationContext?.battleUuid!==context.battleUuid)return null;
 const snapshot=structuredClone(battle);
 snapshot.presentationEvents=[];
 return snapshot;
}
export function restoreGoddessCheckpoint(snapshot,context){
 if(!snapshot||!isSuperGoddess(snapshot.enemy)||!context?.battleUuid||snapshot.explorationContext?.battleUuid!==context.battleUuid)return null;
 if(!Number.isInteger(snapshot.turn)||snapshot.turn<1||!snapshot.player||!Number.isFinite(snapshot.enemy.hp))return null;
 return {...structuredClone(snapshot),explorationContext:structuredClone(context)};
}
