export function getDungeonStairImage(cell) {
  if (cell?.type === 'stairsUp') return cell.portal?.startsWith('transfer_b')
    ? {src:'images/dungeon_effects/transport_portal.avif',alt:'転送門'}
    : {src:'images/dungeon_effects/exit.avif',alt:'出口'};
  if (cell?.type === 'stairsDown') return {src:'images/dungeon_effects/down_stairs.avif',alt:'下り階段'};
  return null;
}
