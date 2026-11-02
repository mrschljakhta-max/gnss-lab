/* GNSS LAB — true 3D transparent ripple tank (Three.js). */
(function(){
'use strict';
window.GNSSWaveTank3D=async function(canvas){
 let T;
 try{T=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js')}
 catch(e){try{T=await import('https://unpkg.com/three@0.165.0/build/three.module.js')}catch(_){return null}}
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'default'})}catch(e){return null}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.23;
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(34,1,.1,100);
 cam.position.set(0,7.8,13);cam.lookAt(0,.4,0);
 scene.add(new T.HemisphereLight(0xdaf8ff,0x15374a,2.1));
 const area=new T.DirectionalLight(0xe4faff,3.1);area.position.set(-4,9,5);scene.add(area);
 const rimLight=new T.DirectionalLight(0x49dffb,2);rimLight.position.set(3,4,-5);scene.add(rimLight);
 const group=new T.Group();scene.add(group);
 const glass=new T.MeshPhysicalMaterial({color:0xc8f5ff,metalness:0,roughness:.075,transmission:.88,thickness:.27,ior:1.48,transparent:true,opacity:.92,depthWrite:false,side:T.DoubleSide});
 const edge=new T.MeshPhysicalMaterial({color:0x9fddeb,roughness:.16,metalness:.26,transparent:true,opacity:.79});
 const base=new T.MeshStandardMaterial({color:0x083648,metalness:.35,roughness:.28});
 function box(w,h,d,x,y,z,mat){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh}
 box(9.0,.16,5.8,0,-.22,0,base);
 for(const z of [-2.9,2.9]){box(9.15,.85,.17,0,.20,z,glass);box(9.2,.045,.20,0,.63,z,edge)}
 for(const x of [-4.5,4.5]){box(.17,.85,5.85,x,.20,0,glass);box(.20,.045,5.9,x,.63,0,edge)}
 const steel=new T.MeshStandardMaterial({color:0xbacbd0,metalness:.94,roughness:.15});
 for(const x of [-4.35,4.35])for(const z of [-2.72,2.72]){
   const bolt=new T.Mesh(new T.CylinderGeometry(.095,.095,.075,20),steel);bolt.position.set(x,.685,z);group.add(bolt)
 }
 const waterGeo=new T.PlaneGeometry(8.78,5.57,128,82);waterGeo.rotateX(-Math.PI/2);
 const shader=new T.ShaderMaterial({
  transparent:false,side:T.DoubleSide,
  uniforms:{uTime:{value:0},uFreq:{value:2},uOn:{value:0},uCount:{value:0},uHits:{value:Array.from({length:8},()=>new T.Vector3(0,0,-1000))}},
  vertexShader:`
varying vec2 vUv;varying vec3 vPos;
uniform float uTime,uFreq,uOn,uCount;uniform vec3 uHits[8];
void main(){
 vUv=uv;vec3 p=position;float d=length(p.xz);float h=0.;
 if(uOn>.5)h+=sin(d*11.-uTime*uFreq*6.28318)*.045*exp(-d*.20);
 for(int i=0;i<8;i++){if(float(i)<uCount){vec3 hit=uHits[i];float q=length(p.xz-hit.xy);h+=exp(-pow((q-hit.z)/.12,2.))*.067;}}
 p.y+=h;vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`,
  fragmentShader:`
precision highp float;varying vec2 vUv;varying vec3 vPos;uniform float uTime,uFreq,uOn,uCount;uniform vec3 uHits[8];
void main(){
float d=length(vPos.xz);float rip=on=0.;
}`
 });
 // Finish fragment separately to keep the shader intentionally simple and maintainable.
 shader.fragmentShader=`precision highp float;
 varying vec2 vUv;varying vec3 vPos;
 uniform float uTime,uFreq,uOn,uCount;uniform vec3 uHits[8];
 void main(){
 float d=length(vPos.xz);
 float wave=uOn>.5?sin(d*11.-uTime*uFreq*6.28318)*exp(-d*.22):0.;
 float pulses=0.;
 for(int i=0;i<8;i++){if(float(i)<uCount){vec3 hit=uHits[i];float q=length(vPos.xz-hit.xy);pulses+=exp(-pow((q-hit.z)/.13,2.));}}
 float caust=pow(max(0.,sin(vUv.x*80.+sin(vUv.y*40.+uTime*.45)*2.)*sin(vUv.y*65.-uTime*.32)),6.);
 vec3 col=mix(vec3(.002,.13,.19),vec3(.007,.32,.39),vUv.y*.65+.19);
 col+=vec3(.04,.18,.22)*caust;
 col+=vec3(.04,.53,.65)*(pow(max(wave,0.),7.)*.82+pulses*.8);
 float sheen=pow(max(0.,sin(vUv.x*40.+uTime*.27)),24.);
 col+=vec3(.03,.16,.19)*sheen;
 gl_FragColor=vec4(col,1.);
 }`;
 const water=new T.Mesh(waterGeo,shader);water.position.y=.46;group.add(water);
 const chrome=new T.MeshPhysicalMaterial({color:0xd3dfe0,metalness:.93,roughness:.13});
 const emitter=new T.Mesh(new T.CylinderGeometry(.23,.25,.27,48),chrome);emitter.position.set(0,.63,0);group.add(emitter);
 const emitterTop=new T.Mesh(new T.CylinderGeometry(.24,.24,.022,48),new T.MeshStandardMaterial({color:0xf4ffff,metalness:.8,roughness:.12}));emitterTop.position.set(0,.78,0);group.add(emitterTop);
 let alive=true;
 function render(time,freq,on,hits){
  if(!alive)return;
  const rect=canvas.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
  const w=Math.round(rect.width),h=Math.round(rect.height);
  if(renderer.domElement.width===0||Math.abs(renderer.domElement.clientWidth-w)>1||Math.abs(renderer.domElement.clientHeight-h)>1){renderer.setSize(w,h,false)}
  cam.aspect=w/h;cam.updateProjectionMatrix();
  shader.uniforms.uTime.value=time;shader.uniforms.uFreq.value=freq;shader.uniforms.uOn.value=on?1:0;
  shader.uniforms.uCount.value=Math.min(hits.length,8);
  hits.slice(-8).forEach((p,i)=>shader.uniforms.uHits.value[i].set(((p.x||590)-590)/105,((p.y||348)-348)/82,p.r/105));
  renderer.render(scene,cam);
 }
 function pulseAt(x,y){return new T.Vector2((x-590)/105,(y-348)/82)}
 return {render,pulseAt,destroy(){alive=false;group.traverse(o=>{if(o.geometry)o.geometry.dispose()});glass.dispose();edge.dispose();base.dispose();steel.dispose();chrome.dispose();shader.dispose();renderer.dispose()}};
};
})();