export const FLOOR_ZONES = Object.freeze([
  Object.freeze({ minimumDepth: 1, maximumDepth: 9, name: "Der Beginn", japaneseName: "始まり" }),
  Object.freeze({ minimumDepth: 10, maximumDepth: 19, name: "Magie-Zone", japaneseName: "魔術区域" }),
  Object.freeze({ minimumDepth: 20, maximumDepth: 29, name: "Folter-Zone", japaneseName: "拷問区域" }),
  Object.freeze({ minimumDepth: 30, maximumDepth: 39, name: "Glut-Zone", japaneseName: "灼熱区域" }),
  Object.freeze({ minimumDepth: 40, maximumDepth: 49, name: "Frost-Zone", japaneseName: "極寒区域" }),
  Object.freeze({ minimumDepth: 50, maximumDepth: 59, name: "Dschungel-Zone", japaneseName: "密林区域" }),
  Object.freeze({ minimumDepth: 60, maximumDepth: 69, name: "Wüsten-Zone", japaneseName: "砂漠区域" }),
  Object.freeze({ minimumDepth: 70, maximumDepth: 79, name: "Wildwasser-Zone", japaneseName: "激流区域" }),
  Object.freeze({ minimumDepth: 80, maximumDepth: 89, name: "Kristall-Zone", japaneseName: "結晶区域" }),
  Object.freeze({ minimumDepth: 90, maximumDepth: 99, name: "Finsternis-Zone", japaneseName: "漆黒区域" }),
  Object.freeze({ minimumDepth: 100, maximumDepth: 100, name: "Final-Zone", japaneseName: "最終区域" })
]);

export function getFloorZone(depth) {
  const floor = Math.floor(Number(depth) || 0);
  return FLOOR_ZONES.find(zone => floor >= zone.minimumDepth && floor <= zone.maximumDepth) || null;
}

export function getFloorZoneName(depth) {
  return getFloorZone(depth)?.name || "";
}
