import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const output='artifacts/boss-color-variants';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const reports=[];
try {
  for(const [label,width,height] of [['pc',1280,1000],['mobile',390,844]]) {
    const page=await browser.newPage({viewport:{width,height},isMobile:label==='mobile',hasTouch:label==='mobile'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/tests/browser/boss-variants.html');
    await page.waitForFunction(()=>window.variantQa);
    const result=await page.evaluate(async()=>{
      const {base,image,getBossVariantImage:get,prepareBossVariantImage:prepare,clearBossVariantCache:clear}=variantQa;
      clear();const prepared=await prepare(base);if(prepared!==get(base)||prepared===image)throw Error('Preload did not cache variant');
      const times=[],hits=[];
      for(let i=0;i<23;i++){clear();const start=performance.now();get(base);const time=performance.now()-start;if(i>=3)times.push(time);}
      const cached=get(base);for(let i=0;i<1000;i++){const start=performance.now();if(get(base)!==cached)throw Error('Cache identity changed');hits.push(performance.now()-start);}
      const stats=values=>({meanMs:values.reduce((a,b)=>a+b,0)/values.length,maxMs:Math.max(...values),samples:values.length});
      const canvas=document.createElement('canvas');canvas.width=canvas.height=600;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0);
      const original=ctx.getImageData(0,0,600,600).data;ctx.clearRect(0,0,600,600);ctx.drawImage(cached,0,0);
      const variant=ctx.getImageData(0,0,600,600).data;let alphaMismatch=0,transparent=0,changed=0;
      for(let i=0;i<original.length;i+=4){if(original[i+3]!==variant[i+3])alphaMismatch++;if(!original[i+3])transparent++;if(original[i]!==variant[i]||original[i+1]!==variant[i+1]||original[i+2]!==variant[i+2])changed++;}
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',variant))).map(v=>v.toString(16).padStart(2,'0')).join('');
      // An ordinary boss is passed through untouched, even with otherwise valid map parameters.
      const normal=new Image();normal.src='/images/bosses/boss_02.avif';await normal.decode();
      const normalUnchanged=get({...base,bossId:'lingering_ghost_b2f',imagePath:'images/bosses/boss_02.avif',image:normal})===normal;
      return {width:image.naturalWidth,height:image.naturalHeight,first:stats(times),cached:stats(hits),alphaMismatch,transparent,changed,hash,normalUnchanged,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(result.width,600);assert.equal(result.height,600);assert.equal(result.alphaMismatch,0);assert.ok(result.transparent>0);assert.ok(result.changed>0);assert.equal(result.normalUnchanged,true);assert.equal(result.overflow,false);assert.deepEqual(errors,[]);
    reports.push({label,...result});await page.screenshot({path:`${output}/${label}.png`,fullPage:true});await page.close();
  }
  assert.equal(reports[0].hash,reports[1].hash);
  await writeFile(`${output}/browser-report.json`,JSON.stringify({browser:await browser.version(),reports},null,2)+'\n');
  console.log(JSON.stringify(reports,null,2));
} finally {await browser.close();}
