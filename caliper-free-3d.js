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
// Precision mechanical caliper V3: industrial satin-steel model inspired by
// the agreed top-down reference. All structural parts are REAL 3D meshes;
// scale, jaws, vernier and roller are separate physical components.
function contour(parent,vertices,z,depth,material,bevel=.7){
 const shape=new T.Shape();
 vertices.forEach((p,i)=>i?shape.lineTo(p[0],p[1]):shape.moveTo(p[0],p[1]));
 shape.closePath();
 const geometry=new T.ExtrudeGeometry(shape,{
  depth,steps:1,bevelEnabled:bevel>0,bevelSegments:2,
  bevelThickness:bevel,bevelSize:bevel,bevelOffset:0,curveSegments:4
 });
 const mesh=new T.Mesh(geometry,material);
 mesh.position.z=z;
 parent.add(mesh);
 return mesh;
}
function straight(parent,x1,y1,x2,y2,z,color,width=.9){
 const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
 if(len<.001)return;
 const piece=new T.Mesh(new T.PlaneGeometry(len,width),
  new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.93,depthWrite:false}));
 piece.position.set((x1+x2)/2,(y1+y2)/2,z);
 piece.rotation.z=Math.atan2(dy,dx);
 parent.add(piece);
 return piece;
}
function ring(parent,x,y,r,z,color,thickness=1.2){
 const g=new T.Mesh(new T.RingGeometry(r-thickness,r,40),
  new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.95}));
 g.position.set(x,y,z);parent.add(g);return g;
}
function screw(parent,x,y,z){
 const disk=disc(parent,x,y,z,5.2,2,mat(0x697985,.72,.26));
 disc(parent,x,y,z+1.4,3.5,1,mat(0xc3d3dc,.78,.22));
 ring(parent,x,y,4.2,z+2.2,0x233b48,.65);
 straight(parent,x-2.2,y-2.2,x+2.2,y+2.2,z+2.55,0x223c4b,1);
 straight(parent,x-2.2,y+2.2,x+2.2,y-2.2,z+2.55,0x223c4b,1);
 return disk;
}
function brushedSteel(){
 const sheet=document.createElement('canvas');sheet.width=512;sheet.height=96;
 const ctx=sheet.getContext('2d');
 if(!ctx)return mat(0xb9c7cd,.75,.29);
 const g=ctx.createLinearGradient(0,0,0,96);
 g.addColorStop(0,'#e7eef0');g.addColorStop(.18,'#cbd5d9');
 g.addColorStop(.55,'#a9b8c2');g.addColorStop(.82,'#b8c3ca');
 g.addColorStop(1,'#8796a1');
 ctx.fillStyle=g;ctx.fillRect(0,0,512,96);
 for(let i=0;i<340;i++){
  const y=(i*29)%96;
  const opacity=.012+(i%7)*.003;
  ctx.fillStyle='rgba(42,61,75,'+opacity+')';
  ctx.fillRect((i*37)%512,y,170+(i%8)*25,(i%4===0?1:.42));
 }
 const texture=new T.CanvasTexture(sheet);
 texture.colorSpace=T.SRGBColorSpace;
 texture.anisotropy=Math.min(renderer?.capabilities?.getMaxAnisotropy?.()||4,8);
 return new T.MeshStandardMaterial({map:texture,color:0xf3f8fa,
  metalness:.76,roughness:.31,side:T.DoubleSide});
}
function engraving(parent,y,z){
 // Real metric geometry: fixed main scale is never moved with the carriage.
 const strokes=[];
 for(let mm=0;mm<=170;mm++){
  const x=mm*3,major=mm%10===0,five=mm%5===0;
  strokes.push([x,y,x,y+(major?19:five?14:9),z]);
 }
 segments(parent,strokes,0x283f4c);
 for(let i=0;i<=160;i+=10)label(parent,String(i),i*3,y+30,12,z+.5);
}
function geometry(){
 instrument=new T.Group();scene.add(instrument);
 const frame=mat(0x43545e,.68,.31),steel=brushedSteel();
 const bright=mat(0xeaf2f5,.69,.22),cut=mat(0x9caeb9,.65,.27);
 const dark=mat(0x34444e,.48,.49),graphite=mat(0x273943,.4,.52);
 const silver=mat(0xbfcbd1,.73,.29),glow=new T.MeshBasicMaterial({color:0xa6f26c});
 // 1. Full-length rail: extruded machined block with a separate brushed face.
 contour(instrument,[[-45,-2],[533,-2],[539,3],[539,60],[531,66],[-44,66]],0,8,frame,1.2);
 contour(instrument,[[-37,3],[529,3],[531,57],[-39,57]],8,3,steel,.4);
 box(instrument,569,3,1,245,-2,11,bright);
 box(instrument,569,2,1,245,62,11,dark);
 straight(instrument,-38,8,531,8,12.4,0xeef7f7,1.3);
 straight(instrument,-38,57,531,57,12.4,0x506470,1);
 engraving(instrument,11,13.3);
 // Laser-engraved mm unit, visible without an electronic readout.
 label(instrument,'mm',518,44,11,13.4);
 // Fine brushed machining bands on the rail.
 for(let i=0;i<13;i++){
  const y=8+i*3.8;
  straight(instrument,-36,y,530,y,12.02,i%3===0?0xd0e3e6:0x94a5ae,.23);
 }
 // Accent line, mimicking engraved paint in the approved reference.
 straight(instrument,0,61,490,61,14,0xa6f76a,2.2);
 // 2. Fixed upper measuring jaw. Inner measuring face is at X = 0.
 contour(instrument,[
  [-44,61],[-44,3],[-27,-8],[-27,-108],[-3,-108],[-3,-58],
  [0,-40],[28,-40],[28,-11],[0,-11],[0,64]
 ],13,9,graphite,.75);
 contour(instrument,[[-23,-108],[-4,-108],[-4,-91],[-23,-91]],22,2,bright,.35);
 contour(instrument,[[-37,-10],[-26,-10],[-26,-42],[-37,-42]],20,3,silver,.4);
 straight(instrument,-26,-99,-26,-13,25,0xb2c2ca,1.2);
 straight(instrument,-3,-91,-3,-58,25,0xf2f8f7,1.3);
 // Left fixed foot, screw heads, reference zero ring.
 contour(instrument,[[-45,-3],[-13,-3],[-13,68],[-45,68]],14,5,dark,.7);
 screw(instrument,-35,11,19);screw(instrument,-35,53,19);
 ring(instrument,0,2.5,8,26,0x9df06e,2.6);
 ring(instrument,0,2.5,3.3,26.2,0x203943,1.5);
 straight(instrument,-1.3,12,-1.3,55,25,0xa8f56d,1.6);
 // 3. Moving group: every attached assembly translates by exactly opening*3.
 slider=new T.Group();instrument.add(slider);
 // Main carriage is a dark bridge over the upper rail.
 contour(slider,[[-36,-10],[-23,-25],[86,-25],[97,-11],[97,3],[-34,3]],15,7,dark,.9);
 contour(slider,[[-29,-19],[80,-19],[89,-8],[-35,-8]],22,1,graphite,.4);
 straight(slider,45,-15,92,-15,24.3,0xb1f56c,3);
 straight(slider,-30,-3,95,-3,23.5,0xadbfc4,1);
 screw(slider,-19,-12,24);screw(slider,87,-12,24);
 // Measuring jaw is an industrial dark jaw like the stationary one, mirrored.
 contour(slider,[
  [40,62],[40,4],[25,-9],[25,-108],[3,-108],[3,-58],
  [0,-40],[-28,-40],[-28,-11],[0,-11],[0,65]
 ],13,11,graphite,.65);
 contour(slider,[[4,-108],[23,-108],[23,-91],[4,-91]],23,2,bright,.35);
 contour(slider,[[26,-42],[38,-42],[38,-10],[26,-10]],21,3,silver,.35);
 straight(slider,3,-91,3,-58,26,0xf0f8f9,1.2);
 ring(slider,0,2.5,8,27,0xa9f66b,2.7);
 ring(slider,0,2.5,3.4,27.2,0x263d4a,1.4);
 // Nonius module hangs below the beam and moves as a single machined plate.
 contour(slider,[[-20,59],[109,59],[111,112],[93,119],[-17,119]],18,8,frame,.8);
 contour(slider,[[-17,65],[105,65],[105,108],[-17,108]],26,2,steel,.5);
 straight(slider,-16,65,104,65,29,0xe7f3f4,1.2);
 // 0.1mm vernier: 10 graduations occupy 9 main-scale millimetres.
 const marks=[];
 for(let i=0;i<=10;i++){
  const x=i*2.7;
  marks.push([x,69,x,i%5===0?88:81,30]);
 }
 segments(slider,marks,0x244351);
 for(let i of [0,5,10])label(slider,String(i),i*2.7,100,10,30.5);
 label(slider,'0,1 mm',59,100,11,30.5);
 screw(slider,-8,103,29);screw(slider,98,103,29);
 // Knurled metal thumb wheel centered under the moving carriage.
 thumb=new T.Group();thumb.position.set(44,145,26);slider.add(thumb);
 disc(thumb,0,0,0,19,8,mat(0x3e525e,.74,.27));
 disc(thumb,0,0,4,16,4,silver);
 disc(thumb,0,0,7,13,3,mat(0x768b96,.78,.25));
 disc(thumb,0,0,10,8,2,bright);
 ring(thumb,0,0,13,13,0xa8f66b,1.5);
 disc(thumb,0,0,11,3,1,graphite);
 const knurls=[];
 for(let i=0;i<56;i++){
  const a=i*Math.PI*2/56,cs=Math.cos(a),sn=Math.sin(a);
  knurls.push([cs*17,sn*17,cs*19.6,sn*19.6,13]);
 }
 segments(thumb,knurls,0x213d50);
 // High contrast reference index on vernier.
 straight(slider,0,55,0,101,30.6,0x93e968,1.3);
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
