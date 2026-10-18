// localStorage wrapper and personal records
export const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
export let rec=store.get('odb-rec3',{})||{};
export const saveRec=()=>store.set('odb-rec3',rec);
// art style: drawn characters, or stickmen drawn in code (chosen in the menu)
export const STYLE={stick:!!store.get('odb-stick',false)};
export const setStick=on=>{ STYLE.stick=!!on; store.set('odb-stick',STYLE.stick); };
// world records: empty until someone sets one (only people count, not the machines)
export let wrec=store.get('odb-wr',{})||{};
export const saveWr=()=>store.set('odb-wr',wrec);
