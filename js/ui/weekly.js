// The weekly challenge: a tournament everyone can play, five events the server draws every Monday (none of last
// week's), one go at each, points as in any tournament; it ends on Sunday at midnight. Played and shown as a
// tournament (ui/online.js); the main menu shows it in its half of the challenges' bar, next to the daily one.
import {getWeek} from '../online.js';
import {player} from '../storage.js';

let data=null, at=0, pid=null;
export const isWeek=code=>/^S\d{6}$/.test(String(code||''));
export const cachedWeek=()=>pid===player()?.id?data:null;
export async function loadWeek(force){
  const p=player(); if(!p) return null;
  if(!force&&data&&pid===p.id&&Date.now()-at<60000) return data;
  const d=await getWeek(); data=d; pid=p.id; at=Date.now(); return d;
}
export const forgetWeek=()=>{ data=null; };
// how long it has left: days and hours, hours and minutes on its last day
const left=t=>{ const m=Math.max(0,Math.floor((new Date(t)-Date.now())/60000)), d=Math.floor(m/1440), h=Math.floor(m/60)%24;
  return d?`${d}d ${h}h`:`${h}h ${String(m%60).padStart(2,'0')}m`; };
// the menu's half bar: how many of the five you played, the time left, Jugar
export function weekBar(){
  const d=cachedWeek(); if(!d||!d.tournament) return '';
  const n=d.tournament.events.length, mine=d.results.filter(r=>r.player_id===player().id).length;
  return `<span class="m-dk">🏆 Desafío semanal</span><b>Semanal</b><span class="m-dt" title="Termina en">⏱ ${left(d.tournament.ends_at)}</span>`
    +`<span class="m-dg${mine>=n?' done':''}">${mine>=n?'¡Completo!':mine?`${mine}/${n} ›`:'Jugar ›'}</span>`;
}
// open it (in the tournament's screen; you're in it once you open it)
export async function showWeek(){
  const {loading,showTournament}=await import('./online.js'); loading('Desafío semanal');
  try{ const d=await loadWeek(true); showTournament(d.code); }catch(e){ const {showOnline}=await import('./online.js'); showOnline(e.message); }
}
export function refreshWeekBar(){
  loadWeek().then(()=>{ const el=document.querySelector('.m-week'); if(!el) return; const h=weekBar(); el.innerHTML=h; el.hidden=!h; },()=>{});
}
