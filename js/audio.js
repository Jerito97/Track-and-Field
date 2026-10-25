// Web Audio beeps and crowd noise; the menus' music
import {store} from './storage.js';

export let soundOn=store.get('odb-snd',true)!==false;
export const toggleSound=()=>{ soundOn=!soundOn; store.set('odb-snd',soundOn); if(!soundOn) musicOff(); return soundOn; };
export let ac=null;
export function unlockAudio(){ if(!soundOn) return; if(!ac){ try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } if(ac&&ac.state==='suspended') ac.resume().catch(()=>{}); }
export function tone(f,d,type='square',vol=.05,slide=0){ if(!ac||!soundOn) return; try{const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,ac.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(f*slide,ac.currentTime+d);g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+d);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+d);}catch(e){} }
export function noise(d,vol=.25,lp=0){ if(!ac||!soundOn) return; try{const n=Math.floor(ac.sampleRate*d),b=ac.createBuffer(1,n,ac.sampleRate),c=b.getChannelData(0);for(let i=0;i<n;i++)c[i]=(Math.random()*2-1)*Math.pow(1-i/n,lp?1:3);const s=ac.createBufferSource(),g=ac.createGain();g.gain.value=vol;s.buffer=b;let node=s;if(lp){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;s.connect(f);node=f;}node.connect(g).connect(ac.destination);s.start();}catch(e){} }
export const cheer=()=>noise(1.6,.18,1400);

// The menus' music: a song in a loop, low, only while you're on the menus (not playing an event, not with the game in
// the background), and not with the sound off. As "ambient" audio: on an iPhone the silent switch mutes it (and it
// doesn't stop music from other apps). Browsers only let it start after a first tap: it starts then.
const MUSIC_VOL=.22, FADE=.8;
let music=null, musicWant=false, tapped=false, playing=false, musicErr=null;  // playing: a play() under way
try{ if(navigator.audioSession) navigator.audioSession.type='ambient'; }catch(e){}
function musicEl(){ if(!music){ music=new window.Audio('assets/audio/menu.mp3'); music.loop=true; music.preload='auto'; music.volume=0; } return music; }
// once a frame: want it (on the menus) or not; the volume goes there smoothly, and it pauses when it's silent
export function musicStep(want,dt){
  musicWant=want&&soundOn&&tapped&&document.visibilityState==='visible';
  if(!musicWant&&!music) return;
  const m=musicEl(), to=musicWant?MUSIC_VOL:0, v=m.volume+Math.sign(to-m.volume)*Math.min(Math.abs(to-m.volume),MUSIC_VOL*dt/FADE);
  m.volume=Math.max(0,Math.min(1,v));
  if(musicWant&&m.paused&&!playing){ playing=true; m.play().then(()=>{ playing=false; },e=>{ playing=false; musicErr=String(e); }); }
  else if(!musicWant&&!m.paused&&m.volume<=.001) m.pause();
}
const firstTap=()=>{ tapped=true; };
addEventListener('pointerdown',firstTap,{capture:true}); addEventListener('keydown',firstTap,{capture:true});
// how it's doing (for the tests)
export const musicState=()=>music?{paused:music.paused,vol:+music.volume.toFixed(3),err:musicErr}:null;
// the sound off: right away
export function musicOff(){ if(music){ music.volume=0; music.pause(); } }
