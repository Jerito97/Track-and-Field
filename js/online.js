// Online tournaments: talks to the Vercel function /api/t (see api/t.js). Codes of the tournaments you're in are kept
// per player on this device, so the menu can list them.
import {player,store,updatePlayer} from './storage.js';

const API=new URL('../api/t',import.meta.url).href;
const tok=()=>player()?.token||null;
async function call(method,body,query=''){
  let r;
  try{ r=await fetch(API+query,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined}); }
  catch(e){ throw new Error('Sin conexión. Probá de nuevo.'); }
  let data={}; try{ data=await r.json(); }catch(e){ /* no body */ }
  // without connection the service worker answers with the last copy it kept (sw.js)
  if(r.headers.get('x-offline')&&data&&typeof data==='object') data.offline=true;
  // the session is no longer valid: the game asks for the code again (records stay on this phone)
  if(r.status===401&&body?.token&&player()?.token===body.token) updatePlayer({token:null,expired:true});
  if(!r.ok){ const e=new Error(data.error||(r.status===404?'No se encontró el servidor de torneos.':'Error del servidor.')); e.status=r.status; throw e; }
  return data;
}
export const cleanCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
// players: unique names with a 4-6 digit code
export const nameExists=async name=>(await call('POST',{action:'check',name})).exists;
export const registerPlayer=(name,pin,color)=>call('POST',{action:'register',name,pin,color});
export const loginPlayer=(name,pin)=>call('POST',{action:'login',name,pin});
export const updateRemote=fields=>call('POST',{action:'update',token:tok(),...fields});
export const getTournament=code=>call('GET',null,'?code='+encodeURIComponent(cleanCode(code)));
export async function repeatTournament(code,events,days){ const r=await call('POST',{action:'repeat',code,events,days,token:tok()}); remember(r.code); return r.code; }
export async function createTournament(name,events,days){ const r=await call('POST',{action:'create',name,events,days,token:tok()}); remember(r.code); return r.code; }
export const closeTournament=code=>call('POST',{action:'close',code:cleanCode(code),token:tok()});
// every tournament you're in, with players and results (from any phone)
export const getMyTours=async()=>(await call('POST',{action:'mytours',token:tok()})).tours;
export async function joinTournament(code){ code=cleanCode(code); await call('POST',{action:'join',code,token:tok()}); remember(code); return code; }
// token: whose result it is (the current player unless given)
export const sendResult=(code,ev,mark,token=tok())=>call('POST',{action:'result',code,ev,mark,token});

// tournaments of the current player, newest first
const KEY=()=>'odb-online-'+(player()?.id||'');
export const myTournaments=()=>store.get(KEY(),[]);
function remember(code){ const l=myTournaments().filter(c=>c!==code); l.unshift(code); store.set(KEY(),l.slice(0,20)); }
export function forget(code){ store.set(KEY(),myTournaments().filter(c=>c!==code)); }
// link that opens the game straight into the tournament
export const inviteLink=code=>{ const u=new URL(location.href); u.search='?t='+code; u.hash=''; return u.href; };
// world top 10 of an event, and your marks for it
export const getTop=(ev,group)=>call('GET',null,'?top='+encodeURIComponent(ev)+(group?'&group='+encodeURIComponent(group):''));
// groups of friends: your groups (with members), create, add a registered player, leave, remove (who created it)
export const getGroups=async()=>(await call('POST',{action:'groups',token:tok()})).groups;
export const createGroup=async name=>(await call('POST',{action:'gcreate',name,token:tok()})).id;
export const addToGroup=(group,player)=>call('POST',{action:'gadd',group,player,token:tok()});
export const leaveGroup=group=>call('POST',{action:'gleave',group,token:tok()});
export const removeFromGroup=(group,player)=>call('POST',{action:'gremove',group,player,token:tok()});
export const sendMarks=list=>call('POST',{action:'marks',list,token:tok()});
// registered players, and one player's public profile
export const getPlayers=()=>call('GET',null,'?players=1');
export const getProfile=id=>call('GET',null,'?player='+encodeURIComponent(id));
// admin tools (the server only lets the admin player use them)
export const adminOp=(op,extra={})=>call('POST',{action:'admin',op,...extra,token:tok()});
