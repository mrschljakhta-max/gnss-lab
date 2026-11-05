/* Geometry Studio: guest-first project library, no registration or sign-in. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),CORE=()=>window.GeometryStudioProjectAPI;
const ACTIVE_KEY='geometry-studio-current-project-id';
let dbPromise,activeId=localStorage.getItem(ACTIVE_KEY)||null,busy=false,lastFingerprint='',previews=[];
const now=()=>new Date().toISOString();
const apiBase=()=>String(window.GeometryStudioCloudConfig?.apiBase||'').replace(/\/+$/,'');
const fingerprint=doc=>{const c={...doc};delete c.savedAt;return JSON.stringify(c);};
const date=t=>{const d=new Date(t||0);return Number.isFinite(+d)?d.toLocaleString('uk-UA'):'';};
function message(t,err=false){const el=$('gspStatus');if(el){el.textContent=t;el.dataset.error=String(err);}}
function openDb(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!indexedDB)return reject(Error('Браузер не підтримує зберігання креслень.'));
  const request=indexedDB.open('geometry-studio-library',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('projects'))request.result.createObjectStore('projects',{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Недоступна локальна база.'));
 });
 return dbPromise;
}
async function db(mode,task){
 const connection=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=connection.transaction('projects',mode),store=tx.objectStore('projects');
  let request;
  try{request=task(store);}catch(e){reject(e);return;}
  tx.oncomplete=()=>resolve(request?.result);
  tx.onerror=()=>reject(tx.error||Error('Помилка локальної бібліотеки.'));
  tx.onabort=()=>reject(tx.error||Error('Збереження скасовано.'));
 });
}
const all=()=>db('readonly',s=>s.getAll());
const get=id=>db('readonly',s=>s.get(id));
const put=rec=>db('readwrite',s=>s.put(rec));
const remove=id=>db('readwrite',s=>s.delete(id));
function active(id,snap){
 activeId=id||null;
 if(id)localStorage.setItem(ACTIVE_KEY,id);else localStorage.removeItem(ACTIVE_KEY);
 lastFingerprint=fingerprint(snap||CORE().exportProject());
}
async function api(path,{method='GET',body,editKey}={}){
 if(!apiBase())throw Error('Немає адреси Cloudflare Worker.');
 const headers={'Accept':'application/json'};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(editKey)headers['X-Edit-Key']=editKey;
 let response;
 try{response=await fetch(apiBase()+path,{
  method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'
 });}
 catch(_){throw Error('Хмара зараз недоступна. Креслення залишилося на пристрої.');}
 let data;
 try{data=await response.json();}catch(_){data=null;}
 if(!response.ok)throw Error(data?.error||'Помилка хмари ('+response.status+').');
 return data;
}
async function captureActive(force=false){
 if(!activeId)return null;
 const rec=await get(activeId);if(!rec)return null;
 const doc=CORE().exportProject(),fp=fingerprint(doc);
 const title=$('gspTitle')?.value.trim().slice(0,100)||rec.title;
 if(!force&&lastFingerprint===fp&&rec.title===title)return rec;
 rec.snapshot=doc;rec.previewSvg=CORE().getSvg();
 rec.title=title;rec.updatedAt=now();rec.dirty=true;
 await put(rec);lastFingerprint=fp;
 return rec;
}
async function saveNew(){
 const doc=CORE().exportProject(),title=$('gspTitle')?.value.trim().slice(0,100)||'Моє креслення';
 const rec={id:crypto.randomUUID(),title,snapshot:doc,previewSvg:CORE().getSvg(),
  createdAt:now(),updatedAt:now(),cloudId:null,editKey:null,revision:null,shareId:null,dirty:true};
 await put(rec);active(rec.id,doc);return rec;
}
async function syncOne(rec){
 if(!apiBase())throw Error('Хмара ще не налаштована.');
 if(!rec.previewSvg){
  if(rec.id!==activeId)throw Error('Спочатку відкрий креслення, щоб підготувати його зображення.');
  rec.previewSvg=CORE().getSvg();
 }
 const doc={title:rec.title,snapshot:rec.snapshot,svg:rec.previewSvg};
 if(rec.cloudId&&rec.editKey){
  const result=await api('/api/guest/projects/'+rec.cloudId,{
   method:'PUT',editKey:rec.editKey,body:{...doc,revision:rec.revision}
  });
  rec.revision=result.revision;
 }else{
  const result=await api('/api/guest/projects',{method:'POST',body:doc});
  rec.cloudId=result.id;rec.editKey=result.editKey;rec.revision=result.revision;
  rec.shareId=result.shareId;
 }
 rec.dirty=false;rec.syncedAt=now();
 await put(rec);return rec;
}
async function saveAction(){
 let rec=activeId?await captureActive(true):await saveNew();
 if(!rec)rec=await saveNew();
 message('Креслення збережено на пристрої.');
 if(apiBase()){
  try{await syncOne(rec);message('Збережено на пристрої та в Cloudflare. Без входу!');}
  catch(e){message('Локальну копію збережено. Хмара: '+e.message,true);}
 }
 await redraw();
}
function viewUrl(id){return new URL('view.html?share='+encodeURIComponent(id),location.href).href;}
function privateUrl(rec){
 const u=new URL('./',location.href);
 u.hash='edit='+rec.cloudId+'.'+rec.editKey;
 return u.href;
}
async function clipboard(value,label){
 try{await navigator.clipboard.writeText(value);message(label);}
 catch(_){prompt('Скопіюй посилання:',value);message(label);}
}
async function share(rec){
 if(rec.id===activeId)await captureActive(true);
 rec=await get(rec.id);
 if(rec.dirty||!rec.cloudId||!rec.editKey)rec=await syncOne(rec);
 const result=await api('/api/guest/projects/'+rec.cloudId+'/share',{
  method:'POST',editKey:rec.editKey,body:{enabled:true}
 });
 rec.shareId=result.shareId;await put(rec);
 await clipboard(viewUrl(rec.shareId),'Посилання тільки для перегляду скопійовано.');
 await redraw();
}
async function closeShare(rec){
 if(!rec.cloudId||!rec.editKey)throw Error('Креслення ще не синхронізовано.');
 const res=await api('/api/guest/projects/'+rec.cloudId+'/share',{
  method:'POST',editKey:rec.editKey,body:{enabled:false}
 });
 rec.shareId=res.shareId;await put(rec);
 message('Посилання для перегляду відкликано.');await redraw();
}
async function shareEdit(rec){
 if(!rec.editKey||!rec.cloudId){rec=await syncOne(rec);}
 await clipboard(privateUrl(rec),'Приватне посилання редагування скопійовано. Не надсилай його стороннім.');
 await redraw();
}
async function openLocal(rec){
 await captureActive();
 CORE().openProject(rec.snapshot);
 active(rec.id,rec.snapshot);$('gspTitle').value=rec.title;
 close();await redraw();
}
async function importEdit(id,key){
 if(!/^[a-f0-9-]{36}$/i.test(id)||!/^[a-f0-9]{64}$/i.test(key))
  throw Error('Некоректне приватне посилання.');
 const remote=await api('/api/guest/projects/'+id,{editKey:key});
 await captureActive();
 const matches=(await all()).find(rec=>rec.cloudId===id&&rec.editKey===key);
 if(matches?.dirty&&!confirm('Локальна версія має незбережені в хмарі зміни. Замінити їх?'))return false;
 const rec=matches||{id:crypto.randomUUID(),createdAt:now()};
 Object.assign(rec,{title:remote.title,snapshot:remote.snapshot,previewSvg:remote.svg,
  cloudId:id,editKey:key,revision:remote.revision,shareId:remote.shareId,
  dirty:false,updatedAt:now(),syncedAt:now()});
 await put(rec);
 CORE().openProject(rec.snapshot);
 active(rec.id,rec.snapshot);$('gspTitle').value=rec.title;
 close();message('Креслення відновлено. Ключ редагування збережено лише в цьому браузері.');
 return true;
}
async function importPrompt(){
 const raw=prompt('Встав приватне посилання редагування (не публічне):','');
 if(!raw)return;
 let hash='';
 try{hash=new URL(raw,location.href).hash;}catch(_){hash=raw;}
 const m=hash.match(/^#?edit=([a-f0-9-]{36})\.([a-f0-9]{64})$/i);
 if(!m)throw Error('Це не приватне посилання редагування.');
 await importEdit(m[1],m[2]);await redraw();
}
async function rename(rec){
 const title=prompt('Нова назва креслення:',rec.title);
 if(title===null)return;
 if(!title.trim())throw Error('Введи назву.');
 rec.title=title.trim().slice(0,100);rec.updatedAt=now();rec.dirty=true;
 await put(rec);
 if(activeId===rec.id)$('gspTitle').value=rec.title;
 await redraw();
}
async function copy(rec){
 const clone={...rec,id:crypto.randomUUID(),title:(rec.title+' — копія').slice(0,100),
  snapshot:JSON.parse(JSON.stringify(rec.snapshot)),
  cloudId:null,editKey:null,revision:null,shareId:null,
  dirty:true,createdAt:now(),updatedAt:now()};
 await put(clone);await redraw();message('Створено незалежну копію креслення.');
}
async function deleteLocal(rec){
 if(!confirm('Видалити локальне креслення «'+rec.title+'»?'))return;
 await remove(rec.id);if(rec.id===activeId)active(null);
 message('Локальне креслення видалено. Хмарна копія лишається, якщо її було створено.');
 await redraw();
}
async function deleteCloud(rec){
 if(!rec.cloudId||!rec.editKey)throw Error('Немає хмарного проєкту.');
 if(!confirm('Назавжди видалити хмарне креслення і відкликати його публічне посилання?'))return;
 await api('/api/guest/projects/'+rec.cloudId,{method:'DELETE',editKey:rec.editKey});
 rec.cloudId=null;rec.editKey=null;rec.shareId=null;rec.revision=null;rec.dirty=true;
 await put(rec);await redraw();message('Хмарну копію видалено, локальну залишено.');
}
const el=(tag,cls,value)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;if(value!==undefined)node.textContent=value;
 return node;
};
function action(parent,label,handler,danger=false){
 const b=el('button','gsp-action'+(danger?' gsp-danger':''),label);b.type='button';
 b.onclick=()=>run(handler);parent.append(b);
}
function card(rec){
 const root=el('article','gsp-card');
 root.append(el('strong','gsp-card-title',rec.title));
 const state=rec.cloudId&&rec.editKey?(rec.dirty?'Є локальні зміни':'У хмарі'):'Лише на пристрої';
 root.append(el('span','gsp-card-info',state+' · '+date(rec.updatedAt)));
 if(rec.previewSvg){
  const img=el('img','gsp-card-preview');img.alt='Мініатюра '+rec.title;
  const u=URL.createObjectURL(new Blob([rec.previewSvg],{type:'image/svg+xml'}));
  previews.push(u);img.src=u;root.append(img);
 }
 const actions=el('div','gsp-card-actions');
 action(actions,'Відкрити',()=>openLocal(rec));
 action(actions,'Назва',()=>rename(rec));
 action(actions,'Копія',()=>copy(rec));
 if(apiBase()){
  action(actions,'Поділитися',()=>share(rec));
  action(actions,'Приватне посилання',()=>shareEdit(rec));
  if(rec.shareId)action(actions,'Закрити доступ',()=>closeShare(rec));
  if(rec.cloudId&&rec.editKey)action(actions,'Видалити з хмари',()=>deleteCloud(rec),true);
 }
 action(actions,'Видалити локально',()=>deleteLocal(rec),true);
 root.append(actions);return root;
}
async function redraw(){
 previews.forEach(u=>URL.revokeObjectURL(u));previews=[];
 const records=(await all()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 const list=$('gspLocalList');if(!list)return;
 list.replaceChildren();
 if(!records.length)list.append(el('p','gsp-empty','Креслень ще немає. Збережи перше креслення.'));
 records.forEach(x=>list.append(card(x)));
 const rec=records.find(x=>x.id===activeId);
 if(rec)$('gspTitle').value=rec.title;
 $('gspCloudUrl').value=apiBase();
}
async function run(handler){
 if(busy)return;busy=true;
 try{await handler();}catch(e){message(e?.message||'Дія не виконана.',true);}
 finally{busy=false;}
}
function close(){$('gspBackdrop').hidden=true;document.body.classList.remove('gsp-dialog-open');}
async function show(){
 $('gspBackdrop').hidden=false;document.body.classList.add('gsp-dialog-open');
 try{await redraw();}catch(e){message(e.message,true);}
}
function installPanel(){
 const actions=document.querySelector('.drawer-group.group-file .top-actions');
 const btn=el('button','btn primary','Мої креслення');
 btn.id='gspOpen';btn.type='button';
 if(actions)actions.insertAdjacentElement('afterend',btn);else document.body.append(btn);
 document.body.append($('gspTemplate').content.cloneNode(true));
 btn.onclick=show;
 $('gspClose').onclick=close;
 $('gspBackdrop').onclick=e=>{if(e.target===$('gspBackdrop'))close();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('gspBackdrop').hidden)close();});
 $('gspSave').onclick=()=>run(saveAction);
 $('gspSync').onclick=()=>run(async()=>{
  let rec=activeId?await captureActive(true):await saveNew();if(!rec)rec=await saveNew();
  await syncOne(rec);message('Збережено в хмарі без реєстрації.');await redraw();
 });
 $('gspImportPrivate').onclick=()=>run(importPrompt);
 $('gspNew').onclick=()=>run(async()=>{
  await captureActive();
  if(!confirm('Почати нове креслення? Поточне збережене у бібліотеці, якщо ти натискав «Зберегти».'))return;
  CORE().newProject();active(null);$('gspTitle').value='Нове креслення';close();
 });
 $('gspSetCloud').onclick=()=>run(async()=>{
  const res=await api('/api/health');
  message(res.ok?'Cloudflare відповідає. Реєстрація не потрібна.':'Cloudflare недоступний.',!res.ok);
 });
}
async function init(){
 if(!CORE()||!$('gspTemplate'))return;
 installPanel();
 try{
  await openDb();
  const doc=CORE().exportProject();
  if(activeId){
   const existing=await get(activeId);
   if(existing)lastFingerprint=fingerprint(existing.snapshot);
   else active(null,doc);
  }else lastFingerprint=fingerprint(doc);
  const fragment=location.hash.match(/^#edit=([a-f0-9-]{36})\.([a-f0-9]{64})$/i);
  if(fragment){
   try{await importEdit(fragment[1],fragment[2]);message('Приватне креслення відкрито без входу.');}
   catch(e){message('Помилка приватного посилання: '+e.message,true);}
   history.replaceState(history.state,'',location.pathname+location.search);
  }
 }catch(e){message(e.message,true);}
 setInterval(async()=>{
  if(busy||!activeId)return;
  try{await captureActive();}catch(_){}
 },4500);
 setInterval(async()=>{
  if(busy||!activeId||!apiBase())return;
  const rec=await get(activeId).catch(()=>null);
  if(!rec?.dirty)return;
  busy=true;
  try{
   await captureActive();
   await syncOne(await get(activeId));
  }catch(e){if(!$('gspBackdrop').hidden)message('Локальна копія збережена. Хмара: '+e.message,true);}
  finally{busy=false;}
 },60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();