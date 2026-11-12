/** TIDEBOUND procedural placeholder mesh factory for Three.js. No models/textures required.
 * Uses fixed shapes; concept art-quality scenes require real meshes/shaders/texture assets later.
 * Asset's procedural.seedSalt can be combined with world/chunk/instance seed on host.
 */
import * as THREE from 'three';

const shared = new Map();
function material(hex, emissive=false) {
  const key = hex+'|'+emissive;
  if (!shared.has(key)) shared.set(key, new THREE.MeshStandardMaterial({color: hex, roughness: 0.85, emissive:emissive?hex:'#000000', emissiveIntensity:emissive?0.2:0}));
  return shared.get(key);
}
function part(group, geometry, color, at=[0,0,0], scale=[1,1,1], glowing=false) {
  const mesh = new THREE.Mesh(geometry, material(color, glowing));
  mesh.position.set(...at); mesh.scale.set(...scale);
  mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh); return mesh;
}
const box = new THREE.BoxGeometry(1,1,1);
const sphere = new THREE.SphereGeometry(0.5,8,6);
const cone = new THREE.ConeGeometry(0.5,1,8);
const cyl = new THREE.CylinderGeometry(0.5,0.5,1,8);
function colorAt(a,i=0) {return a.procedural.colors[i%a.procedural.colors.length];}
export function makeWorldAsset(asset) {
  if (!asset?.geometryPreset || !asset?.procedural) throw Error('Invalid asset');
  const g = new THREE.Group(); const c=i=>colorAt(asset,i); const glow=asset.procedural.emissive;
  switch(asset.geometryPreset) {
    case 'grass_clump':
    case 'flower_stems':
      for(let i=0;i<6;i++){let x=Math.sin(i*2.4)*0.24,z=Math.cos(i*2.4)*0.24;
        part(g,cyl,c(0),[x,0.25,z],[.055,.5,.055]);
        if(asset.geometryPreset==='flower_stems') part(g,sphere,c(1),[x,0.56,z],[.24,.24,.24],glow);}
      break;
    case 'tree':
      part(g,cyl,'#674831',[0,1.1,0],[.42,2.2,.42]);
      for(let i=0;i<3;i++)part(g,sphere,c(i),[i*.3-.3,2.3+i*.22,0],[1.6,1.3,1.5],glow);break;
    case 'shrub':
      for(let i=0;i<4;i++)part(g,sphere,c(i),[Math.sin(i*2)*.34,.5,Math.cos(i*2)*.34],[.85,.9,.85],glow);break;
    case 'mushrooms':
      for(let i=0;i<4;i++){let x=i*.35-.5;
        part(g,cyl,'#d8ceb8',[x,.25,0],[.14,.5,.14]);part(g,sphere,c(i),[x,.55,0],[.55,.24,.55],glow);}break;
    case 'rocks': case 'rock_cluster':case 'ore_cluster':case 'sand_rocks':
      for(let i=0;i<5;i++)part(g,new THREE.DodecahedronGeometry(.55,0),c(i),[Math.sin(i*2.1)*.6,.26,Math.cos(i*2.1)*.5],[.8+(i%2)*.4,.8,.85],glow);break;
    case 'rock_mass':case 'mountain_mass':
      for(let i=0;i<3;i++)part(g,cone,c(i),[(i-1)*.75,(2+i)*.5,0],[1.5+(i%2),2+i,1.4],glow);break;
    case 'water_plane':
      part(g,new THREE.CylinderGeometry(2,2,.04,24),c(2),[0,0,0]);break;
    case 'cave_entrance':
      for(let i=0;i<7;i++){let ang=(i/6)*Math.PI;
        part(g,box,c(i),[Math.cos(ang)*1.6,Math.sin(ang)*1.7,0],[.65,.8,.9]);}break;
    case 'particles':
      for(let i=0;i<25;i++)part(g,sphere,c(i),[Math.sin(i*7)*2,Math.abs(Math.sin(i*3.1))*2,Math.cos(i*5)*2],[.08,.08,.08],glow);break;
    case 'path_segments':
      for(let i=0;i<6;i++)part(g,box,c(i),[0,.02,i*.6-1.5],[1.3,.05,.5]);break;
    case 'modular_structure':
      part(g,box,c(0),[0,.65,0],[1.8,1.3,.25]);break;
    case 'house':
      part(g,box,c(0),[0,1,0],[2.5,2,2.3]);
      part(g,cone,c(1),[0,2.5,0],[3,1.4,3]);break;
    case 'fortification':
      if (/tower/i.test(asset.name)) {
        part(g,cyl,c(0),[0,2.2,0],[2,4.4,2]);
        part(g,cone,c(1),[0,4.9,0],[2.5,1.3,2.5]);
      } else {
        part(g,box,c(0),[0,1,0],[2,2,1]);
        for(let i=0;i<3;i++)part(g,box,c(1),[i-1,2.3,0],[.5,.6,1.1]);
      }
      break;
    case 'ruin':
      for(let i=0;i<3;i++)part(g,box,c(i),[i-1,.8-i*.18,0],[.35,1.6-i*.35,.5]);break;
    case 'infrastructure':
      part(g,cyl,c(0),[0,.5,0],[1,1,1]);part(g,box,c(1),[0,1.2,0],[1.6,.22,1.6]);break;
    case 'prop':
      part(g,cyl,c(0),[0,.4,0],[.7,.8,.7]);part(g,sphere,c(1),[0,.9,0],[.55,.35,.55],glow);break;
    default: throw Error('Unknown geometryPreset: '+asset.geometryPreset);
  }
  g.scale.setScalar(asset.procedural.scale);
  g.userData.assetId=asset.id;
  return g;
}
/** This sample only aligns assets. Caller handles collisions, planet-local tangent frame, terrain validation, persistence. */
export function alignToTerrain(object, normal) {
  const up = new THREE.Vector3(0,1,0);
  object.quaternion.setFromUnitVectors(up,normal.clone().normalize());
}
/** Dispose unique geometries while leaving shared cached materials and geometries intact. */
export function disposeWorldAsset(group) {
  group.traverse(o=>{if(o.isMesh && o.geometry !==box && o.geometry !==sphere && o.geometry !==cone && o.geometry !==cyl) o.geometry.dispose();});
}
