// Points, sorting and formatting of results
import {ATH} from '../state.js';

export function fmt(ev,v){ if(v==null) return ev.type==='sprint'?'DESC.':'NULO'; return v.toFixed(2)+(ev.type==='sprint'?' s':' m'); }
export function sortRows(ev,vals){ const rows=ATH.map((a,i)=>({a,i,v:vals[i]})); rows.sort((x,y)=>{ if(x.v==null&&y.v==null) return 0; if(x.v==null) return 1; if(y.v==null) return -1; return ev.type==='sprint'?x.v-y.v:y.v-x.v; }); return rows; }
export const bestOf=ms=>{ const v=ms.filter(m=>m!=null); return v.length?Math.max(...v):null; };
export const POINTS={'100':t=>1000+(10.0-t)*170,'110h':t=>1000+(13.5-t)*140,'lj':m=>1000+(m-7.8)*260,'pv':m=>1000+(m-5.5)*320,'jav':m=>1000+(m-80)*14,'tj':m=>1000+(m-17)*120,'ham':m=>1000+(m-70)*14};
// an event without its points table yet (in testing) scores 0
export const pts=(ev,v)=>v==null||!POINTS[ev.id]?0:Math.max(0,Math.round(POINTS[ev.id](v)));
