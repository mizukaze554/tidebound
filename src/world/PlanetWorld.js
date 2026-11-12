import * as THREE from 'three';
import { fbm3, smoothstep, valueNoise3 } from './TerrainNoise.js';
import { rockGeometry, rockMaterial, treeGeometry, treeMaterial } from './EnvironmentModels.js';
import { createVegetationMaterials, getFlowerGeometry, getGrassGeometry } from './Vegetation.js';
import { AzureValley } from './AzureValley.js';

// A globe-scale world is rendered in engine units for stable browser physics.
export class PlanetWorld {
  constructor(scene) {
    this.scene = scene;
    this.radius = 700;
    this.realAreaKm2 = 510_100_000;
    this.realRadiusKm = Math.sqrt(this.realAreaKm2 / (4 * Math.PI));
    this.kmPerUnit = this.realRadiusKm / this.radius;
    this.chunkAngle = Math.PI * 2 / 288;
    this.chunkRadius = 4;
    this.terrainSegments = 10;
    this.grassCount = 70;
    this.particleMultiplier = 0.75;
    this.quality = 'balanced';
    this.chunks = new Map();
    this.streamTimer = 0;
    this.weatherClock = 0;
    this.spawnLat = 0.35;
    this.spawnLon = 0.6;
    this.weather = 'CLEAR';
    this.valleyName = 'THE AZURE VALLEY';
    this.weatherParticles = null;
    this.weatherPositions = null;
    this.creaturesVisible = false;
    this.rotationAxis = new THREE.Vector3(0, 1, 0);
    this.vegetation = createVegetationMaterials();
    this.buildAtmosphere();
    this.buildClouds();
    this.valley = new AzureValley(this, this.scene);
    this.stream(this.surfacePoint(this.spawnLat, this.spawnLon));
  }

  buildAtmosphere() {
    this.planetCore = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius - 0.35, 64, 40),
      new THREE.MeshToonMaterial({ color: 0x4b8b67 }),
    );
    this.planetCore.receiveShadow = true;
    this.scene.add(this.planetCore);
    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uUp: { value: this.surfacePoint(this.spawnLat, this.spawnLon).normalize() }, uSun: { value: new THREE.Vector3(0.3, 0.9, 0.2).normalize() } },
      vertexShader: 'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `uniform vec3 uUp; uniform vec3 uSun; varying vec3 vPos;
        void main(){vec3 direction=normalize(vPos); float elevation=dot(direction,uUp);
          float horizon=smoothstep(-.14,.5,elevation); vec3 low=vec3(.78,.89,.89); vec3 high=vec3(.15,.43,.71);
          vec3 color=mix(low,high,horizon); float warmth=pow(max(dot(direction,uSun),0.),28.);
          color+=vec3(.34,.20,.09)*warmth*(1.-horizon*.4); gl_FragColor=vec4(color,1.);}`,
    });
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 2.8, 32, 20),
      this.skyMaterial,
    );
    this.scene.add(sky);
    this.scene.fog = new THREE.FogExp2(0xb3d5d6, 0.0032);
    this.hemi = new THREE.HemisphereLight(0xe4f3ff, 0x415f70, 1.25);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe9bd, 2.4);
    this.sun.position.set(-250, 400, 180);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -70;
    this.sun.shadow.camera.right = this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.far = 900;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
  }

  buildClouds() {
    this.cloudLayer = new THREE.Group();
    const material = new THREE.MeshToonMaterial({ color: 0xf7fcff, transparent: true, opacity: 0.72, depthWrite: false });
    for (let i = 0; i < 20; i++) {
      const lat = -0.9 + this.hash(i, 31) * 1.8;
      const lon = -Math.PI + this.hash(i, 41) * Math.PI * 2;
      const anchor = this.surfacePoint(lat, lon, 20 + this.hash(i, 52) * 12).normalize().multiplyScalar(this.radius + 24 + this.hash(i, 53) * 10);
      const normal = anchor.clone().normalize();
      const cloud = new THREE.Group();
      const puffCount = 3 + Math.floor(this.hash(i, 61) * 3);
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2 + this.hash(i * 9 + p, 62) * 2.8, 8, 6), material);
        puff.position.set((p - puffCount / 2) * 3.2, this.hash(p, i) * 1.4, (this.hash(p + 5, i) - 0.5) * 2.2);
        puff.scale.y = 0.55; cloud.add(puff);
      }
      cloud.position.copy(anchor);
      cloud.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      this.cloudLayer.add(cloud);
    }
    this.scene.add(this.cloudLayer);
  }

  buildDuelSanctuary() {
    const center = this.surfacePoint(this.spawnLat, this.spawnLon, 0.12);
    const up = center.clone().normalize();
    const east = new THREE.Vector3(-Math.sin(this.spawnLon), 0, Math.cos(this.spawnLon)).normalize();
    const north = new THREE.Vector3().crossVectors(up, east).normalize();
    const orient = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(8.2, 8.7, 64),
      new THREE.MeshToonMaterial({ color: 0xd9d2b2, emissive: 0x315f69, emissiveIntensity: 0.22, side: THREE.DoubleSide }),
    );
    ring.position.copy(center); ring.quaternion.copy(orient); ring.receiveShadow = true;
    this.scene.add(ring);

    const pillarGeometry = new THREE.CylinderGeometry(0.38, 0.55, 3.7, 8);
    pillarGeometry.translate(0, 1.85, 0);
    const pillars = new THREE.InstancedMesh(pillarGeometry, new THREE.MeshToonMaterial({ color: 0x829b98 }), 8);
    const crystalGeometry = new THREE.OctahedronGeometry(0.55, 0);
    const crystals = new THREE.InstancedMesh(crystalGeometry, new THREE.MeshToonMaterial({ color: 0x78e7ff, emissive: 0x35bddd, emissiveIntensity: 0.8 }), 8);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      const tangentPoint = center.clone().addScaledVector(east, Math.cos(angle) * 10.5).addScaledVector(north, Math.sin(angle) * 10.5);
      const normal = tangentPoint.clone().normalize();
      const position = normal.clone().multiplyScalar(this.surfaceRadius(tangentPoint) + 0.05);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      matrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1)); pillars.setMatrixAt(i, matrix);
      const crystalPosition = position.clone().addScaledVector(normal, 4.5);
      matrix.compose(crystalPosition, quaternion, new THREE.Vector3(1, 1.35, 1)); crystals.setMatrixAt(i, matrix);
    }
    pillars.castShadow = pillars.receiveShadow = true; crystals.castShadow = true;
    const rockGeometry = new THREE.DodecahedronGeometry(0.42, 0);
    const rocks = new THREE.InstancedMesh(rockGeometry, new THREE.MeshToonMaterial({ color: 0x667c78 }), 22);
    const flowerGeometry = new THREE.OctahedronGeometry(0.12, 0);
    const flowers = new THREE.InstancedMesh(flowerGeometry, new THREE.MeshToonMaterial({ color: 0xff9fc8, emissive: 0x7a294b, emissiveIntensity: 0.35 }), 34);
    const setDecoration = (mesh, index, angle, distance, height, scale) => {
      const tangentPoint = center.clone().addScaledVector(east, Math.cos(angle) * distance).addScaledVector(north, Math.sin(angle) * distance);
      const normal = tangentPoint.clone().normalize();
      const position = normal.clone().multiplyScalar(this.surfaceRadius(tangentPoint) + height);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      matrix.compose(position, quaternion, scale); mesh.setMatrixAt(index, matrix);
    };
    for (let i = 0; i < rocks.count; i++) setDecoration(rocks, i, this.hash(i, 801) * Math.PI * 2, 12 + this.hash(i, 802) * 7, 0.2, new THREE.Vector3(0.6 + this.hash(i, 803), 0.45 + this.hash(i, 804) * 0.7, 0.6 + this.hash(i, 805)));
    for (let i = 0; i < flowers.count; i++) setDecoration(flowers, i, this.hash(i, 811) * Math.PI * 2, 9.3 + this.hash(i, 812) * 9, 0.18, new THREE.Vector3(0.65, 1.2, 0.65));
    rocks.castShadow = rocks.receiveShadow = true;
    this.scene.add(pillars, crystals, rocks, flowers);
    this.sanctuary = { ring, pillars, crystals, rocks, flowers };
  }

  hash(x, y = 0) {
    const value = Math.sin(x * 127.1 + y * 311.7 + 74.77) * 43758.5453123;
    return value - Math.floor(value);
  }

  valleyCoordinates(lat, lon) {
    return { x: (lon - this.spawnLon) * this.radius * Math.cos(this.spawnLat), z: (lat - this.spawnLat) * this.radius };
  }

  riverCenter(x) { return -14 + Math.sin(x / 24) * 5; }

  slopeAt(lat, lon) {
    const stepLat = 1 / this.radius;
    const stepLon = 1 / (this.radius * Math.max(0.2, Math.cos(lat)));
    const north = (this.heightAt(lat + stepLat, lon) - this.heightAt(lat - stepLat, lon)) * 0.5;
    const east = (this.heightAt(lat, lon + stepLon) - this.heightAt(lat, lon - stepLon)) * 0.5;
    return Math.hypot(north, east);
  }

  heightAt(lat, lon) {
    const cos = Math.cos(lat);
    const nx = cos * Math.cos(lon), ny = Math.sin(lat), nz = cos * Math.sin(lon);
    const warp = (valueNoise3(nx * 8 + 3, ny * 8 - 7, nz * 8 + 11) - 0.5) * 0.7;
    const hills = fbm3(nx * 7 + warp, ny * 7 - warp, nz * 7 + warp, 4);
    const highland = smoothstep(0.5, 0.72, valueNoise3(nx * 3 + 14, ny * 3 + 5, nz * 3 - 9));
    const globalHeight = 3.5 + hills * 5.2 + highland * (8 + 7 * Math.abs(fbm3(nx * 19, ny * 19, nz * 19, 3)));
    const { x, z } = this.valleyCoordinates(lat, lon);
    const distance = Math.hypot(x, z);
    if (distance >= 230) return globalHeight;
    const valleyHills = fbm3(x / 68 + 12.3, z / 68 - 3.7, 1.83, 4) * 4.2
      + fbm3(x / 22 - 4.6, z / 22 + 9.1, 5.2, 3) * 0.8;
    const ridge = Math.exp(-(((x + 145) / 49) ** 2)) * (12 + 7 * Math.abs(fbm3(z / 25, x / 29, 2.8, 3)));
    const river = x > -135 && x < 60 ? Math.exp(-(((z - this.riverCenter(x)) / 4.8) ** 2)) * 1.7 : 0;
    let localHeight = 3.6 + valleyHills + ridge - river;
    localHeight = THREE.MathUtils.lerp(3.6, localHeight, smoothstep(10, 26, distance));
    return THREE.MathUtils.lerp(localHeight, globalHeight, smoothstep(150, 230, distance));
  }

  biomeAt(lat, lon, height = this.heightAt(lat, lon)) {
    const { x, z } = this.valleyCoordinates(lat, lon);
    if (Math.hypot(x, z) < 155) {
      if (x < -112 && height > 10) return 'highland';
      if (Math.abs(z - this.riverCenter(x)) < 5 && x > -135 && x < 60) return 'wetland';
      if (z > 20 && x < -40) return 'forest';
      return 'grassland';
    }
    const cos = Math.cos(lat);
    const moisture = valueNoise3(cos * Math.cos(lon) * 10 + 8, Math.sin(lat) * 10, cos * Math.sin(lon) * 10 - 4);
    if (Math.abs(lat) > 1.05) return 'tundra';
    if (height > 6) return 'highland';
    if (height < 2.3 && Math.abs(lat) < 0.85) return 'coast';
    if (moisture > 0.82) return 'wetland';
    if (moisture < 0.25) return 'steppe';
    if (moisture > 0.72) return 'forest';
    return 'grassland';
  }

  colorFor(lat, lon, height, slope = 0) {
    const biome = this.biomeAt(lat, lon, height);
    const cos = Math.cos(lat);
    const detail = valueNoise3(cos * Math.cos(lon) * 54 + 2, Math.sin(lat) * 54 - 7, cos * Math.sin(lon) * 54 + 4);
    const grass = new THREE.Color(0x5b9257).lerp(new THREE.Color(0x8ab66b), detail * 0.38);
    if (biome === 'forest') grass.lerp(new THREE.Color(0x315c47), 0.48);
    if (biome === 'wetland') grass.lerp(new THREE.Color(0x3c746b), 0.42);
    if (biome === 'steppe') grass.lerp(new THREE.Color(0xa7945d), 0.72);
    if (biome === 'coast') grass.lerp(new THREE.Color(0xc3b583), 0.85);
    const { x, z } = this.valleyCoordinates(lat, lon);
    if (Math.hypot(x, z) < 170 && x > -135 && x < 60) {
      const riverDistance = Math.abs(z - this.riverCenter(x));
      grass.lerp(new THREE.Color(0x647a57), (1 - smoothstep(4, 11, riverDistance)) * 0.45);
    }
    if (x > -60 && x < 12) {
      const trail = (7 - x) * 0.28 + Math.sin(x / 13) * 1.7;
      grass.lerp(new THREE.Color(0xa3916c), (1 - smoothstep(1.2, 3.5, Math.abs(z - trail))) * 0.53);
    }
    const rock = Math.max(smoothstep(0.35, 0.7, slope), smoothstep(9, 16, height) * 0.9);
    grass.lerp(new THREE.Color(0x737c78), rock);
    if (height > 18) grass.lerp(new THREE.Color(0xd8ded4), smoothstep(18, 25, height) * 0.8);
    return grass;
  }

  surfacePoint(lat, lon, extra = 0) {
    const cos = Math.cos(lat);
    const normal = new THREE.Vector3(cos * Math.cos(lon), Math.sin(lat), cos * Math.sin(lon));
    return normal.multiplyScalar(this.radius + this.heightAt(lat, lon) + extra);
  }

  coordinates(position) {
    const n = position.clone().normalize();
    return { lat: Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)), lon: Math.atan2(n.z, n.x) };
  }

  surfaceRadius(position) {
    const { lat, lon } = this.coordinates(position);
    return this.radius + this.heightAt(lat, lon);
  }

  spawnPositions() {
    const center = this.surfacePoint(this.spawnLat, this.spawnLon, 0.03);
    const up = center.clone().normalize();
    const east = new THREE.Vector3(-Math.sin(this.spawnLon), 0, Math.cos(this.spawnLon)).normalize();
    const a = center.clone().addScaledVector(east, 7).normalize();
    const b = center.clone().addScaledVector(east, -7).normalize();
    return {
      player: a.multiplyScalar(this.surfaceRadius(a)),
      enemy: b.multiplyScalar(this.surfaceRadius(b)),
      up,
    };
  }

  updateUp(character) {
    character.up.copy(character.position).normalize();
    character.facing.projectOnPlane(character.up).normalize();
    if (character.facing.lengthSq() < 0.01) character.facing.set(0, 0, 1).projectOnPlane(character.up).normalize();
  }

  constrain(character) {
    const surface = this.surfaceRadius(character.position);
    const radial = character.position.length();
    this.updateUp(character);
    if (character.grounded || radial <= surface) {
      character.position.normalize().multiplyScalar(surface);
      character.grounded = true;
      character.verticalSpeed = Math.max(0, character.verticalSpeed);
      if (radial <= surface) character.verticalSpeed = 0;
    }
  }

  chunkKey(latIndex, lonIndex) { return `${latIndex}:${lonIndex}`; }

  stream(position) {
    this.lastStreamPosition = position.clone();
    const { lat, lon } = this.coordinates(position);
    const centerLat = Math.floor((lat + Math.PI / 2) / this.chunkAngle);
    const centerLon = Math.floor((lon + Math.PI) / this.chunkAngle);
    const required = new Set();
    for (let y = -this.chunkRadius; y <= this.chunkRadius; y++) {
      for (let x = -this.chunkRadius; x <= this.chunkRadius; x++) {
        const li = THREE.MathUtils.clamp(centerLat + y, 0, Math.ceil(Math.PI / this.chunkAngle) - 1);
        const oi = this.wrapLonIndex(centerLon + x);
        const key = this.chunkKey(li, oi);
        required.add(key);
        if (!this.chunks.has(key)) this.generateChunk(li, oi, key);
      }
    }
    for (const [key, chunk] of this.chunks) if (!required.has(key)) this.removeChunk(key, chunk);
  }

  wrapLonIndex(index) {
    const count = Math.ceil(Math.PI * 2 / this.chunkAngle);
    return ((index % count) + count) % count;
  }

  generateChunk(latIndex, lonIndex, key) {
    const segments = this.terrainSegments;
    const lat0 = latIndex * this.chunkAngle - Math.PI / 2;
    const lon0 = lonIndex * this.chunkAngle - Math.PI;
    const positions = [], colors = [], indices = [];
    for (let y = 0; y <= segments; y++) {
      const lat = Math.min(Math.PI / 2, lat0 + this.chunkAngle * y / segments);
      for (let x = 0; x <= segments; x++) {
        const lon = lon0 + this.chunkAngle * x / segments;
        const height = this.heightAt(lat, lon);
        const p = this.surfacePoint(lat, lon);
        const color = this.colorFor(lat, lon, height, this.slopeAt(lat, lon));
        positions.push(p.x, p.y, p.z);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let y = 0; y < segments; y++) for (let x = 0; x < segments; x++) {
      const a = y * (segments + 1) + x, b = a + 1, c = a + segments + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    const group = new THREE.Group(); group.add(terrain);
    const grassGroup = new THREE.Group(), landmarkGroup = new THREE.Group();
    const creatureGroup = new THREE.Group(), resourceGroup = new THREE.Group();
    group.add(grassGroup, landmarkGroup, creatureGroup, resourceGroup);
    group.userData.detailGroups = { grassGroup, landmarkGroup, creatureGroup, resourceGroup };
    group.userData.center = this.surfacePoint(lat0 + this.chunkAngle * 0.5, lon0 + this.chunkAngle * 0.5);
    this.generateGrass(grassGroup, latIndex, lonIndex, lat0, lon0);
    this.generateLandmarks(landmarkGroup, latIndex, lonIndex, lat0, lon0);
    this.worldSlice?.attachChunk(key, group, latIndex, lonIndex, lat0, lon0);
    this.generateCreature(group, latIndex, lonIndex, lat0, lon0);
    this.scene.add(group);
    this.chunks.set(key, group);
  }

  generateGrass(group, latIndex, lonIndex, lat0, lon0) {
    const count = this.grassCount;
    const grass = new THREE.InstancedMesh(getGrassGeometry(), this.vegetation.grass, count);
    const flowers = new THREE.InstancedMesh(getFlowerGeometry(), this.vegetation.flower, Math.ceil(count / 5));
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    let blades = 0, blooms = 0;
    for (let i = 0; i < count * 3 && blades < count; i++) {
      const lat = lat0 + this.chunkAngle * this.hash(latIndex * 43 + i, lonIndex * 7);
      const lon = lon0 + this.chunkAngle * this.hash(lonIndex * 37 + i, latIndex * 11);
      const biome = this.biomeAt(lat, lon);
      if (!['grassland', 'forest', 'wetland', 'coast'].includes(biome)) continue;
      if (this.slopeAt(lat, lon) > 0.28) continue;
      const { x, z } = this.valleyCoordinates(lat, lon);
      if (x > -135 && x < 60 && Math.abs(z - this.riverCenter(x)) < 5) continue;
      if (fbm3(x / 17 + 6.4, z / 17 - 2.8, 0.46, 3) < -0.32) continue;
      const position = this.surfacePoint(lat, lon, 0.02);
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().normalize());
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.hash(i, latIndex + lonIndex) * Math.PI * 2));
      const size = 0.65 + this.hash(i * 3, latIndex) * 0.95;
      scale.set(size, size * (0.8 + this.hash(i + 91, lonIndex) * 0.55), size);
      matrix.compose(position, quaternion, scale); grass.setMatrixAt(blades, matrix);
      const tint = new THREE.Color(biome === 'forest' ? 0x6c9e58 : biome === 'wetland' ? 0x669a72 : 0x8ab869);
      tint.offsetHSL(this.hash(i + 51, latIndex) * 0.05 - 0.025, 0, this.hash(i + 63, lonIndex) * 0.1 - 0.05);
      grass.setColorAt(blades++, tint);
      if (blooms < flowers.instanceMatrix.count && biome === 'grassland' && this.hash(i + 33, lonIndex) > 0.82) {
        scale.setScalar(0.55 + this.hash(i + 89, latIndex) * 0.65);
        matrix.compose(position.clone().addScaledVector(position.clone().normalize(), 0.02), quaternion, scale);
        flowers.setMatrixAt(blooms++, matrix);
      }
    }
    grass.count = blades; flowers.count = blooms;
    if (blades) { grass.instanceMatrix.needsUpdate = true; grass.instanceColor.needsUpdate = true; grass.userData.sharedResource = true; group.add(grass); }
    if (blooms) { flowers.instanceMatrix.needsUpdate = true; flowers.userData.sharedResource = true; group.add(flowers); }
  }

  generateLandmarks(group, latIndex, lonIndex, lat0, lon0) {
    const centerLat = lat0 + this.chunkAngle * 0.5;
    const centerLon = lon0 + this.chunkAngle * 0.5;
    const biome = this.biomeAt(centerLat, centerLon);
    const trees = { broadleaf: [], pine: [], blossom: [] };
    const rocks = [];
    const capacity = biome === 'forest' ? 7 : biome === 'grassland' ? 4 : biome === 'wetland' ? 2 : biome === 'highland' ? 3 : 1;
    const matrix = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    for (let index = 0; index < capacity; index++) {
      const lat = lat0 + this.chunkAngle * (0.12 + this.hash(latIndex * 17 + index, lonIndex) * 0.76);
      const lon = lon0 + this.chunkAngle * (0.12 + this.hash(lonIndex * 23 + index, latIndex) * 0.76);
      const { x, z } = this.valleyCoordinates(lat, lon);
      if (Math.hypot(x - 7, z) < 23) continue;
      if (x > -135 && x < 60 && Math.abs(z - this.riverCenter(x)) < 5) continue;
      const slope = this.slopeAt(lat, lon);
      const cluster = fbm3(x / 35 + 3.2, z / 35 - 1.7, 0.81, 3);
      const position = this.surfacePoint(lat, lon, 0.02);
      const normal = position.clone().normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(up, this.hash(index + 7, latIndex) * Math.PI * 2));
      if ((biome === 'forest' || biome === 'grassland' || biome === 'wetland') && slope < 0.38 && cluster > -0.25) {
        const kind = biome === 'forest' && this.hash(index, lonIndex + 13) > 0.64 ? 'pine'
          : this.hash(index + 20, latIndex) > 0.93 ? 'blossom' : 'broadleaf';
        const size = 0.8 + this.hash(index * 4, latIndex + lonIndex) * 0.48;
        matrix.compose(position, quaternion, new THREE.Vector3(size, size, size));
        trees[kind].push(matrix.clone());
      } else if ((biome === 'highland' || slope > 0.22) && this.hash(index + 33, latIndex) > 0.2) {
        const size = 0.7 + this.hash(index * 5, lonIndex) * 1.2;
        matrix.compose(position, quaternion, new THREE.Vector3(size, size, size));
        rocks.push(matrix.clone());
      }
    }
    for (const [kind, placements] of Object.entries(trees)) {
      if (!placements.length) continue;
      const mesh = new THREE.InstancedMesh(treeGeometry(kind), treeMaterial, placements.length);
      placements.forEach((placement, index) => mesh.setMatrixAt(index, placement));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.sharedResource = true;
      group.add(mesh);
    }
    if (rocks.length) {
      const mesh = new THREE.InstancedMesh(rockGeometry(), rockMaterial, rocks.length);
      rocks.forEach((placement, index) => mesh.setMatrixAt(index, placement));
      mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.sharedResource = true;
      group.add(mesh);
    }
  }

  generateCreature(group, latIndex, lonIndex, lat0, lon0) {
    if (this.hash(latIndex, lonIndex + 113) < 0.62) return;
    const lat = lat0 + this.chunkAngle * 0.5;
    const lon = lon0 + this.chunkAngle * 0.5;
    const anchor = new THREE.Group();
    anchor.position.copy(this.surfacePoint(lat, lon, 0.3));
    anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), anchor.position.clone().normalize());
    const creature = new THREE.Group();
    const coat = new THREE.MeshToonMaterial({ color: this.hash(latIndex, lonIndex) > 0.5 ? 0x8265a2 : 0x4f8d89 });
    const glow = new THREE.MeshToonMaterial({ color: 0xffe5a0, emissive: 0xffad57, emissiveIntensity: 0.9 });
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), coat);
    body.position.y = 1.1; body.scale.set(1, 0.75, 1.2); creature.add(body);
    for (const x of [-0.48, 0.48]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 5), coat);
      horn.position.set(x, 1.95, 0.05); creature.add(horn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), glow);
      eye.position.set(x * 0.5, 1.25, 0.87); creature.add(eye);
    }
    creature.userData.phase = this.hash(latIndex, lonIndex) * Math.PI * 2;
    creature.traverse((mesh) => { if (mesh.isMesh) mesh.castShadow = true; });
    anchor.add(creature); anchor.visible = this.creaturesVisible;
    (group.userData.detailGroups?.creatureGroup || group).add(anchor);
    (group.userData.creatures ||= []).push({ anchor, creature });
  }

  setCreaturesVisible(visible) {
    this.creaturesVisible = visible;
    for (const chunk of this.chunks.values()) for (const item of chunk.userData.creatures || []) item.anchor.visible = visible;
  }

  removeChunk(key, chunk) {
    this.scene.remove(chunk);
    this.worldSlice?.detachChunk(chunk);
    const geometries = new Set(); const materials = new Set();
    chunk.traverse((object) => {
      if (!object.isMesh) return;
      if (object.userData.sharedResource) return;
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean).forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.chunks.delete(key);
  }

  setQuality(preset = 'balanced') {
    const config = {
      high: { radius: 5, segments: 14, grass: 120, particles: 1, shadow: 2048 },
      balanced: { radius: 4, segments: 11, grass: 70, particles: 0.75, shadow: 1024 },
      low: { radius: 3, segments: 7, grass: 25, particles: 0.4, shadow: 512 },
    }[preset] || { radius: 4, segments: 11, grass: 70, particles: 0.75, shadow: 1024 };
    if (this.quality === preset && this.chunks.size) return;
    this.quality = preset;
    this.chunkRadius = config.radius; this.terrainSegments = config.segments;
    this.grassCount = config.grass; this.particleMultiplier = config.particles;
    if (this.sun.shadow.mapSize.x !== config.shadow) {
      this.sun.shadow.mapSize.set(config.shadow, config.shadow);
      this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
    }
    const position = this.lastStreamPosition?.clone() || this.surfacePoint(this.spawnLat, this.spawnLon);
    for (const [key, chunk] of [...this.chunks]) this.removeChunk(key, chunk);
    this.stream(position);
  }

  setWeather(type, player) {
    this.weather = type;
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles.geometry.dispose(); this.weatherParticles.material.dispose();
      this.weatherParticles = null;
    }
    const config = {
      CLEAR: { fog: 0.0032, light: 2.4 }, RAIN: { fog: 0.007, light: 1.65 },
      FOG: { fog: 0.012, light: 1.1 }, STORM: { fog: 0.01, light: 0.9 }, SNOW: { fog: 0.007, light: 1.8 },
    }[type];
    this.scene.fog.density = config.fog; this.sun.intensity = config.light;
    if (!['RAIN', 'STORM', 'SNOW'].includes(type)) return;
    const count = Math.floor((type === 'STORM' ? 650 : 420) * this.particleMultiplier);
    this.weatherPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.weatherPositions[i * 3] = (this.hash(i, 1) - 0.5) * 42;
      this.weatherPositions[i * 3 + 1] = this.hash(i, 2) * 25;
      this.weatherPositions[i * 3 + 2] = (this.hash(i, 3) - 0.5) * 42;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.weatherPositions, 3));
    const material = new THREE.PointsMaterial({ color: type === 'SNOW' ? 0xffffff : 0x9bcce3, size: type === 'SNOW' ? 0.16 : 0.08, transparent: true, opacity: 0.75, depthWrite: false });
    this.weatherParticles = new THREE.Points(geometry, material);
    this.scene.add(this.weatherParticles);
    this.positionWeather(player);
  }

  positionWeather(player) {
    if (!this.weatherParticles || !player) return;
    this.weatherParticles.position.copy(player.position);
    this.weatherParticles.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), player.up);
  }

  update(time, dt, player = null) {
    if (!player) return;
    this.vegetation.wind.value = time;
    this.valley.update(time, player.position);
    this.weatherClock += dt;
    this.cloudLayer.rotation.y += dt * 0.004;
    const east = new THREE.Vector3().crossVectors(this.rotationAxis, player.up).normalize();
    if (east.lengthSq() < 0.01) east.set(1, 0, 0);
    this.sun.position.copy(player.position).addScaledVector(player.up, 110).addScaledVector(east, -95);
    this.sun.target.position.copy(player.position);
    this.sun.target.updateMatrixWorld();
    this.skyMaterial.uniforms.uUp.value.copy(player.up);
    this.skyMaterial.uniforms.uSun.value.copy(this.sun.position).sub(player.position).normalize();
    this.streamTimer -= dt;
    if (this.streamTimer <= 0) { this.stream(player.position); this.streamTimer = 0.45; }
    const detailDistance = this.quality === 'high' ? [85, 120, 70, 55]
      : this.quality === 'low' ? [37, 60, 38, 28] : [58, 88, 48, 38];
    for (const chunk of this.chunks.values()) {
      const distance = chunk.userData.center.distanceTo(player.position);
      const { grassGroup, landmarkGroup, creatureGroup, resourceGroup } = chunk.userData.detailGroups;
      grassGroup.visible = distance < detailDistance[0];
      landmarkGroup.visible = distance < detailDistance[1];
      creatureGroup.visible = distance < detailDistance[2];
      resourceGroup.visible = distance < detailDistance[3];
    }
    if (this.creaturesVisible) for (const chunk of this.chunks.values()) for (const { creature } of chunk.userData.creatures || []) {
      const phase = time * 0.8 + creature.userData.phase;
      creature.position.set(Math.sin(phase) * 1.8, Math.sin(phase * 2) * 0.12, Math.cos(phase) * 1.8);
      creature.rotation.y = -phase;
    }
    this.worldSlice?.update(player.position);
    const cycle = ['CLEAR', 'RAIN', 'FOG', 'STORM', 'SNOW'];
    const next = cycle[Math.floor(this.weatherClock / 40) % cycle.length];
    if (next !== this.weather) this.setWeather(next, player);
    if (this.weatherParticles) {
      const fall = this.weather === 'SNOW' ? 2.5 : 15;
      for (let i = 1; i < this.weatherPositions.length; i += 3) {
        this.weatherPositions[i] -= fall * dt;
        if (this.weatherPositions[i] < 0) this.weatherPositions[i] += 25;
      }
      this.weatherParticles.geometry.attributes.position.needsUpdate = true;
      this.positionWeather(player);
    }
    if (this.weather === 'STORM') this.sun.intensity = 0.65 + (Math.sin(this.weatherClock * 1.7) > 0.985 ? 5 : 0);
  }
}
