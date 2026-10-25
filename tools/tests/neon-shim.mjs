// neon() as the game uses it (sql`...` tagged queries), on PGlite: a Postgres in memory, empty each time the process
// starts. globalThis.__pg is the database, for tests that set things up with plain SQL
import {PGlite} from '@electric-sql/pglite';
export function neon(){ const db=globalThis.__pg||(globalThis.__pg=new PGlite());
  return async (strings,...vals)=>{ let q=strings[0]; vals.forEach((v,i)=>{ q+='$'+(i+1)+strings[i+1]; }); return (await db.query(q,vals)).rows; }; }
