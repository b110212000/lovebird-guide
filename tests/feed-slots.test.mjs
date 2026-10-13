import test from 'node:test';
import assert from 'node:assert/strict';
import {CLOCK_RE,MAX_SLOTS,slotsFromLegacy,normalizeSlots,addSlot,updateSlot,deleteSlot,activeCount} from '../src/feed-slots.js';

test('migrates existing morning/evening schedules without changing IDs',()=>{
 const slots=slotsFromLegacy({morning:'07:30',evening:'19:15'});
 assert.deepEqual(slots,[{id:'morning',time:'07:30'},{id:'evening',time:'19:15'}]);
 assert.equal(activeCount({morning:'2026-10-14T00:00:00.000Z'},slots),1);
});
test('can add third, fourth and fifth meal and sort by time',()=>{
 let slots=slotsFromLegacy({morning:'08:00',evening:'18:00'});
 for(const [i,time] of ['12:00','15:00','21:30'].entries()){
  slots=addSlot(slots,time,'meal-'+String(i+1).padStart(32,'0'));
  assert.ok(slots);
 }
 assert.equal(slots.length,5);
 assert.deepEqual(slots.map(x=>x.time),['08:00','12:00','15:00','18:00','21:30']);
 assert.equal(activeCount({morning:'2026-10-14T00:01:00.000Z'},slots),1);
});
test('editing time keeps stable slot id and preserves a historical check-in',()=>{
 let slots=slotsFromLegacy();
 const newId='meal-'+'1'.repeat(32);
 slots=addSlot(slots,'13:00',newId);
 const record={[newId]:'2026-10-14T05:15:00.000Z'};
 slots=updateSlot(slots,newId,'11:45');
 assert.equal(slots.find(s=>s.id===newId).time,'11:45');
 assert.equal(activeCount(record,slots),1);
});
test('deleting a slot changes active totals but leaves the original history object intact',()=>{
 const key='meal-'+'a'.repeat(32);
 let slots=addSlot(slotsFromLegacy(),'12:00',key);
 const history={morning:'2026-10-14T00:00:00.000Z',[key]:'2026-10-14T04:00:00.000Z'};
 slots=deleteSlot(slots,key);
 assert.equal(slots.length,2);
 assert.equal(activeCount(history,slots),1);
 assert.equal(history[key],'2026-10-14T04:00:00.000Z');
});
test('rejects invalid time, duplicate ids, zero slots and more than 12',()=>{
 assert.equal(CLOCK_RE.test('25:99'),false);
 assert.equal(addSlot(slotsFromLegacy(),'25:99','meal-'+'2'.repeat(32)),null);
 assert.equal(addSlot(slotsFromLegacy(),'12:00','morning'),null);
 assert.equal(deleteSlot([{id:'morning',time:'08:00'}],'morning'),null);
 let slots=slotsFromLegacy();
 for(let i=0;i<MAX_SLOTS-2;i++)slots=addSlot(slots,'12:00','meal-'+String(i).padStart(32,'0'));
 assert.equal(slots.length,MAX_SLOTS);
 assert.equal(addSlot(slots,'22:00','meal-'+'f'.repeat(32)),null);
 assert.deepEqual(normalizeSlots([{id:'invalid',time:'08:00'}]),slotsFromLegacy());
});
