// Pure helpers allow Node tests and Durable Object Worker to share validation.
export const VALID_TIME=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const SLOT_ID=/^(?:morning|evening|meal-[a-f0-9]{32})$/;
export const DEFAULT_TIMES={morning:'08:00',evening:'18:00'};
export const MAX_SLOTS=12;
export function legacySlots(times){
 const source=times&&typeof times==='object'?times:{};
 return [{id:'morning',time:VALID_TIME.test(source.morning)?source.morning:'08:00'},
         {id:'evening',time:VALID_TIME.test(source.evening)?source.evening:'18:00'}];
}
export function currentSlots(state){return Array.isArray(state.slots)?state.slots:legacySlots(state.times)}
export function validateSlots(input){
 if(!Array.isArray(input)||input.length<1||input.length>MAX_SLOTS)throw new Error('INVALID_SLOTS');
 const ids=new Set();
 const slots=input.map(item=>{
  if(!item||typeof item!=='object'||typeof item.id!=='string'||!SLOT_ID.test(item.id)
    ||typeof item.time!=='string'||!VALID_TIME.test(item.time)||ids.has(item.id))
   throw new Error('INVALID_SLOTS');
  ids.add(item.id);
  return {id:item.id,time:item.time};
 });
 slots.sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
 return slots;
}
