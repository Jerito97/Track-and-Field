// Small math helpers
export const rand=(a,b)=>a+Math.random()*(b-a);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const hash=n=>{ const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };
// a time in seconds as it's read: 9.58, 59.99, then 1:05.23 from a minute on
export const secs=v=>{ const c=Math.round(v*100)/100; return c<60?c.toFixed(2):`${Math.floor(c/60)}:${(c%60).toFixed(2).padStart(5,'0')}`; };
