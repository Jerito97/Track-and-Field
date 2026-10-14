// Web Audio beeps and crowd noise
import {store} from './storage.js';

export let soundOn=store.get('odb-snd',true)!==false;
export const toggleSound=()=>{ soundOn=!soundOn; store.set('odb-snd',soundOn); return soundOn; };
export let ac=null;
export function unlockAudio(){ if(!soundOn) return; if(!ac){ try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } if(ac&&ac.state==='suspended') ac.resume().catch(()=>{}); }
export function tone(f,d,type='square',vol=.05,slide=0){ if(!ac||!soundOn) return; try{const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,ac.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(f*slide,ac.currentTime+d);g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+d);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+d);}catch(e){} }
export function noise(d,vol=.25,lp=0){ if(!ac||!soundOn) return; try{const n=Math.floor(ac.sampleRate*d),b=ac.createBuffer(1,n,ac.sampleRate),c=b.getChannelData(0);for(let i=0;i<n;i++)c[i]=(Math.random()*2-1)*Math.pow(1-i/n,lp?1:3);const s=ac.createBufferSource(),g=ac.createGain();g.gain.value=vol;s.buffer=b;let node=s;if(lp){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;s.connect(f);node=f;}node.connect(g).connect(ac.destination);s.start();}catch(e){} }
export const cheer=()=>noise(1.6,.18,1400);
