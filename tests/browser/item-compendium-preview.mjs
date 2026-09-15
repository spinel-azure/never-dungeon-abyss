import {createRequire} from "node:module";
import {mkdir} from "node:fs/promises";
import assert from "node:assert/strict";
const {chromium} = createRequire(import.meta.url)("playwright");
const origin=process.env.ITEM_PREVIEW_URL||"http://127.0.0.1:4179";
const out="artifacts/item-compendium-preview";
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:"msedge",headless:true});
try {
  for(const [label,width,height] of [["pc",1280,900],["mobile",390,844]]) {
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/js/main.js?*",r=>r.fulfill({contentType:"text/javascript",body:""}));
    await page.goto(origin);
    const dimensions=await page.evaluate(async()=>{
      document.querySelector('#titleScreen').hidden=true;
      document.body.className='menu-open inventory-open '+(innerWidth<600?'layout-mobile orientation-portrait input-touch':'layout-pc');
      for(const el of document.querySelector('.game').children)el.hidden=true;
      const menu=document.querySelector('#menuScreen');menu.hidden=false;
      for(const el of menu.children)el.hidden=true;
      const monster=menu.querySelector('[data-menu-view="monsterCompendium"]');monster.hidden=false;
      const bounds=monster.getBoundingClientRect();const reference={width:bounds.width,height:bounds.height};monster.hidden=true;
      const css=document.createElement('link');css.rel='stylesheet';css.href='/css/item-compendium.css';document.head.append(css);await new Promise(r=>css.onload=r);
      const {mountItemCompendium}=await import('/js/item-compendium.js');const {ITEM_COMPENDIUM_ENTRIES}=await import('/data/item-compendium.js');
      const root=document.createElement('div');root.id='itemPreview';menu.append(root);mountItemCompendium(root,Object.values(ITEM_COMPENDIUM_ENTRIES));
      await document.fonts.ready;const rect=root.getBoundingClientRect();return {reference,actual:{width:rect.width,height:rect.height}};
    });
    assert.deepEqual(dimensions.actual,dimensions.reference);
    await page.locator('#itemPreview button').getByText('貴重品',{exact:true}).click();
    await page.screenshot({path:`${out}/${label}-tabs.png`,fullPage:true});
    await page.getByRole('button',{name:'女王のティアラ',exact:true}).click();
    assert.equal(await page.locator('#itemPreview dd').last().innerText(),'非売品');
    assert.equal(await page.locator('.item-compendium-content').evaluate(e=>e.scrollHeight<=e.clientHeight),true);
    await page.screenshot({path:`${out}/${label}.png`,fullPage:true});
    await page.getByRole('button',{name:'一覧へ戻る',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'貴重品',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'消耗品',exact:true}).click();
    assert.match(await page.locator('.item-compendium-content').innerText(),/まだ登録がありません/);
    assert.deepEqual(errors,[]);console.log(label+": fits, complete text, no page errors");await page.close();
  }
} finally {await browser.close();}
