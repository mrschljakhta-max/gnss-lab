/* Geometry Studio: enter an exact spatial point or position it with the mouse. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const api=()=>window.GeometryStudioPointAPI;
const SUB='₀₁₂₃₄₅₆₇₈₉';
let tab='coords';
const formatted=s=>String(s).replace(/([0-9]+)$/,n=>[...n].map(c=>SUB[Number(c)]).join(''));
const isOpen=()=>$('pointPanel')?.classList.contains('open')||false;
function error(message){const node=$('pointError');if(node)node.textContent=message||'';}
function close(){
 $('pointPanel')?.classList.remove('open');
 $('pointPanel')?.setAttribute('aria-hidden','true');
 error('');
}
function switchTab(mode){
 tab=mode==='mouse'?'mouse':'coords';
 for(const item of document.querySelectorAll('[data-point-tab]')){
  item.setAttribute('aria-selected',String(item.dataset.pointTab===tab));
 }
 $('pointCoordsMode').hidden=tab!=='coords';
 $('pointMouseMode').hidden=tab!=='mouse';
 error('');
}
function updatePreview(){
 const mode=$('pointProjection').value;
 $('pointYField').hidden=mode==='pi2';
 $('pointZField').hidden=mode==='pi1';
 const name=$('pointName').value.trim()||'P';
 const x=$('pointX').value.trim()||'—',y=$('pointY').value.trim()||'—',z=$('pointZ').value.trim()||'—';
 $('pointResult1').hidden=mode==='pi2';
 $('pointResult2').hidden=mode==='pi1';
 $('pointResult1').textContent=formatted(name+'1')+'   (X='+x+'; Y='+y+')';
 $('pointResult2').textContent=formatted(name+'2')+'   (X='+x+'; Z='+z+')';
}
function open(){
 if(!api()){return;}
 api().prepareCoordinate();
 for(const name of ['shapesPopover','toolsPopover','axesPopover','projectionPopover','trianglePanel']){
  $(name)?.classList.remove('open');$(name)?.setAttribute('aria-hidden','true');
 }
 for(const name of ['shapesFab','toolsFab','axesFab','projectionFab']){
  $(name)?.setAttribute('aria-expanded','false');
 }
 $('pointName').value=api().suggestName();
 $('pointProjection').value='both';
 $('pointX').value='100';$('pointY').value='10';$('pointZ').value='25';
 switchTab('coords');updatePreview();
 $('pointPanel').classList.add('open');
 $('pointPanel').setAttribute('aria-hidden','false');
 requestAnimationFrame(()=>$('pointName')?.focus());
}
function createPoint(){
 try{
  error('');
  const mode=$('pointProjection').value;
  const number=id=>{
   const s=$(id).value.trim();
   if(s==='')throw Error('Заповни координати для вибраної проєкції.');
   const n=Number(s.replace(',','.'));
   if(!Number.isFinite(n))throw Error('Координати мають бути числами.');
   return n;
  };
  const values={
   name:$('pointName').value.trim(),view:mode,x:number('pointX'),
   y:mode!=='pi2'?number('pointY'):0,
   z:mode!=='pi1'?number('pointZ'):0
  };
  api().create(values);
  close();
 }catch(e){error(e?.message||'Не вдалося нанести точку.');}
}
function useMouse(){
 api()?.activateManual();
 close();
}
function init(){
 const choice=document.querySelector('#shapesPopover [data-tool="point"]');
 if(!choice||!$('pointPanel'))return;
 choice.addEventListener('click',open);
 $('pointClose').addEventListener('click',close);
 $('pointApply').addEventListener('click',createPoint);
 $('pointUseMouse').addEventListener('click',useMouse);
 for(const btn of document.querySelectorAll('[data-point-tab]')){
  btn.addEventListener('click',()=>switchTab(btn.dataset.pointTab));
 }
 for(const key of ['pointName','pointX','pointY','pointZ','pointProjection']){
  $(key).addEventListener(key==='pointProjection'?'change':'input',updatePreview);
 }
 $('pointCoordsForm').addEventListener('submit',e=>{e.preventDefault();createPoint();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen())close();});
 updatePreview();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();