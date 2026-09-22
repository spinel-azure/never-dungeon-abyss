import { createStageShake } from "./effects/effect-stage.js";
import { EffectEngine } from "./effects/effect-engine.js";
import { createEffectAudioRouting } from "./audio.js";

const definitionPromises = new Map();
let registryPromise = null;
let activeEngine = null;
let requestGeneration = 0;

export function prepareBattleSkillEffect(definition, damage = 0, healing = 0) {
  const values={damage:String(Math.max(0,Math.floor(Number(damage)||0))),healing:String(Math.max(0,Math.floor(Number(healing)||0)))};
  return {...structuredClone(definition), parts:(definition?.parts||[]).map(part=>
    part.type==='popup' && part.valueSource in values
      ? {...part,valueSource:'fixed',text:String(part.text||`{${part.valueSource}}`).replaceAll(`{${part.valueSource}}`,values[part.valueSource])}
      : {...part})};
}

// Rectangles are measured together, so CSS animation, viewport scaling and parent
// shake are accounted for without feeding the shake back into the target position.
export function getBattleEffectTarget(root, canvas, targetIndex) {
  const member=Number.isInteger(targetIndex)?root.querySelector(`.battle-enemy-member[data-index="${targetIndex}"]`):null;
  const image=member?.querySelector('.battle-enemy-member-image')||root.querySelector('#battleEnemyImage');
  const host=image?.closest('.has-enemy-deform');
  const visible=host?.querySelector('.battle-enemy-ambient-front')||image;
  if(!visible)return null;
  const rect=visible.getBoundingClientRect(),base=canvas.getBoundingClientRect();
  if(!base.width||!base.height||!rect.width||!rect.height)return null;
  return {x:(rect.left+rect.width/2-base.left)*canvas.width/base.width,y:(rect.top+rect.height/2-base.top)*canvas.height/base.height};
}

export function stopBattleSkillPresentation() {requestGeneration++;if(activeEngine){activeEngine.canvas.hidden=true;activeEngine.stop(false)}activeEngine=null;}

export async function playBattleSkillPresentation({root,presentationId,damage,healing,targetIndex,definition}={}) {
  const canvas=root?.querySelector?.('#battleSkillEffectCanvas');
  if(!canvas||(!definition&&!presentationId))return false;
  const request=++requestGeneration;
  let engine=null, routing=null;
  try {
    if(!definition){
      const registry=await loadRegistry();
      const url=registry[presentationId];if(!url)return false;
      definition=await loadDefinition(url);
    }
    if(request!==requestGeneration)return false;
    activeEngine?.stop(false);
    routing=(definition.audioTracks||[]).some(t=>t.enabled!==false)?await createEffectAudioRouting():null;
    if(request!==requestGeneration){routing?.release();return false}
    const surface=root.closest('.viewport');
    const shake=createStageShake(surface?[...surface.children]:[root],root,()=>engine.effect);
    engine=new EffectEngine(canvas,{transparent:true,backdrop:false,
      getTarget:()=>getBattleEffectTarget(root,canvas,targetIndex),
      onShake:shake,
      audio:routing?.options||{}
    });
    activeEngine=engine;
    engine.load(prepareBattleSkillEffect(definition,damage,healing));
    canvas.hidden=false;
    return await engine.play();
  }catch(error){console.warn('Battle presentation failed',error);return false}
  finally{
    routing?.release();
    if(activeEngine===engine){engine?.stop(false);canvas.hidden=true;activeEngine=null}
  }
}

async function loadRegistry(){
  if(!registryPromise)registryPromise=fetch('data/effects/battle-presentations.json').then(r=>{if(!r.ok)throw new Error('Presentation registry unavailable');return r.json()}).catch(error=>{registryPromise=null;throw error});
  return registryPromise;
}
function loadDefinition(url){
  if(!definitionPromises.has(url))definitionPromises.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error(`Battle effect JSON request failed: ${r.status}`);return r.json()}).catch(error=>{definitionPromises.delete(url);throw error}));
  return definitionPromises.get(url);
}
