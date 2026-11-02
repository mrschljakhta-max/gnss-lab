/* GNSS LAB / Lesson 03 — Oscillations, waves and frequency */
(()=>{
'use strict';
const board=document.getElementById('engBoard');if(!board)return;
const NS='http://www.w3.org/2000/svg',TAU=2*Math.PI,KEY='gnss-lab-m03-v1';
const names=['Створи коливання','Народження хвилі','Керуй хвилею','Виміряй невидиме','Знайди резонанс','Від хвилі до сигналу'];
const desc=['Змінюй частоту генератора та спостерігай за циклами.','Торкнися води й увімкни джерело хвиль.','Зміни частоту й амплітуду окремо.','Встанови два маркери на сусідніх вершинах сигналу.','Налаштуй другий камертон до резонансу.','Налаштуй приймач на частоту передавача.'];
const qa=['Створи хвилю 3 Гц','Порівняй амплітуди','Виміряй частоту','Налаштуй приймач'];
const values=[20,20,30,30],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fmt=(v,n=1)=>Number(v).toLocaleString('uk-UA',{minimumFractionDigits:n,maximumFractionDigits:n});
let save;try{save=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
if(!save||save.version!==1)save={version:1,stage:0,done:[],q:0,marks:[null,null,null,null],attempt:0};
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(save))}catch{}};
const root=document.createElement('section');root.id='gnssMission03';root.hidden=true;root.innerHTML=
 '<header class="m03-header"><h2 id="m03Title"></h2><p id="m03Subtitle"></p></header>'+
 '<div class="m03-stage"><svg id="m03Svg" viewBox="0 0 1200 660" aria-label="Інтерактивна фізична модель"></svg></div>'+
 '<aside class="m03-panel" id="m03Panel"></aside><nav id="m03Dock" class="m03-dock" hidden></nav>'+
 '<button id="m03Toggle" data-act="dock" class="m03-toggle" aria-label="Відкрити інструменти" hidden>☷</button>'+
 '<footer class="m03-footer"><button data-act="restart" title="На початок уроку">↻</button><span id="m03Progress"></span><button id="m03Next" data-act="next">Далі →</button></footer>';
board.append(root);
const $=id=>root.querySelector('#'+id),svg=$('m03Svg'),panel=$('m03Panel'),dock=$('m03Dock'),next=$('m03Next');
let mode='demo',shown=false,raf=0,last=0,dockOpen=true,tool=0,phase=0,started=false,cycles=0,pressed=false,qaChoice=null;
let freq=2,amp=.55,frequency2=4,receiver=3,tx=5,markers=[.2,.4],source=false,waterRings=[],time=0,reading=null;
const active=()=>typeof window.GNSSLabActiveIndex==='function'?window.GNSSLabActiveIndex()===2:location.hash==='#lab-03';
function sync(){const want=active()&&document.body.classList.contains('engineering-live');if(!want){if(shown){shown=false;root.hidden=true;document.body.classList.remove('gnss-lesson03-active');cancelAnimationFrame(raf);raf=0}return}
 const m=document.body.dataset.expMode||'demo';if(!shown){shown=true;root.hidden=false;document.body.classList.add('gnss-lesson03-active');mode=m;reset(false);render();tick(performance.now())}else if(m!==mode){mode=m;reset(false);render()}}
function reset(resetSettings=true){started=false;cycles=0;source=false;waterRings=[];time=0;reading=null;qaChoice=null;phase=0;if(resetSettings){freq=2;amp=.55;frequency2=4;receiver=3;tx=5;markers=[.2,.4]}dockOpen=true}
const stage=()=>mode==='demo'?save.stage:mode==='quest'?save.q:tool;
const btn=(id,label,disabled=false)=>'<button type="button" data-act="'+id+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
const slider=(key,label,val,min,max,step,unit='')=>'<label>'+label+' <output>'+fmt(val,step<1?1:0)+unit+'</output><input data-key="'+key+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"></label>';
const pass=()=>save.marks.reduce((a,b)=>a+(b||0),0)>=80;
function grade(points){if(mode!=='quest'||save.q>=4)return;save.marks[save.q]=clamp(points,0,values[save.q]);save.q++;persist();reset();render();
 if(save.q===4&&pass())document.dispatchEvent(new CustomEvent('gnss:mission-three-complete',{detail:{mission:3,completed:true,score:save.marks.reduce((a,b)=>a+(b||0),0)}}))}
function panelContent(){const n=stage();
 if(mode==='quest'){
  if(n===4)return '<h3>Практичний залік</h3><div class="m03-grade">'+save.marks.reduce((a,b)=>a+(b||0),0)+' / 100</div><strong>'+(pass()?'Залік складено':'Потрібно 80 балів')+'</strong>'+qa.map((v,i)=>'<p>'+v+' · '+save.marks[i]+'/'+values[i]+'</p>').join('')+btn('retake','Повторити залік');
  if(n===0)return '<h3>Генератор</h3>'+slider('freq','Частота',freq,1,8,1,' Гц')+btn('check','Перевірити частоту');
  if(n===1)return '<h3>Амплітуда</h3><p>Обери хвилю з більшою амплітудою.</p>'+btn('chooseA','Хвиля A')+btn('chooseB','Хвиля B');
  if(n===2)return '<h3>Осцилограф</h3><p>Період сигналу: '+fmt(1/freq,2)+' с. Введи частоту в Гц.</p><input id="m03Answer" inputmode="decimal" placeholder="Частота, Гц" aria-label="Частота в герцах">'+btn('check','Перевірити');
  return '<h3>Радіоприймач</h3><p>Передавач працює на '+fmt(tx,1)+' МГц.</p>'+slider('receiver','Частота приймача',receiver,1,10,.1,' МГц')+btn('check','Перевірити');
 }
 if(n===0)return '<h3>Генератор коливань</h3>'+slider('freq','Частота',freq,1,10,.5,' Гц')+btn('toggle',started?'Зупинити':'Запустити')+'<p>'+fmt(freq,1)+' циклів за секунду</p>';
 if(n===1)return '<h3>Хвильова ванна</h3>'+btn('drop','Створити хвилю')+btn('toggle',source?'Зупинити вібратор':'Увімкнути вібратор')+slider('freq','Частота',freq,1,8,.5,' Гц');
 if(n===2)return '<h3>Хвиля на мотузці</h3>'+slider('freq','Частота',freq,1,10,.5,' Гц')+slider('amp','Амплітуда',amp,.1,1,.1,'')+btn('toggle',started?'Зупинити':'Запустити');
 if(n===3)return '<h3>Осцилограф</h3>'+slider('freq','Частота',freq,1,10,.5,' Гц')+'<p>Перетягни маркери на два сусідні максимуми.</p><p>Δt: '+fmt(Math.abs(markers[1]-markers[0]),2)+' с</p>'+btn('measure','Виміряти');
 if(n===4)return '<h3>Два камертони</h3><p>Перший: '+fmt(freq,1)+' Гц</p>'+slider('f2','Другий камертон',frequency2,1,10,.1,' Гц')+btn('toggle',started?'Зупинити':'Вдарити камертон')+'<p>Відгук: '+fmt(100/(1+Math.pow(frequency2-freq,2)*9),0)+' %</p>';
 return '<h3>Передавач і приймач</h3>'+slider('tx','Передавач',tx,1,10,.1,' МГц')+slider('receiver','Приймач',receiver,1,10,.1,' МГц')+'<p>'+(Math.abs(tx-receiver)<.15?'Сигнал прийнято':'Налаштуй приймач на сигнал')+'</p>';
}
function render(){if(!shown)return;
 const n=stage(),end=mode==='quest'&&n>=4;
 $('m03Title').textContent=mode==='explore'?'Лабораторія хвиль':end?'Результат іспиту':mode==='quest'?qa[n]:names[n];
 $('m03Subtitle').textContent=mode==='explore'?'Обери інструмент і експериментуй.':end?'':mode==='quest'?'Практичне випробування':desc[n];
 panel.innerHTML=panelContent();$('m03Progress').textContent=mode==='quest'?Math.min(n,4)+'/4':mode==='demo'?Math.min(n+1,6)+'/6':'Пісочниця';
 next.hidden=mode!=='demo';next.disabled=mode==='demo'&&!save.done.includes(n);
 $('m03Toggle').hidden=mode!=='explore';$('m03Toggle').setAttribute('aria-expanded',String(dockOpen));dock.hidden=mode!=='explore'||!dockOpen;
 dock.innerHTML=['Генератор','Хвильова ванна','Мотузка','Осцилограф','Камертони','Радіосигнал'].map((name,i)=>'<button data-act="tool" data-tool="'+i+'" class="'+(tool===i?'selected':'')+'"><span class="m03-tool-icon">'+['◉','≈','〰','▤','♬','⌁'][i]+'</span>'+name+'</button>').join('');
 draw();
}
function markDone(){if(mode==='demo'&&!save.done.includes(save.stage)){save.done.push(save.stage);persist();next.disabled=false}}
function graphics(){const raw=stage(),n=mode==='quest'?(raw===0?0:raw===1?2:raw===2?3:raw===3?5:0):raw,wave=n===1||n===2||n===3;
 const line=(f,a,y,shift=0)=>Array.from({length:210},(_,i)=>{const x=90+i*4.9;return(i?'L':'M')+x.toFixed(1)+' '+(y-Math.sin(x/105*f+shift)*a).toFixed(1)}).join(' ');
 let shapes='<defs><linearGradient id="m03glow"><stop stop-color="#b7f48c"/><stop offset="1" stop-color="#63bcd8"/></linearGradient></defs><path d="M70 335H1120" stroke="#7498a5" stroke-dasharray="5 8"/>';
 if(n===0){
  const centerX=600,centerY=340,waveAmplitude=95;
  const wavePhase=time*TAU*freq;
  const waveY=x=>centerY-Math.sin(x/105*freq+wavePhase)*waveAmplitude;
  const particleY=waveY(centerX);
  shapes+='<circle cx="600" cy="340" r="146" stroke="#80bac5" fill="none" opacity=".3"/>'+
   '<path d="'+line(freq,waveAmplitude,centerY,wavePhase)+'" stroke="#b4f58d" stroke-width="4" fill="none"/>'+
   '<circle cx="'+centerX+'" cy="'+particleY.toFixed(2)+'" r="24" fill="#e9c67e" stroke="#f9edbf" stroke-width="3"/>';
 }

 else if(n===1){
  const cx=590,cy=347;
  shapes+='<defs>'+
   '<linearGradient id="m03GlassRim" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#e6fbff"/><stop offset=".22" stop-color="#4e899f"/><stop offset=".48" stop-color="#d6f3f8"/><stop offset=".76" stop-color="#31738d"/><stop offset="1" stop-color="#c7e9f2"/></linearGradient>'+
   '<radialGradient id="m03Water" cx=".48" cy=".44" r=".78"><stop stop-color="#076b82"/><stop offset=".46" stop-color="#07526a"/><stop offset="1" stop-color="#052c45"/></radialGradient>'+
   '<radialGradient id="m03Emitter" cx=".32" cy=".21" r=".85"><stop stop-color="#ffffff"/><stop offset=".42" stop-color="#cededf"/><stop offset="1" stop-color="#506e7a"/></radialGradient>'+
   '<filter id="m03WaveGlow" x="-55%" y="-55%" width="210%" height="210%"><feGaussianBlur stdDeviation="5"/></filter>'+
   '<clipPath id="m03TankClip"><rect x="131" y="161" width="918" height="391" rx="28"/></clipPath></defs>'+
   '<rect x="109" y="135" width="964" height="433" rx="39" fill="#031f32" stroke="#548fa6" stroke-width="4"/>'+
   '<rect x="119" y="143" width="945" height="414" rx="36" fill="#073e56" stroke="url(#m03GlassRim)" stroke-width="9"/>'+
   '<rect x="132" y="160" width="917" height="392" rx="26" fill="url(#m03Water)" stroke="#126783" stroke-width="3"/>'+
   '<g clip-path="url(#m03TankClip)">'+
   '<path d="M146 198Q340 176 556 192T1040 188M140 526Q370 510 596 530T1040 523" fill="none" stroke="#85edf1" stroke-opacity=".22" stroke-width="3"/>';
  // Water wavefronts share a constant outward propagation speed; frequency changes spacing.
  const speed=145,maxR=560;
  const spacing=speed/Math.max(freq,.25);
  const count=Math.ceil(maxR/spacing)+2;
  const rings=source?Array.from({length:count},(_,i)=>((time*speed-i*spacing)%maxR+maxR)%maxR):waterRings.map(v=>v.r);
  for(const r of rings){
   if(r<=3||r>=maxR)continue;
   const opacity=Math.pow(Math.max(0,1-r/maxR),.78);
   shapes+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r.toFixed(2)+'" fill="none" stroke="#2deafb" stroke-width="13" opacity="'+(.21*opacity).toFixed(3)+'" filter="url(#m03WaveGlow)"/>'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+r.toFixed(2)+'" fill="none" stroke="#55edfb" stroke-width="2.4" opacity="'+(.85*opacity).toFixed(3)+'"/>'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+4).toFixed(2)+'" fill="none" stroke="#90ffff" stroke-width="1" opacity="'+(.2*opacity).toFixed(3)+'"/>';
  }
  shapes+='</g>'+
   '<path d="M145 169Q390 148 1042 169" fill="none" stroke="#e6fcff" stroke-opacity=".48" stroke-width="3"/>'+
   '<path d="M148 547Q500 566 1037 543" fill="none" stroke="#8be7f5" stroke-opacity=".32" stroke-width="3"/>'+
   '<rect x="143" y="169" width="893" height="375" rx="22" fill="none" stroke="#b6f5fa" stroke-opacity=".16" stroke-width="2"/>'+
   '<ellipse cx="'+cx+'" cy="'+(cy+14)+'" rx="27" ry="10" fill="#001e2b" opacity=".65"/>'+
   '<rect x="'+(cx-19)+'" y="'+(cy-2)+'" width="38" height="24" rx="6" fill="#5a8492" stroke="#c8eff0" stroke-width="1.5"/>'+
   '<ellipse cx="'+cx+'" cy="'+cy+'" rx="21" ry="13" fill="url(#m03Emitter)" stroke="#e5f9f8" stroke-width="1.8"/>'+
   '<ellipse cx="'+(cx-5)+'" cy="'+(cy-4)+'" rx="9" ry="3.5" fill="#ffffff" opacity=".32"/>';
 }
 else if(wave){shapes+='<path d="'+line(freq,amp*95,320,time*freq*2)+'" stroke="#b8f687" stroke-width="4" fill="none"/>';if(mode==='quest'&&raw===1)shapes+='<path d="'+line(freq,amp*40,460,time*freq*2)+'" stroke="#7cc5e0" stroke-width="4" fill="none"/>';if(n===3){shapes+='<path d="M90 180V520H1120" stroke="#92b6bf" stroke-width="2"/>';for(const [i,m] of markers.entries())shapes+='<line data-marker="'+i+'" x1="'+(90+m*1030)+'" x2="'+(90+m*1030)+'" y1="180" y2="520" stroke="'+(i===0?'#f1c681':'#8dd3eb')+'" stroke-width="3" stroke-dasharray="6 5" style="cursor:ew-resize"/>'}}
 else if(n===4){for(const [x,f] of [[430,freq],[790,frequency2]]){const spread=50*(1/(1+(f-frequency2)*(f-frequency2)*2));const offset=started?Math.sin(time*f*4)*spread:0;shapes+='<path d="M'+(x-24+offset)+' 200L'+x+' 430L'+(x+24+offset)+' 200" fill="none" stroke="#d8e6e2" stroke-width="9"/><rect x="'+(x-70)+'" y="433" width="140" height="18" fill="#7e9ba4"/>'}}
 else{shapes+='<rect x="245" y="225" width="180" height="205" rx="18" fill="#153d50" stroke="#a6cbd2" stroke-width="3"/><rect x="785" y="225" width="180" height="205" rx="18" fill="#153d50" stroke="#a6cbd2" stroke-width="3"/><path d="M335 225V130M875 225V130" stroke="#d1ece8" stroke-width="5"/>';for(let i=0;i<3;i++)shapes+='<path d="M'+(420+i*95)+' 180q55 -45 95 0" fill="none" stroke="'+(Math.abs(tx-receiver)<.15?'#b8f487':'#6b93a2')+'" stroke-width="3"/>'}
 return shapes}
function draw(){if(shown)svg.innerHTML=graphics()}
function tick(t){raf=0;if(!shown)return;const dt=last?Math.min(.07,(t-last)/1000):0;last=t;if(started||source)time+=dt;if(source)markDone();if(mode==='demo'&&(started||source))markDone();waterRings=waterRings.map(o=>({r:o.r+dt*175})).filter(o=>o.r<500);draw();raf=requestAnimationFrame(tick)}
root.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;if(act==='dock'){dockOpen=!dockOpen;render();return}if(act==='tool'){tool=Number(b.dataset.tool);dockOpen=false;reset(false);render();return}
 if(act==='restart'){if(mode==='demo'){save.stage=0;save.done=[];persist()}reset();render();return}
 if(act==='next'&&mode==='demo'&&save.done.includes(save.stage)){save.stage=Math.min(5,save.stage+1);persist();reset();render();return}
 if(act==='toggle'){if(stage()===1){source=!source}else started=!started;markDone();render();return}
 if(act==='drop'){waterRings.push({r:1});markDone();return}
 if(act==='measure'){markDone();reading=Math.abs(markers[1]-markers[0]);render();return}
 if(act==='chooseA'||act==='chooseB'){grade(act==='chooseA'?20:0);return}
 if(act==='retake'){save.q=0;save.marks=[null,null,null,null];save.attempt++;persist();reset();render();return}
 if(act==='check'){const n=save.q;if(n===0)grade(Math.abs(freq-3)<.01?20:0);else if(n===2){const v=Number(($('m03Answer')?.value||'').replace(',','.'));grade(Math.abs(v-freq)<.15?30:0)}else if(n===3)grade(Math.abs(tx-receiver)<.15?30:0);return}
});
panel.addEventListener('input',e=>{const key=e.target.dataset.key;if(!key)return;const val=Number(e.target.value);if(!Number.isFinite(val))return;({freq:()=>freq=val,amp:()=>amp=val,f2:()=>frequency2=val,receiver:()=>receiver=val,tx:()=>tx=val}[key]||(()=>{}))();const o=e.target.closest('label')?.querySelector('output');if(o)o.textContent=fmt(val,key==='freq'&&val%1===0?0:1)+(key==='freq'||key==='f2'?' Гц':key==='tx'||key==='receiver'?' МГц':'');if(mode==='demo')markDone();draw()});
svg.addEventListener('pointerdown',e=>{if(!shown||mode==='quest'||stage()!==3)return;const r=svg.getBoundingClientRect();const t=clamp(((e.clientX-r.left)/r.width*1200-90)/1030,0,1);const i=Math.abs(markers[0]-t)<Math.abs(markers[1]-t)?0:1;markers[i]=t;render();});
svg.addEventListener('pointerdown',e=>{if(!shown||stage()!==1||mode==='quest')return;const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*1200,y=(e.clientY-r.top)/r.height*660;if(x>125&&x<1055&&y>145&&y<550){waterRings.push({r:1});markDone()}});
window.addEventListener('hashchange',sync);window.addEventListener('gnss:lab-change',sync);document.getElementById('sidebarNav')?.addEventListener('click',()=>setTimeout(sync,0));new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
sync();
})();