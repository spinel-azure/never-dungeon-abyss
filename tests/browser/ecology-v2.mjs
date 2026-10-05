import {createRequire} from 'node:module';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {generateV2Ecology} from '../../js/special-map/ecology-v2.js';
const {chromium}=createRequire(import.meta.url)('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
const output='artifacts/v2-ecology-candidate-1';await mkdir(output,{recursive:true});const results=[];
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:label==='mobile',hasTouch:label==='mobile'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/browser/ecology-v2.html');await page.waitForFunction(()=>window.ecologyPreview);
  assert.deepEqual(await page.evaluate(()=>ecologyPreview),generateV2Ecology({ruleset:'special-map-v2',seed:12345,level:100,rarity:'WHITE',themeId:'crystal'}));
  await page.locator('#grant').click();const maps=await page.evaluate(()=>ecologyStarterMaps);assert.equal(maps.length,3);assert.equal(new Set(maps.map(m=>m.seed)).size,3);
  const samples=[];for(let i=0;i<3;i++){
    await page.locator('#starters button').nth(i).click();const e=await page.evaluate(()=>ecologyPreview);assert.ok(e.level>=1&&e.level<=5);assert.equal(e.rarity,'WHITE');assert.equal(e.seed,maps[i].seed);assert.equal(e.floors.length,3);samples.push(e);
  }
  // Explicit representative low-level theme/seed variation, without changing the grant RNG.
  for(const [seed,level] of [[0,1],[1,3],[12345,5]]){
    await page.locator('#seed').fill(String(seed));await page.locator('#level').fill(String(level));await page.locator('form button').click();samples.push(await page.evaluate(()=>ecologyPreview));
  }
  assert.ok(new Set(samples.map(s=>s.themeId)).size>1);
  assert.ok(new Set(samples.map(s=>JSON.stringify(s.floors))).size>1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.screenshot({path:`${output}/${label}.png`,fullPage:true});results.push({label,maps,samples,errors});await page.close();
}await writeFile(`${output}/browser-report.json`,JSON.stringify(results,null,2)+'\n');console.log('PC and 390px ecology preview passed');}finally{await browser.close();}
