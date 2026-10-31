
/* Hover lesson drawer + mobile tap drawer. */
(function(){
'use strict';
const sidebar=document.getElementById('lessonSidebar'),toggle=document.getElementById('mobileSidebarTrigger'),scrim=document.getElementById('sidebarScrim'),nav=document.getElementById('sidebarNav');
if(!sidebar||!toggle||!scrim||!nav)return;
const mobile=()=>window.matchMedia('(max-width:650px)').matches;
function close(){sidebar.classList.remove('is-open');scrim.classList.remove('is-visible');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Відкрити уроки')}
function open(){sidebar.classList.add('is-open');scrim.classList.add('is-visible');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Закрити уроки')}
toggle.addEventListener('click',()=>sidebar.classList.contains('is-open')?close():open());
scrim.addEventListener('click',close);
nav.addEventListener('click',e=>{if(mobile()&&e.target.closest('[data-topic]'))close()});
window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
window.addEventListener('resize',()=>{if(!mobile())close()});
})();
