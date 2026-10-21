// Entry point
import {loadAssets} from './assets.js';
import {OV,resize} from './canvas.js';
import {update} from './game/core.js';
import {holdEnd,holdStart,initInput,onTap} from './input.js';
import {POSE,runPose} from './poses.js';
import {frame} from './render/frame.js';
import {drawRig} from './rig.js';
import {buildAthletes,G,ME,S,screen} from './state.js';
import {player} from './storage.js';
import {syncMarks} from './ui/board.js';
import {clearInvite,flush,inviteFromUrl,onJoin} from './ui/online.js';
import {initScreens,paintOv,showMenu,showPause} from './ui/screens.js';

addEventListener('resize',resize); resize();
buildAthletes();
initInput();
initScreens();
await loadAssets();
// invite link (?t=CODE): straight into the tournament (a new player is created first, then joins)
const inv=inviteFromUrl();
// (without a session the menu asks to enter first; the invite waits in the address and joins right after)
if(inv&&player()?.token){ clearInvite(); onJoin(inv); } else showMenu();
flush();  // tournament results waiting from last time
// splash: the logo stays at least a moment (tap to skip), then fades out; removed when it's done
const splash=document.getElementById('splash');
if(splash){ const hide=()=>{ splash.classList.add('out'); setTimeout(()=>splash.remove(),500); };
  if(navigator.webdriver) splash.remove(); else { splash.addEventListener('pointerdown',hide); setTimeout(hide,Math.max(0,1400-performance.now())); } }
// offline play: a service worker keeps a copy of the game (sw.js); it's told what this page already loaded
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  navigator.serviceWorker.register(new URL('../sw.js',import.meta.url)).then(()=>navigator.serviceWorker.ready).then(reg=>{
    const urls=performance.getEntriesByType('resource').map(r=>r.name).filter(u=>u.startsWith(location.origin)&&!u.includes('/api/')||/fonts\.(googleapis|gstatic)/.test(u));
    reg.active?.postMessage({cache:[location.href.split('?')[0],...urls]}); }).catch(()=>{});
}
// back online: records made without connection go up to the world top 10, waiting tournament results are sent
addEventListener('online',()=>{ syncMarks(); flush(); });
// at the start: records wiped out on the server meanwhile are cleared here, and what's waiting goes up
syncMarks();
// leaving the app (or locking the phone) in the middle of an event pauses it
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'&&screen==='play'&&S&&S.ev&&!S.replay&&S.phase!=='lap') showPause(); });
let lastT=performance.now();
function loop(now){ const dt=Math.min(.05,(now-lastT)/1000); lastT=now; if(screen==='play'&&S) update(dt); frame(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(!OV.hidden) paintOv(); });
// debug hooks
window.__odb={get S(){return S;},onTap,G,holdStart,holdEnd,rigTest:(cv2)=>{ const c=cv2.getContext('2d'); const poses=[POSE.stand,POSE.crouch,POSE.set,runPose(0,1),runPose(1.6,1),runPose(3.1,1),runPose(4.7,1),POSE.hurdle,POSE.dip,POSE.ljAir,POSE.javBack,POSE.cheer]; poses.forEach((J,i)=>{ drawRig(c,60,70+i*120,230,0,J,ME(),0); }); }};
