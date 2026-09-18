export const LEO_ROOM_CLOSED_MESSAGE = '扉には獅子座の紋様が印されている。固く閉ざされ、今は開かないようだ。';

export function isLeoRoomDoor(depth, doorKind) {
  return depth === 1 && (doorKind === 'specialLocked' || doorKind === 'specialUnlocked');
}

const GEMINI_DOOR_DEPTHS = new Set([22, 31, 44, 48, 59, 73]);

export function getEventDoorTextureKind(depth, doorKind) {
  if (isLeoRoomDoor(depth, doorKind)) return 'leo';
  if ((doorKind === 'specialLocked' || doorKind === 'specialUnlocked')
    && GEMINI_DOOR_DEPTHS.has(depth)) return 'gemini';
  return doorKind;
}
