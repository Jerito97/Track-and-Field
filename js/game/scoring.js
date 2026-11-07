// Points, sorting and formatting of results
import {ATH} from '../state.js';
import {secs} from '../utils.js';
import {ptsOf} from './points.js';

export function fmt(ev,v){ if(v==null) return ev.type==='sprint'?'DESC.':'NULO'; return ev.type==='sprint'?secs(v)+(v<59.995?' s':''):v.toFixed(2)+' m'; }
export function sortRows(ev,vals){ const rows=ATH.map((a,i)=>({a,i,v:vals[i]})); rows.sort((x,y)=>{ if(x.v==null&&y.v==null) return 0; if(x.v==null) return 1; if(y.v==null) return -1; return ev.type==='sprint'?x.v-y.v:y.v-x.v; }); return rows; }
export const bestOf=ms=>{ const v=ms.filter(m=>m!=null); return v.length?Math.max(...v):null; };
export {POINTS} from './points.js';
export const pts=(ev,v)=>ptsOf(ev.id,v);
