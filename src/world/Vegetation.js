import * as THREE from 'three';

let grassGeometry = null, flowerGeometry = null;

export function getGrassGeometry() {
  if (grassGeometry) return grassGeometry;
  const positions = [];
  for (let blade = 0; blade < 3; blade++) {
    const angle = blade * Math.PI * 2 / 3;
    const directionX = Math.cos(angle), directionZ = Math.sin(angle);
    const sideX = -directionZ * 0.12, sideZ = directionX * 0.12;
    const tipX = directionX * 0.2, tipZ = directionZ * 0.2;
    positions.push(-sideX, 0, -sideZ, sideX, 0, sideZ, tipX * 0.45, 0.38, tipZ * 0.45);
    positions.push(sideX, 0, sideZ, tipX, 0.72, tipZ, tipX * 0.45, 0.38, tipZ * 0.45);
  }
  grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  grassGeometry.computeVertexNormals();
  return grassGeometry;
}

export function getFlowerGeometry() {
  if (flowerGeometry) return flowerGeometry;
  const positions = [], colors = [];
  const add = (points, color) => {
    const tint = new THREE.Color(color);
    for (const point of points) { positions.push(...point); colors.push(tint.r, tint.g, tint.b); }
  };
  add([[-0.025, 0, 0], [0.025, 0, 0], [0, 0.61, 0]], 0x3f874c);
  for (let index = 0; index < 5; index++) {
    const angle = index * Math.PI * 2 / 5;
    const c = Math.cos(angle), s = Math.sin(angle);
    add([[0, 0.64, 0], [c * 0.25 - s * 0.08, 0.7, s * 0.25 + c * 0.08], [c * 0.25 + s * 0.08, 0.7, s * 0.25 - c * 0.08]], index % 2 ? 0xf6a4bc : 0xffd6a6);
  }
  flowerGeometry = new THREE.BufferGeometry();
  flowerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  flowerGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  flowerGeometry.computeVertexNormals();
  return flowerGeometry;
}

export function createVegetationMaterials() {
  const grass = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.92 });
  const wind = { value: 0 };
  grass.userData.wind = wind;
  grass.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = wind;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWindTime;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float windPhase = uWindTime * 1.7 + instanceMatrix[3].x * 0.047 + instanceMatrix[3].z * 0.053;
      transformed.x += sin(windPhase) * transformed.y * transformed.y * 0.15;
      transformed.z += cos(windPhase * 0.73) * transformed.y * transformed.y * 0.09;`);
  };
  const flower = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 });
  return { grass, flower, wind };
}
