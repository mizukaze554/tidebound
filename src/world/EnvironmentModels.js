import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const trees = new Map();
let sharedRock = null;
const treeMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: THREE.DoubleSide });
const rockMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, flatShading: true });

function colored(geometry, color, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  if (geometry.index) { const expanded = geometry.toNonIndexed(); geometry.dispose(); geometry = expanded; }
  geometry.scale(...scale);
  geometry.rotateX(rotation[0]); geometry.rotateY(rotation[1]); geometry.rotateZ(rotation[2]);
  geometry.translate(...position);
  const tint = new THREE.Color(color);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let index = 0; index < colors.length; index += 3) {
    colors[index] = tint.r; colors[index + 1] = tint.g; colors[index + 2] = tint.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function treeGeometry(kind = 'broadleaf') {
  if (trees.has(kind)) return trees.get(kind);
  const pine = kind === 'pine';
  const blossom = kind === 'blossom';
  const ancient = kind === 'ancient';
  const trunk = ancient ? 0.62 : pine ? 0.3 : 0.36;
  const height = ancient ? 7.4 : pine ? 4.7 : 3.7;
  const parts = [colored(new THREE.CylinderGeometry(trunk * 0.66, trunk, height, 7), 0x73503c, [0, height / 2, 0])];
  for (const side of [-1, 1]) {
    parts.push(colored(new THREE.CylinderGeometry(0.09, 0.15, ancient ? 2.9 : 1.9, 5), 0x775341,
      [side * (ancient ? 1.05 : 0.65), height * 0.82, 0], [1, 1, 1], [0, 0, -side * 0.62]));
  }
  if (pine) {
    for (let tier = 0; tier < 4; tier++) parts.push(colored(new THREE.ConeGeometry(2.2 - tier * 0.35, 3.2, 8), tier % 2 ? 0x356d55 : 0x427e5a, [0, 3.5 + tier * 0.83, 0]));
  } else {
    const leaf = blossom ? [0xd89bb5, 0xe8b8c5, 0xc788a8] : ancient ? [0x3d895c, 0x58a672, 0x79af6d] : [0x4e985e, 0x76b36b, 0x5aa674];
    const scale = ancient ? 1.65 : 1;
    const crowns = [
      [-1.15, height + 0.68, 0.1, 1.7], [1.15, height + 0.6, 0.2, 1.65],
      [0, height + 1.48, -0.12, 2.05], [-0.2, height + 0.55, 1.1, 1.55],
      [0.38, height + 0.18, -1.08, 1.5],
    ];
    crowns.forEach(([x, y, z, radius], index) => parts.push(colored(new THREE.IcosahedronGeometry(radius * scale, 1), leaf[index % leaf.length],
      [x * scale, y * scale, z * scale], [1.08, 0.72 + index * 0.035, 0.94])));
  }
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  geometry.computeBoundingSphere();
  trees.set(kind, geometry);
  return geometry;
}

export function rockGeometry() {
  if (sharedRock) return sharedRock;
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const stone = new THREE.Color(0x78857f), moss = new THREE.Color(0x708d68);
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
    const roughness = 0.88 + Math.sin(x * 11.7 + y * 7.3 + z * 15.1) * 0.11;
    positions.setXYZ(index, x * roughness, y * roughness * 0.7, z * roughness);
    const color = y > 0.15 ? stone.clone().lerp(moss, 0.28 + Math.max(0, y) * 0.3) : stone;
    colors.set([color.r, color.g, color.b], index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  sharedRock = geometry;
  return geometry;
}

export function makeTree(kind = 'broadleaf') {
  const mesh = new THREE.Mesh(treeGeometry(kind), treeMaterial);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.sharedResource = true;
  mesh.userData.sharedGeometry = true;
  return mesh;
}

export function makeRock() {
  const mesh = new THREE.Mesh(rockGeometry(), rockMaterial);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.sharedResource = true;
  mesh.userData.sharedGeometry = true;
  return mesh;
}

export { treeMaterial, rockMaterial };
