// Online tournaments: talks to the Vercel function /api/t (see api/t.js). Codes of the tournaments you're in are kept
// per player on this device, so the menu can list them.
import {player,store} from './storage.js';

const API=new URL('../api/t',import.meta.url).href;
const me=()=>{ const p=player(); return p&&{id:p.id,name:p.name,color:p.color}; };
async function call(method,body,query=''){
  let r;
  try{ r=await fetch(API+query,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined}); }
  catch(e){ throw new Error('Sin conexión. Probá de nuevo.'); }
  let data={}; try{ data=await r.json(); }catch(e){ /* no body */ }
  if(!r.ok) throw new Error(data.error||(r.status===404?'No se encontró el servidor de torneos.':'Error del servidor.'));
  return data;
}
export const cleanCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
export const getTournament=code=>call('GET',null,'?code='+encodeURIComponent(cleanCode(code)));
export async function createTournament(name,events){ const r=await call('POST',{action:'create',name,events,player:me()}); remember(r.code); return r.code; }
export async function joinTournament(code){ code=cleanCode(code); await call('POST',{action:'join',code,player:me()}); remember(code); return code; }
export const sendResult=(code,ev,mark)=>call('POST',{action:'result',code,ev,mark,player:me()});

// tournaments of the current player, newest first
const KEY=()=>'odb-online-'+(player()?.id||'');
export const myTournaments=()=>store.get(KEY(),[]);
function remember(code){ const l=myTournaments().filter(c=>c!==code); l.unshift(code); store.set(KEY(),l.slice(0,20)); }
export function forget(code){ store.set(KEY(),myTournaments().filter(c=>c!==code)); }
// link that opens the game straight into the tournament
export const inviteLink=code=>{ const u=new URL(location.href); u.search='?t='+code; u.hash=''; return u.href; };
