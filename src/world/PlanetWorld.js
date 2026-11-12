import * as THREE from 'three';

// The rendered globe is scaled for stable browser physics. Its declared surface
// area is 9.6 million km² (approximately China); kmPerUnit maps that authored
// scale onto the compact Three.js globe.
export class PlanetWorld {
  constructor(scene) {
    this.scene = scene;
    this.radius = 340;
    this.realAreaKm2 = 9_600_000;
    this.realRadiusKm = Math.sqrt(this.realAreaKm2 / (4 * Math.PI));
    this.kmPerUnit = this.realRadiusKm / this.radius;
    this.chunkAngle = Math.PI * 2 / 144;
    this.chunkRadius = 3;
    this.chunks = new Map();
    this.streamTimer = 0;
    this.weatherClock = 0;
    this.spawnLat = 0.36;
    this.spawnLon = 0.2;
    this.weather = 'CLEAR';
    this.weatherParticles = null;
    this.weatherPositions = null;
    this.buildAtmosphere();
    this.buildClouds();
    this.stream(this.surfacePoint(this.spawnLat, this.spawnLon));
  }

  buildAtmosphere() {
    this.planetCore = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius - 0.35, 64, 40),
      new THREE.MeshToonMaterial({ color: 0x4b8b67 }),
    );
    this.planetCore.receiveShadow = true;
    this.scene.add(this.planetCore);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 2.8, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'varying vec3 vPos; void main(){float h=smoothstep(-.45,.82,normalize(vPos).y);vec3 a=vec3(.72,.89,.94);vec3 b=vec3(.12,.42,.67);float glow=pow(max(normalize(vPos).y,0.),5.);gl_FragColor=vec4(mix(a,b,h)+vec3(.18,.13,.06)*glow,1.0);}',
      }),
    );
    this.scene.add(sky);
    this.scene.fog = new THREE.FogExp2(0xb8dce1, 0.006);
    this.hemi = new THREE.HemisphereLight(0xd9f4ff, 0x46634c, 2.2);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1cb, 3.4);
    this.sun.position.set(-250, 400, 180);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -70;
    this.sun.shadow.camera.right = this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.far = 900;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
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

  hash(x, y = 0) {
    const value = Math.sin(x * 127.1 + y * 311.7 + 74.77) * 43758.5453123;
    return value - Math.floor(value);
  }

  heightAt(lat, lon) {
    const continental = Math.sin(lon * 2 + Math.sin(lat * 3.4)) * 1.8;
    const ridges = Math.abs(Math.sin(lon * 8 + lat * 5.7) * Math.cos(lat * 9.1 - lon * 3));
    const detail = Math.sin(lon * 24 + lat * 19.3) * 0.42 + Math.sin(lon * 52 - lat * 37.4) * 0.18;
    return 0.8 + continental * 0.45 + ridges * 2.2 + detail;
  }

  biomeAt(lat, lon, height = this.heightAt(lat, lon)) {
    const moisture = Math.sin(lon * 5 - lat * 7.9) * 0.5 + 0.5;
    if (Math.abs(lat) > 1.05) return 'tundra';
    if (height > 3.4) return 'highland';
    if (moisture < 0.25) return 'steppe';
    if (moisture > 0.72) return 'forest';
    return 'grassland';
  }

  colorFor(biome, height) {
    const colors = { tundra: 0x9baead, highland: 0x68706a, steppe: 0x8a8153, forest: 0x245746, grassland: 0x3f7359 };
    return new THREE.Color(colors[biome]).offsetHSL(0, 0, THREE.MathUtils.clamp((height - 1.5) * 0.025, -0.04, 0.08));
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
    const segments = 10;
    const lat0 = latIndex * this.chunkAngle - Math.PI / 2;
    const lon0 = lonIndex * this.chunkAngle - Math.PI;
    const positions = [], colors = [], indices = [];
    for (let y = 0; y <= segments; y++) {
      const lat = Math.min(Math.PI / 2, lat0 + this.chunkAngle * y / segments);
      for (let x = 0; x <= segments; x++) {
        const lon = lon0 + this.chunkAngle * x / segments;
        const height = this.heightAt(lat, lon);
        const p = this.surfacePoint(lat, lon);
        const color = this.colorFor(this.biomeAt(lat, lon, height), height);
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
    const material = new THREE.MeshToonMaterial({ vertexColors: true });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    const group = new THREE.Group(); group.add(terrain);
    this.generateGrass(group, latIndex, lonIndex, lat0, lon0);
    this.generateLandmarks(group, latIndex, lonIndex, lat0, lon0);
    this.scene.add(group);
    this.chunks.set(key, group);
  }

  generateGrass(group, latIndex, lonIndex, lat0, lon0) {
    const count = 34;
    const geometry = new THREE.ConeGeometry(0.055, 0.62, 3);
    geometry.translate(0, 0.31, 0);
    const material = new THREE.MeshToonMaterial({ color: this.hash(latIndex, lonIndex) > 0.5 ? 0x71a957 : 0x5f984e });
    const grass = new THREE.InstancedMesh(geometry, material, count);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const lat = lat0 + this.chunkAngle * this.hash(latIndex * 43 + i, lonIndex * 7);
      const lon = lon0 + this.chunkAngle * this.hash(lonIndex * 37 + i, latIndex * 11);
      const position = this.surfacePoint(lat, lon, 0.02);
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().normalize());
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.hash(i, latIndex + lonIndex) * Math.PI));
      const s = 0.65 + this.hash(i * 3, latIndex) * 0.8;
      scale.set(s, s, s);
      matrix.compose(position, quaternion, scale); grass.setMatrixAt(i, matrix);
    }
    grass.castShadow = true; grass.receiveShadow = true; group.add(grass);
  }

  generateLandmarks(group, latIndex, lonIndex, lat0, lon0) {
    const count = 2 + Math.floor(this.hash(latIndex, lonIndex) * 4);
    for (let i = 0; i < count; i++) {
      const lat = lat0 + this.chunkAngle * (0.12 + this.hash(latIndex * 17 + i, lonIndex) * 0.76);
      const lon = lon0 + this.chunkAngle * (0.12 + this.hash(lonIndex * 23 + i, latIndex) * 0.76);
      const position = this.surfacePoint(lat, lon, 0.05);
      const normal = position.clone().normalize();
      const biome = this.biomeAt(lat, lon);
      const object = new THREE.Group();
      if (biome === 'forest' || biome === 'grassland') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 1.8, 6), new THREE.MeshToonMaterial({ color: 0x664932 }));
        trunk.position.y = 0.9;
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 + this.hash(i, latIndex) * 0.4, 1), new THREE.MeshToonMaterial({ color: biome === 'forest' ? 0x28845b : 0x54a666 }));
        crown.position.y = 2.1; object.add(trunk, crown);
      } else {
        const crystalColor = biome === 'tundra' ? 0x9fe8ff : 0xd0a76a;
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.45 + this.hash(i, lonIndex) * 0.5), new THREE.MeshToonMaterial({ color: crystalColor, emissive: crystalColor, emissiveIntensity: 0.35 }));
        crystal.position.y = 0.55; object.add(crystal);
      }
      object.position.copy(position);
      object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      object.traverse((mesh) => { if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true; });
      group.add(object);
    }
    // Rare ruins are tied to chunk coordinates, forming persistent discoveries
    // rather than random decorations that change between visits.
    if (this.hash(latIndex * 3, lonIndex * 5) > 0.86) {
      const lat = lat0 + this.chunkAngle * 0.5;
      const lon = lon0 + this.chunkAngle * 0.5;
      const position = this.surfacePoint(lat, lon, 0.04);
      const ruin = new THREE.Group();
      const stone = new THREE.MeshToonMaterial({ color: 0x718a82 });
      for (const x of [-1.15, 1.15]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 3.1, 7), stone);
        pillar.position.set(x, 1.55, 0); pillar.castShadow = pillar.receiveShadow = true; ruin.add(pillar);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3, 0.38, 0.6), stone);
      lintel.position.y = 3; lintel.castShadow = lintel.receiveShadow = true; ruin.add(lintel);
      ruin.position.copy(position);
      ruin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().normalize());
      group.add(ruin);
    }
  }

  removeChunk(key, chunk) {
    this.scene.remove(chunk);
    chunk.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose()); else object.material.dispose();
    });
    this.chunks.delete(key);
  }

  setWeather(type, player) {
    this.weather = type;
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles.geometry.dispose(); this.weatherParticles.material.dispose();
      this.weatherParticles = null;
    }
    const config = {
      CLEAR: { fog: 0.0045, light: 3.1 }, RAIN: { fog: 0.012, light: 1.7 },
      FOG: { fog: 0.024, light: 1.25 }, STORM: { fog: 0.018, light: 0.75 }, SNOW: { fog: 0.014, light: 2.1 },
    }[type];
    this.scene.fog.density = config.fog; this.sun.intensity = config.light;
    if (!['RAIN', 'STORM', 'SNOW'].includes(type)) return;
    const count = type === 'STORM' ? 650 : 420;
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
    this.weatherClock += dt;
    this.cloudLayer.rotation.y += dt * 0.004;
    this.sun.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.006);
    this.streamTimer -= dt;
    if (this.streamTimer <= 0) { this.stream(player.position); this.streamTimer = 0.45; }
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
