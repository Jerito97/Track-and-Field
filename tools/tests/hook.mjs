// The tests' stand-in for the database: '@neondatabase/serverless' resolves to neon-shim.mjs (an in-memory Postgres),
// so api/t.js runs as it is, without touching the real database or the game's node_modules
export async function resolve(spec,ctx,next){
  if(spec==='@neondatabase/serverless') return {url:new URL('./neon-shim.mjs',import.meta.url).href,shortCircuit:true};
  return next(spec,ctx);
}
