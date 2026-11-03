/* Geometry Studio v2: minimal canvas UI, no change to geometry engine. */
(() => {
  const $ = s => document.querySelector(s);
  const app = $('#app'), bar = $('.topbar'), workspace = $('.workspace');
  const stage = $('.stage-shell'), rail = $('.toolrail'), inspector = $('#inspector');
  const canvasbar = $('.canvasbar'), steps = $('#autoStrip');
  const viewport = $('#canvasViewport'), paper = $('#paperWrap');
  if (![app,bar,workspace,stage,rail,inspector,canvasbar,steps,viewport,paper].every(Boolean)) return;
  const drawer = document.createElement('aside');
  drawer.id='studioDrawer'; drawer.className='studio-drawer';
  drawer.setAttribute('aria-label','Керування Geometry Studio');
  drawer.setAttribute('aria-hidden','true');
  const trigger = document.createElement('button');
  trigger.id='edgeTrigger';trigger.className='edge-trigger';trigger.type='button';
  trigger.setAttribute('aria-label','Відкрити меню креслення');
  trigger.setAttribute('aria-controls','studioDrawer');trigger.setAttribute('aria-expanded','false');
  trigger.textContent='›';
  const header = document.createElement('div');header.className='drawer-head';
  header.append($('.brand'));
  const closeButton=document.createElement('button');closeButton.id='drawerClose';closeButton.type='button';closeButton.className='drawer-close';closeButton.textContent='×';closeButton.setAttribute('aria-label','Закрити меню');header.append(closeButton);
  drawer.append(header);
  function group(name,cls,...parts){
    const sect=document.createElement('section');sect.className='drawer-group '+cls;
    const title=document.createElement('h2');title.className='drawer-group-heading';title.textContent=name;sect.append(title);
    parts.forEach(p=>{if(p)sect.append(p)});drawer.append(sect);return sect;
  }
  group('Режим роботи','group-modes',$('.mode-tabs'),$('.breadcrumb'));
  group('Файл','group-file',$('.top-actions'));
  group('Інструменти','group-tools',rail);
  group('Автоматична побудова','group-steps',steps);
  const status=document.createElement('div');status.className='drawer-status';status.append($('.canvas-bottom'));
  group('Полотно','group-paper',$('.canvas-actions'),status);
  group('Властивості та об’єкти','group-props',inspector);
  app.insertBefore(trigger,workspace);app.insertBefore(drawer,workspace);
  app.insertBefore(stage,workspace);workspace.remove();bar.remove();canvasbar.remove();
  let hideTimer=null,hintTimer=null,lastPointer={x:innerWidth/2,y:innerHeight/2};
  const open=()=>{clearTimeout(hideTimer);drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');trigger.setAttribute('aria-expanded','true')};
  const close=()=>{clearTimeout(hideTimer);drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');trigger.setAttribute('aria-expanded','false')};
  trigger.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open()});
  trigger.addEventListener('click',open);
  drawer.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
  drawer.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')hideTimer=setTimeout(()=>{if(!drawer.matches(':hover'))close()},140)});
  closeButton.addEventListener('click',close);
  viewport.addEventListener('pointerdown',close);
  document.addEventListener('pointerdown',e=>{if(drawer.classList.contains('open')&&!drawer.contains(e.target)&&e.target!==trigger)close()});
  document.addEventListener('pointermove',e=>{lastPointer={x:e.clientX,y:e.clientY}},{passive:true});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')close();
    if(e.key==='Tab'&&!e.shiftKey&&!drawer.classList.contains('open')&&(document.activeElement===document.body||document.activeElement===trigger)){
      e.preventDefault();open();closeButton.focus();
    }
  });
  const manualHints={select:'Натисніть на об’єкт для вибору',point:'Натисніть на аркуш, щоб додати точку',segment:'Позначте дві точки для відрізка',line:'Позначте дві точки для прямої',perp:'Оберіть пряму, а потім точку',parallel:'Оберіть пряму, а потім точку',intersect:'Виберіть дві прямі для перетину',pan:'Перетягуйте аркуш',erase:'Натисніть на об’єкт для видалення'};
  function hint(text){
    const node=$('#canvasHelp');if(!node||!text)return;
    const bounds=viewport.getBoundingClientRect();
    node.textContent=text;
    node.style.left=Math.max(22,Math.min(bounds.width-300,lastPointer.x-bounds.left+15))+'px';
    node.style.top=Math.max(16,Math.min(bounds.height-80,lastPointer.y-bounds.top+15))+'px';
    node.classList.add('visible');clearTimeout(hintTimer);hintTimer=setTimeout(()=>node.classList.remove('visible'),1800);
  }
  document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>{close();hint(manualHints[b.dataset.tool])}));
  ['modeManual','modeAuto','btnNew','btnExample','btnAdd3D'].forEach(id=>document.getElementById(id)?.addEventListener('click',close));
  // Grid is painted across the entire viewport, aligned to the SVG paper.
  function alignGrid(){
    const match=paper.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\) scale\(([-\d.]+)\)/);
    if(match){const x=Number(match[1]),y=Number(match[2]),zoom=Number(match[3]);
      viewport.style.setProperty('--minor-step',(10*zoom)+'px');viewport.style.setProperty('--major-step',(50*zoom)+'px');
      viewport.style.setProperty('--grid-offset-x',x+'px');viewport.style.setProperty('--grid-offset-y',y+'px');}
    viewport.classList.toggle('grid-on',$('#showGrid').checked);
  }
  new MutationObserver(alignGrid).observe(paper,{attributes:true,attributeFilter:['style']});
  $('#showGrid').addEventListener('change',alignGrid);
  requestAnimationFrame(()=>{$('#zoomReset').click();alignGrid()});
  // On a new visit begin with blank graph paper; projects previously saved stay intact.
  let previous=null;
  try{previous=JSON.parse(window.__geometrySaveSnapshot||'null')}catch(e){}
  const defaults={A:{x:180,y:80,z:10},B:{x:70,y:5,z:13},C:{x:55,y:95,z:65},D:{x:100,y:10,z:25}};
  const unchanged=previous?.paperMode==='example'&&previous?.mode==='auto'&&
    JSON.stringify(previous.coords3)===JSON.stringify(defaults)&&
    (previous.history||[]).every(item=>item.msg==='Завантажено варіант 15');
  if(!previous||unchanged)requestAnimationFrame(()=>{document.getElementById('btnNew').click();document.getElementById('toast')?.classList.remove('show');close()});
})();