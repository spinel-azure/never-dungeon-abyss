import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=await mkdtemp(path.join(tmpdir(),'nda-reinc-armor-'));console.log(output);
const source=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const hook=`
window.armorQa={async setup(series){
 const {REINCARNATION_ARMOR,REINCARNATION_ARMOR_SETS}=await import('../data/reincarnation-armor.js');
 const {equipInstance}=await import('../data/equipment-inventory.js');
 const set=REINCARNATION_ARMOR_SETS[series];
 character=normalizeCharacter({...createInitialCharacter({name:'防具検証',job:set.job}),reincarnationCount:set.tier,level:100});
 for(const item of Object.values(REINCARNATION_ARMOR).filter(x=>x.seriesId===series)){
 const g=grantEquipmentInstance(character,item.id,item.slot,{enhancement:3});
 const e=equipInstance(g.character,item.slot,g.instance.instanceId);
 if(!e.accepted)throw new Error(e.reason);character=e.character;
 }
 if(set.job==='thief'){const g=grantEquipmentInstance(character,'katzendolch','rightArmId');const e=equipInstance(g.character,'rightArmId',g.instance.instanceId);if(!e.accepted)throw Error(e.reason);character=e.character;}
 character=normalizeCharacter(character);
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 document.body.classList.add('town-active');closeCampMenu('qa');closeTown();updateCharacterUi();openStatusMenu();
}, inventory(){closeCampMenu('qa');openItemInventory();handleMenuInput('right');handleMenuInput('right');},
input(action){handleMenuInput(action);}};
`;
const hooked=source.replace(/\n\}\)\(\);\s*$/,`\n${hook}\n})();\n`);
assert.notEqual(hooked,source);
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
try{
 for(const [label,width,height] of [['pc',1280,900],['mobile',390,844],['narrow',360,800]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:label!=='pc',isMobile:label!=='pc'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:hooked}));
  await page.goto(process.env.ARMOR_QA_URL||'http://127.0.0.1:4174');
  for(const id of ['obsidian','nightcrow','dawn','eveningstar','dragonbone','phantomshade','sacredradiance','firmament','divinemight','shadowless','heavenprayer','polarstar']){
   await page.evaluate(id=>armorQa.setup(id),id);await page.evaluate(()=>document.fonts.ready);
   const panel=page.locator('#menuScreen');
   assert.ok((await panel.boundingBox()).width<=width,`${label} ${id} panel exceeds viewport`);
   assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${label} ${id} content overflow`);
   assert.ok(await panel.evaluate(e=>[...e.querySelectorAll('.nde-equipment-name,.nde-equipment-bonus')].every(x=>{
    const box=x.getBoundingClientRect(),outer=e.getBoundingClientRect();
    return box.right<=outer.right+1 && x.scrollWidth<=x.clientWidth+1;
   })),`${label} ${id} clipped bonus text`);
   assert.doesNotMatch(await panel.innerText(),/セット効果|先駆け|術式|余光|逆鱗|あと1部位/);
   await panel.screenshot({path:path.join(output,`${label}-${id}.png`)});
  }
  await page.evaluate(()=>armorQa.inventory());
  await page.locator('[data-inventory-tab=equipment]').click();
  await page.locator('.inventory-entry').filter({hasText:'極星の'}).first().click();
  assert.match(await page.locator('[data-inventory-description]').innerText(),/転生3回以上/);
  assert.doesNotMatch(await page.locator('[data-inventory-description]').innerText(),/術式|蓄積|セット/);
  await page.locator('#menuScreen').screenshot({path:path.join(output,`${label}-inventory.png`)});
  console.log(label,'12 status screens passed');
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
