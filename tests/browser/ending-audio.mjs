import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({channel:"msedge",headless:true});
const errors=[], warnings=[];
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push(m.text());});
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto(process.env.ENDING_TEST_URL || 'http://127.0.0.1:4175');
  await page.evaluate(async()=>{
    document.querySelector('#titleScreen').hidden=true;
    const audio=await import('/js/audio.js'); audio.configureAudio();
    window.audio=audio;
  });
  await page.mouse.click(10,10);
  await page.evaluate(async()=>{
    const {createEndingController}=await import('/js/ending.js');
    window.audioMode=null; window.finished=0;
    window.controller=createEndingController({parent:document.querySelector('.game'),
      createAudioClock:()=>{const clock=audio.createEndingAudioClock();window.clock=clock;
        return {...clock, async start(){const played=await clock.start();window.audioMode=played;return played;}};},
      onFinish:()=>{window.finished++;return true;}});
    await controller.start();
  });
  assert.equal(await page.evaluate(()=>audioMode),true);
  await page.waitForTimeout(1500);
  const t=await page.evaluate(()=>clock.elapsed()); assert.ok(t>1 && t<4);
  // Background/focus handling must not reset the cinematic source or its clock.
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(500);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  assert.ok(await page.evaluate(()=>clock.elapsed())>t);
  console.log('Audio started from the shared manager; real-time 96-second playback in progress.');
  await page.waitForFunction(()=>window.finished===1,{},{timeout:105000});
  assert.equal(await page.locator('#endingScreen').count(),0);
  assert.equal(await page.evaluate(()=>controller.isActive()),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({actualBgm:true,completed:true,errors,warnings}));
} finally {await browser.close();}
