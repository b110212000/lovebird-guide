// Canonical daily feeding schedule. Stable slot IDs preserve historical check-ins.
export const CLOCK_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const SLOT_ID_RE=/^(?:morning|evening|meal-[a-f0-9]{32})$/;
export const MAX_SLOTS=12;
export const DEFAULT_SLOTS=[{id:'morning',time:'08:00'},{id:'evening',time:'18:00'}];

export function slotsFromLegacy(times={}){
 const source=times&&typeof times==='object'&&!Array.isArray(times)?times:{};
 return [
  {id:'morning',time:CLOCK_RE.test(source.morning)?source.morning:'08:00'},
  {id:'evening',time:CLOCK_RE.test(source.evening)?source.evening:'18:00'}
 ];
}
export function normalizeSlots(input,fallback=DEFAULT_SLOTS){
 if(!Array.isArray(input)||input.length===0||input.length>MAX_SLOTS)return slotsFromLegacy(Object.fromEntries(fallback.map(x=>[x.id,x.time])));
 const used=new Set();
 const items=[];
 for(const item of input){
  if(!item||typeof item!=='object'||!SLOT_ID_RE.test(item.id)||!CLOCK_RE.test(item.time)||used.has(item.id))
   return slotsFromLegacy(Object.fromEntries(fallback.map(x=>[x.id,x.time])));
  used.add(item.id);
  items.push({id:item.id,time:item.time});
 }
 return items.sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
}
export function newSlotId(){return 'meal-'+crypto.randomUUID().replace(/-/g,'');}
export function addSlot(slots,time='12:00',id=newSlotId()){
 if(!CLOCK_RE.test(time)||!SLOT_ID_RE.test(id)||slots.length>=MAX_SLOTS||slots.some(x=>x.id===id))return null;
 return normalizeSlots([...slots,{id,time}]);
}
export function updateSlot(slots,id,time){
 if(!CLOCK_RE.test(time)||!slots.some(x=>x.id===id))return null;
 return normalizeSlots(slots.map(x=>x.id===id?{...x,time}:x));
}
export function deleteSlot(slots,id){
 if(slots.length<=1||!slots.some(x=>x.id===id))return null;
 return normalizeSlots(slots.filter(x=>x.id!==id));
}
export function activeCount(feed,slots){return slots.filter(s=>Boolean(feed?.[s.id])).length}
