// node --import ./register.mjs ...: the database stand-in (hook.mjs)
import {register} from 'node:module';
process.env.DATABASE_URL=process.env.DATABASE_URL||'pglite://test';
register('./hook.mjs',import.meta.url);
