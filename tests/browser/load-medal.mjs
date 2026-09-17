import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
await mkdir('artifacts/load-medal',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const [name,width,height] of [['pc',1280,900],['mobile',390,844]]) {
    const page=await browser.newPage({viewport:{width,height}});
    await page.addInitScript(()=>{
      for(const [slot,awarded] of [[1,true],[2,false]]) localStorage.setItem(`nda.save.manual${slot}.current`,JSON.stringify({schemaVersion:1,savedAt:'2026-09-17T07:00:00Z',character:{name:'スピネル',level:125,eventFlags:{royal_cat_medal_awarded:awarded}},player:{gridX:1,gridY:1,dir:0},dungeon:{cells:[[{type:'floor'}]],explored:[[true]]}}));
    });
    await page.goto('http://127.0.0.1:4179');
    await page.locator('[data-title-action="load-game"]').click();
    const medal=page.locator('[data-load-slot="manual1"] img');
    await medal.waitFor();
    await page.waitForFunction(()=>document.querySelector('.title-load-medal')?.naturalWidth>0);
    assert.equal(await page.locator('.title-load-medal').count(),1);
    const box=await medal.boundingBox(),button=await page.locator('[data-load-slot="manual1"]').boundingBox();
    assert.ok(box.x>=button.x&&box.x+box.width<=button.x+button.width&&box.y+box.height<=button.y+button.height);
    await page.screenshot({path:`artifacts/load-medal/${name}.png`});
    console.log(`${name}: awarded badge only, image loaded and within button`);
    await page.close();
  }
} finally {await browser.close();}
