import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
const { chromium }=createRequire(import.meta.url)("playwright");
const origin=process.env.ENGRAVING_STATUS_URL||"http://127.0.0.1:4173";
const output=path.resolve("artifacts/engraving-status");await mkdir(output,{recursive:true});
const source=await readFile(new URL("../../js/main.js",import.meta.url),"utf8");
const hook=`
window.engravingStatusQa={setup(){
 character=createInitialCharacter({name:'刻印検証',job:'warrior'});character.reincarnationCount=3;character=normalizeCharacter(character);
 character.baseStats={str:8,int:8,agi:8,dex:8,luc:8};character.engravingStatBonuses={str:30,int:42,agi:22,dex:52,luc:62};
 character.equipmentStatBonuses={str:10,int:10,agi:20,dex:20,luc:10,def:25};character.cardStatBonuses={str:2,int:10,agi:10,dex:10,luc:10,def:20};character.def=45;
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');document.body.classList.add('town-active');closeCampMenu('qa');closeTown();
 updateCharacterUi();openStatusMenu();
},read(){return [...document.querySelectorAll('.nde-stat-row')].map(row=>({text:row.textContent,tier:row.dataset.tier,cells:[...row.querySelectorAll('i')].map(x=>x.className)}));}};
`;
const hookedSource=source.replace(/\n\}\)\(\);\s*$/,`\n${hook}\n})();\n`);
const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const errors=[];
try{for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});const page=await context.newPage();page.on('pageerror',e=>errors.push(label+': '+e.message));await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:hookedSource}));await page.goto(origin);await page.evaluate(()=>engravingStatusQa.setup());await page.locator('#menuScreen').waitFor({state:'visible'});const rows=await page.evaluate(()=>engravingStatusQa.read());assert.equal(rows.length,6);assert.ok(rows.some(r=>r.cells.some(c=>c.includes('is-engraving'))));assert.ok(rows.some(r=>r.tier==='3'));const box=await page.locator('#menuScreen').boundingBox();assert.ok(box.width<=width+1);await page.locator('#menuScreen').screenshot({path:path.join(output,label+'-status.png')});console.log(label,JSON.stringify(rows.map(r=>({text:r.text,tier:r.tier}))));await context.close();}assert.deepEqual(errors,[]);}finally{await browser.close();}
