import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTS,getQuestProgress,isQuestAvailable} from '../data/quests.js';
import {getAvailableGuildQuestNotifications} from '../data/guild-quest-notifications.js';
import {createCoalescedNotificationSync} from '../js/passive-notification-sync.js';
import {createGuildQuestNotificationController} from '../js/rumor-notification.js';
test('batched notification work uses latest state once and cancels old load/session work',async()=>{
 let state=0;const seen=[];const sync=createCoalescedNotificationSync(()=>seen.push(state));
 sync.request();state=1;sync.request();await Promise.resolve();assert.deepEqual(seen,[1]);
 sync.request();sync.cancel();state=2;sync.request();await Promise.resolve();assert.deepEqual(seen,[1,2]);
 sync.request();sync.cancel();await Promise.resolve();assert.deepEqual(seen,[1,2]);
});
test('quest availability remains equivalent across progress and flag combinations, with one normalization',()=>{
 for(const count of [0,3,15,33])for(const unlocked of [false,true])for(const depth of [1,50,100]){
  const quests={completedQuestIds:QUESTS.slice(0,count).map(q=>q.id),active:{guild_035:{progress:2},guild_006:{progress:0}}};
  const flags=Object.fromEntries(QUESTS.filter(q=>q.availableFlag).map(q=>[q.availableFlag,true]));
  const c={quests,eventFlags:{...flags,guild_first_request_unlocked:unlocked},highestDungeonDepthReached:depth};
  const expected=unlocked?QUESTS.filter(q=>{const p=getQuestProgress(c,q.id);return isQuestAvailable(c,q)&&!p.active&&!p.completed}).map(q=>q.id):[];
  let reads=0;Object.defineProperty(c,'quests',{get(){reads++;return quests}});
  assert.deepEqual(getAvailableGuildQuestNotifications(c).map(q=>q.id),expected);
  assert.equal(reads,unlocked?1:0);
 }
});
test('notification request reuses reconciled entries but playback rechecks current state',async()=>{
 let reads=0,entry;const controller=createGuildQuestNotificationController({
  root:{hidden:true,classList:{remove(){}}},bell:{},copy:{},detail:{},
  getPending:()=>{reads++;return []},coordinator:{enqueue:e=>{entry=e;return true}}
 });
 assert.equal(controller.request([{notificationId:'old'}]),true);assert.equal(reads,0);
 await entry.play({signal:new AbortController().signal});assert.equal(reads,1);
 controller.dispose();
});
