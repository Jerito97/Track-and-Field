// Playwright: the project's own if it's installed here, else the one this machine has (cloud sessions)
let m; try{ m=await import('playwright'); }catch(e){ m=await import('/opt/node-tools/node_modules/playwright/index.mjs'); }
export const chromium=m.chromium;
