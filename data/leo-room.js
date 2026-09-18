export const LEO_ROOM_CLOSED_MESSAGE = '扉には獅子座の紋様が印されている。固く閉ざされ、今は開かないようだ。';

export function isLeoRoomDoor(depth, doorKind) {
  return depth === 1 && (doorKind === 'specialLocked' || doorKind === 'specialUnlocked');
}

export function getEventDoorTextureKind(depth, doorKind) {
  return isLeoRoomDoor(depth, doorKind) ? 'leo' : doorKind;
}
