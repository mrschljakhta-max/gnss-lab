/* Run with Node 22+: node --test cloudflare/geometry-studio/worker.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.js';

const ORIGIN='https://mrschljakhta-max.github.io';
function environment(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(new URL('./migrations/0001_init.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('./migrations/0002_guest_projects.sql',import.meta.url),'utf8'));
 const db={
  prepare(query){
   const stmt=sql.prepare(query);
   let values=[];
   const statement={
    bind(...args){values=args;return statement;},
    first:async()=>stmt.get(...values)||null,
    all:async()=>({results:stmt.all(...values)}),
    run:async()=>({meta:{changes:stmt.run(...values).changes}})
   };
   return statement;
  }
 };
 return {DB:db,INVITE_CODE:'invite-for-testing-only-12345',
  AUTH_LIMITER:{limit:async()=>({success:true})}};
}
function client(env,authToken='',origin=ORIGIN){
 return async(path,method='GET',payload,editKey)=>{
  const headers={Origin:origin};
  if(payload!==undefined)headers['Content-Type']='application/json';
  if(authToken)headers.Authorization='Bearer '+authToken;
  if(editKey)headers['X-Edit-Key']=editKey;
  const res=await worker.fetch(new Request('https://geometry-studio-cloud.example.workers.dev'+path,{
   method,headers,body:payload===undefined?undefined:JSON.stringify(payload)
  }),env);
  let data=null;try{data=await res.json();}catch(_){}
  return {status:res.status,data,headers:res.headers};
 };
}
function draft(){
 return {title:'Завдання №5',snapshot:{entities:[
  {id:'g1',type:'point',x:10,y:20,label:'A1'},
  {id:'g2',type:'point',x:40,y:20,label:'B1'}
 ]},svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 420"></svg>'};
}
test('private projects, invite registration, read-only share, revocation and version checks',async()=>{
 const env=environment(),guest=client(env);
 assert.equal((await guest('/api/health')).status,200);
 assert.equal((await guest('/api/auth/register','POST',{
  username:'owner',password:'OwnerPassword123!',inviteCode:'wrong'
 })).status,403);
 const owner=await guest('/api/auth/register','POST',{
  username:'owner',password:'OwnerPassword123!',inviteCode:env.INVITE_CODE
 });
 assert.equal(owner.status,201);
 assert.match(owner.data.token,/^[a-f0-9]{64}$/);
 const ownerAPI=client(env,owner.data.token);
 const second=await guest('/api/auth/register','POST',{
  username:'polia',password:'PoliaPassword123!',inviteCode:env.INVITE_CODE
 });
 assert.equal(second.status,201);
 const poliaAPI=client(env,second.data.token);
 const created=await ownerAPI('/api/projects','POST',draft());
 assert.equal(created.status,201);
 const id=created.data.id;
 assert.equal((await guest('/api/projects/'+id)).status,401);
 assert.equal((await poliaAPI('/api/projects/'+id)).status,404);
 const ownerRead=await ownerAPI('/api/projects/'+id);
 assert.equal(ownerRead.status,200);
 assert.equal(ownerRead.data.snapshot.entities[0].label,'A1');
 assert.match(ownerRead.data.svg,/^<svg/);
 assert.equal((await ownerAPI('/api/projects/'+id,'PUT',{...draft(),revision:0})).status,400);
 const updated=await ownerAPI('/api/projects/'+id,'PUT',{...draft(),revision:1,title:'Оновлене'});
 assert.equal(updated.status,200);assert.equal(updated.data.revision,2);
 assert.equal((await ownerAPI('/api/projects/'+id,'PUT',{...draft(),revision:1})).status,409);
 const shared=await ownerAPI('/api/projects/'+id+'/share','POST',{enabled:true});
 assert.equal(shared.status,200);
 const view=await guest('/api/share/'+shared.data.shareId);
 assert.equal(view.status,200);assert.equal(view.data.title,'Оновлене');
 assert.equal(view.data.snapshot,undefined);
 const revoke=await ownerAPI('/api/projects/'+id+'/share','POST',{enabled:false});
 assert.equal(revoke.status,200);assert.equal(revoke.data.shareId,null);
 assert.equal((await guest('/api/share/'+shared.data.shareId)).status,404);
 assert.equal((await ownerAPI('/api/projects/'+id,'DELETE')).status,204);
 assert.equal((await ownerAPI('/api/projects')).data.projects.length,0);
 assert.equal((await ownerAPI('/api/auth/logout','POST')).status,204);
 assert.equal((await ownerAPI('/api/me')).status,401);
});
test('CORS and registration protections',async()=>{
 const env=environment(),external=client(env,'','https://not-our-site.example');
 assert.equal((await external('/api/health')).status,403);
 const guest=client(env);
 assert.equal((await guest('/api/auth/login','POST',{username:'unknown',password:'wrong'})).status,401);
 assert.equal((await guest('/api/auth/register','POST',{
  username:'a',password:'too-short',inviteCode:env.INVITE_CODE
 })).status,400);
});

test('guest saves and sharing need no registration but keep editing private',async()=>{
 const env=environment(),anonymous=client(env);
 const created=await anonymous('/api/guest/projects','POST',draft());
 assert.equal(created.status,201);
 assert.match(created.data.editKey,/^[a-f0-9]{64}$/);
 assert.equal(created.data.shareId,null);
 const id=created.data.id,key=created.data.editKey;
 assert.equal((await anonymous('/api/guest/projects/'+id)).status,403);
 assert.equal((await anonymous('/api/guest/projects/'+id,'GET',undefined,'0'.repeat(64))).status,403);
 const owned=await anonymous('/api/guest/projects/'+id,'GET',undefined,key);
 assert.equal(owned.status,200);
 assert.equal(owned.data.snapshot.entities[0].label,'A1');
 const update=await anonymous('/api/guest/projects/'+id,'PUT',{...draft(),title:'Поля',revision:1},key);
 assert.equal(update.status,200);
 assert.equal(update.data.revision,2);
 assert.equal((await anonymous('/api/guest/projects/'+id,'PUT',{...draft(),revision:1},key)).status,409);
 const shared=await anonymous('/api/guest/projects/'+id+'/share','POST',{enabled:true},key);
 assert.equal(shared.status,200);
 assert.match(shared.data.shareId,/^[a-f0-9-]{36}$/);
 const view=await anonymous('/api/share/'+shared.data.shareId);
 assert.equal(view.status,200);
 assert.equal(view.data.title,'Поля');
 assert.equal(view.data.snapshot,undefined);
 assert.equal((await anonymous('/api/guest/projects/'+id+'/share','POST',{enabled:false})).status,403);
 const revoked=await anonymous('/api/guest/projects/'+id+'/share','POST',{enabled:false},key);
 assert.equal(revoked.status,200);assert.equal(revoked.data.shareId,null);
 assert.equal((await anonymous('/api/share/'+shared.data.shareId)).status,404);
 assert.equal((await anonymous('/api/guest/projects/'+id,'DELETE',undefined,key)).status,204);
 assert.equal((await anonymous('/api/guest/projects/'+id,'GET',undefined,key)).status,403);
});
test('guest create quota and request validation',async()=>{
 const env=environment(),anonymous=client(env);
 assert.equal((await anonymous('/api/guest/projects','POST',{title:'Bad',snapshot:{entities:[]},svg:'not svg'})).status,400);
 for(let i=0;i<11;i++)assert.equal((await anonymous('/api/guest/projects','POST',draft())).status,201);
 assert.equal((await anonymous('/api/guest/projects','POST',draft())).status,429);
});
