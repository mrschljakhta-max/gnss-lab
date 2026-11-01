/* GNSS LAB / A-B caliper visual. One physical Three.js model follows
 * the exact same geometry as the SVG interaction overlay (which is fallback).
 */
(function(){
'use strict';
const board=document.getElementById('engBoard');
const drafting=document.getElementById('gfcSvg');
if(!board||!drafting)return;
const host=document.createElement('div');
host.id='gfcThreeStage';host.setAttribute('aria-hidden','true');
host.style.cssText='position:absolute;inset:0;z-index:11;pointer-events:none;overflow:hidden;display:none';
const canvas=document.createElement('canvas');
canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block';
host.append(canvas);board.append(host);
let T,renderer,scene,camera,instrument,slider,thumb,ready=false;
let pose={active:false},lastX=NaN,W=0,H=0,raf=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function mat(color,metal=.66,rough=.28){
 return new T.MeshStandardMaterial({color,metalness:metal,roughness:rough});
}
function box(parent,w,h,d,x,y,z,m){
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function disc(parent,x,y,z,r,depth,m){
 const mesh=new T.Mesh(new T.CylinderGeometry(r,r,depth,40),m);
 mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function segments(parent,lines,color=0x264554){
 if(!lines.length)return;
 const v=[];
 for(const [a,b,c,d,z] of lines)v.push(a,b,z,c,d,z);
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(v,3));
 const item=new T.LineSegments(geo,new T.LineBasicMaterial({color,linewidth:1}));
 parent.add(item);return item;
}
function typeface(text,size=11){
 const cv=document.createElement('canvas');
 cv.width=128;cv.height=48;
 const ctx=cv.getContext('2d');
 if(!ctx)return null;
 ctx.clearRect(0,0,128,48);ctx.font='bold 26px Arial, sans-serif';
 ctx.fillStyle='#234454';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText(text,64,24);
 const tx=new T.CanvasTexture(cv);
 tx.colorSpace=T.SRGBColorSpace;
 return new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false});
}
function label(parent,text,x,y,size=14,z=11){
 const m=typeface(String(text));if(!m)return;
 const obj=new T.Mesh(new T.PlaneGeometry(size*2.4,size),m);
 obj.position.set(x,y,z);parent.add(obj);
}
function geometry(){
 instrument=new T.Group();scene.add(instrument);
 const alloy=mat(0xc9d8dc,.73,.23),light=mat(0xf3faf8,.65,.22),
  dark=mat(0x546f7e,.56,.3),shadow=mat(0x274859,.44,.36),
  grip=mat(0xb7cbd1,.72,.23);
 // A precision straightedge: 170 mm, scale fixed at 3 model units / mm.
 box(instrument,560,51,7,243,17,1,dark);
 box(instrument,559,45,5,243,17,6,alloy);
 box(instrument,558,4,2,243,-4,9,light);
 box(instrument,558,2,1,243,38,10,shadow);
 const marks=[];
 for(let mm=0;mm<=170;mm++){
  const xx=3*mm;
  marks.push([xx,4,xx,mm%10===0?18:mm%5===0?14:10,10.5]);
  if(mm%10===0)label(instrument,mm,xx,31,9,11);
 }
 segments(instrument,marks,0x234556);
 // Fixed exterior jaw: the reference plane lies at X=0.
 box(instrument,20,66,9,-3,-30,10,shadow);
 box(instrument,14,62,9,-6,-28,16,alloy);
 box(instrument,22,13,10,-1,-53,14,light);
 box(instrument,32,12,9,15,-10,13,alloy);
 // Movable vernier assembly and jaw.
 slider=new T.Group();instrument.add(slider);
 box(slider,64,57,10,18,51,12,shadow);
 box(slider,61,53,9,18,48,18,alloy);
 box(slider,61,4,2,18,24,23,light);
 box(slider,19,65,9,-8,-28,15,shadow);
 box(slider,14,62,9,-7,-28,21,alloy);
 box(slider,22,13,9,-12,-53,20,light);
 box(slider,31,11,9,-19,-10,19,alloy);
 // Exact vernier spacing: ten divisions across 9 mm = 27 model units.
 const vernier=[];
 for(let i=0;i<=10;i++){
  const x=i*2.7;
  vernier.push([x,45,x,i%5===0?62:55,24]);
 }
 segments(slider,vernier,0x294755);
 for(const val of [0,5,10])label(slider,val,val*2.7,69,9,24);
 // Rolling thumb wheel (actual 3D metal geometry).
 thumb=new T.Group();thumb.position.set(15,83,26);slider.add(thumb);
 disc(thumb,0,0,0,13,7,dark);
 disc(thumb,0,0,6,11,3,grip);
 disc(thumb,0,0,8,4,2,shadow);
 const ridges=[];
 for(let i=0;i<28;i++){
  const a=i*Math.PI/14;
  ridges.push([11*Math.cos(a),11*Math.sin(a),13*Math.cos(a),13*Math.sin(a),10]);
 }
 segments(thumb,ridges,0x3f5f6d);
}
function coordinates(){
 const rect=board.getBoundingClientRect();
 const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
 if(w!==W||h!==H){
  W=w;H=h;
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.setSize(w,h,false);
  camera.left=0;camera.right=w;camera.top=0;camera.bottom=h;
  camera.updateProjectionMatrix();
 }
 const m=drafting.getScreenCTM();
 if(!m)return null;
 const a=drafting.createSVGPoint();
 a.x=0;a.y=0;
 const origin=a.matrixTransform(m);
 a.x=1;
 const next=a.matrixTransform(m);
 const scale=Math.hypot(next.x-origin.x,next.y-origin.y);
 if(!Number.isFinite(scale)||scale<=0)return null;
 return {x:origin.x-rect.left,y:origin.y-rect.top,scale};
}
function paint(){
 if(!pose?.active||!ready)return;
 const c=coordinates();if(!c)return;
 const {origin,angle,normal,opening,progress}=pose;
 if(!origin||![origin.x,origin.y,angle,opening,progress].every(Number.isFinite))return;
 const entry=clamp(progress,0,1),sc=c.scale*(.94+.06*entry);
 const slideX=origin.x-(normal?.x||0)*64*(1-entry);
 const slideY=origin.y-(normal?.y||0)*64*(1-entry);
 instrument.position.set(c.x+slideX*c.scale,c.y+slideY*c.scale,0);
 instrument.rotation.z=angle;
 instrument.scale.setScalar(sc);
 slider.position.x=opening*3;
 if(Number.isFinite(lastX))thumb.rotation.z+=(lastX-opening)*.1;
 lastX=opening;
 renderer.render(scene,camera);
}
function schedule(){
 if(raf||!ready||!pose.active)return;
 const loop=()=>{
  raf=0;
  if(!ready||!pose.active)return;
  paint();
  raf=requestAnimationFrame(loop);
 };
 raf=requestAnimationFrame(loop);
}
function update(d){
 pose=d||{active:false};
 if(!pose.active){
  host.style.display='none';lastX=NaN;
  if(raf){cancelAnimationFrame(raf);raf=0}
  return;
 }
 if(!ready)return;
 host.style.display='block';
 paint();schedule();
}
document.addEventListener('gnss:free-caliper-pose',e=>update(e.detail));
async function init(){
 try{
  let mod;
  try{mod=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js')}
  catch{mod=await import('https://unpkg.com/three@0.165.0/build/three.module.js')}
  T=mod;
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.62;
  scene=new T.Scene();
  camera=new T.OrthographicCamera(0,1,0,1,.1,1100);
  camera.position.set(0,0,650);camera.lookAt(0,0,0);
  scene.add(new T.AmbientLight(0xe7f8ff,1.65));
  const a=new T.DirectionalLight(0xffffff,2.5);a.position.set(-320,-230,540);scene.add(a);
  const b=new T.DirectionalLight(0xd1edff,1.0);b.position.set(280,300,440);scene.add(b);
  geometry();ready=true;
  document.body.classList.add('gnss-free-caliper-3d-ready');
  document.dispatchEvent(new CustomEvent('gnss:request-free-caliper-pose'));
  update(pose);
 }catch(error){
  console.warn('GNSS LAB free caliper: Three.js unavailable, using vector instrument',error);
  ready=false;host.style.display='none';
  document.body.classList.remove('gnss-free-caliper-3d-ready');
 }
}
init();
window.GNSSFreeCaliper3D={get ready(){return ready}};
})();
