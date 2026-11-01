/* GNSS LAB / Mechanical vernier caliper, top-down physical 3D model.
 * 0.1 mm metric nonius: 10 vernier divisions span 9 main-scale mm.
 * The lab SVG remains the fully functional fallback until WebGL is ready.
 */
(function(){
'use strict';
const board=document.getElementById('engBoard');
const journey=document.getElementById('lab01Journey');
const sketch=document.getElementById('jSketch');
if(!board||!journey||!sketch)return;
const host=document.createElement('div');
host.id='gnssCaliper3D';
host.setAttribute('aria-hidden','true');
host.style.cssText='position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;display:none';
const canvas=document.createElement('canvas');
canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
host.append(canvas);journey.append(host);
let T,renderer,scene,camera,group,moving,wheel,basePose=null,active=false,ready=false;
let latestPose={active:false},intro=0,lastGap=NaN,frame=0,lastW=0,lastH=0;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ease=t=>{t=clamp(t,0,1);return 1-Math.pow(1-t,3)};
function material(color,metalness=.68,roughness=.27){
 return new T.MeshStandardMaterial({color,metalness,roughness});
}
function box(parent,w,h,depth,x,y,z,mat){
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,depth),mat);
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function wheelDisc(parent,r,x,y,z,mat){
 const m=new T.Mesh(new T.CylinderGeometry(r,r,8,44),mat);
 m.rotation.x=Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;
}
function lines(parent,segments,color=0x274b5c){
 const coords=[];
 for(const [x1,y1,x2,y2,z] of segments){
  coords.push(x1,y1,z,x2,y2,z);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3));
 const line=new T.LineSegments(geometry,new T.LineBasicMaterial({color}));
 parent.add(line);
 return line;
}
function letterTexture(label,width=100,height=38,font=24){
 const cv=document.createElement('canvas');cv.width=width;cv.height=height;
 const ctx=cv.getContext('2d');
 ctx.clearRect(0,0,width,height);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#173448';ctx.font='bold '+font+'px Arial,sans-serif';
 ctx.fillText(label,width/2,height/2);
 const texture=new T.CanvasTexture(cv);
 texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
 return texture;
}
function lettering(parent,label,x,y,size=14){
 const texture=letterTexture(label,96,36,25);
 const surface=new T.Mesh(
  new T.PlaneGeometry(size*2.5,size),
  new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide})
 );
 surface.position.set(x,y,10.5);parent.add(surface);
}
function build(){
 group=new T.Group();scene.add(group);
 const metal=material(0xd1e0e5,.76,.22);
 const edge=material(0x7b9cae,.72,.28);
 const bright=material(0xf1f6f5,.68,.2);
 const shadow=material(0x365369,.35,.44);
 const groove=material(0x31586f,.46,.35);
 const accent=material(0x405f7c,.54,.3);
 // 170-mm engraved bar, real dimensional geometry in SVG units (3 units/mm).
 box(group,588,44,7,226,0,1,edge);
 box(group,588,35,5,226,-3,5,metal);
 box(group,582,3,1,226,-19,8,bright);
 box(group,582,2,1,226,16,7,shadow);
 // Stationary external measuring jaw with the zero face exactly at x=0.
 box(group,13,136,8,-6.5,-86,8,metal);
 box(group,19,13,9,-8,-151,9,bright);
 box(group,15,10,9,-7,19,9,edge);
 // Main scale: 1-mm marks (3 model units), every 5th/10th mark longer.
 const mainTicks=[];
 for(let i=0;i<=170;i++){
  const x=i*3;
  const h=i%10===0?14:i%5===0?10:6;
  mainTicks.push([x,-11,x,-11+h,9.3]);
 }
 lines(group,mainTicks,0x1c4253);
 for(let i=0;i<=160;i+=10)lettering(group,String(i),i*3,23,12);
 // Movable metal slider and true external jaw; translation equals the opening.
 moving=new T.Group();group.add(moving);
 box(moving,66,68,9,18,28,13,shadow);
 box(moving,60,62,7,18,27,18,metal);
 box(moving,54,4,2,18,0,22,bright);
 box(moving,17,136,8,8.5,-86,15,metal);
 box(moving,21,13,9,9,-151,16,bright);
 box(moving,20,10,9,8.5,19,17,edge);
 // Vernier 0-10: marks spaced exactly 0.9 mm => 2.7 model units.
 const ticks=[];
 for(let i=0;i<=10;i++)ticks.push([i*2.7,46,i*2.7,i%5===0?66:60,23]);
 lines(moving,ticks,0x294c5c);
 for(const i of [0,5,10])lettering(moving,String(i),i*2.7,72,9);
 // Tactile metal adjustment roller with engraved concentric rings.
 wheel=new T.Group();moving.add(wheel);
 wheelDisc(wheel,14,15,103,20,accent);
 wheelDisc(wheel,11,15,103,26,metal);
 wheelDisc(wheel,4,15,103,30,groove);
 const ridges=[];
 for(let i=0;i<24;i++){
  const angle=i*Math.PI/12;
  ridges.push([
   15+11*Math.cos(angle),103+11*Math.sin(angle),
   15+13*Math.cos(angle),103+13*Math.sin(angle),29
  ]);
 }
 lines(wheel,ridges,0x2e5266);
 box(moving,58,3,2,18,84,22,bright);
}
function calibrate(){
 const rect=board.getBoundingClientRect();
 const W=Math.max(1,Math.round(rect.width)),H=Math.max(1,Math.round(rect.height));
 if(W!==lastW||H!==lastH){
  lastW=W;lastH=H;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(W,H,false);
  camera.left=0;camera.right=W;camera.top=0;camera.bottom=H;
  camera.updateProjectionMatrix();
 }
 const p=sketch.createSVGPoint();p.x=0;p.y=0;
 const m=sketch.getScreenCTM();
 if(!m)return null;
 const o=p.matrixTransform(m);p.x=1;
 const a=p.matrixTransform(m);const scale=Math.hypot(a.x-o.x,a.y-o.y);
 if(!Number.isFinite(scale)||scale<=0)return null;
 return {left:o.x-rect.left,top:o.y-rect.top,scale};
}
function applyPose(pose,now){
 if(!ready||!active||!pose?.active)return;
 const tr=calibrate();if(!tr)return;
 const opening=clamp(Number(pose.gap)||0,pose.target||0,pose.max||160);
 const origin=Number(pose.zeroX),baseY=Number(pose.y);
 if(!Number.isFinite(origin)||!Number.isFinite(baseY))return;
 const arrival=ease((now-intro)/440);
 group.position.set(tr.left+origin*tr.scale,
  tr.top+(baseY+20*(1-arrival))*tr.scale,0);
 group.scale.setScalar(tr.scale);
 moving.position.set(opening*3,0,0);
 if(Number.isFinite(lastGap)){
  const shift=lastGap-opening;
  wheel.rotation.z+=shift*.085;
 }
 lastGap=opening;
 renderer.render(scene,camera);
}
function show(state){
 latestPose=state||{active:false};
 active=!!latestPose.active;
 if(!active){host.style.display='none';return}
 if(!ready)return;
 if(!basePose||basePose.object!==latestPose.object){intro=performance.now();lastGap=latestPose.gap}
 basePose=latestPose;
 host.style.display='block';
 frame=0;
 applyPose(latestPose,performance.now());
}
document.addEventListener('gnss:caliper-pose',event=>show(event.detail));
document.dispatchEvent(new CustomEvent('gnss:request-caliper-pose'));
async function start(){
 try{
  let mod;
  try{mod=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js')}
  catch{mod=await import('https://unpkg.com/three@0.165.0/build/three.module.js')}
  T=mod;
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.6;
  scene=new T.Scene();
  camera=new T.OrthographicCamera(0,1,0,1,.1,1500);
  camera.position.set(0,0,600);camera.lookAt(0,0,0);
  scene.add(new T.AmbientLight(0xf4fbff,1.7));
  const top=new T.DirectionalLight(0xffffff,3.1);top.position.set(-240,-300,440);scene.add(top);
  const fill=new T.DirectionalLight(0xc8ddf4,1.0);fill.position.set(440,350,300);scene.add(fill);
  build();ready=true;document.body.classList.add('gnss-caliper-3d-ready');
  show(latestPose);
 }catch(error){
  ready=false;document.body.classList.remove('gnss-caliper-3d-ready');
  host.style.display='none';
  console.warn('GNSS LAB: 3D caliper unavailable; precise SVG vernier remains usable.',error);
 }
}
start();
window.GNSSCaliper3D={get ready(){return ready},get active(){return ready&&active}};
})();
