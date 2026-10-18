// localStorage wrapper and personal records
export const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
export let rec=store.get('odb-rec3',{})||{};
export const saveRec=()=>store.set('odb-rec3',rec);
// art style: the game uses stickmen drawn in code. The drawn characters (image pieces and animation strips under
// assets/characters/) are kept but switched off: set stick to false to bring them back (their images then load too).
export const STYLE={stick:true};
// world records: empty until someone sets one (only people count, not the machines)
export let wrec=store.get('odb-wr',{})||{};
export const saveWr=()=>store.set('odb-wr',wrec);
