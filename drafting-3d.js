/* GNSS LAB / Geometry-first drafting, transient procedural Three.js tools.
 * No imported model files and no permanent tools on the blueprint.
 * A WebGL-free canvas fallback keeps the practical lesson usable offline.
 */
(function(){
'use strict';
const board=document.getElementById('engBoard');
const svg=document.getElementById('engSvg');
const cmd=document.getElementById('engCommand');
if(!board||!svg)return;
const NS='http://www.w3.org/2000/svg',SCALE=3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
const preview=document.createElementNS(NS,'svg');
preview.classList.add('gnss-draft-preview');
preview.setAttribute('viewBox','0 0 1200 660');
preview.setAttribute('preserveAspectRatio','xMidYMid meet');
preview.setAttribute('aria-hidden','true');
board.append(preview);
const stageEl=document.createElement('div');stageEl.className='gnss-3d-stage';
const canvas=document.createElement('canvas'),fallback=document.createElement('canvas');
canvas.setAttribute('aria-hidden','true');fallback.setAttribute('aria-hidden','true');
stageEl.append(canvas,fallback);board.append(stageEl);
const hint=document.createElement('div');hint.className='gnss-draft-feedback';board.append(hint);
let mode='demo',tool='line',step=0,complete=false,first=null,cursor=null,motion=null;
let animationHandle=0,demoInit=false,three=null,renderer=null,scene=null,camera=null,light=null,ruler=null,pencil=null,compass=null;
let ctx=null,ratio=1,w=0,h=0;
const RULER_ASSET=new URL('./assets/ruler-150-topdown.webp',document.baseURI).href;
const RULER_WIDTH=480,RULER_HEIGHT=62,RULER_ZERO=16;
const rulerPhoto=new Image();
rulerPhoto.decoding='async';
rulerPhoto.src=RULER_ASSET;
const interactive=()=>mode!=='demo'&&!complete&&
  (mode==='explore'&&['line','ruler','compass'].includes(tool)||
   mode==='quest'&&(step===0&&['line','ruler'].includes(tool)||step===1&&tool==='compass'));
const kind=()=>tool==='compass'?'circle':'line';
window.GNSSDrafting3D={
 get intercepts(){return interactive()},
 get demoRunning(){return !!motion?.demo},
 get animating(){return !!motion},
 cancel(){cancel()},
};
function node(tag,attrs={},text){
 const e=document.createElementNS(NS,tag);
 Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));
 if(text!==undefined)e.textContent=text;
 return e;
}
const toSvg=e=>{
 const q=svg.createSVGPoint();q.x=e.clientX;q.y=e.clientY;
 const matrix=svg.getScreenCTM();
 return matrix?q.matrixTransform(matrix.inverse()):{x:0,y:0};
};
const snap=v=>Math.round(v/SCALE)*SCALE;
const point=p=>({x:clamp(snap(p.x),16,1184),y:clamp(snap(p.y),16,644)});
function screen(p){
 const q=svg.createSVGPoint();q.x=p.x;q.y=p.y;
 const m=svg.getScreenCTM();const r=m?q.matrixTransform(m):{x:0,y:0},b=board.getBoundingClientRect();
 return {x:r.x-b.left,y:r.y-b.top};
}
function unitScale(){
 const a=screen({x:0,y:0}),b=screen({x:100,y:0});
 return Math.hypot(b.x-a.x,b.y-a.y)/100;
}
function feedback(text){
 hint.textContent=text;hint.classList.add('is-visible');
 clearTimeout(feedback.timer);
 feedback.timer=setTimeout(()=>hint.classList.remove('is-visible'),1100);
}
function display(shape,progress=null){
 preview.replaceChildren();
 if(!shape)return;
 const isCircle=shape.type==='circle';
 if(isCircle){
  const {x,y,r}=shape;
  preview.append(node('circle',{cx:x,cy:y,r:5,class:'gnss-point'}));
  if(r>1){
   preview.append(node('line',{x1:x,y1:y,x2:x+r,y2:y,class:'gnss-radius'}));
   if(progress===null){
    preview.append(node('circle',{cx:x,cy:y,r,class:'gnss-guide'}));
   }else{
    const n=Math.max(1,Math.ceil(progress*95));
    let d='';
    for(let i=0;i<=n;i++){
     const a=-Math.PI/2+2*Math.PI*progress*i/n;
     d+=(i?'L':'M')+(x+r*Math.cos(a)).toFixed(2)+' '+(y+r*Math.sin(a)).toFixed(2)+' ';
    }
    preview.append(node('path',{d,class:'gnss-drawn'}));
   }
   preview.append(node('text',{x,y:y-r-18,class:'gnss-dimension','text-anchor':'middle'},'Ø '+(r*2/SCALE).toLocaleString('uk-UA',{maximumFractionDigits:1})+' мм'));
  }
  return;
 }
 const a={x:shape.x1,y:shape.y1},b={x:shape.x2,y:shape.y2};
 const d=Math.hypot(b.x-a.x,b.y-a.y),v=d||1,nx=-(b.y-a.y)/v,ny=(b.x-a.x)/v;
 preview.append(node('circle',{cx:a.x,cy:a.y,r:5,class:'gnss-point'}));
 preview.append(node('text',{x:a.x+10,y:a.y-12,class:'gnss-mark'},'A'));
 if(d>1){
  const end=progress===null?b:{x:lerp(a.x,b.x,progress),y:lerp(a.y,b.y,progress)};
  preview.append(node('line',{x1:a.x,y1:a.y,x2:end.x,y2:end.y,class:progress===null?'gnss-guide':'gnss-drawn'}));
  preview.append(node('circle',{cx:b.x,cy:b.y,r:5,class:'gnss-point'}));
  preview.append(node('text',{x:b.x+10,y:b.y-12,class:'gnss-mark'},'B'));
  preview.append(node('text',{
   x:(a.x+b.x)/2+nx*20,y:(a.y+b.y)/2+ny*20-5,
   class:'gnss-dimension','text-anchor':'middle'
  },(d/SCALE).toLocaleString('uk-UA',{maximumFractionDigits:1})+' мм'));
 }
}
function geometry(){
 if(!first)return null;
 const next=cursor||first;
 return kind()==='circle'
  ?{type:'circle',x:first.x,y:first.y,r:Math.round(Math.hypot(next.x-first.x,next.y-first.y)/SCALE)*SCALE}
  :{type:'line',x1:first.x,y1:first.y,x2:next.x,y2:next.y};
}
function valid(shape){
 const data={shape,accepted:false};
 document.dispatchEvent(new CustomEvent('gnss:draw-check',{detail:data}));
 return data.accepted;
}
function clear(){first=null;cursor=null;preview.replaceChildren()}
function cancel(){
 const previous=motion;motion=null;cancelAnimationFrame(animationHandle);
 if(previous)finishScene();
 clear();
 document.body.classList.remove('gnss-draft-animating');
}
function pointerDown(e){
 if(!interactive()||e.button!==0)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(motion)return;
 const p=point(toSvg(e));
 if(!first){first=p;cursor=p;display(geometry());return}
 const shape=kind()==='circle'
  ?{type:'circle',x:first.x,y:first.y,r:Math.round(Math.hypot(p.x-first.x,p.y-first.y)/SCALE)*SCALE}
  :{type:'line',x1:first.x,y1:first.y,x2:p.x,y2:p.y};
 if(shape.type==='line'&&Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1)<24){feedback('↔ Потрібен довший відрізок');return}
 if(shape.type==='line'&&Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1)>600){feedback('↔ Максимум 200 мм');return}
 if(shape.type==='circle'&&shape.r<15){feedback('◯ Збільш радіус');return}
 if(!valid(shape)){feedback('↔ Перевір розмір і положення');return}
 clear();
 play(shape,false);
}
function pointerMove(e){
 if(!interactive()||motion||!first)return;
 const p=point(toSvg(e));
 if(e.shiftKey&&kind()==='line'){
  if(Math.abs(p.x-first.x)>Math.abs(p.y-first.y))p.y=first.y;else p.x=first.x;
 }
 cursor=p;display(geometry());
}
function sync(e){
 const d=e.detail||{};
 const nextMode=d.mode||document.body.dataset.expMode||'demo';
 const nextTool=d.tool||'line',nextStep=d.stage||0;
 if(nextMode!==mode||nextTool!==tool||nextStep!==step||!!d.complete!==complete)cancel();
 const wasDemo=mode==='demo';
 mode=nextMode;tool=nextTool;step=nextStep;complete=!!d.complete;
 document.body.classList.toggle('gnss-draft-working',interactive());
 if(mode==='demo'&&!wasDemo)setTimeout(startDemo,130);
}
svg.addEventListener('pointerdown',pointerDown,true);
svg.addEventListener('pointermove',pointerMove,true);
svg.addEventListener('pointerleave',()=>{if(!motion&&first){cursor=null;display(geometry())}},true);
document.addEventListener('gnss:draft-state',sync);
document.addEventListener('click',e=>{
 if(e.target.closest('#engFloatUndo')&&(first||motion)){
  e.preventDefault();e.stopImmediatePropagation();cancel();
 }
},true);
document.addEventListener('keydown',e=>{
 if((e.key==='Escape'||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'))&&(first||motion)){
  e.preventDefault();e.stopImmediatePropagation();cancel();
 }
},true);
function resize(){
 const b=board.getBoundingClientRect();
 w=Math.max(1,Math.round(b.width));h=Math.max(1,Math.round(b.height));
 ratio=Math.min(2,window.devicePixelRatio||1);
 fallback.width=Math.round(w*ratio);fallback.height=Math.round(h*ratio);
 if(renderer){renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);camera.left=0;camera.right=w;camera.top=0;camera.bottom=h;camera.updateProjectionMatrix()}
}
window.addEventListener('resize',resize);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(board);
resize();
async function init3D(){
 try{
  let mod;
  try{mod=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js')}
  catch(_){mod=await import('https://unpkg.com/three@0.165.0/build/three.module.js')}
  three=mod;
  renderer=new three.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0x000000,0);renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);
  renderer.outputColorSpace=three.SRGBColorSpace;
  renderer.toneMapping=three.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.55;
  scene=new three.Scene();
  camera=new three.OrthographicCamera(0,w,0,h,.1,3000);
  camera.position.set(0,0,1200);camera.lookAt(0,0,0);
  scene.add(new three.AmbientLight(0xcce7ff,1.8));
  light=new three.DirectionalLight(0xffffff,3.0);
  light.position.set(-300,-320,700);scene.add(light);
  ruler=buildRuler();pencil=buildPencil();compass=buildCompass();
  scene.add(ruler,pencil,compass);ruler.visible=pencil.visible=compass.visible=false;
  fallback.style.display='none';canvas.style.display='block';resize();
 }catch(err){
  renderer=null;three=null;
  canvas.style.display='none';fallback.style.display='block';
  console.warn('GNSS LAB: 3D unavailable; local shaded-canvas fallback active',err);
 }
}
function material(color,metalness=.75,roughness=.28){
 return new three.MeshStandardMaterial({color,metalness,roughness});
}
function cylinder(radiusTop,radiusBottom,length,color){
 const ob=new three.Mesh(new three.CylinderGeometry(radiusTop,radiusBottom,length,14),material(color));
 return ob;
}
function buildRuler(){
 const T=three,g=new T.Group();
 // The ruler is always viewed orthographically from directly above.
 // The photograph is a flat material skin: no perspective tilt or black box.
 // Its printed "0" is calibrated to the origin. The bottom edge sits just
 // above the drawn A→B segment, not over the white ink.
 const left=-RULER_ZERO,bottom=-5;
 const cx=left+RULER_WIDTH/2,cy=bottom-RULER_HEIGHT/2;
 const plane=new T.PlaneGeometry(RULER_WIDTH,RULER_HEIGHT);
 const shadow=new T.Mesh(plane,new T.MeshBasicMaterial({
  color:0x041e2e,transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide
 }));
 shadow.position.set(cx+3,cy+4,6);
 shadow.visible=false; // Never show an opaque rectangular shadow before texture loads.
 g.add(shadow);
 const material=new T.MeshBasicMaterial({
  color:0xe6f0f0,transparent:true,alphaTest:.08,
  side:T.DoubleSide,depthWrite:false,toneMapped:false
 });
 const face=new T.Mesh(plane,material);
 face.position.set(cx,cy,12);
 g.add(face);
 const tex=new T.TextureLoader().load(
  RULER_ASSET,
  texture=>{
   texture.colorSpace=T.SRGBColorSpace;
   texture.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);
   texture.needsUpdate=true;
   face.material.color.set(0xffffff);
   face.material.map=texture;
   face.material.needsUpdate=true;
   // Use the same transparency mask for the soft shadow: no dark rectangle.
   shadow.material.map=texture;
   shadow.material.needsUpdate=true;
   shadow.visible=true;
  },
  undefined,
  err=>console.warn('GNSS LAB ruler texture load failed',err)
 );
 tex.colorSpace=T.SRGBColorSpace;
 g.userData.isOrthographic=true;
 g.visible=false;
 return g;
}
function buildPencil(){
 const T=three,g=new T.Group();
 // Pencil point is the origin; colored barrel extends back along -Y.
 const barrel=cylinder(8,8,83,0x184f7c);barrel.position.set(0,-74,25);g.add(barrel);
 const nose=cylinder(8,5.4,34,0xb9ced2);nose.position.set(0,-19,25);g.add(nose);
 const tip=new T.Mesh(new T.ConeGeometry(5.2,16,16),material(0xdee7e7,.83,.21));
 tip.position.set(0,-8,25);g.add(tip);
 const graphite=new T.Mesh(new T.ConeGeometry(1.4,6,12),material(0x1a2027,.4,.37));
 graphite.position.set(0,-3,25);g.add(graphite);
 const ring=cylinder(8.4,8.4,6,0xeff4e9);ring.position.set(0,-36,25);g.add(ring);
 const cap=cylinder(7.8,8,13,0xc4d1d2);cap.position.set(0,-120,25);g.add(cap);
 const clip=new T.Mesh(new T.BoxGeometry(3,48,2),material(0xe5eff4,.9,.16));
 clip.position.set(8,-93,32);g.add(clip);
 const shine=new T.Mesh(new T.BoxGeometry(1.7,71,1.5),material(0x9accf0,.46,.22));
 shine.position.set(-4,-78,32);g.add(shine);
 g.visible=false;return g;
}
function rodBetween(group,a,b,r){
 const T=three,delta=new T.Vector3().subVectors(b,a);
 const ob=new T.Mesh(new T.CylinderGeometry(r,r*.78,delta.length(),12),material(0xc2d5de,.87,.19));
 ob.position.copy(a).add(b).multiplyScalar(.5);
 ob.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
 group.add(ob);
}
function buildCompass(){
 const T=three,g=new T.Group();
 // Real 3D hinge + two tilted steel legs. The pivot remains at circle center.
 const pivot=new T.Mesh(new T.SphereGeometry(10,16,12),material(0xe1eced,.85,.22));
 pivot.position.set(0,-46,22);g.add(pivot);
 const needle=new T.Vector3(0,0,7),pen=new T.Vector3(96,0,7),hinge=new T.Vector3(48,-48,28);
 rodBetween(g,hinge,needle,5.4);rodBetween(g,hinge,pen,5.4);
 const ink=new T.Mesh(new T.ConeGeometry(3,11,12),material(0x202e3d,.38,.42));
 ink.position.set(96,3,7);g.add(ink);
 const knob=cylinder(8,8,24,0xe4edee);knob.position.set(48,-58,30);g.add(knob);
 g.userData.pen=pen;g.visible=false;return g;
}
function showStage(){
 stageEl.classList.add('is-playing');
 if(renderer){canvas.style.display='block';fallback.style.display='none'}
 else{canvas.style.display='none';fallback.style.display='block'}
}
function finishScene(){
 stageEl.classList.remove('is-playing');
 if(ruler)ruler.visible=false;
 if(pencil)pencil.visible=false;
 if(compass)compass.visible=false;
 if(ctx)ctx.clearRect(0,0,w,h);
}
function paintFallback(shape,t,progress){
 if(!ctx)ctx=fallback.getContext('2d');
 if(!ctx)return;
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const scale=unitScale();
 const p=shape.type==='line'?screen({x:shape.x1,y:shape.y1}):screen({x:shape.x,y:shape.y});
 ctx.save();
 const angle=shape.type==='line'?Math.atan2(shape.y2-shape.y1,shape.x2-shape.x1):0;
 if(shape.type==='line'){
  if(t<.90){
   const enter=ease(t/.20),dx=(1-enter)*-60*scale;
   ctx.translate(p.x+dx,p.y-45*(1-enter)*scale);ctx.rotate(angle);ctx.scale(scale,scale);
   ctx.shadowColor='#001625aa';ctx.shadowBlur=12;ctx.shadowOffsetY=7;
   if(rulerPhoto.complete&&rulerPhoto.naturalWidth){
    ctx.drawImage(rulerPhoto,-RULER_ZERO,-RULER_HEIGHT-5,RULER_WIDTH,RULER_HEIGHT);
   }else{
    const gr=ctx.createLinearGradient(0,-67,0,-5);
    gr.addColorStop(0,'#dce8e9');gr.addColorStop(.5,'#aabec5');gr.addColorStop(1,'#eff5f5');
    ctx.fillStyle=gr;ctx.fillRect(-RULER_ZERO,-67,RULER_WIDTH,62);
   }
   ctx.shadowBlur=0;
   ctx.restore();ctx.save();
  }
  if(t>.22&&t<.96){
   const start=screen({x:shape.x1,y:shape.y1}),end=screen({x:shape.x2,y:shape.y2});
   const penProgress=t<.31?0:clamp((t-.31)/.55,0,1);
   const X=lerp(start.x,end.x,penProgress),Y=lerp(start.y,end.y,penProgress);
   ctx.translate(X,Y);ctx.rotate(-.23);
   ctx.shadowColor='#00151cc5';ctx.shadowBlur=12;ctx.shadowOffsetX=8;ctx.shadowOffsetY=9;
   const g=ctx.createLinearGradient(-9,0,9,0);
   g.addColorStop(0,'#061f37');g.addColorStop(.34,'#1c5c8d');g.addColorStop(.8,'#8dbece');g.addColorStop(1,'#102c48');
   ctx.fillStyle=g;ctx.fillRect(-7,-115,14,99);
   ctx.fillStyle='#cbd6db';ctx.fillRect(-6,-17,12,13);
   ctx.fillStyle='#161e28';ctx.beginPath();ctx.moveTo(-3,-4);ctx.lineTo(0,0);ctx.lineTo(3,-4);ctx.fill();
  }
 }else if(t<.96){
  const center=screen({x:shape.x,y:shape.y});
  const r=shape.r*scale,phase=-Math.PI/2+Math.PI*2*progress;
  ctx.translate(center.x,center.y);ctx.rotate(phase);
  ctx.shadowColor='#001b2fc0';ctx.shadowBlur=9;ctx.shadowOffsetY=7;
  ctx.strokeStyle='#c8dde7';ctx.lineWidth=6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*.5,-45*scale);ctx.lineTo(r,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(r*.5,-45*scale);ctx.lineTo(0,0);ctx.stroke();
  ctx.fillStyle='#e8f2ed';ctx.beginPath();ctx.arc(r*.5,-45*scale,7,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function paint3D(shape,t,progress){
 if(!renderer||!three){paintFallback(shape,t,progress);return}
 const sc=unitScale();
 ruler.visible=pencil.visible=compass.visible=false;
 if(shape.type==='line'){
  const a=screen({x:shape.x1,y:shape.y1}),b=screen({x:shape.x2,y:shape.y2});
  const angle=Math.atan2(b.y-a.y,b.x-a.x),enter=ease(t/.2),fade=t>.9?clamp((1-t)/.1,0,1):1;
  ruler.visible=t<.98;
  ruler.scale.setScalar(sc);
  ruler.rotation.set(0,0,angle);
  ruler.position.set(a.x+Math.cos(angle)*(-60*(1-enter))*sc,a.y+Math.sin(angle)*(-60*(1-enter))*sc-45*(1-enter)*sc,5+10*(1-enter));
  ruler.visible=t<.92;
  if(t>.2&&t<.98){
   pencil.visible=true;pencil.scale.setScalar(sc);
   const lead=ease((t-.2)/.11);
   const initial={x:a.x-70*sc,y:a.y-90*sc};
   const along=t<.31?0:clamp((t-.31)/.55,0,1);
   const target={x:lerp(a.x,b.x,along),y:lerp(a.y,b.y,along)};
   pencil.position.set(lerp(initial.x,target.x,lead),lerp(initial.y,target.y,lead),14+(t>.88?16*ease((t-.88)/.1):0));
   pencil.rotation.z=-.21;
  }
 }else{
  const center=screen({x:shape.x,y:shape.y});
  compass.visible=t<.96;
  compass.scale.setScalar(sc*(shape.r/96));
  compass.position.set(center.x,center.y,6+(1-ease(t/.2))*16);
  compass.rotation.z=-Math.PI/2+Math.PI*2*progress;
 }
 renderer.render(scene,camera);
}
function play(shape,demo=false){
 if(motion)cancel();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=reduced?350:shape.type==='circle'?3400:2900;
 const playback={shape,demo,started:performance.now(),duration,paused:false,pausedAt:0,progress:0};
 motion=playback;
 if(demo)document.dispatchEvent(new CustomEvent('gnss:ruler-demo-begin'));
 document.body.classList.add('gnss-draft-animating');
 showStage();display(shape,0);
 function animate(now){
  if(motion!==playback)return;
  if(playback.paused){animationHandle=requestAnimationFrame(animate);return}
  const t=clamp((now-playback.started)/duration,0,1);
  const f=clamp((t-.31)/.55,0,1);
  const fraction=shape.type==='line'?f:clamp((t-.23)/.68,0,1);
  playback.progress=fraction;
  display(shape,t<.25?null:fraction);
  paint3D(shape,t,fraction);
  if(t>=1){
   motion=null;
   finishScene();
   document.body.classList.remove('gnss-draft-animating');
   preview.replaceChildren();
   if(demo)document.dispatchEvent(new CustomEvent('gnss:ruler-demo-finished'));
   else document.dispatchEvent(new CustomEvent('gnss:draw-commit',{detail:{shape}}));
   return;
  }
  animationHandle=requestAnimationFrame(animate);
 }
 animationHandle=requestAnimationFrame(animate);
}
function startDemo(){
 if(demoInit||mode!=='demo'||!document.body.classList.contains('engineering-live'))return;
 demoInit=true;
 const shape={type:'line',x1:300,y1:208,x2:720,y2:208};
 play(shape,true);
}
cmd?.addEventListener('click',e=>{
 if(mode!=='demo')return;
 const b=e.target.closest('[data-cmd]');if(!b)return;
 if(b.dataset.cmd==='replay'){
  e.preventDefault();e.stopImmediatePropagation();
  cancel();demoInit=false;startDemo();return;
 }
 if(!motion?.demo)return;
 if(b.dataset.cmd==='play'){
  e.preventDefault();e.stopImmediatePropagation();
  if(motion.paused){motion.started+=performance.now()-motion.pausedAt;motion.paused=false;b.textContent='Ⅱ'}
  else{motion.paused=true;motion.pausedAt=performance.now();b.textContent='▶'}
 }
 if(b.dataset.cmd==='next'){
  e.preventDefault();e.stopImmediatePropagation();
  cancel();document.dispatchEvent(new CustomEvent('gnss:ruler-demo-finished'));
 }
},true);
const oldSync=sync;
document.addEventListener('gnss:draft-state',e=>{
 if(e.detail?.mode==='demo'&&!demoInit)setTimeout(startDemo,160);
 if(e.detail?.mode!=='demo')demoInit=false;
});
init3D();
// On reload, read the already-selected mode/tool even if its initial event fired earlier.
document.dispatchEvent(new CustomEvent('gnss:request-draft-state'));
document.body.classList.toggle('gnss-draft-working',interactive());
setTimeout(()=>{if(mode==='demo')startDemo()},310);
})();
