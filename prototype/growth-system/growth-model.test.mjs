import assert from "node:assert/strict"; import { JOBS, MAX_LEVEL, calculateStats, getDeckCostAtLevel, getExperienceForLevel, getLevelGrowth, previewStatChange } from "./growth-model.js";
for (const job of Object.values(JOBS)) { assert.equal(Object.values(job.stats).reduce((sum,value)=>sum+value,0),24); assert.equal(job.hp+job.sp,45); }
for (const [level, cost] of [[1,3],[4,5],[5,6],[22,11],[23,12],[72,23],[73,24],[136,35],[137,36],[196,47],[197,48]]) assert.equal(getDeckCostAtLevel(level),cost);
for (const [jobId, hp, sp] of [["warrior",999,650],["thief",850,750],["cleric",750,850],["mage",650,999]]) { assert.equal(getLevelGrowth(jobId,1).hp,JOBS[jobId].hp); assert.equal(getLevelGrowth(jobId,1).sp,JOBS[jobId].sp); assert.equal(getLevelGrowth(jobId,197).hp,hp); assert.equal(getLevelGrowth(jobId,197).sp,sp); }
assert.ok(getLevelGrowth("warrior",100).hp >= 400 && getLevelGrowth("warrior",100).hp <= 450);
for (const [level, experience] of [[1,0],[2,10],[3,25],[4,45],[5,70],[20,3_000],[30,12_000],[50,90_000],[75,500_000],[100,1_600_000],[125,3_500_000],[150,6_000_000],[175,8_500_000],[197,9_999_999]]) assert.equal(getExperienceForLevel(level),experience);
for (let level=2;level<=MAX_LEVEL;level+=1) assert.ok(getExperienceForLevel(level)>getExperienceForLevel(level-1));
assert.equal(getExperienceForLevel(-10),0); assert.equal(getExperienceForLevel(999),9_999_999); assert.ok(getExperienceForLevel(196)<9_999_999);
assert.equal(calculateStats({jobId:"warrior",equipment:{str:2},cards:{str:3}}).stats.str.total,13); assert.equal(previewStatChange({jobId:"warrior",equipment:{str:20},cards:{}},"cards",{str:3}).allowed,false); assert.equal(previewStatChange({jobId:"warrior",equipment:{str:19},cards:{}},"cards",{str:3}).allowed,true); console.log("growth-model: all tests passed");
