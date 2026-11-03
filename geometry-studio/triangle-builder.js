/* Geometry Studio — Triangle Builder / Task 5 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const api=()=>window.GeometryStudioTriangleAPI;
const labels=['A','B','C'];
const demo={A:{x:180,y:80,z:10},B:{x:70,y:5,z:13},C:{x:55,y:95,z:65}};
let mode='step',current=0,pairs=[null,null,null],points=[null,null,null],connected=false,bases=labels;
const visible=()=>!!$('trianglePanel')?.classList.contains('open');
const format=p=>`${p.x}; ${p.y}; ${p.z} мм`;
function message(t){$('triangleError').textContent=t||'';}
function readFields(prefix){
 const out={};
 for(const k of 'xyz'){
  const input=$(prefix+k.toUpperCase());
  if(!input||input.value.trim()===''||!Number.isFinite(Number(input.value)))throw Error('Введи числові координати X, Y та Z.');
  out[k]=Number(input.value);
 }
 return out;
}
function placeFields(prefix,p){for(const k of 'xyz')$(prefix+k.toUpperCase()).value=String(p[k]);}
function setMode(next){
 mode=next==='all'?'all':'step';message('');
 for(const tab of document.querySelectorAll('[data-triangle-tab]'))tab.setAttribute('aria-selected',String(tab.dataset.triangleTab===mode));
 $('triangleStepMode').hidden=mode!=='step';$('triangleAllMode').hidden=mode!=='all';drawProgress();
}
function drawProgress(){
 const steps=$('triangleSteps');steps.replaceChildren();
 labels.forEach((l,i)=>{
  const b=document.createElement('button');b.type='button';b.className='triangle-step';
  if(pairs[i])b.classList.add('is-complete');if(current===i)b.classList.add('is-current');
  b.textContent=pairs[i]?`✓ ${bases[i]}`:bases[i];b.disabled=!pairs[i]&&i>0&&!pairs[i-1];
  b.addEventListener('click',()=>selectStep(i));steps.appendChild(b);
 });
 $('triangleCurrentTitle').textContent=`Точка ${bases[current]}`;
 $('triangleAddVertex').textContent=pairs[current]?`Оновити точку ${bases[current]}`:`Нанести точку ${bases[current]}`;
 $('triangleConnect').disabled=!pairs.every(Boolean)||connected;
 $('triangleConnect').textContent=connected?'Трикутник побудовано ✓':'З’єднати A–B–C–A';
 const list=$('trianglePointList');list.replaceChildren();
 pairs.forEach((pair,i)=>{
  if(!pair)return;
  const d=document.createElement('div');d.className='triangle-progress__item';
  const s=document.createElement('span');const strong=document.createElement('strong');
  strong.textContent=bases[i];s.append(strong,document.createTextNode('  '+format(points[i])));
  const edit=document.createElement('button');edit.textContent='Змінити';edit.type='button';
  edit.addEventListener('click',()=>selectStep(i));d.append(s,edit);list.appendChild(d);
 });
}
function selectStep(i){current=i;placeFields('triStep',points[i]||demo[labels[i]]);message('');drawProgress();}
function close(){const p=$('trianglePanel');if(!p)return;p.classList.remove('open');p.setAttribute('aria-hidden','true');}
function resetDraft(){pairs=[null,null,null];points=[null,null,null];connected=false;current=0;bases=api()?.nextLabels?.()||labels;selectStep(0);}
function open(){
 if(!api()){message('Редактор ще завантажується.');return;}
 $('trianglePanel').classList.add('open');$('trianglePanel').setAttribute('aria-hidden','false');
 for(const name of ['shapesPopover','toolsPopover','axesPopover']){
  const pop=$(name);if(pop){pop.classList.remove('open');pop.setAttribute('aria-hidden','true');}
 }
 for(const name of ['shapesFab','toolsFab','axesFab'])$(name)?.setAttribute('aria-expanded','false');
 resetDraft();setMode('step');
}
function addCurrent(){
 try{
  message('');const p=readFields('triStep');const label=bases[current];
  pairs[current]=pairs[current]?api().updateVertex(pairs[current],p):api().addVertex(label,p);
  points[current]=p;connected=false;if(current<2)current+=1;
  selectStep(current);if(pairs.every(Boolean))$('triangleConnect').focus();
 }catch(e){message(e.message||'Не вдалося нанести точку.');}
}
function connect(){
 try{message('');if(!pairs.every(Boolean))throw Error('Спочатку нанеси точки A, B та C.');
  api().connectTriangle(pairs,points);connected=true;drawProgress();close();
 }catch(e){message(e.message||'Не вдалося з’єднати точки.');}
}
function constructAll(){
 try{message('');const coords=labels.map(l=>readFields('triAll'+l));
  api().createTriangle(coords);close();resetDraft();
 }catch(e){message(e.message||'Не вдалося побудувати трикутник.');}
}
function init(){
 if(!$('trianglePanel')||!$('triangleTool'))return;
 $('triangleTool').addEventListener('click',open);
 $('triangleClose').addEventListener('click',close);
 document.querySelectorAll('[data-triangle-tab]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.triangleTab)));
 $('triangleAddVertex').addEventListener('click',addCurrent);
 $('triangleConnect').addEventListener('click',connect);
 $('triangleBuildAll').addEventListener('click',constructAll);
 $('triangleReset').addEventListener('click',resetDraft);
 for(const l of labels)placeFields('triAll'+l,demo[l]);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&visible())close();});
 resetDraft();setMode('step');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();