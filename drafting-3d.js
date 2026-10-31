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
let animationHandle=0,demoInit=false,three=null,renderer=null,scene=null,camera=null,light=null,ruler=null,pencil=null,compass=null,eraser=null,eraserMotion=null;
let ctx=null,ratio=1,w=0,h=0;
const COMPASS_INITIAL=20;
// Orthographic calibration: 1 mm = 3 SVG units, exactly 150 mm on one ruler.
const RULER_SPAN=450,RULER_LEFT=-11,RULER_RIGHT=485;
const RULER_TOP=-44,RULER_BOTTOM=-5;
let rulerTextureCanvas=null;
function getRulerArtwork(){
 if(rulerTextureCanvas)return rulerTextureCanvas;
 const c=document.createElement('canvas');c.width=4096;c.height=336;
 const g=c.getContext('2d');
 if(!g)return c;
 const W=c.width,H=c.height;
 const sx=x=>(x-RULER_LEFT)/(RULER_RIGHT-RULER_LEFT)*W;
 const sy=y=>(y-RULER_TOP)/(RULER_BOTTOM-RULER_TOP)*H;
 const base=g.createLinearGradient(0,0,0,H);
 base.addColorStop(0,'#f2f4f1');base.addColorStop(.17,'#dbe3e5');
 base.addColorStop(.56,'#c4d0d5');base.addColorStop(.85,'#e0e9e9');
 base.addColorStop(1,'#8a9ea9');
 g.fillStyle=base;g.fillRect(0,0,W,H);
 // Stationary fine brushing: subtle texture without image-generation artifacts.
 for(let y=0;y<H;y+=2){
  g.fillStyle=y%4===0?'rgba(255,255,255,.045)':'rgba(41,69,83,.025)';
  g.fillRect(0,y,W,1);
 }
 const gleam=g.createLinearGradient(0,0,W,0);
 gleam.addColorStop(0,'rgba(255,255,255,.30)');
 gleam.addColorStop(.3,'rgba(255,255,255,.03)');
 gleam.addColorStop(.62,'rgba(17,37,47,.025)');
 gleam.addColorStop(1,'rgba(255,255,255,.20)');
 g.fillStyle=gleam;g.fillRect(0,0,W,H);
 g.lineCap='square';
 // Both edges show exactly 1-mm ticks, with 5-mm and 10-mm accents.
 for(let mm=0;mm<=150;mm++){
  const x=sx(mm*SCALE);
  const major=mm%10===0,mid=mm%5===0;
  const tick=major?78:mid?52:27;
  g.lineWidth=major?3.6:mid?2.9:2;
  g.strokeStyle=major?'#263842':'#344853';
  g.beginPath();g.moveTo(x,13);g.lineTo(x,13+tick);g.stroke();
  g.beginPath();g.moveTo(x,H-13);g.lineTo(x,H-13-tick);g.stroke();
  if(major){
   g.fillStyle='#1d303d';
   g.font='600 64px Arial, sans-serif';
   g.textAlign='center';g.textBaseline='middle';
   g.fillText(String(mm),x,H*.51);
  }
 }
 // The image is only the face; the circular hole is real 3D geometry.
 g.fillStyle='#3a5060';g.font='500 44px Arial, sans-serif';
 g.textAlign='center';g.fillText('мм',sx(460),H*.74);
 rulerTextureCanvas=c;return c;
}
const interactive=()=>mode!=='demo'&&!complete&&
  (mode==='explore'&&['line','ruler','compass'].includes(tool)||
   mode==='quest'&&(step===0&&['line','ruler'].includes(tool)||step===1&&tool==='compass'));
const kind=()=>tool==='compass'?'circle':'line';
window.GNSSDrafting3D={
 get intercepts(){return interactive()},
 get demoRunning(){return !!motion?.demo},
 get animating(){return !!motion||!!eraserMotion},
 get erasing(){return !!eraserMotion},
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
function previewDimensionText(shape){
 if(shape.type==='circle')
  return 'Ø '+(shape.r*2/SCALE).toLocaleString('uk-UA',{maximumFractionDigits:1})+' мм';
 const d=Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1);
 return (d/SCALE).toLocaleString('uk-UA',{maximumFractionDigits:1})+' мм';
}
function previewDimensionPosition(shape){
 const saved=Array.isArray(window.GNSSPublishedShapes)?window.GNSSPublishedShapes:[];
 const solver=window.GNSSDimensions;
 if(!solver)return null;
 // Keep already drawn labels fixed while the new stroke is being animated.
 const placed=solver.layout(saved,saved.map(previewDimensionText),{font:13});
 const preview=solver.layout([shape],[previewDimensionText(shape)],{
  font:14,obstacles:saved,reserved:placed.filter(Boolean).map(p=>p.box)
 });
 return preview[0]||null;
}
function display(shape,progress=null){
 preview.replaceChildren();
 if(!shape)return;
 const isCircle=shape.type==='circle';
 if(isCircle){
  const {x,y,r}=shape;
  preview.append(node('circle',{cx:x,cy:y,r:5,class:'gnss-point'}));
  if(r>1){
   const a0=Number.isFinite(shape.startAngle)?shape.startAngle:-Math.PI/2;
   preview.append(node('line',{x1:x,y1:y,x2:x+r*Math.cos(a0),y2:y+r*Math.sin(a0),class:'gnss-radius'}));
   preview.append(node('circle',{cx:x+r*Math.cos(a0),cy:y+r*Math.sin(a0),r:4.2,class:'gnss-point'}));
   if(progress===null){
    preview.append(node('circle',{cx:x,cy:y,r,class:'gnss-guide'}));
   }else{
    const n=Math.max(1,Math.ceil(progress*95));
    let d='';
    for(let i=0;i<=n;i++){
     const a=a0+2*Math.PI*progress*i/n;
     d+=(i?'L':'M')+(x+r*Math.cos(a)).toFixed(2)+' '+(y+r*Math.sin(a)).toFixed(2)+' ';
    }
    preview.append(node('path',{d,class:'gnss-drawn'}));
   }
   const dp=previewDimensionPosition(shape)||{x,y:y-r-28};
   preview.append(node('text',{x:dp.x,y:dp.y,class:'gnss-dimension','text-anchor':'middle'},
    progress===null
      ?'R '+(r/SCALE).toLocaleString('uk-UA',{maximumFractionDigits:1})+' мм'
      :previewDimensionText(shape)));
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
  const dp=previewDimensionPosition(shape)||{x:(a.x+b.x)/2+nx*30,y:(a.y+b.y)/2+ny*30-5};
  preview.append(node('text',{x:dp.x,y:dp.y,
    class:'gnss-dimension','text-anchor':'middle'
  },previewDimensionText(shape)));
 }
}
function geometry(){
 if(!first)return null;
 const next=cursor||first;
 return kind()==='circle'
  ?{type:'circle',x:first.x,y:first.y,r:Math.round(Math.hypot(next.x-first.x,next.y-first.y)/SCALE)*SCALE,
     startAngle:Math.atan2(next.y-first.y,next.x-first.x)}
  :{type:'line',x1:first.x,y1:first.y,x2:next.x,y2:next.y};
}
function valid(shape){
 const data={shape,accepted:false};
 document.dispatchEvent(new CustomEvent('gnss:draw-check',{detail:data}));
 return data.accepted;
}
function clear(){first=null;cursor=null;preview.replaceChildren()}
function cancel(){
 if(eraserMotion)cancelErase();
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
  ?{type:'circle',x:first.x,y:first.y,r:Math.round(Math.hypot(p.x-first.x,p.y-first.y)/SCALE)*SCALE,
     startAngle:Math.atan2(p.y-first.y,p.x-first.x)}
  :{type:'line',x1:first.x,y1:first.y,x2:p.x,y2:p.y};
 if(shape.type==='line'&&Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1)<24){feedback('↔ Потрібен довший відрізок');return}
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
 document.body.classList.toggle('gnss-eraser-ready',mode!=='demo'&&tool==='eraser'&&!complete);
 if(mode==='demo'&&!wasDemo)setTimeout(startDemo,130);
}
svg.addEventListener('pointerdown',pointerDown,true);
svg.addEventListener('pointermove',pointerMove,true);
svg.addEventListener('pointerleave',()=>{if(!motion&&first){cursor=null;display(geometry())}},true);
document.addEventListener('gnss:draft-state',sync);
document.addEventListener('click',e=>{
 if(e.target.closest('#engFloatUndo')&&(first||motion||eraserMotion)){
  e.preventDefault();e.stopImmediatePropagation();cancel();
 }
},true);
document.addEventListener('keydown',e=>{
 if((e.key==='Escape'||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'))&&(first||motion||eraserMotion)){
  e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();cancel();
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
  ruler=buildRuler();pencil=buildPencil();compass=buildCompass();eraser=buildEraser();
  scene.add(ruler,pencil,compass,eraser);ruler.visible=pencil.visible=compass.visible=eraser.visible=false;
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
 const T=three,group=new T.Group(),shape=new T.Shape(),r=3.4;
 const L=RULER_LEFT,R=RULER_RIGHT,U=RULER_TOP,D=RULER_BOTTOM;
 // Genuine rounded metal body, with real thickness and bevelled side faces.
 shape.moveTo(L+r,U);
 shape.lineTo(R-r,U);
 shape.quadraticCurveTo(R,U,R,U+r);
 shape.lineTo(R,D-r);
 shape.quadraticCurveTo(R,D,R-r,D);
 shape.lineTo(L+r,D);
 shape.quadraticCurveTo(L,D,L,D-r);
 shape.lineTo(L,U+r);
 shape.quadraticCurveTo(L,U,L+r,U);
 shape.closePath();
 // A physically cut hole rather than a dark circle painted on a texture.
 const eye=new T.Path();
 eye.absarc(469,-24.5,6.4,0,Math.PI*2,true);
 shape.holes.push(eye);
 const alloy=new T.MeshStandardMaterial({
  color:0xe0e9ee,metalness:.68,roughness:.28,
  side:T.DoubleSide
 });
 const body=new T.Mesh(new T.ExtrudeGeometry(shape,{
  depth:2.5,steps:1,bevelEnabled:true,bevelThickness:.8,
  bevelSize:.8,bevelSegments:3,curveSegments:32
 }),alloy);
 body.position.z=7;
 group.add(body);
 const artwork=getRulerArtwork();
 const texture=new T.CanvasTexture(artwork);
 texture.colorSpace=T.SRGBColorSpace;
 texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
 texture.minFilter=T.LinearMipmapLinearFilter;
 texture.magFilter=T.LinearFilter;
 texture.generateMipmaps=true;
 texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 const faceGeometry=new T.ShapeGeometry(shape,32);
 const xy=faceGeometry.attributes.position,uv=faceGeometry.attributes.uv;
 for(let i=0;i<xy.count;i++){
  uv.setXY(i,
   (xy.getX(i)-L)/(R-L),
   1-(xy.getY(i)-U)/(D-U));
 }
 uv.needsUpdate=true;
 const ink=new T.Mesh(faceGeometry,new T.MeshBasicMaterial({
  map:texture,side:T.DoubleSide,transparent:false,toneMapped:false
 }));
 ink.position.z=10.37;
 group.add(ink);
 // A real thin polished straight edge instead of the previous black beam.
 const lip=new T.Mesh(
  new T.BoxGeometry(R-L-12,.85,.6),
  new T.MeshStandardMaterial({color:0xf5ffff,metalness:.58,roughness:.2})
 );
 lip.position.set((L+R)/2,D-.6,10.1);
 group.add(lip);
 // Shape-conforming soft shadow; keeps the hole and rounded outline.
 const shadow=new T.Mesh(new T.ShapeGeometry(shape,24),
  new T.MeshBasicMaterial({color:0x021525,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide})
 );
 shadow.position.set(3,4,2);
 group.add(shadow);
 group.userData={isOrthographic:true,precisionMillimetres:150,zeroX:0,scalePerMm:SCALE};
 group.visible=false;
 return group;
}
function buildPencil(){
 // Premium top-down mechanical pencil: the graphite contact is EXACTLY (0,0).
 // All parts are genuine Three.js meshes. The drafting timeline is untouched.
 const T=three,g=new T.Group();
 const alloy=(color,metalness=.58,roughness=.27)=>
  new T.MeshStandardMaterial({color,metalness,roughness,side:T.FrontSide});
 const nickel=alloy(0xdbe5e9,.54,.24);
 const chrome=alloy(0xf0f7f8,.63,.19);
 const steelDark=alloy(0x637785,.5,.3);
 const navy=alloy(0x163c60,.29,.32);
 const navyDark=alloy(0x0b243d,.29,.34);
 const ink=alloy(0x20272d,.22,.52);
 const addCylinder=(top,bottom,height,y,z,mat,segments=48)=>{
  const m=new T.Mesh(new T.CylinderGeometry(top,bottom,height,segments),mat);
  m.position.set(0,y,z);g.add(m);return m;
 };
 const addRing=(radius,tube,y,z,mat)=>{
  const m=new T.Mesh(new T.TorusGeometry(radius,tube,8,48),mat);
  // A torus normally faces +Z. Rotate to encircle the pencil's Y-axis.
  m.rotation.x=Math.PI/2;m.position.set(0,y,z);
  g.add(m);return m;
 };
 // Reproducible high-resolution cross-hatch in the silver grip.
 // Applied as both color and micro-relief: no raster photo or perspective trick.
 const textureCanvas=document.createElement('canvas');
 textureCanvas.width=1024;textureCanvas.height=512;
 const tc=textureCanvas.getContext('2d');
 if(tc){
  const gr=tc.createLinearGradient(0,0,1024,0);
  gr.addColorStop(0,'#85939a');gr.addColorStop(.16,'#dce8e7');
  gr.addColorStop(.50,'#adbcc5');gr.addColorStop(.83,'#ecf4f1');
  gr.addColorStop(1,'#8799a2');
  tc.fillStyle=gr;tc.fillRect(0,0,1024,512);
  tc.lineWidth=1.9;tc.strokeStyle='rgba(32,48,58,.44)';
  for(let k=-620;k<1660;k+=19){
   tc.beginPath();tc.moveTo(k,0);tc.lineTo(k+520,512);tc.stroke();
   tc.beginPath();tc.moveTo(k,512);tc.lineTo(k+520,0);tc.stroke();
  }
  tc.lineWidth=.8;tc.strokeStyle='rgba(248,255,255,.65)';
  for(let k=-620;k<1660;k+=19){
   tc.beginPath();tc.moveTo(k+4,0);tc.lineTo(k+524,512);tc.stroke();
   tc.beginPath();tc.moveTo(k+4,512);tc.lineTo(k+524,0);tc.stroke();
  }
 }
 const knurlTex=new T.CanvasTexture(textureCanvas);
 knurlTex.colorSpace=T.SRGBColorSpace;
 knurlTex.anisotropy=Math.min(16,renderer?.capabilities.getMaxAnisotropy()||1);
 knurlTex.wrapS=T.RepeatWrapping;
 knurlTex.wrapT=T.RepeatWrapping;
 const knurlMat=new T.MeshStandardMaterial({
  map:knurlTex,bumpMap:knurlTex,bumpScale:.11,
  metalness:.34,roughness:.35
 });
 // The graphite lead runs up to local Y=0, the drawing contact coordinate.
 addCylinder(.72,.72,6,-3,25,ink,16);
 // Extended drafting lead sleeve: visible even at ordinary desktop zoom.
 addCylinder(1.35,1.6,14,-13,25,chrome,24);
 addRing(1.65,.30,-20,25,steelDark);
 // Machined conical metal nose tapers toward the contact point.
 addCylinder(1.85,6.6,24,-32,25,nickel,48);
 addCylinder(6.6,7.1,5,-46.5,25,chrome,48);
 addRing(7.2,.55,-48.5,25,steelDark);
 // Silver grip: full 3D cylindrical knurling, length 40.
 addCylinder(7.35,7.45,39,-70.5,25,knurlMat,64);
 addRing(7.45,.65,-51,25,chrome);
 addRing(7.5,.62,-90,25,chrome);
 // Slim, dark separator at the transition into the blue barrel.
 addCylinder(7.95,7.6,5.5,-92,25,navyDark);
 addRing(8.1,.5,-94,25,nickel);
 // Twelve-facet dark blue barrel reproduces the third reference silhouette.
 const bodyMat=new T.MeshStandardMaterial({
  color:0x143b61,metalness:.26,roughness:.33,flatShading:true
 });
 const barrel=addCylinder(8.25,8.4,81,-137,25,bodyMat,12);
 // Subtle recessed longitudinal channels, visible from the overhead camera.
 for(const x of [-4.6,-2.2,2.2,4.6]){
  const z=25+Math.sqrt(8.15*8.15-x*x)+.18;
  const groove=new T.Mesh(new T.BoxGeometry(.64,68,.42),
   x<0?navyDark:navy);
  groove.position.set(x,-137,z);g.add(groove);
 }
 const ridge=new T.Mesh(new T.BoxGeometry(1,69,.55),
  alloy(0x6c91b1,.24,.31));
 ridge.position.set(-1,-137,33.2);g.add(ridge);
 // Rear cap, polished rings and push-button in the same 3D assembly.
 addRing(8.3,.72,-177.6,25,chrome);
 addCylinder(7.9,7.1,10,-183,25,navyDark);
 addRing(7.65,.64,-187,25,nickel);
 addCylinder(6.8,6.8,11,-193,25,chrome);
 addCylinder(6.2,6.2,3.5,-200,25,steelDark);
 // Real raised silver pocket clip: broad, flat, rounded plate and mounting foot.
 const clipShape=new T.Shape();
 clipShape.moveTo(-2,-155);
 clipShape.quadraticCurveTo(-2.4,-157,-1.6,-160);
 clipShape.lineTo(-1.1,-174);
 clipShape.quadraticCurveTo(0,-177,1.8,-174);
 clipShape.lineTo(4.1,-121);
 clipShape.quadraticCurveTo(4.5,-118,2.1,-118);
 clipShape.lineTo(-.2,-118);
 clipShape.quadraticCurveTo(-2.2,-119,-2,-122);
 clipShape.closePath();
 const clip=new T.Mesh(new T.ExtrudeGeometry(clipShape,{
  depth:1.25,steps:1,bevelEnabled:true,bevelSize:.4,
  bevelThickness:.25,bevelSegments:2,curveSegments:8
 }),chrome);
 // Clip sits above the barrel, so the metal glints under the overhead light.
 clip.position.set(5,0,35.6);g.add(clip);
 const clipFoot=new T.Mesh(new T.BoxGeometry(6,6,2.2),nickel);
 clipFoot.position.set(7,-179,35);g.add(clipFoot);
 // No visual offset: the shader may add highlight, not change the ink point.
 g.userData={design:'premium-mechanical-pencil-v3',leadTip:{x:0,y:0},orthographic:true};
 g.visible=false;
 return g;
}
/* Precision drafting compass — all parts share one top-down physical 3D assembly.
 * Local needle contact (0,0); adjustable graphite contact (radius,0).
 * Both legs remain articulated. The needle does NOT orbit around the centre.
 */
function buildCompass(){
 const T=three,g=new T.Group();
 const steel=new T.MeshStandardMaterial({color:0xd6e1e7,metalness:.73,roughness:.26});
 const bright=new T.MeshStandardMaterial({color:0xf0f6f6,metalness:.65,roughness:.18});
 const edge=new T.MeshStandardMaterial({color:0x607681,metalness:.72,roughness:.32});
 const brushed=new T.MeshStandardMaterial({color:0xb9c8d1,metalness:.58,roughness:.37});
 const dark=new T.MeshStandardMaterial({color:0x26363e,metalness:.46,roughness:.36});
 const needleMat=new T.MeshStandardMaterial({color:0x889ca7,metalness:.82,roughness:.18});
 const graphite=new T.MeshStandardMaterial({color:0x202c32,metalness:.24,roughness:.54});
 const add=(parent,geometry,mat,x=0,y=0,z=25)=>{
  const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;
 };
 const disk=(parent,x,y,r,mat,z=27,thickness=3)=>{
  const m=add(parent,new T.CylinderGeometry(r,r,thickness,48),mat,x,y,z);
  m.rotation.x=Math.PI/2;return m;
 };
 const rod=(parent,rad,length,x,y,z,mat)=>{
  return add(parent,new T.CylinderGeometry(rad,rad,length,32),mat,x,y,z);
 };
 // Leaf-like legs with chamfered sides and a recess rather than plain cylinders.
 function makeLeg(isPencil){
  const leg=new T.Group();g.add(leg);
  const sh=new T.Shape();
  sh.moveTo(-6.3,5);sh.lineTo(6.3,5);sh.lineTo(8.2,14);
  sh.lineTo(8.2,117);sh.quadraticCurveTo(8.2,131,7,139);
  sh.lineTo(5.4,146);sh.lineTo(-5.4,146);sh.lineTo(-7,139);
  sh.quadraticCurveTo(-8.2,131,-8.2,117);
  sh.lineTo(-8.2,14);sh.closePath();
  const body=add(leg,new T.ExtrudeGeometry(sh,{
   depth:2.9,bevelEnabled:true,bevelThickness:.75,bevelSize:.75,
   bevelSegments:3,steps:1,curveSegments:16
  }),steel,0,0,22);
  const groove=add(leg,new T.BoxGeometry(2.3,79,.55),edge,0,66,27.1);
  const grooveLight=add(leg,new T.BoxGeometry(.75,77,.42),bright,-.45,66,27.52);
  const screw=disk(leg,0,132,4.7,bright,29.4,2.3);
  disk(leg,0,132,2,edge,31,1);
  // A real adjustable metal sleeve and sharpened tip.
  const sleeve=rod(leg,5.3,17,0,153,25,brushed);
  rod(leg,5.7,4,0,144,25,bright);
  // Cylinder + cone finishes with a physical local contact at y=164.
  if(isPencil){
   rod(leg,3.4,11,0,154.5,26,edge);
   const tip=add(leg,new T.ConeGeometry(2.65,11,24),graphite,0,158.5,26);
   // ConeGeometry points along +Y, apex = 164 exactly.
   add(leg,new T.BoxGeometry(2,7,.7),bright,-.45,151,31.2);
  }else{
   const point=add(leg,new T.ConeGeometry(2.3,15,24),needleMat,0,156.5,26);
   // Apex y=164; guide needle is at the EXACT pivot of the circle.
  }
  return leg;
 }
 const left=makeLeg(false),right=makeLeg(true);
 // Joint support and precision round hinged cover.
 const pivot=new T.Group();g.add(pivot);
 disk(pivot,0,0,19,edge,30,4);
 disk(pivot,0,0,16,steel,32.1,2.7);
 disk(pivot,0,0,12,brushed,34.3,1);
 disk(pivot,0,0,4.5,bright,35.4,2.8);
 disk(pivot,0,0,1.5,edge,37.2,1);
 const crown=rod(pivot,5,20,0,-31,29,steel);
 rod(pivot,8,4,0,-39,30,bright);
 const handle=rod(pivot,7.2,28,0,-58,30,brushed);
 // Lathe-like narrow rings give tactile knurling to the turn knob.
 for(let i=0;i<10;i++){
  const y=-70+i*2.7;
  const ring=add(pivot,new T.TorusGeometry(7.25,.44,6,24),edge,0,y,30);
  ring.rotation.x=Math.PI/2;
 }
 const screwGroup=new T.Group();g.add(screwGroup);
 const bar=rod(screwGroup,2.4,1,0,0,24,brushed);
 bar.rotation.z=Math.PI/2;
 const leftNut=disk(screwGroup,0,0,5.1,edge,27.4,2);
 const rightNut=disk(screwGroup,0,0,5.1,edge,27.4,2);
 const adjustWheel=disk(screwGroup,0,0,9,steel,30,5.5);
 const adjustCore=disk(screwGroup,0,0,4.4,bright,33.5,1.6);
 // Radial grooves on adjustment wheel — visible in orthographic overhead view.
 for(let i=0;i<24;i++){
  const theta=i*Math.PI/12;
  const m=add(screwGroup,new T.BoxGeometry(1.05,3,.9),edge,
    Math.cos(theta)*7.6,Math.sin(theta)*7.6,33);
  m.rotation.z=theta;
 }
 const shadow=new T.Group();g.add(shadow);
 const shadowMat=new T.MeshBasicMaterial({
  color:0x061a29,transparent:true,opacity:.12,depthWrite:false
 });
 const spot=add(shadow,new T.CircleGeometry(15,32),shadowMat,0,0,-1);
 function pose(radius){
  const r=Math.max(7,radius);
  // A fixed-length impression for normal radii; wider-opening tools remain legible.
  const hingeH=Math.max(105,Math.min(170,158-r*.15));
  const hx=r/2,hy=-hingeH;
  pivot.position.set(hx,hy,0);
  const locate=(leg,footX)=>{
   const dx=footX-hx,dy=-hy,length=Math.hypot(dx,dy);
   leg.position.set(hx,hy,0);
   // Local positive Y points downwards toward the feet.
   leg.rotation.z=-Math.atan2(dx,dy);
   leg.scale.set(1,length/164,1);
  };
  locate(left,0);locate(right,r);
  const u=.57,cy=hy*(1-u),from=r*(1-u)/2,to=r*(1+u)/2;
  screwGroup.position.set(0,0,0);
  bar.position.set(r/2,cy,24);
  bar.scale.y=Math.max(1,Math.abs(to-from));
  leftNut.position.set(from,cy,27.4);
  rightNut.position.set(to,cy,27.4);
  adjustWheel.position.set(r/2,cy,30);
  adjustCore.position.set(r/2,cy,33.5);
  // Wheel grooves are local to screwGroup; recenter around wheel.
  for(const child of screwGroup.children){
   if(child===bar||child===leftNut||child===rightNut||child===adjustWheel||child===adjustCore)continue;
   if(!child.userData.basePosition)child.userData.basePosition=child.position.clone();
   child.position.copy(child.userData.basePosition).add(new T.Vector3(r/2,cy,0));
  }
  shadow.position.set(hx,hy,0);
  g.userData.radius=r;
  // Invariant: left needle at 0,0; graphite point at (r,0).
  g.userData.needleContact={x:0,y:0};
  g.userData.graphiteContact={x:r,y:0};
 }
 g.userData={pose,design:'precision-steel-compass-v2',orthographic:true};
 pose(96);
 g.visible=false;
 return g;
}
/* Premium drafting eraser. True 3D rubber with softly beveled corners
 * and a deep blue wrap, seen orthographically from the fixed top camera.
 */
function buildEraser(){
 const T=three,g=new T.Group();
 const offWhite=new T.MeshStandardMaterial({color:0xe4e9e5,roughness:.84,metalness:0});
 const edgeRubber=new T.MeshStandardMaterial({color:0xbfc8c7,roughness:.95,metalness:0});
 const navy=new T.MeshStandardMaterial({color:0x17385e,roughness:.58,metalness:.08});
 const navySide=new T.MeshStandardMaterial({color:0x09233f,roughness:.6,metalness:.05});
 const rounded=(left,right,top,bottom,r,z,height,mat)=>{
  const sh=new T.Shape();
  sh.moveTo(left+r,top);sh.lineTo(right-r,top);sh.quadraticCurveTo(right,top,right,top+r);
  sh.lineTo(right,bottom-r);sh.quadraticCurveTo(right,bottom,right-r,bottom);
  sh.lineTo(left+r,bottom);sh.quadraticCurveTo(left,bottom,left,bottom-r);
  sh.lineTo(left,top+r);sh.quadraticCurveTo(left,top,left+r,top);sh.closePath();
  const obj=new T.Mesh(new T.ExtrudeGeometry(sh,{
   depth:height,bevelEnabled:true,bevelThickness:1.6,
   bevelSize:1.5,bevelSegments:3,steps:1,curveSegments:12
  }),mat);
  obj.position.z=z;g.add(obj);return obj;
 };
 // 87 × 39 × 11 mm: white rubber nose + removable midnight-blue sleeve.
 rounded(-47,42,-19,19,5,10,9,offWhite);
 rounded(-15,44,-20.2,20.2,3.8,15,4,navy);
 const stripe=new T.Mesh(new T.BoxGeometry(49,1.1,.35),
  new T.MeshBasicMaterial({color:0x7c9eb9}));
 stripe.position.set(13,-13,21);g.add(stripe);
 // Label is physically printed on the upper face, never a UI card.
 const texCanvas=document.createElement('canvas');
 texCanvas.width=512;texCanvas.height=180;
 const ct=texCanvas.getContext('2d');
 if(ct){
  ct.clearRect(0,0,512,180);ct.fillStyle='#e8f4f1';ct.font='600 54px Arial,sans-serif';
  ct.textAlign='center';ct.textBaseline='middle';ct.fillText('ERASER',256,82);
  ct.fillStyle='#8dabbf';ct.font='400 26px Arial,sans-serif';ct.fillText('GNSS LAB',256,136);
 }
 const labelTex=new T.CanvasTexture(texCanvas);labelTex.colorSpace=T.SRGBColorSpace;
 const label=new T.Mesh(new T.PlaneGeometry(47,16),
  new T.MeshBasicMaterial({map:labelTex,transparent:true,depthWrite:false,side:T.DoubleSide}));
 label.position.set(13,2,22.35);g.add(label);
 // A thin low-opacity contact shadow, hidden when no animation is active.
 const shade=new T.Mesh(new T.PlaneGeometry(87,41),
  new T.MeshBasicMaterial({color:0x011d30,transparent:true,opacity:.13,depthWrite:false}));
 shade.position.set(4,3,7.5);g.add(shade);
 g.userData={design:'technical-eraser-v1',orthographic:true};
 g.visible=false;
 return g;
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
 if(eraser)eraser.visible=false;
 if(ctx)ctx.clearRect(0,0,w,h);
}
/* Timed measured passes: the ruler is always exactly 150 mm long.
 * An arbitrary long A-B segment is drawn with consecutive ruler placements.
 */
function linePlan(shape,reduced=false){
 const L=Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1);
 const parts=[];
 const count=Math.max(1,Math.ceil(L/RULER_SPAN));
 for(let i=0;i<count;i++){
  const from=i*RULER_SPAN,to=Math.min(L,(i+1)*RULER_SPAN);
  parts.push({from,to,ms:reduced?90:Math.max(430,Math.round(1060*(to-from)/RULER_SPAN))});
 }
 const intro=reduced?45:590,lead=reduced?30:270,shift=reduced?35:410,outro=reduced?40:360;
 const duration=intro+lead+parts.reduce((sum,p)=>sum+p.ms,0)+shift*(parts.length-1)+outro;
 return {L,parts,intro,lead,shift,outro,duration};
}
function linePose(plan,elapsed){
 let ms=clamp(elapsed,0,plan.duration),p=plan.parts;
 const base={phase:'park',draw:0,offset:0,entry:1,pencilVisible:false,lift:0,penLift:0};
 if(ms<plan.intro)return {...base,phase:'enter',entry:ease(ms/plan.intro),lift:1-ease(ms/plan.intro)};
 ms-=plan.intro;
 if(ms<plan.lead)return {...base,phase:'approach',pencilVisible:true,penLift:1-ease(ms/plan.lead)};
 ms-=plan.lead;
 for(let i=0;i<p.length;i++){
  const seg=p[i];
  if(ms<seg.ms){
   const u=clamp(ms/seg.ms,0,1);
   return {...base,phase:'trace',pass:i,draw:(seg.from+(seg.to-seg.from)*u)/plan.L,
     offset:seg.from,pencilVisible:true,penLift:0};
  }
  ms-=seg.ms;
  if(i<p.length-1){
   if(ms<plan.shift){
    const u=ease(ms/plan.shift);
    return {...base,phase:'shift',pass:i,draw:seg.to/plan.L,
      offset:lerp(seg.from,p[i+1].from,u),pencilVisible:true,
      penLift:Math.sin(Math.PI*u),lift:Math.sin(Math.PI*u)};
   }
   ms-=plan.shift;
  }
 }
 return {...base,phase:'exit',pass:p.length-1,draw:1,offset:p[p.length-1].from,
  pencilVisible:true,penLift:ease(ms/plan.outro),lift:ease(ms/plan.outro)};
}
// Animation only. Input remains cursor-only: centre, radius, then replay.
function circlePose(t,radius){
 const t01=clamp(t,0,1),closed=Math.max(5,radius*.25),open=ease((t01-.25)/.17);
 let phase='draw';
 if(t01<.14)phase='appear';
 else if(t01<.25)phase='place';
 else if(t01<.42)phase='open';
 else if(t01<.47)phase='settle';
 else if(t01<.90)phase='draw';
 else if(t01<.96)phase='lift';
 else phase='exit';
 const positioned=ease(t01/.25);
 const exiting=ease((t01-.96)/.04);
 const lift=t01<.14?1-ease(t01/.14):t01>.90?ease((t01-.90)/.10):0;
 return {
  phase,
  radius:lerp(closed,radius,open),
  draw:clamp((t01-.47)/.43,0,1),
  shiftX:-65*(1-positioned)+42*exiting,
  shiftY:-55*(1-positioned)-24*exiting,
  lift
 };
}
function paintFallback(shape,t,progress,pose){
 if(!ctx)ctx=fallback.getContext('2d');
 if(!ctx)return;
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const scale=unitScale(),p=shape.type==='line'
  ?screen({x:shape.x1,y:shape.y1}):screen({x:shape.x,y:shape.y});
 ctx.save();
 if(shape.type==='line'){
  const a=screen({x:shape.x1,y:shape.y1}),b=screen({x:shape.x2,y:shape.y2});
  const angle=Math.atan2(b.y-a.y,b.x-a.x),ux=Math.cos(angle),uy=Math.sin(angle);
  const P=pose||{offset:0,entry:ease(t/.2),draw:progress,pencilVisible:t>.2,penLift:0,lift:0,phase:'trace'};
  const ox=(P.offset-(1-P.entry)*55)*scale;
  const oy=-(1-P.entry)*25*scale-P.lift*12*scale;
  ctx.translate(a.x+ux*ox,a.y+uy*ox+oy);
  ctx.rotate(angle);ctx.scale(scale,scale);
  ctx.shadowColor='#001c30a0';ctx.shadowBlur=11;ctx.shadowOffsetY=6;
  ctx.drawImage(getRulerArtwork(),RULER_LEFT,RULER_TOP,
    RULER_RIGHT-RULER_LEFT,RULER_BOTTOM-RULER_TOP);
  ctx.shadowBlur=0;
  ctx.restore();ctx.save();
  if(P.pencilVisible&&P.phase!=='enter'){
   const x=lerp(a.x,b.x,P.draw),y=lerp(a.y,b.y,P.draw);
   ctx.translate(x,y-12*P.penLift*scale);ctx.rotate(-.20);ctx.scale(scale,scale);
   ctx.shadowColor='rgba(1,17,31,.50)';ctx.shadowBlur=12;ctx.shadowOffsetX=6;ctx.shadowOffsetY=8;
   const tube=(top,bottom,r,stops)=>{
    const grad=ctx.createLinearGradient(-r,0,r,0);
    stops.forEach(([at,color])=>grad.addColorStop(at,color));
    ctx.fillStyle=grad;ctx.fillRect(-r,top,2*r,bottom-top);
   };
   const blue=[[0,'#091d34'],[.22,'#173e68'],[.49,'#315d88'],[.82,'#10365d'],[1,'#071b30']];
   const silver=[[0,'#657b87'],[.19,'#d2e0e1'],[.47,'#f2f6f2'],[.7,'#a5b8c1'],[1,'#526c7c']];
   tube(-198,-188,6.5,silver);
   tube(-188,-176,7.8,blue);
   tube(-176,-95,8.2,blue);
   ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
   ctx.lineWidth=.65;
   for(const gx of [-4.3,-1.9,2.2,4.6]){
    ctx.strokeStyle=gx<0?'#071f3a':'#7396b555';
    ctx.beginPath();ctx.moveTo(gx,-170);ctx.lineTo(gx,-100);ctx.stroke();
   }
   tube(-95,-90,7.9,silver);
   tube(-90,-51,7.45,silver);
   ctx.save();ctx.beginPath();ctx.rect(-7.45,-90,14.9,39);ctx.clip();
   ctx.lineWidth=.57;
   for(let yy=-113;yy<-35;yy+=3.4){
    ctx.strokeStyle='rgba(45,67,75,.62)';
    ctx.beginPath();ctx.moveTo(-9,yy);ctx.lineTo(9,yy+18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-9,yy+18);ctx.lineTo(9,yy);ctx.stroke();
   }
   ctx.restore();
   tube(-51,-46,7.1,silver);
   ctx.fillStyle='#d7e4e6';ctx.beginPath();
   ctx.moveTo(-6.9,-46);ctx.lineTo(6.9,-46);
   ctx.lineTo(1.7,-19);ctx.lineTo(-1.7,-19);ctx.closePath();ctx.fill();
   tube(-19,-6,1.55,silver);
   ctx.strokeStyle='#20292f';ctx.lineWidth=1.4;
   ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,0);ctx.stroke();
   // Polished sprung pocket clip, visually above the dark-blue barrel.
   ctx.strokeStyle='#e5edf0';ctx.lineWidth=3.4;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(9.1,-177);ctx.lineTo(11.2,-161);
   ctx.lineTo(10.1,-119);ctx.stroke();
   ctx.strokeStyle='#839eac';ctx.lineWidth=.8;
   ctx.beginPath();ctx.moveTo(11.4,-160);ctx.lineTo(10.4,-121);ctx.stroke();
  }
 }else{
  const cp=circlePose(t,shape.r),center=screen({x:shape.x,y:shape.y});
  const r=cp.radius*scale,hingeH=Math.max(105,Math.min(170,158-cp.radius*.15))*scale;
  const phase=(shape.startAngle??-Math.PI/2)+Math.PI*2*cp.draw;
  ctx.translate(center.x+cp.shiftX*scale,center.y+cp.shiftY*scale-cp.lift*14*scale);
  ctx.rotate(phase);
  const grad=ctx.createLinearGradient(-9,0,9,0);
  grad.addColorStop(0,'#657e8d');grad.addColorStop(.26,'#eaf4f2');
  grad.addColorStop(.55,'#b5c7cd');grad.addColorStop(.8,'#f2f5f3');
  grad.addColorStop(1,'#57717e');
  ctx.strokeStyle='#021a2a99';ctx.lineWidth=18*scale;ctx.lineCap='round';
  ctx.shadowColor='#001a2ba6';ctx.shadowBlur=10;ctx.shadowOffsetY=6;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r/2,-hingeH);ctx.lineTo(r,0);ctx.stroke();
  ctx.shadowBlur=0;ctx.lineWidth=14*scale;ctx.strokeStyle=grad;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r/2,-hingeH);ctx.lineTo(r,0);ctx.stroke();
  const cy=-hingeH*.43,left=r*.215,right=r*.785;
  ctx.lineWidth=4*scale;ctx.strokeStyle='#c4d8db';
  ctx.beginPath();ctx.moveTo(left,cy);ctx.lineTo(right,cy);ctx.stroke();
  ctx.fillStyle='#b4c6d0';ctx.beginPath();ctx.arc(r/2,-hingeH,17*scale,0,2*Math.PI);ctx.fill();
  ctx.strokeStyle='#607481';ctx.lineWidth=4*scale;ctx.stroke();
  ctx.fillStyle='#f0f6f5';ctx.beginPath();ctx.arc(r/2,-hingeH,4*scale,0,2*Math.PI);ctx.fill();
  ctx.fillStyle='#c3d4da';ctx.fillRect(r/2-5*scale,-hingeH-62*scale,10*scale,42*scale);
  ctx.fillStyle='#d4e6e8';ctx.beginPath();ctx.arc(r/2,cy,9*scale,0,2*Math.PI);ctx.fill();
  ctx.strokeStyle='#566e7b';ctx.lineWidth=2*scale;ctx.stroke();
  ctx.fillStyle='#1b2a30';ctx.beginPath();ctx.arc(r,0,2.4*scale,0,2*Math.PI);ctx.fill();
 }
 ctx.restore();
}
function paint3D(shape,t,progress,pose){
 if(!renderer||!three){paintFallback(shape,t,progress,pose);return}
 const sc=unitScale();
 ruler.visible=pencil.visible=compass.visible=false;
 if(shape.type==='line'){
  const a=screen({x:shape.x1,y:shape.y1}),b=screen({x:shape.x2,y:shape.y2});
  const angle=Math.atan2(b.y-a.y,b.x-a.x),ux=Math.cos(angle),uy=Math.sin(angle);
  const P=pose||{offset:0,entry:ease(t/.2),draw:progress,pencilVisible:t>.2,penLift:0,lift:0,phase:'trace'};
  const slide=(P.offset-(1-P.entry)*55)*sc;
  ruler.visible=P.phase!=='exit'||P.lift<.85;
  ruler.scale.setScalar(sc);
  ruler.rotation.set(0,0,angle);
  ruler.position.set(
   a.x+ux*slide,
   a.y+uy*slide-(1-P.entry)*25*sc-P.lift*12*sc,
   5+P.lift*15
  );
  if(P.pencilVisible){
   pencil.visible=true;pencil.scale.setScalar(sc);
   let px=lerp(a.x,b.x,P.draw),py=lerp(a.y,b.y,P.draw);
   if(P.phase==='approach'){
    const lead=1-P.penLift;
    px=lerp(a.x-65*sc,a.x,lead);
    py=lerp(a.y-80*sc,a.y,lead);
   }
   pencil.position.set(px,py,14+P.penLift*22);
   pencil.rotation.set(0,0,-.20);
  }
 }else{
  const center=screen({x:shape.x,y:shape.y}),p=circlePose(t,shape.r);
  compass.visible=true;
  compass.scale.setScalar(sc);
  compass.userData.pose(p.radius);
  compass.position.set(center.x+p.shiftX*sc,center.y+p.shiftY*sc,6+p.lift*20);
  compass.rotation.z=(shape.startAngle??-Math.PI/2)+Math.PI*2*p.draw;
 }
 renderer.render(scene,camera);
}
// One-click erase. The engine preserves the original SVG record until this
// performance finishes. Every frame removes the ink underneath the moving tip.
function cancelErase(){
 if(!eraserMotion)return;
 const old=eraserMotion;eraserMotion=null;
 cancelAnimationFrame(old.frame);
 preview.replaceChildren();
 finishScene();
 document.body.classList.remove('gnss-draft-animating','gnss-eraser-active');
 document.dispatchEvent(new CustomEvent('gnss:erase-cancel'));
}
// Keep animation coordinates finite even if pointer metadata is incomplete.
// A shape's stored geometry, not the hit click, defines the physical wiping path.
function validatedEraseHit(data){
 const source=data?.shape;
 if(!source||!['line','circle'].includes(source.type))return null;
 const shape={...source};
 const keys=shape.type==='line'?['x1','y1','x2','y2']:['x','y','r'];
 if(keys.some(key=>!Number.isFinite(shape[key])))return null;
 if(shape.type==='line'&&Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1)<1)return null;
 if(shape.type==='circle'&&shape.r<=0)return null;
 let at={...data?.at};
 if(!Number.isFinite(at.x)||!Number.isFinite(at.y)){
  at=shape.type==='line'?{x:shape.x1,y:shape.y1}:{x:shape.x+shape.r,y:shape.y};
 }
 if(shape.type==='line'){
  const dx=shape.x2-shape.x1,dy=shape.y2-shape.y1;
  const dot=((at.x-shape.x1)*dx+(at.y-shape.y1)*dy)/(dx*dx+dy*dy);
  const u=clamp(Number.isFinite(dot)?dot:0,0,1);
  at={x:shape.x1+dx*u,y:shape.y1+dy*u};
 }else{
  const angle=Math.atan2(at.y-shape.y,at.x-shape.x);
  at={x:shape.x+shape.r*Math.cos(angle),y:shape.y+shape.r*Math.sin(angle)};
 }
 return {shape,at};
}
function eraserPathPosition(data,time){
 const shape=data.shape,at=data.at,t=clamp(Number.isFinite(time)?time:0,0,1);
 const travel=clamp((t-.13)/.73,0,1);
 const enter=ease(t/.13),exiting=ease((t-.86)/.14);
 if(shape.type==='line'){
  const dx=shape.x2-shape.x1,dy=shape.y2-shape.y1;
  const angle=Math.atan2(dy,dx);
  const x=lerp(lerp(at.x,shape.x1,enter),shape.x2,travel);
  const y=lerp(lerp(at.y,shape.y1,enter),shape.y2,travel);
  const wobble=travel>0&&travel<1?Math.sin(travel*13*Math.PI)*2:0;
  return {x:x-Math.sin(angle)*wobble+Math.cos(angle)*exiting*24,
   y:y+Math.cos(angle)*wobble+Math.sin(angle)*exiting*24,
   angle:angle+.2+Math.sin(travel*9*Math.PI)*.027,
   progress:travel,lift:(1-enter)*13+exiting*17};
 }
 const initialAngle=Math.atan2(at.y-shape.y,at.x-shape.x);
 const angle=initialAngle+travel*Math.PI*2;
 return {x:shape.x+shape.r*Math.cos(angle)+Math.cos(angle)*exiting*23,
  y:shape.y+shape.r*Math.sin(angle)+Math.sin(angle)*exiting*23,
  angle:angle+Math.PI/2+.2,
  progress:travel,lift:(1-enter)*12+exiting*20};
}
function paintEraserFallback(pose){
 if(!ctx)ctx=fallback.getContext('2d');
 if(!ctx)return;
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const sc=unitScale(),p=screen(pose);
 ctx.save();ctx.translate(p.x,p.y-pose.lift*sc);
 ctx.rotate(pose.angle);ctx.scale(sc,sc);
 ctx.shadowColor='#00192791';ctx.shadowBlur=9;ctx.shadowOffsetY=6;
 const rubber=ctx.createLinearGradient(0,-20,0,20);
 rubber.addColorStop(0,'#f7faf6');rubber.addColorStop(.52,'#e2e9e6');
 rubber.addColorStop(1,'#a8bac1');
 ctx.fillStyle=rubber;ctx.beginPath();ctx.roundRect(-47,-19,89,38,5);ctx.fill();
 ctx.shadowBlur=0;
 const sleeve=ctx.createLinearGradient(0,-21,0,21);
 sleeve.addColorStop(0,'#426785');sleeve.addColorStop(.38,'#17395f');
 sleeve.addColorStop(1,'#0b243e');ctx.fillStyle=sleeve;
 ctx.beginPath();ctx.roundRect(-15,-20,59,40,3);ctx.fill();
 ctx.strokeStyle='#8aafc7';ctx.lineWidth=1.1;
 ctx.beginPath();ctx.moveTo(-10,-13);ctx.lineTo(38,-13);ctx.stroke();
 ctx.fillStyle='#e9f4f5';ctx.font='600 10px Arial,sans-serif';
 ctx.textAlign='center';ctx.fillText('ERASER',12,1);
 ctx.fillStyle='#8cbed2';ctx.font='6px Arial,sans-serif';
 ctx.fillText('GNSS LAB',12,9);
 ctx.restore();
}
function paintEraseDust(pose,t){
 preview.replaceChildren();
 if(t<.14||t>.95)return;
 const opacity=clamp(1-Math.abs(t-.6)*1.7,0,.72);
 const sc=unitScale(),p=pose,angle=pose.angle;
 for(let i=0;i<5;i++){
  const side=(i%2?1:-1)*(5+i*2);
  const back=-i*4;
  const x=p.x+Math.cos(angle)*back-Math.sin(angle)*side;
  const y=p.y+Math.sin(angle)*back+Math.cos(angle)*side;
  preview.append(node('ellipse',{
   cx:x,cy:y,rx:1.25+(i%3)*.5,ry:.8+(i%2)*.4,
   fill:i%2?'#f0f4ec':'#b8c7c5',
   opacity:(opacity*(.9-i*.08)).toFixed(3),
   transform:'rotate('+(angle*180/Math.PI)+' '+x+' '+y+')'
  }));
 }
}
function beginErase(data){
 if(eraserMotion||motion||mode==='demo'||tool!=='eraser'||complete)return false;
 const verified=validatedEraseHit(data);
 if(!verified||!Number.isInteger(data.index)||data.index<0)return false;
 // Reduced-motion mode keeps the wipe visual but compresses its duration.
 const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?220:1050;
 const active={index:data.index,shape:verified.shape,at:verified.at,duration,start:performance.now(),frame:0};
 eraserMotion=active;preview.replaceChildren();showStage();
 document.body.classList.add('gnss-draft-animating','gnss-eraser-active');
 document.dispatchEvent(new CustomEvent('gnss:erase-progress',{
  detail:{index:active.index,progress:0,at:active.at}
 }));
 function frame(now){
  if(eraserMotion!==active)return;
  try{
   const elapsed=Number.isFinite(now)?now-active.start:performance.now()-active.start;
   const t=clamp(elapsed/duration,0,1);
   const pose=eraserPathPosition(active,t);
   if(![pose.x,pose.y,pose.angle,pose.lift,pose.progress].every(Number.isFinite)){
    throw new Error('Invalid eraser animation coordinates');
   }
   document.dispatchEvent(new CustomEvent('gnss:erase-progress',{
    detail:{index:active.index,progress:pose.progress,at:active.at}
   }));
   if(renderer&&three&&eraser){
    ruler.visible=pencil.visible=compass.visible=false;
    eraser.visible=true;eraser.scale.setScalar(unitScale());
    const xy=screen(pose);
    if(!Number.isFinite(xy.x)||!Number.isFinite(xy.y))
     throw new Error('Eraser screen transform not finite');
    eraser.position.set(xy.x,xy.y,10+pose.lift);
    eraser.rotation.set(0,0,pose.angle);
    renderer.render(scene,camera);
   }else paintEraserFallback(pose);
   paintEraseDust(pose,t);
   if(t>=1){
    eraserMotion=null;preview.replaceChildren();finishScene();
    document.body.classList.remove('gnss-draft-animating','gnss-eraser-active');
    document.dispatchEvent(new CustomEvent('gnss:erase-commit',{
     detail:{index:active.index,shape:active.shape}
    }));
    return;
   }
   active.frame=requestAnimationFrame(frame);
  }catch(error){
   console.error('GNSS LAB: eraser animation cancelled safely',error);
   cancelErase();
  }
 }
 active.frame=requestAnimationFrame(frame);
 return true;
}
document.addEventListener('gnss:erase-start',e=>{
 const detail=e.detail||{};
 detail.accepted=beginErase(detail);
});
function play(shape,demo=false){
 if(motion)cancel();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const plan=shape.type==='line'?linePlan(shape,reduced):null;
 const duration=plan?plan.duration:reduced?400:4200;
 const playback={shape,demo,started:performance.now(),duration,plan,paused:false,pausedAt:0,progress:0};
 motion=playback;
 if(demo)document.dispatchEvent(new CustomEvent('gnss:ruler-demo-begin'));
 document.body.classList.add('gnss-draft-animating');
 showStage();display(shape,0);
 function animate(now){
  if(motion!==playback)return;
  if(playback.paused){animationHandle=requestAnimationFrame(animate);return}
  const t=clamp((now-playback.started)/duration,0,1);
  const pose=plan?linePose(plan,clamp(now-playback.started,0,duration)):null;
  const cp=shape.type==='circle'?circlePose(t,shape.r):null;
  const fraction=pose?pose.draw:cp?cp.draw:0;
  playback.progress=fraction;
  display(shape,(pose?.phase==='enter'||pose?.phase==='approach'||(cp&&t<.47))?null:fraction);
  paint3D(shape,t,fraction,pose);
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
