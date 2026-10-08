export const MAP_BETA_RUMOR_FLAG='tavern_rumor_019_base_read';
export const TRELIREN_REQUEST='ふぅ、ふぅ…。こんにちは！よく会うね。あなたにならお願いしても…いいかな？地図作りをあなたにも手伝ってもらいたいの。詳しくは今度あたしのテントで話しましょ！';
export const MAP_BETA_WELCOME='あたしのテントへようこそ！あなたにはあたしが見つけた地図の探索を手伝ってほしいの。まずはこれを渡しておくね。';
export const MAP_BETA_EXPLANATION=[
 'あたしが見つけたこの白地図は奈落とは違う所に繋がっているの。あたしは『地図迷宮』って呼んでるけれど。',
 '奈落の迷宮は入る度にその姿を変えるけれど、この地図迷宮は何度入っても同じ姿を保ったままなのよ。',
 'しかも、地図迷宮の最奥を守る魔物を倒すと新しい地図が手に入るの。でもあたしには荷が重いから、あなたの手を貸してほしい。調査が進めば、それに応じてお礼もするつもり。',
 '白地図はあたしがどんな地図なのか鑑定してあげる。あなたはその地図を持って調査に行ってくれればいいわ。',
 'では、早速鑑定してあげる。さあ、地図を見せて！'
];
export const MAP_BETA_NOTICE='地図探索β：宝箱と一部の地形ギミックは未実装です。戦闘バランスは調整中です。';
export function normalizeTrelirenProgress(character){
 const p=character?.trelirenProgress;
 return {encounters:Number.isSafeInteger(p?.encounters)&&p.encounters>=0?p.encounters:character?.eventFlags?.treliren_met?1:0,
  requestCompleted:p?.requestCompleted===true,lastEncounterId:typeof p?.lastEncounterId==='string'?p.lastEncounterId:''};
}
export function needsTrelirenRequest(character){const p=normalizeTrelirenProgress(character);return p.encounters>=2&&!p.requestCompleted;}
export function completeTrelirenEncounter(character,{requestCompleted=false}={}){
 const progress=normalizeTrelirenProgress(character),run=character.trelirenRun;
 if(!run?.encounterId||run.encountered||progress.lastEncounterId===run.encounterId)return character;
 return {...character,trelirenProgress:{encounters:progress.encounters+1,lastEncounterId:run.encounterId,requestCompleted:progress.requestCompleted||requestCompleted},
  trelirenRun:{...run,encountered:true,phase:-1},eventFlags:{...character.eventFlags,treliren_met:true}};
}
export const isMapTentUnlocked=character=>Boolean(character?.eventFlags?.[MAP_BETA_RUMOR_FLAG]);
export const isMapBetaUnlocked=character=>isMapTentUnlocked(character)&&character?.specialMaps?.betaExplorationUnlocked===true;
