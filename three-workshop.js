/* GNSS LAB / Lesson 01: interactive Three.js workshop.
   Fallback: the existing SVG lesson remains when WebGL/CDN is unavailable. */
(function(){
'use strict';
const host=document.querySelector('.canvas-column');
if(!host)return;
const progressKey='gnss-workshop-3d-progress';
const P={length:1.25,left:-1.1,ruler:-1.85,calX:1.98,calZ:-1.26,gap:.55,unit:'cm',instrument:'ruler',mode:'demo',time:0,playing:true,step:0,passed:false};
try{P.step=Math.max(0,Math.min(3,Number(localStorage.getItem(progressKey))||0))}catch(_){}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const showNum=(v,n=0)=>Number(v).toLocaleString('uk-UA',{maximumFractionDigits:n,minimumFractionDigits:n});
let T,scene,camera,renderer,clock,root,grid,block,body,handle,ruler,caliper,jaw,calBeam,cylinder,ring,ray,plane,resizeObserver;
let readout,tools,playbar,questbar,activeMode='',activeLesson=-1,drag=null,offset={x:0,z:0,px:0,py:0},angle=.64,elevation=.51,distance=6.9;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function object(w,h,d,color,x=0,y=0,z=0){
 const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,metalness:.1,roughness:.7}));
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;
}
function pick(group,name){group.traverse(x=>{if(x.isMesh)x.userData.action=name})}
function updateCamera(){
 // A fixed, top-down drafting camera. Only objects move, never the workspace.
 camera.up.set(0,0,-1);
 camera.position.set(0,12,0.0001);
 camera.lookAt(0,.05,0);
}
function reset(m){
 P.mode=m;P.length=1.25;P.ruler=-1.85;P.calX=1.98;P.calZ=-1.26;P.gap=.55;P.instrument='ruler';P.time=0;P.playing=true;P.passed=false;
 if(m==='quest'&&P.step===1){P.length=.8;P.ruler=P.left}
 if(m==='quest'&&P.step===2)P.ruler=P.left;
 hud()
}
function target(){return ['Сумісти «0» з краєм бруска','Зроби довжину 1,50 м','Виміряй циліндр: Ø 34 см'][Math.min(2,P.step)]}
function check(){
 if(P.mode!=='quest'||P.passed||P.step>=3)return;
 let ok=P.step===0?Math.abs(P.ruler-P.left)<.045:P.step===1?Math.abs(P.length-1.5)<.035:Math.hypot(P.calX-1.42,P.calZ+.63)<.19&&Math.abs(P.gap-.34)<.022;
 if(ok){P.passed=true;hud()}
}
function save(){try{localStorage.setItem(progressKey,String(P.step))}catch(_){}}
function next(){
 if(!P.passed)return;
 P.step=Math.min(P.step+1,3);save();reset('quest');
 if(P.step===3)P.playing=false;
}
function hud(){
 if(!root)return;
 let v=P.length*(P.unit==='m'?1:P.unit==='cm'?100:1000);
 readout.textContent=showNum(v,P.unit==='m'?2:0)+' '+P.unit;
 root.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',P.instrument===b.dataset.tool));
 root.querySelectorAll('[data-unit]').forEach(b=>b.classList.toggle('active',P.unit===b.dataset.unit));
 playbar.hidden=P.mode!=='demo';
 tools.hidden=P.mode==='demo';
 playbar.querySelector('[data-play]').textContent=P.playing?'⏸':'▶';
 questbar.hidden=P.mode!=='quest';
 if(P.mode==='quest'){
  let dots=[0,1,2].map(i=>i<P.step?'●':i===P.step?'◉':'○').join(' ');
  questbar.innerHTML='<span style="color:#b1f378;letter-spacing:3px">'+dots+'</span> <strong>'+(P.step>=3?'✓ 3 / 3':target())+'</strong> '+(P.step>=3?'<button data-replay aria-label="Повторити">↻</button>':P.passed?'<button data-next>Далі →</button>':'');
 }
 let jawRange=tools.querySelector('#workshopJaw');jawRange.value=P.gap;
 tools.querySelector('#workshopJawValue').textContent='Ø '+showNum(P.gap*100)+' см';
 tools.querySelector('.three-jaw').hidden=P.instrument!=='caliper';
}
function buildHUD(){
 root=document.createElement('div');root.id='gnss-three-root';root.setAttribute('aria-label','3D майстерня вимірювань');
 root.innerHTML='<div class="three-hud three-readout" id="threeReadout">125 см</div>'
 +'<div class="three-hud three-play" id="threePlay"><button type="button" data-restart aria-label="Повторити показ">↻</button><button type="button" data-play aria-label="Пауза або відтворення">⏸</button><button type="button" data-forward aria-label="Наступний кадр">→</button></div>'
 +'<div class="three-hud three-quest" id="threeQuest" aria-live="polite" hidden></div>'
 +'<div class="three-hud three-toolbar" id="threeTools"><button type="button" data-tool="ruler" aria-label="Обрати лінійку">▥ Лінійка</button><button type="button" data-tool="caliper" aria-label="Обрати штангенциркуль">⊣ Штангенциркуль</button><span class="three-jaw" hidden><span id="workshopJawValue">Ø 55 см</span><input type="range" id="workshopJaw" aria-label="Розкриття губок" min=".18" max=".70" step=".01" value=".55"></span><button type="button" data-unit="m">м</button><button type="button" data-unit="cm">см</button><button type="button" data-unit="mm">мм</button><button type="button" data-reset aria-label="Скинути сцену">↻</button></div>'
 +'<span class="three-hint">↔ Перетягуй предмети · Обертай сцену · Коліщатко — масштаб</span>';
 host.append(root);
 readout=root.querySelector('#threeReadout');tools=root.querySelector('#threeTools');playbar=root.querySelector('#threePlay');questbar=root.querySelector('#threeQuest');
 tools.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tool)P.instrument=b.dataset.tool;
  if(b.dataset.unit)P.unit=b.dataset.unit;
  if(b.hasAttribute('data-reset'))reset(P.mode);
  hud()
 });
 tools.querySelector('#workshopJaw').addEventListener('input',e=>{P.gap=Number(e.target.value);check();hud()});
 playbar.addEventListener('click',e=>{
  let b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-play'))P.playing=!P.playing;
  if(b.hasAttribute('data-restart')){P.time=0;P.playing=true}
  if(b.hasAttribute('data-forward')){P.time=Math.min(9,(Math.floor(P.time/3)+1)*3);P.playing=false}
  hud()
 });
 questbar.addEventListener('click',e=>{
  if(e.target.closest('[data-next]'))next();
  if(e.target.closest('[data-replay]')){P.step=0;save();reset('quest')}
 });
}
function createScene(){
 scene=new T.Scene();scene.background=null;
 camera=new T.OrthographicCamera(-4.4,4.4,2.55,-2.55,.1,60);
 renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
 renderer.setClearColor(0x000000,0);
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','3D-стіл: перетягніть лінійку, зелену ручку бруска або штангенциркуль');canvas.tabIndex=0;root.prepend(canvas);
 scene.add(new T.HemisphereLight(0xc3e0ed,0x183c36,2.4));
 const sun=new T.DirectionalLight(0xffe9cb,3.4);sun.position.set(-2,7,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=6;sun.shadow.camera.bottom=-6;scene.add(sun);
 const rim=new T.PointLight(0x73dec5,8,9);rim.position.set(3,2,-2);scene.add(rim);
 // The former solid tabletop and teal grid are gone.
 // The true drafting paper is a crisp, fixed SVG underneath the transparent canvas.
 // A transparent shadow catcher grounds the measuring tools on the paper.
 const shadowSurface=new T.Mesh(new T.PlaneGeometry(24,24),
   new T.ShadowMaterial({color:0x001526,opacity:.24}));
 shadowSurface.rotation.x=-Math.PI/2;
 shadowSurface.position.y=-.045;
 shadowSurface.receiveShadow=true;
 scene.add(shadowSurface);
 block=new T.Group();scene.add(block);
 body=object(1,.39,.56,0xc9a57b);body.userData.action='grip';block.add(body);
 body.add(new T.LineSegments(new T.EdgesGeometry(body.geometry),new T.LineBasicMaterial({color:0xffe5ad,transparent:true,opacity:.3})));
 handle=new T.Mesh(new T.SphereGeometry(.105,20,12),new T.MeshStandardMaterial({color:0xb1f378,roughness:.3,emissive:0x26511c,emissiveIntensity:.65}));
 handle.userData.action='grip';scene.add(handle);
 ruler=new T.Group();scene.add(ruler);
 const rulerBody=object(2.31,.055,.22,0xd4e0db,1.155,.05,0);ruler.add(rulerBody);
 let cv=document.createElement('canvas');cv.width=2048;cv.height=160;let c=cv.getContext('2d');
 c.fillStyle='#d9e8e0';c.fillRect(0,0,2048,160);c.strokeStyle='#25473f';c.fillStyle='#1f3733';c.textAlign='center';c.textBaseline='middle';
 for(let i=0;i<=220;i++){let x=8+i/220*2032;let major=i%10===0;c.lineWidth=major?3:1;c.beginPath();c.moveTo(x,4);c.lineTo(x,major?105:52);c.stroke();if(major){c.font='bold 22px sans-serif';c.fillText(String(i),x,138)}}
 const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;
 const marks=new T.Mesh(new T.PlaneGeometry(2.3,.215),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));
 marks.rotation.x=-Math.PI/2;marks.position.set(1.155,.084,0);ruler.add(marks);
 const zero=object(.012,.075,.27,0xa9f28c,0,.08,0);ruler.add(zero);pick(ruler,'ruler');
 caliper=new T.Group();scene.add(caliper);
 calBeam=object(1.12,.06,.10,0x9aaeb8,.16,.075,0);caliper.add(calBeam);
 caliper.add(object(.055,.06,.31,0xafc0c6,-.34,.08,-.13));
 jaw=object(.055,.06,.31,0xc1cfd0,-.34+P.gap,.08,-.13);caliper.add(jaw);
 const slide=object(.17,.09,.19,0x587580,-.34+P.gap,.08,.015);caliper.add(slide);jaw.userData.slider=slide;
 pick(caliper,'caliper');
 cylinder=new T.Mesh(new T.CylinderGeometry(.17,.17,.4,44),new T.MeshStandardMaterial({color:0x80baa8,roughness:.5}));
 cylinder.position.set(1.25,.2,-.63);cylinder.castShadow=true;scene.add(cylinder);
 const guide=new T.Mesh(new T.RingGeometry(.25,.28,60),new T.MeshBasicMaterial({color:0xaaf28d,transparent:true,opacity:.45,side:T.DoubleSide}));
 guide.rotation.x=-Math.PI/2;guide.position.set(1.25,.04,-.63);guide.name='guide';scene.add(guide);
 ray=new T.Raycaster();plane=new T.Plane(new T.Vector3(0,1,0),-.12);
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 
 let adjust=()=>{
  if(!root||!renderer)return;
  const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight),aspect=w/h;
  renderer.setSize(w,h,false);
  // Keep the drafting sheet and its objects stationary when the viewport changes.
  const halfH=aspect<1?3.65:4.25/aspect;
  camera.left=-halfH*aspect;camera.right=halfH*aspect;
  camera.top=halfH;camera.bottom=-halfH;
  camera.updateProjectionMatrix();
  updateCamera();
 };
 resizeObserver=new ResizeObserver(adjust);resizeObserver.observe(root);adjust();updateCamera();
 clock=new T.Clock();
}
function worldPoint(e){
 let b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);
 let v=new T.Vector3();return ray.ray.intersectPlane(plane,v)?v:null;
}
function down(e){
 if(P.mode==='demo')return;
 let v=worldPoint(e),hit=ray.intersectObjects([handle,body,ruler,caliper],true).find(x=>x.object.userData.action);
 drag=hit?hit.object.userData.action:null;
 if(!drag)return;
 if(P.mode==='quest'&&((drag==='ruler'&&P.step!==0)||(drag==='grip'&&P.step!==1)||(drag==='caliper'&&P.step!==2)))drag='orbit';
 if(v){offset.x=drag==='ruler'?v.x-P.ruler:drag==='caliper'?v.x-P.calX:0;offset.z=v.z-P.calZ}
 offset.px=e.clientX;offset.py=e.clientY;
 try{renderer.domElement.setPointerCapture(e.pointerId)}catch(_){}
 renderer.domElement.style.cursor='grabbing';
}
function move(e){
 if(!drag)return;
 if(drag){
  let v=worldPoint(e);
  if(v){
   if(drag==='ruler')P.ruler=clamp(Math.round((v.x-offset.x)*100)/100,-2.4,.5);
   if(drag==='grip')P.length=clamp(Math.round((v.x-P.left)*20)/20,.25,2);
   if(drag==='caliper'){P.calX=clamp(v.x-offset.x,-2.2,2.4);P.calZ=clamp(v.z-offset.z,-1.8,1.5)}
   check();hud()
  }
 }
 offset.px=e.clientX;offset.py=e.clientY;
}
function up(e){drag=null;if(renderer)renderer.domElement.style.cursor='grab';try{renderer.domElement.releasePointerCapture(e.pointerId)}catch(_){}}
function interp(a,b,t){let q=clamp(t,0,1);q=q*q*(3-2*q);return a+(b-a)*q}
function tick(t){
 requestAnimationFrame(tick);
 let lesson=typeof active!=='undefined'?active:-1;
 let mode=document.body.dataset.expMode||'demo';
 if(lesson!==activeLesson||mode!==activeMode){
  activeLesson=lesson;activeMode=mode;document.body.classList.toggle('gnss-workshop',lesson===0);
  if(lesson===0)reset(mode)
 }
 let dt=clock.getDelta();
 if(lesson!==0||document.hidden)return;
 if(P.mode==='demo'){
  if(P.playing){P.time=Math.min(9,P.time+Math.min(.06,dt));if(P.time>=9){P.playing=false;hud()}}
  P.ruler=interp(-1.85,P.left,P.time/2.8);
  P.length=interp(1.25,1.7,(P.time-3)/2.7);
  P.calX=interp(1.98,1.42,(P.time-6)/2.8);
  P.calZ=interp(-1.26,-.63,(P.time-6)/2.8);
  P.gap=interp(.55,.34,(P.time-6)/2.8);
  // Camera never drifts: blueprint is an anchored drafting surface.
  let v=P.length*(P.unit==='cm'?100:P.unit==='mm'?1000:1);
  readout.textContent=showNum(v,P.unit==='m'?2:0)+' '+P.unit
 }
 body.scale.x=P.length;block.position.set(P.left+P.length/2,.26,.12);
 handle.position.set(P.left+P.length,.26,.43);
 ruler.position.set(P.ruler,0,.86);
 caliper.position.set(P.calX,0,P.calZ);
 jaw.position.x=-.34+P.gap;jaw.userData.slider.position.x=-.34+P.gap;
 scene.getObjectByName('guide').visible=P.mode==='quest'&&P.step===2;
 renderer.render(scene,camera)
}
async function boot(){
 if(!document.createElement('canvas').getContext('webgl2'))return;
 try{T=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js').catch(()=>import('https://unpkg.com/three@0.165.0/build/three.module.js'))}
 catch(e){console.warn('Three.js unavailable, using existing 2D stand',e);return}
 try{buildHUD();createScene();reset(document.body.dataset.expMode||'demo');requestAnimationFrame(tick)}
 catch(e){console.error('3D lab failed to initialize; retaining 2D scene',e);root?.remove();document.body.classList.remove('gnss-workshop')}
}
boot();
})();