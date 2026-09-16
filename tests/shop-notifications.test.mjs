import test from 'node:test';
import assert from 'node:assert/strict';
import {syncShopNotifications,markShopNotificationsShown} from '../data/shop-notifications.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
test('shop baseline, unlock, persistence and acknowledgement',()=>{
 let c=createInitialCharacter({name:'test',job:'mage'});
 let result=syncShopNotifications(c);assert.equal(result.pending.length,0);c=result.character;
 c.highestDungeonDepthReached=70;
 result=syncShopNotifications(c);assert.ok(result.pending.some(x=>x.notificationId.includes('wurfmesser')));
 c=normalizeCharacter(JSON.parse(JSON.stringify(result.character)));
 assert.deepEqual(syncShopNotifications(c).pending,result.pending);
 c=markShopNotificationsShown(c,result.pending.map(x=>x.notificationId));assert.equal(syncShopNotifications(c).pending.length,0);
 c.eventFlags.weapon_imbue_oils_shop_unlocked=true;
 result=syncShopNotifications(c);assert.ok(result.pending.length>0);
 assert.equal(syncShopNotifications({...c,shopNotifications:null}).pending.length,0);
});
