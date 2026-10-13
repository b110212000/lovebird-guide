import test from 'node:test';
import assert from 'node:assert/strict';
import {legacySlots,currentSlots,validateSlots} from '../worker/src/meal-slots.js';

test('cloud legacy accounts without slots preserve both existing reminder times',()=>{
 const legacy={times:{morning:'06:30',evening:'21:30'}};
 assert.deepEqual(currentSlots(legacy),[{id:'morning',time:'06:30'},{id:'evening',time:'21:30'}]);
});
test('backend accepts 5 meals with stable ids and sorts them',()=>{
 const ids=['a','b','c'].map(c=>'meal-'+c.repeat(32));
 const slots=validateSlots([
 {id:'evening',time:'18:00'},
 {id:ids[0],time:'11:30'},
 {id:'morning',time:'08:00'},
 {id:ids[1],time:'14:30'},
 {id:ids[2],time:'21:00'}
 ]);
 assert.equal(slots.length,5);
 assert.deepEqual(slots.map(s=>s.time),['08:00','11:30','14:30','18:00','21:00']);
});
test('backend rejects duplicate id, malformed ids, malformed clocks, empty or excessive slots',()=>{
 for(const input of [[],[{id:'morning',time:'08:00'},{id:'morning',time:'09:00'}],
 [{id:'__proto__',time:'08:00'}],[{id:'morning',time:'28:01'}],
 Array.from({length:13},(_,i)=>({id:'meal-'+String(i).padStart(32,'0'),time:'11:00'}))]){
  assert.throws(()=>validateSlots(input),/INVALID_SLOTS/);
 }
});
test('deleted meal IDs are omitted from active schedule without affecting stored historical records',()=>{
 const id='meal-'+'d'.repeat(32);
 const history={[id]:'2026-10-14T05:20:00.000Z'};
 const state={slots:[{id:'morning',time:'08:00'}],times:{morning:'08:00',evening:'18:00'}};
 assert.deepEqual(currentSlots(state),state.slots);
 assert.equal(history[id],'2026-10-14T05:20:00.000Z');
});
