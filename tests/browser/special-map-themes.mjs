import {createRequire} from 'node:module';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {SPECIAL_MAP_THEMES,SPECIAL_THEME_DEFINITIONS} from '../../data/special-map-themes.js';
import {SPECIAL_THEME_BOSS_IDS} from '../../data/karte-special-bosses.js';
const {chromium}=createRequire(import.meta.url)('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
const dir='artifacts/v2-ecology-candidate-2';await mkdir(dir,{recursive:true});const reports=[];
try{
 for(const [label,width,height] of [['pc',1280,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:label==='mobile',hasTouch:label==='mobile'});const errors=[],loaded=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===200)loaded.push(new URL(r.url()).pathname.slice(1));});
  await page.goto('http://127.0.0.1:4173/tests/browser/special-map-themes.html');await page.waitForFunction(()=>window.specialThemePreview||window.specialThemeError);
  for(const themeId of SPECIAL_MAP_THEMES){
   await page.locator('#theme').selectOption(themeId);
   for(const floor of ['0','1','2']){
    await page.locator('#floor').selectOption(floor);await page.locator('form button').click();await page.waitForFunction(()=>window.specialThemePreview||window.specialThemeError);
    const result=await page.evaluate(()=>window.specialThemePreview);assert.ok(result,await page.locator('#summary').textContent());
    assert.equal(result.status.loaded,2);assert.equal(result.status.fallback,false);assert.equal(result.boss.id,SPECIAL_THEME_BOSS_IDS[themeId]);
    assert.equal(result.boss.imageSize,600);assert.ok(result.imageSize[0]>0);assert.equal(result.imageSize[0],result.imageSize[1]);
    assert.ok(result.map.floors.every(f=>f.themeId===themeId));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
   for(const path of SPECIAL_THEME_DEFINITIONS[themeId].walls)assert.ok(loaded.includes(path));
   await page.screenshot({path:`${dir}/${label}-${themeId}.png`,fullPage:true});
   const size=await page.evaluate(()=>specialThemePreview.imageSize);reports.push({label,themeId,passed:true,actualImageSize:size,standard600:size.every(n=>n===600)});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 // Each fresh page has a fresh texture cache. Fail every special theme's walls.
 for(const themeId of SPECIAL_MAP_THEMES){
  const page=await browser.newPage();for(const path of SPECIAL_THEME_DEFINITIONS[themeId].walls)await page.route('**/'+path,r=>r.abort());
  await page.goto('http://127.0.0.1:4173/tests/browser/special-map-themes.html');await page.waitForFunction(()=>window.specialThemePreview);
  await page.locator('#theme').selectOption(themeId);await page.locator('form button').click();await page.waitForFunction(()=>window.specialThemePreview);
  assert.equal(await page.evaluate(()=>specialThemePreview.status.fallback),true);
  assert.ok(await page.locator('#view').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4!==3&&v>0)));
  reports.push({themeId,wallFailureFallback:true});await page.close();
 }
 await writeFile(`${dir}/browser-report.json`,JSON.stringify(reports,null,2)+'\n');console.log('All special walls/boss images and fallback paths passed on PC/390px');
}finally{await browser.close();}
