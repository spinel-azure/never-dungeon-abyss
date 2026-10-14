import {getEquipmentItem} from './equipment.js';
// Support both legacy equipment IDs and equipped inventory instances.
export function hasEquippedFloorProtection(character,property){
 const instanceId=character?.equippedInstanceIds?.footId;
 const instance=character?.equipmentInventory?.instances?.find(i=>i.instanceId===instanceId);
 return [character?.equipment?.footId,instance?.equipmentId].some(id=>getEquipmentItem(id,'footId')?.[property]===true);
}
