/* Geometry Studio: offline IndexedDB library, optional Cloudflare D1 sync. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),CORE=()=>window.GeometryStudioProjectAPI;
const LOCAL_KEY='geometry-studio-current-project-id',SESSION_KEY='geometry-studio-cloud-token',API_KEY='geometry-studio-worker-url';
let dbPromise,activeId=localStorage.getItem(LOCAL_KEY)||null,lastFingerprint='',busy=false,cloudList=[],username='';
let previewUrls=[];
const now=()=>new Date().toISOString();
const configuredBase=()=>String(window.GeometryStudioCloudConfig?.apiBase||'').replace(/\/+$/,'');
const base=()=>configuredBase()||String(localStorage.getItem(API_KEY)||'').replace(/\/+$/,'');
const key=()=>localStorage.getItem(SESSION_KEY)||'';
const humanDate=value=>{
 const date=new Date(typeof value==='number'?value*1000:value||0);
 return Number.isFinite(date.getTime())?date.toLocaleString('uk-UA'):'';
};
function feedback(text,problem=false){if($('gspStatus')){$('gspStatus').textContent=text;$('gspStatus').dataset.error=String(problem);}}
function localDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(Error('Цей браузер не підтримує IndexedDB.'));
  const r=indexedDB.open('geometry-studio-library',1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('projects'))r.result.createObjectStore('projects',{keyPath:'id'});};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Помилка локальної бази.'));
 });
 return dbPromise;
}
async function local(method,fn){
 const db=await localDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('projects',method),store=tx.objectStore('projects'),request=fn(store);
  tx.oncomplete=()=>resolve(request?.result);
  tx.onerror=()=>reject(tx.error||Error('Помилка локального збереження.'));
  tx.onabort=()=>reject(tx.error||Error('Операцію скасовано.'));
 });
}
const list=()=>local('readonly',x=>x.getAll()),find=id=>local('readonly',x=>x.get(id));
const put=x=>local('readwrite',s=>s.put(x)),remove=id=>local('readwrite',s=>s.delete(id));
const snapshot=()=>CORE().exportProject();
function fingerprint(doc){const clone={...doc};delete clone.savedAt;return JSON.stringify(clone);}
function setActive(id,doc){
 activeId=id||null;
 if(id)localStorage.setItem(LOCAL_KEY,id);else localStorage.removeItem(LOCAL_KEY);
 lastFingerprint=fingerprint(doc||snapshot());
}
async function api(path,{method='GET',body}={}){
 if(!base())throw Error('Не вказано адресу Cloudflare Worker.');
 const headers={'Accept':'application/json'};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(key())headers.Authorization='Bearer '+key();
 let response;
 try{response=await fetch(base()+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});}
 catch(_){throw Error('Cloudflare недоступний. Локальна копія не втрачена.');}
 let result;try{result=await response.json();}catch(_){result=null;}
 if(response.status===401&&path!=='/api/auth/login'&&path!=='/api/auth/register'){
  localStorage.removeItem(SESSION_KEY);username='';
 }
 if(!response.ok)throw Error(result?.error||'Помилка HTTP '+response.status+'.');
 return result;
}
async function saveCurrent(force=false){
 if(!activeId)return null;
 const record=await find(activeId);if(!record)return null;
 const data=snapshot(),fp=fingerprint(data);
 const title=$('gspTitle')?.value.trim();
 const nextTitle=title&&record.id===activeId?title.slice(0,100):record.title;
 if(!force&&fp===lastFingerprint&&nextTitle===record.title)return record;
 record.snapshot=data;record.previewSvg=CORE().getSvg();record.title=nextTitle;record.dirty=true;record.updatedAt=now();
 await put(record);lastFingerprint=fp;return record;
}
async function saveNew(){
 const data=snapshot(),title=$('gspTitle')?.value.trim()||'Нове креслення';
 const record={id:crypto.randomUUID(),title:title.slice(0,100),snapshot:data,previewSvg:CORE().getSvg(),
  cloudId:null,revision:null,shareId:null,dirty:true,createdAt:now(),updatedAt:now()};
 await put(record);setActive(record.id,data);return record;
}
async function cloudSave(record){
 if(!base()||!key())throw Error('Для хмарного збереження потрібні Worker і вхід.');
 if(record.id!==activeId)throw Error('Спочатку відкрий проєкт у редакторі.');
 const documentData={title:record.title,snapshot:record.snapshot,svg:record.previewSvg||CORE().getSvg()};
 if(record.cloudId){
  const res=await api('/api/projects/'+record.cloudId,{method:'PUT',body:{...documentData,revision:record.revision}});
  record.revision=res.revision;
 }else{
  const res=await api('/api/projects',{method:'POST',body:documentData});
  record.cloudId=res.id;record.revision=res.revision;record.shareId=res.shareId;
 }
 record.dirty=false;record.syncedAt=now();await put(record);return record;
}
async function cloudRefresh(){
 if(!base()||!key()){cloudList=[];username='';return;}
 const [me,rows]=await Promise.all([api('/api/me'),api('/api/projects')]);
 username=me.username;cloudList=rows.projects||[];
}
async function saveAction(){
 let record=activeId?await saveCurrent(true):await saveNew();
 if(!record)record=await saveNew();
 feedback('Локальну копію збережено.');
 if(base()&&key()){
  try{await cloudSave(record);await cloudRefresh();feedback('Креслення збережено на пристрої та у Cloudflare.');}
  catch(e){feedback('Збережено локально. Синхронізація: '+e.message,true);}
 }else feedback('Збережено локально. Хмару можна підключити пізніше.');
 await draw();
}
async function openLocal(record){
 await saveCurrent();
 CORE().openProject(record.snapshot);
 setActive(record.id,record.snapshot);
 $('gspTitle').value=record.title;
 closeDialog();await draw();
}
async function openCloud(meta){
 const remote=await api('/api/projects/'+meta.id);
 await saveCurrent();
 const records=await list();let localRecord=records.find(r=>r.cloudId===remote.id);
 if(localRecord?.dirty&&!confirm('У локальній копії є незавантажені зміни. Замінити їх версією з хмари?'))return;
 if(!localRecord)localRecord={id:crypto.randomUUID(),createdAt:now()};
 Object.assign(localRecord,{title:remote.title,snapshot:remote.snapshot,previewSvg:remote.svg||'',
  cloudId:remote.id,revision:remote.revision,shareId:remote.shareId,
  updatedAt:now(),dirty:false,syncedAt:now()});
 await put(localRecord);
 CORE().openProject(localRecord.snapshot);
 setActive(localRecord.id,localRecord.snapshot);
 $('gspTitle').value=localRecord.title;
 closeDialog();await draw();
}
function publicURL(shareId){return new URL('view.html?share='+encodeURIComponent(shareId),location.href).href;}
async function share(record){
 if(!base()||!key())throw Error('Для постійного посилання підключи Cloudflare та увійди.');
 if(activeId!==record.id)throw Error('Спочатку відкрий потрібне креслення.');
 await saveCurrent(true);record=await find(record.id);
 record=await cloudSave(record);
 const result=await api('/api/projects/'+record.cloudId+'/share',{method:'POST',body:{enabled:true}});
 record.shareId=result.shareId;await put(record);
 const link=publicURL(record.shareId);
 try{await navigator.clipboard.writeText(link);feedback('Посилання для перегляду скопійовано.');}
 catch(_){prompt('Скопіюй посилання для перегляду:',link);feedback('Посилання готове.');}
 await cloudRefresh();await draw();
}
async function unshare(record){
 const response=await api('/api/projects/'+record.cloudId+'/share',{method:'POST',body:{enabled:false}});
 record.shareId=response.shareId;await put(record);
 await cloudRefresh();await draw();feedback('Публічний доступ вимкнено.');
}
async function rename(record){
 const title=prompt('Назва креслення:',record.title);
 if(title===null)return;
 if(!title.trim())throw Error('Назва не може бути порожньою.');
 record.title=title.trim().slice(0,100);record.updatedAt=now();record.dirty=true;
 await put(record);if(activeId===record.id)$('gspTitle').value=record.title;
 await draw();
}
async function duplicate(record){
 const copy={...record,id:crypto.randomUUID(),title:(record.title+' — копія').slice(0,100),
  snapshot:JSON.parse(JSON.stringify(record.snapshot)),cloudId:null,revision:null,shareId:null,
  dirty:true,createdAt:now(),updatedAt:now()};
 await put(copy);await draw();feedback('Копію створено.');
}
async function deleteLocal(record){
 if(!confirm('Видалити локальну копію «'+record.title+'»?'))return;
 await remove(record.id);if(activeId===record.id)setActive(null);
 await draw();feedback('Локальну копію видалено. Хмарна залишилася.');
}
async function deleteCloud(record){
 if(!confirm('Безповоротно видалити «'+record.title+'» з Cloudflare та вимкнути посилання?'))return;
 await api('/api/projects/'+record.id,{method:'DELETE'});
 for(const localRecord of await list())if(localRecord.cloudId===record.id){
  localRecord.cloudId=null;localRecord.revision=null;localRecord.shareId=null;localRecord.dirty=true;await put(localRecord);
 }
 await cloudRefresh();await draw();feedback('У хмарі видалено, локальну копію збережено.');
}
function element(tag,cls,text){
 const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;
 return e;
}
function button(parent,label,fn,danger=false){
 const b=element('button','gsp-action'+(danger?' gsp-danger':''),label);b.type='button';
 b.onclick=()=>run(fn);parent.append(b);
}
function recordCard(record,isCloud=false){
 const card=element('article','gsp-card'+(isCloud?' gsp-card-remote':''));
 card.append(element('strong','gsp-card-title',record.title));
 const hint=isCloud?'Хмара':(record.dirty?'Не синхронізовано':record.cloudId?'У хмарі':'Локально');
 card.append(element('span','gsp-card-info',hint+' · '+humanDate(record.updatedAt)));
 if(!isCloud&&record.previewSvg){
  const img=element('img','gsp-card-preview');img.alt='Попередній перегляд '+record.title;
  const url=URL.createObjectURL(new Blob([record.previewSvg],{type:'image/svg+xml;charset=utf-8'}));
  previewUrls.push(url);img.src=url;card.append(img);
 }
 const actions=element('div','gsp-card-actions');
 if(isCloud){
  button(actions,'Відкрити',()=>openCloud(record));
  if(record.shareId)button(actions,'Переглянути',()=>{window.open(publicURL(record.shareId),'_blank','noopener');});
  button(actions,'Видалити з хмари',()=>deleteCloud(record),true);
 }else{
  button(actions,'Відкрити',()=>openLocal(record));
  button(actions,'Назва',()=>rename(record));
  button(actions,'Копія',()=>duplicate(record));
  if(base()&&key()){
   button(actions,'Поділитися',()=>share(record));
   if(record.shareId)button(actions,'Закрити доступ',()=>unshare(record));
  }
  button(actions,'Видалити',()=>deleteLocal(record),true);
 }
 card.append(actions);return card;
}
async function draw(){
 previewUrls.forEach(url=>URL.revokeObjectURL(url));previewUrls=[];
 const records=(await list()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 const localContainer=$('gspLocalList');if(!localContainer)return;
 localContainer.replaceChildren();
 if(!records.length)localContainer.append(element('p','gsp-empty','Ще немає креслень. Натисни «Зберегти поточне».'));
 records.forEach(rec=>localContainer.append(recordCard(rec)));
 const cloudContainer=$('gspCloudList');cloudContainer.replaceChildren();
 if(base()&&key()){
  if(cloudList.length)cloudList.forEach(rec=>cloudContainer.append(recordCard(rec,true)));
  else cloudContainer.append(element('p','gsp-empty','У хмарі ще немає креслень.'));
 }else cloudContainer.append(element('p','gsp-empty','Підключи Worker і увійди для синхронізації між пристроями.'));
 $('gspAccount').textContent=username?'Увійшли як '+username:'Хмарний акаунт не підключено';
 $('gspLoginForm').hidden=!!username;$('gspLogout').hidden=!username;
 $('gspCloudUrl').value=base();
 const active=records.find(x=>x.id===activeId);
 if(active)$('gspTitle').value=active.title;
}
async function login(register=false){
 const username=$('gspUsername').value.trim(),password=$('gspPassword').value;
 if(!username||!password)throw Error('Потрібні логін та пароль.');
 const data={username,password};
 if(register)data.inviteCode=$('gspInvite').value;
 const reply=await api('/api/auth/'+(register?'register':'login'),{method:'POST',body:data});
 localStorage.setItem(SESSION_KEY,reply.token);
 $('gspPassword').value='';$('gspInvite').value='';
 await cloudRefresh();await draw();feedback('Вхід виконано. Можна зберігати креслення в хмарі.');
}
async function sync(){
 if(!base()||!key())throw Error('Спочатку підключи Worker і увійди.');
 let rec=activeId?await saveCurrent(true):await saveNew();
 await cloudSave(rec);await cloudRefresh();await draw();
 feedback('Поточне креслення синхронізовано.');
}
async function configure(){
 const raw=$('gspCloudUrl').value.trim();let origin='';
 if(raw){
  let parsed;try{parsed=new URL(raw);}catch(_){throw Error('Некоректна адреса Worker.');}
  if(parsed.protocol!=='https:'||parsed.pathname!=='/'||parsed.search||parsed.hash)
   throw Error('Вкажи HTTPS-адресу Worker без додаткових шляхів.');
  origin=parsed.origin;
 }
 if(configuredBase()&&origin!==configuredBase())throw Error('Адресу Worker вже встановлено власником сайту.');
 if(!configuredBase()){
  if(origin)localStorage.setItem(API_KEY,origin);
  else localStorage.removeItem(API_KEY);
 }
 cloudList=[];username='';await draw();
 if(origin){const result=await api('/api/health');feedback(result.ok?'Cloudflare відповідає.':'Worker не відповідає.');}
 else feedback('Локальний режим — без хмари.');
}
async function run(task){
 if(busy)return;busy=true;
 try{await task();}catch(e){feedback(e?.message||'Не вдалося виконати дію.',true);}
 finally{busy=false;}
}
function closeDialog(){$('gspBackdrop').hidden=true;document.body.classList.remove('gsp-dialog-open');}
async function openDialog(){
 $('gspBackdrop').hidden=false;document.body.classList.add('gsp-dialog-open');
 try{if(base()&&key())await cloudRefresh();await draw();}
 catch(e){feedback(e.message,true);await draw();}
}
function initPanel(){
 const fileActions=document.querySelector('.drawer-group.group-file .top-actions');
 const trigger=element('button','btn primary','Мої креслення');trigger.type='button';trigger.id='gspOpen';
 if(fileActions)fileActions.insertAdjacentElement('afterend',trigger);
 else document.body.append(trigger);
 const template=$('gspTemplate');document.body.append(template.content.cloneNode(true));
 trigger.onclick=openDialog;
 $('gspClose').onclick=closeDialog;
 $('gspBackdrop').onclick=e=>{if(e.target===$('gspBackdrop'))closeDialog();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('gspBackdrop').hidden)closeDialog();});
 $('gspSave').onclick=()=>run(saveAction);
 $('gspNew').onclick=()=>run(async()=>{
  await saveCurrent();
  if(!confirm('Створити порожній аркуш? Незбережене креслення може бути втрачено.'))return;
  CORE().newProject();setActive(null);$('gspTitle').value='Нове креслення';closeDialog();
 });
 $('gspLogin').onclick=()=>run(()=>login(false));
 $('gspRegister').onclick=()=>run(()=>login(true));
 $('gspSync').onclick=()=>run(sync);
 $('gspSetCloud').onclick=()=>run(configure);
 $('gspLogout').onclick=()=>run(async()=>{
  try{await api('/api/auth/logout',{method:'POST'});}catch(_){}
  localStorage.removeItem(SESSION_KEY);username='';cloudList=[];
  await draw();feedback('Вихід виконано. Локальні креслення залишилися.');
 });
}
async function init(){
 if(!CORE()||!$('gspTemplate'))return;
 initPanel();
 try{
  await localDB();const latest=snapshot();
  if(activeId){
   const saved=await find(activeId);
   if(saved)lastFingerprint=fingerprint(saved.snapshot);
   else setActive(null,latest);
  }else lastFingerprint=fingerprint(latest);
 }catch(e){feedback(e.message,true);}
 setInterval(async()=>{
  if(busy||!activeId)return;
  try{await saveCurrent();}catch(_){}
 },4500);
 setInterval(async()=>{
  if(busy||!activeId||!base()||!key())return;
  try{
   const rec=await find(activeId);
   if(rec?.dirty){busy=true;await saveCurrent();await cloudSave(await find(activeId));}
  }catch(e){if($('gspBackdrop')&&!$('gspBackdrop').hidden)feedback('Локально збережено. Хмарна синхронізація: '+e.message,true);}
  finally{busy=false;}
 },60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();