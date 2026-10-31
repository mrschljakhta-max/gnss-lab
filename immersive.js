/* GNSS LAB / Space-first navigation without replacing the drawing engine. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const modeAnchor=$('modeTabsAnchor');
const modeTabs=$('expModes');
const workspace=$('engWorkspace');
const tools=$('engTools');
const confirm=$('engConfirm');
if(!modeAnchor||!modeTabs||!workspace||!tools||!confirm)return;
const engineDock=workspace.querySelector('.eng-dock');
const engineRight=workspace.querySelector('.eng-right');
if(!engineDock||!engineRight)return;
const peek=document.createElement('button');
peek.type='button';
peek.className='mode-peek';
peek.id='modePeek';
peek.setAttribute('aria-label','Обрати режим');
peek.setAttribute('aria-controls','expModes');
peek.setAttribute('aria-expanded','false');
peek.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M4 6h7v7H4zM13 6h7v7h-7zM4 15h7v5H4zM13 15h7v5h-7z"/></svg><span id="modeCurrent">Демонстрація</span><span class="mode-chevron" aria-hidden="true">▾</span>';
modeAnchor.prepend(peek);
const current=$('modeCurrent');
const labels={demo:'Демонстрація',explore:'Пісочниця',quest:'Тести'};
function syncMode(){
 const m=document.body.dataset.expMode||'demo';
 const label=labels[m]||'Режим';
 if(current.textContent!==label)current.textContent=label;
}
function setModeOpen(open){
 modeAnchor.classList.toggle('mode-open',open);
 peek.setAttribute('aria-expanded',String(open));
}
peek.addEventListener('click',()=>setModeOpen(!modeAnchor.classList.contains('mode-open')));
peek.addEventListener('pointerenter',syncMode);
modeAnchor.addEventListener('mouseleave',()=>setModeOpen(false));
modeTabs.addEventListener('click',e=>{
 if(e.target.closest('button[data-mode]')){
  setModeOpen(false);
  requestAnimationFrame(syncMode);
 }
});
const modeObserver=new MutationObserver(syncMode);
modeObserver.observe(document.body,{attributes:true,attributeFilter:['data-exp-mode']});
syncMode();
engineDock.id='engDock';
const floats=document.createElement('div');
floats.id='engFloats';
floats.className='eng-floats';
floats.setAttribute('aria-label','Швидке керування кресленням');
floats.innerHTML=
'<button type="button" id="engFloatConfirm" class="eng-float-btn eng-float-confirm" title="Підтвердити побудову" aria-label="Підтвердити побудову"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg></button>'+
'<button type="button" id="engFloatUndo" class="eng-float-btn" title="Скасувати останню дію" aria-label="Скасувати останню дію"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7 4 11l4 4M4 11h10a6 6 0 0 1 0 12"/></svg></button>'+
'<button type="button" id="engFloatTools" class="eng-float-btn eng-float-tools" title="Інструменти" aria-label="Показати інструменти" aria-controls="engDock" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M6 12h12M9 18h6"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="18" r="2" fill="currentColor"/></svg></button>';
document.body.append(floats);
const toolButton=$('engFloatTools');
const undoButton=$('engFloatUndo');
const confirmButton=$('engFloatConfirm');
function setToolsOpen(open){
 document.body.classList.toggle('tools-open',open);
 toolButton.classList.toggle('is-active',open);
 toolButton.setAttribute('aria-expanded',String(open));
 toolButton.setAttribute('aria-label',open?'Сховати інструменти':'Показати інструменти');
 engineDock.inert=!open;
}
setToolsOpen(false);
toolButton.addEventListener('click',()=>setToolsOpen(!document.body.classList.contains('tools-open')));
undoButton.addEventListener('click',()=>engineRight.querySelector('[data-cmd="undo"]')?.click());
confirmButton.addEventListener('click',()=>{if(!confirm.disabled)confirm.click()});
function syncConfirm(){
 const show=!confirm.disabled&&document.body.classList.contains('engineering-live');
 confirmButton.classList.toggle('is-visible',show);
 confirmButton.disabled=!show;
}
const confirmObserver=new MutationObserver(syncConfirm);
confirmObserver.observe(confirm,{attributes:true,attributeFilter:['disabled']});
syncConfirm();
tools.addEventListener('click',e=>{
 if(e.target.closest('button[data-tool]'))setToolsOpen(false);
});
document.addEventListener('pointerdown',e=>{
 if(!modeAnchor.contains(e.target))setModeOpen(false);
 if(document.body.classList.contains('tools-open')&&!engineDock.contains(e.target)&&!toolButton.contains(e.target)){
  setToolsOpen(false);
 }
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){setModeOpen(false);setToolsOpen(false)}
 if(e.key.toLowerCase()==='t'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.repeat&&document.body.classList.contains('engineering-live')&&e.target.tagName!=='INPUT'){
  setToolsOpen(!document.body.classList.contains('tools-open'));
 }
});
document.querySelector('#sidebarNav')?.addEventListener('click',()=>{setToolsOpen(false);setModeOpen(false)});
window.addEventListener('hashchange',()=>{setToolsOpen(false);setModeOpen(false)});
})();
