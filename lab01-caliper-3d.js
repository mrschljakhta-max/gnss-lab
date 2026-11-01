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
let contactStart=0,wasContact=false;
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
 surface.scale.y=-1;surface.position.set(x,y,10.5);parent.add(surface);
}
function build(){
 group=new T.Group();scene.add(group);
 const metal=material(0xc4cdd1,.65,.46),edge=material(0x647681,.65,.38),bright=material(0xe5e9e9,.6,.32),groove=material(0x425762,.4,.6);
 // Brushed satin microstructure; deterministic fine horizontal machining marks.
 const cv=document.createElement('canvas');cv.width=256;cv.height=256;
 const ctx=cv.getContext('2d');ctx.fillStyle='#c5cdd0';ctx.fillRect(0,0,256,256);
 for(let i=0;i<256;i++){ctx.fillStyle=`rgba(55,69,78,${.015+(i*37%13)/250})`;ctx.fillRect(0,i,256,1)}
 const satin=new T.CanvasTexture(cv);
 metal.map=satin;metal.needsUpdate=true;
 function bevel(parent,w,h,x,y,z){
  box(parent,w,h,5,x,y,z,edge);box(parent,w-2,h-2,2,x,y,z+3,metal);
  box(parent,w-3,1,1,x,y-h/2+1,z+4,bright);
 }
 bevel(group,555,45,255.5,.5,3);
 // Both inner measuring faces are exactly x=0. No decorative foot crosses them.
 bevel(group,17,158,-8.5,-79,10);
 box(group,1,115,.7,-.5,-87,14,bright);
 const main=[];
 for(let i=0;i<=170;i++)main.push([i*3,-10,i*3,i%10===0?4:i%5===0?0:-4,8]);
 lines(group,main,0x203440);
 for(let i=0;i<=170;i+=10)lettering(group,String(i),i*3,17,9);
 moving=new T.Group();group.add(moving);
 bevel(moving,17,181,8.5,-67.5,15);
 box(moving,1,115,.7,.5,-87,19,bright);
 bevel(moving,56,36,20,41,19);
 const ticks=[];
 for(let i=0;i<=10;i++)ticks.push([i*2.7,26,i*2.7,i%5===0?41:36,24]);
 lines(moving,ticks,0x203440);
 for(const i of [0,5,10]){lettering(moving,String(i),i*2.7,51,8);moving.children[moving.children.length-1].position.z=25}
 box(moving,40,2,1,20,57,24,groove);
 wheel=new T.Group();wheel.position.set(20,69,25);moving.add(wheel);
 wheelDisc(wheel,13,0,0,0,edge);wheelDisc(wheel,11,0,0,5,metal);wheelDisc(wheel,3,0,0,10,groove);
 const ridges=[];for(let i=0;i<32;i++){const a=i*Math.PI/16;ridges.push([9*Math.cos(a),9*Math.sin(a),13*Math.cos(a),13*Math.sin(a),10])}
 lines(wheel,ridges,0x455760);
 // Recessed fastening screw on the slider.
 wheelDisc(moving,3,39,33,25,groove);lines(moving,[[37,33,41,33,30]],0xc2cdd0);
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
  tr.top+baseY*tr.scale,0);
 group.scale.setScalar(tr.scale);
 const bounce=pose.contact?Math.exp(-(now-contactStart)/75)*Math.sin((now-contactStart)/24)*1.3:0;
 moving.position.set(opening*(pose.pxPerMm||3),0,bounce);
 if(Number.isFinite(lastGap)){
  const shift=lastGap-opening;
  wheel.rotation.z+=shift*.085;
 }
 lastGap=opening;
 renderer.render(scene,camera);
 if(pose.contact&&now-contactStart<320)requestAnimationFrame(t=>{if(ready&&active)applyPose(latestPose,t)});
}
function show(state){
 latestPose=state||{active:false};
 if(latestPose.contact&&!wasContact)contactStart=performance.now();
 wasContact=!!latestPose.contact;
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
  scene.add(new T.HemisphereLight(0xffffff,0x52738a,2.4));
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
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;host.style.display='none';document.body.classList.remove('gnss-caliper-3d-ready')});
new ResizeObserver(()=>{if(ready&&active)applyPose(latestPose,performance.now())}).observe(board);
start();
window.GNSSCaliper3D={get ready(){return ready},get active(){return ready&&active}};
})();

