// Small math helpers
export const rand=(a,b)=>a+Math.random()*(b-a);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const hash=n=>{ const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };
