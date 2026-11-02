/* GNSS LAB — true 3D transparent ripple tank (Three.js). */
(function(){
'use strict';
window.GNSSWaveTank3D=async function(canvas){
 let T;
 try{T=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js')}
 catch(e){try{T=await import('https://unpkg.com/three@0.165.0/build/three.module.js')}catch(_){return null}}
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'default'})}catch(e){return null}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2.5));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.02;
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(31,1,.1,100);
 cam.position.set(0,8.4,12.4);cam.lookAt(0,.25,0);
 scene.add(new T.HemisphereLight(0xdaf8ff,0x15374a,2.1));
 const area=new T.DirectionalLight(0xe4faff,3.1);area.position.set(-4,9,5);scene.add(area);
 const rimLight=new T.DirectionalLight(0x49dffb,2);rimLight.position.set(3,4,-5);scene.add(rimLight);
 const group=new T.Group();scene.add(group);
 const glass=new T.MeshPhysicalMaterial({color:0xd5f5f9,metalness:0,roughness:.045,transmission:.96,thickness:.16,ior:1.45,transparent:true,opacity:.62,depthWrite:false,side:T.DoubleSide});
 const edge=new T.MeshPhysicalMaterial({color:0xc5eff6,roughness:.09,metalness:.12,transparent:true,opacity:.44,depthWrite:false});
 const base=new T.MeshStandardMaterial({color:0x083648,metalness:.35,roughness:.28});
 function box(w,h,d,x,y,z,mat){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh}
 box(9.0,.16,5.8,0,-.22,0,base);
 for(const z of [-2.9,2.9]){box(9.15,.85,.17,0,.20,z,glass);box(9.2,.045,.20,0,.63,z,edge)}
 for(const x of [-4.5,4.5]){box(.17,.85,5.85,x,.20,0,glass);box(.20,.045,5.9,x,.63,0,edge)}
 const steel=new T.MeshStandardMaterial({color:0xbacbd0,metalness:.94,roughness:.15});
 for(const x of [-4.35,4.35])for(const z of [-2.72,2.72]){
   const bolt=new T.Mesh(new T.CylinderGeometry(.095,.095,.075,20),steel);bolt.position.set(x,.685,z);group.add(bolt)
 }
 const waterGeo=new T.PlaneGeometry(8.78,5.57,240,160);waterGeo.rotateX(-Math.PI/2);
 const shader=new T.ShaderMaterial({
  transparent:false,side:T.DoubleSide,
  uniforms:{uTime:{value:0},uFreq:{value:2},uOn:{value:0},uCount:{value:0},uHits:{value:Array.from({length:8},()=>new T.Vector3(0,0,-1000))}},
  vertexShader:`
varying vec2 vUv;varying vec3 vPos;
uniform float uTime,uFreq,uOn,uCount;uniform vec3 uHits[8];
void main(){
 vUv=uv;vec3 p=position;float d=length(p.xz);float h=0.;
 if(uOn>.5)h+=sin(d*5.5-uTime*uFreq*6.28318)*.035*exp(-d*.23);
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
  float theta=d*5.5-uTime*uFreq*6.2831853;
  float envelope=exp(-d*.18);
  float wave=uOn>.5?sin(theta)*envelope:0.;
  float pulses=0.;
  for(int i=0;i<8;i++){
   if(float(i)<uCount){
    vec3 hit=uHits[i];float q=length(vPos.xz-hit.xy);
    pulses+=exp(-pow((q-hit.z)/.11,2.))*.9;
   }
  }
  // Irregular soft caustics instead of ruler-straight lines.
  float a=sin(vUv.x*17.+2.*sin(vUv.y*13.+uTime*.24));
  float b=sin(vUv.y*19.+1.6*sin(vUv.x*14.-uTime*.21));
  float caust=pow(max(0.,a*b),8.);
  float ambient=.12*sin(vUv.x*8.+vUv.y*5.+uTime*.17);
  vec3 col=mix(vec3(.012,.17,.24),vec3(.015,.31,.38),clamp(.34+vUv.y*.27+ambient,0.,1.));
  col+=vec3(.025,.13,.15)*caust;
  float crests=pow(max(0.,wave),4.);
  col+=vec3(.05,.52,.63)*(crests*.72+pulses*.9);
  // Soft broad surface reflection, not a repeating linear grid.
  float reflection=exp(-pow((vUv.y-.78-.045*sin(vUv.x*7.))/.18,2.));
  col+=vec3(.03,.095,.11)*reflection;
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
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
  if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false)}
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