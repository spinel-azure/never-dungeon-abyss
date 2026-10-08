export function getV2StairImage(session){
 if(session?.kind!=='specialMapV2')return null;
 const at=p=>p&&session.playerX===p.x&&session.playerY===p.y;
 const f=session.generatedMap;
 if(at(f.stairsUp))return session.currentFloor===0
  ?{src:'images/dungeon_effects/exit.avif',alt:'上り階段（出口）'}
  :{src:'images/dungeon_effects/up_stairs.avif',alt:'上り階段'};
 if(at(f.stairsDown))return {src:'images/dungeon_effects/down_stairs.avif',alt:'下り階段'};
 return null;
}
