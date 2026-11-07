// Each event's points for a mark (as in the decathlon's tables: about 1000 for a world-class mark); no imports, so
// the server uses it too (api/t.js: who won a weekly challenge)
export const POINTS={'100':t=>1000+(10.0-t)*170,'110h':t=>1000+(13.5-t)*140,'lj':m=>1000+(m-7.8)*260,'pv':m=>1000+(m-5.5)*320,'jav':m=>1000+(m-80)*14,'tj':m=>1000+(m-17)*120,'ham':m=>1000+(m-70)*14,'hj':m=>1000+(m-2.2)*800,'sp':m=>1000+(m-13)*80,'dis':m=>1000+(m-60)*18,'crawl':t=>1000+(19-t)*60,'breast':t=>1000+(24-t)*40,'fly':t=>1000+(21-t)*60,'4x100':t=>1000+(31-t)*30,'laser':t=>1000+(42-t)*20,'cycle':t=>1000+(37-t)*40};
// an event without its points table yet (in testing) scores 0
export const ptsOf=(id,v)=>v==null||!POINTS[id]?0:Math.max(0,Math.round(POINTS[id](v)));
