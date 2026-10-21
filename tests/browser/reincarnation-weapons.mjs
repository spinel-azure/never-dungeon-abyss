import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {REINCARNATION_WEAPONS,FINAL_CAT_WEAPONS} from '../../data/reincarnation-weapons.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=await mkdtemp(path.join(tmpdir(),'nda-reinc-weapons-'));console.log(output);
const source=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const hook=`
window.weaponQa={async setup(id){
 const {getWeapon}=await import('../data/weapons.js');
 const {equipInstance}=await import('../data/equipment-inventory.js');
 const w=getWeapon(id);
 character=normalizeCharacter({...createInitialCharacter({name:'武器検証',job:w.allowedJobs[0]}),reincarnationCount:3,level:197});
 const g=grantEquipmentInstance(character,id,'rightArmId',{enhancement:3});
 const e=equipInstance(g.character,'rightArmId',g.instance.instanceId);if(!e.accepted)throw Error(e.reason);character=normalizeCharacter(e.character);
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 document.body.classList.add('town-active');closeCampMenu('qa');closeTown();updateCharacterUi();openStatusMenu();
},inventory(){closeCampMenu('qa');openItemInventory();handleMenuInput('right');handleMenuInput('right');}};
`;
const hooked=source.replace(/\n\}\)\(\);\s*$/,`\n${hook}\n})();\n`);assert.notEqual(hooked,source);
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
try{
 for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:label!=='pc',isMobile:label!=='pc'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:hooked}));
  await page.goto('http://127.0.0.1:4174');
  for(const w of [...Object.values(REINCARNATION_WEAPONS),...Object.values(FINAL_CAT_WEAPONS)]){
   await page.evaluate(id=>weaponQa.setup(id),w.id);await page.evaluate(()=>document.fonts.ready);
   const panel=page.locator('#menuScreen');
   assert.ok((await panel.boundingBox()).width<=width,`${label}/${w.id} panel width`);
   assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${label}/${w.id} status overflow`);
   await page.evaluate(()=>weaponQa.inventory());await page.locator('[data-inventory-tab=equipment]').click();
   await page.locator('.inventory-entry').filter({hasText:w.name}).first().click();
   const detail=page.locator('[data-inventory-description]');
   const text=await detail.innerText();assert.match(text,/転生[123]回以上/);assert.doesNotMatch(text,/BASEMAX|CRITICALBONUS|SPELLRESISTANCE/);
   assert.ok(await detail.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${label}/${w.id} detail overflow`);
   await panel.screenshot({path:path.join(output,`${label}-${w.id}.png`)});
  }
  console.log(label,'16 weapon status/details passed');await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
