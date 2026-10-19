// Entry point
import {loadAssets} from './assets.js';
import {OV,resize} from './canvas.js';
import {update} from './game/core.js';
import {holdEnd,holdStart,initInput,onTap} from './input.js';
import {POSE,runPose} from './poses.js';
import {frame} from './render/frame.js';
import {drawRig} from './rig.js';
import {buildAthletes,G,ME,S,screen} from './state.js';
import {clearInvite,inviteFromUrl,onJoin} from './ui/online.js';
import {initScreens,paintOv,showMenu} from './ui/screens.js';
import {player} from './storage.js';

addEventListener('resize',resize); resize();
buildAthletes();
initInput();
initScreens();
await loadAssets();
// invite link (?t=CODE): straight into the tournament (a new player is created first, then joins)
const inv=inviteFromUrl();
if(inv&&player()){ clearInvite(); onJoin(inv); } else showMenu();
// splash: the logo stays at least a moment (tap to skip), then fades out; removed when it's done
const splash=document.getElementById('splash');
if(splash){ const hide=()=>{ splash.classList.add('out'); setTimeout(()=>splash.remove(),500); };
  if(navigator.webdriver) splash.remove(); else { splash.addEventListener('pointerdown',hide); setTimeout(hide,Math.max(0,1400-performance.now())); } }
let lastT=performance.now();
function loop(now){ const dt=Math.min(.05,(now-lastT)/1000); lastT=now; if(screen==='play'&&S) update(dt); frame(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(!OV.hidden) paintOv(); });
// debug hooks
window.__odb={get S(){return S;},onTap,G,holdStart,holdEnd,rigTest:(cv2)=>{ const c=cv2.getContext('2d'); const poses=[POSE.stand,POSE.crouch,POSE.set,runPose(0,1),runPose(1.6,1),runPose(3.1,1),runPose(4.7,1),POSE.hurdle,POSE.dip,POSE.ljAir,POSE.javBack,POSE.cheer]; poses.forEach((J,i)=>{ drawRig(c,60,70+i*120,230,0,J,ME(),0); }); }};
