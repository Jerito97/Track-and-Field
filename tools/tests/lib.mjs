// Shared by the tests: the game's address (the runner starts a server for each test) and the page set-up most of
// them use: a seeded Math.random, a clock the test moves by hand (window.__step(frames), 60 per second), and one
// player ('Test', with a fake session) on the phone
export const BASE=process.env.BASE||'http://localhost:8090';
export const INIT=seed=>`(()=>{ let a=${seed}; Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 let T=1000, cbs=[], tos=[]; performance.now=()=>T; window.requestAnimationFrame=cb=>{cbs.push(cb);return cbs.length;}; window.setTimeout=(f,ms)=>{tos.push({at:T+(ms||0),f});return 1;};
 window.__step=n=>{ for(let i=0;i<n;i++){ T+=1000/60; const q=cbs; cbs=[]; q.forEach(c=>c(T)); const d=tos.filter(o=>o.at<=T); tos=tos.filter(o=>o.at>T); d.forEach(o=>o.f()); } }; try{localStorage.clear();localStorage.setItem('odb-players',JSON.stringify({list:[{id:'t',name:'Test',color:'#e8262d',token:'test',created:0,rec:{},best:{},history:[],tours:[]}],cur:'t'}));}catch(e){} })();`;
