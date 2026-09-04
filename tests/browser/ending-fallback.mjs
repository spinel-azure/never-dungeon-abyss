import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({channel:"msedge",headless:true,args:['--autoplay-policy=user-gesture-required']});
const errors=[], warnings=[];
try {
  const context=await browser.newContext(); const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push(m.text());});
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto(process.env.ENDING_TEST_URL || 'http://127.0.0.1:4175');
  await page.clock.install();
  // No user gesture: exercise the browser's actual suspended AudioContext.
  await page.evaluate(async()=>{
    document.querySelector('#titleScreen').hidden=true;
    const audio=await import('/js/audio.js');
    const {createEndingController}=await import('/js/ending.js');
    window.played=null; window.finished=false;
    window.controller=createEndingController({parent:document.querySelector('.game'),
      createAudioClock:()=>{const c=audio.createEndingAudioClock({timeoutMs:150});return {...c,async start(){window.played=await c.start();return played;}};},
      onFinish:()=>{window.finished=true;return true;}});
    await controller.start();
  });
  assert.equal(await page.evaluate(()=>played),false);
  await page.clock.fastForward(97000);
  await page.evaluate(()=>Promise.resolve());
  assert.equal(await page.evaluate(()=>finished),true);
  assert.equal(await page.locator('#endingScreen').count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browserAudioDenied:true,fallbackCompleted:true,errors,warnings}));
} finally {await browser.close();}
