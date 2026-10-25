const ROOT=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
process.env.DATABASE_URL='x';
const mk=async q=>{ const {default:h}=await import(ROOT+'/api/t.js'+q); return (body,query)=>new Promise(res=>{ const out={c:200,status(c){this.c=c;return this;},setHeader(){},json(o){res({status:this.c,...o});}}; h({method:query?'GET':'POST',query:query||{},body},out); }); };
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const call=await mk('');
const reg=n=>call({action:'register',name:n,pin:'1234',color:'#e8262d'});
const [A,B,C,D]=[await reg('Ana'),await reg('Beto'),await reg('Caro'),await reg('Dani')];
const q=(s,p)=>globalThis.__pg.query(s,p);
// an old group (Ana, Beto, Caro) from before friends
await q("insert into groups(id,name,owner_id) values('g1','Los pibes',$1)",[A.player.id]);
await q("insert into group_members(group_id,player_id) values('g1',$1),('g1',$2),('g1',$3)",[A.player.id,B.player.id,C.player.id]);
await q("delete from migrations where id='groups-to-friends-1'");
const call2=await mk('?again');
const fr=async u=>(await call2({action:'friends',token:u.token})).friends.map(f=>f.name).sort().join(',');
ok(await fr(A)==='Beto,Caro'&&await fr(B)==='Ana,Caro'&&await fr(D)==='','el grupo viejo pasó a amigos (Ana: Beto, Caro; Dani: nadie)');
// add / remove
ok((await call2({action:'fadd',player:D.player.id,token:A.token})).status===200&&await fr(A)==='Beto,Caro,Dani','Ana agrega a Dani');
ok(await fr(D)==='','agregar no necesita el sí del otro (Dani sigue sin amigos)');
ok((await call2({action:'fadd',player:A.player.id,token:A.token})).status===400,'no te podés agregar a vos');
await call2({action:'fdel',player:C.player.id,token:A.token}); ok(await fr(A)==='Beto,Dani','Ana quita a Caro');
// boards
const now=Date.now();
for(const [u,m] of [[A,11],[B,10.5],[C,10.2],[D,12]]) await call2({action:'marks',token:u.token,list:[{ev:'100',mark:m,date:now}]});
const w=(await call2(null,{top:'100'})).top.map(r=>r.name).join(','), f=(await call2(null,{top:'100',friends:A.player.id})).top.map(r=>r.name).join(','), fy=(await call2(null,{top:'100',friends:A.player.id,span:'year'})).top.map(r=>r.name).join(',');
console.log('  mundial:',w,'| amigos de Ana:',f,'| este año:',fy);
ok(w==='Caro,Beto,Ana,Dani'&&f==='Beto,Ana,Dani'&&fy===f,'tabla de amigos: Ana y sus amigos (sin Caro), también la del año');
console.log(fails?fails+' FALLAS':'AMIGOS OK');
process.exit(0);
