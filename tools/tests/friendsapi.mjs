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
// requests: Ana asks Dani (pending, nobody's friend yet); Dani accepts (friends both ways)
const R=await call2({action:'fadd',player:D.player.id,token:A.token}); const lists=async u=>call2({action:'friends',token:u.token});
ok(R.status==='sent'&&(await fr(A))==='Beto,Caro'&&(await lists(D)).incoming.map(f=>f.name).join()==='Ana'&&(await lists(A)).outgoing.map(f=>f.name).join()==='Dani','Ana le manda solicitud a Dani: queda pendiente (no son amigos todavía)');
ok((await call2({action:'faccept',player:A.player.id,token:D.token})).ok&&await fr(A)==='Beto,Caro,Dani'&&await fr(D)==='Ana'&&!(await lists(D)).incoming.length,'Dani acepta: amigos los dos');
ok((await call2({action:'fadd',player:A.player.id,token:A.token})).status===400,'no te podés agregar a vos');
// turned down; asking each other: friends right away
const E=await reg('Eli'); await call2({action:'fadd',player:E.player.id,token:B.token}); await call2({action:'freject',player:B.player.id,token:E.token});
ok(!(await lists(E)).incoming.length&&!(await fr(E)),'Eli rechaza la de Beto');
await call2({action:'fadd',player:C.player.id,token:E.token}); ok((await call2({action:'fadd',player:E.player.id,token:C.token})).status==='friends'||await fr(E)==='Caro','si los dos se mandan, quedan amigos');
await call2({action:'fdel',player:C.player.id,token:A.token}); ok(await fr(A)==='Beto,Dani'&&!(await fr(C)).includes('Ana'),'Ana quita a Caro (de las dos listas)');
// a one-way friend from before requests: it turns into a request to them
const F=await reg('Fede'); await q("insert into friends(player_id,friend_id) values($1,$2)",[A.player.id,F.player.id]); await q("delete from migrations where id='friends-mutual-1'");
const call3=await mk('?again2'); await call3(null,{top:'100'});
ok(!(await fr(A)).includes('Fede')&&(await call3({action:'friends',token:F.token})).incoming.map(f=>f.name).join()==='Ana','un amigo de un solo lado de antes pasa a ser una solicitud');
// boards
const now=Date.now();
for(const [u,m] of [[A,11],[B,10.5],[C,10.2],[D,12]]) await call2({action:'marks',token:u.token,list:[{ev:'100',mark:m,date:now}]});
const w=(await call2(null,{top:'100'})).top.map(r=>r.name).join(','), f=(await call2(null,{top:'100',friends:A.player.id})).top.map(r=>r.name).join(','), fy=(await call2(null,{top:'100',friends:A.player.id,span:'year'})).top.map(r=>r.name).join(',');
console.log('  mundial:',w,'| amigos de Ana:',f,'| este año:',fy);
ok(w==='Caro,Beto,Ana,Dani'&&f==='Beto,Ana,Dani'&&fy===f,'tabla de amigos: Ana y sus amigos (sin Caro), también la del año');
console.log(fails?fails+' FALLAS':'AMIGOS OK');
process.exit(0);
