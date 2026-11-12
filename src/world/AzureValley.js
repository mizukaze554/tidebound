import * as THREE from 'three';
import { makeRock, makeTree } from './EnvironmentModels.js';
import { EnvironmentAssetRegistry } from './EnvironmentAssetRegistry.js';

export class AzureValley {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'The Azure Valley';
    this.colliders = [];
    this.waterTime = { value: 0 };
    scene.add(this.group);
    this.build();
    void this.upgradeOptionalArt();
  }

  coordinates(x, z) {
    return {
      lat: this.world.spawnLat + z / this.world.radius,
      lon: this.world.spawnLon + x / (this.world.radius * Math.cos(this.world.spawnLat)),
    };
  }

  place(object, x, z, lift = 0, rotation = 0) {
    const { lat, lon } = this.coordinates(x, z);
    const point = this.world.surfacePoint(lat, lon, lift);
    object.position.copy(point);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), point.clone().normalize());
    object.rotateY(rotation);
    this.group.add(object);
    return object;
  }

  addCollision(x, z, radius) { this.colliders.push({ x, z, radius }); }

  blocksMovement(position, radius = 0.7) {
    const { lat, lon } = this.world.coordinates(position);
    const point = this.world.valleyCoordinates(lat, lon);
    return this.colliders.some((item) => Math.hypot(point.x - item.x, point.z - item.z) < item.radius + radius);
  }

  build() {
    const stone = new THREE.MeshStandardMaterial({ color: 0x91a9a0, roughness: 0.92 });
    const moss = new THREE.MeshStandardMaterial({ color: 0x6e8e70, roughness: 0.98 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd3bc82, metalness: 0.28, roughness: 0.54 });
    const crystal = new THREE.MeshStandardMaterial({ color: 0x7de3f1, emissive: 0x218fba, emissiveIntensity: 0.55, roughness: 0.3 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x70513a, roughness: 0.88 });
    const mesh = (geometry, material, x = 0, y = 0, z = 0) => {
      const object = new THREE.Mesh(geometry, material);
      object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true;
      return object;
    };

    // The giant tree and ruins frame the player's first view without blocking spawn.
    const elder = makeTree('ancient');
    elder.scale.setScalar(2.3);
    this.place(elder, -78, 33, 0, 0.22);
    this.heroTrees = [{ object: elder, key: 'ancientTree' }];
    this.addCollision(-78, 33, 2.7);
    const roots = new THREE.Group();
    for (let index = 0; index < 7; index++) {
      const angle = index * Math.PI * 2 / 7;
      const root = mesh(new THREE.CylinderGeometry(0.14, 0.38, 5, 6), wood,
        Math.cos(angle) * 2.0, 0.35, Math.sin(angle) * 2.0);
      root.rotation.z = Math.cos(angle) * 1.1; root.rotation.x = -Math.sin(angle) * 1.1;
      roots.add(root);
    }
    this.place(roots, -78, 33, 0.12);

    const forest = [
      [-53, 37, 'broadleaf', 1.1], [-61, 43, 'blossom', 0.95], [-89, 48, 'broadleaf', 1.3],
      [-102, 37, 'pine', 1.1], [-116, 42, 'pine', 1.25], [-42, 47, 'broadleaf', 1.0],
      [-65, -39, 'broadleaf', 1.1], [-88, -32, 'pine', 1.15], [-101, -42, 'pine', 1.1],
      [-32, -37, 'blossom', 0.85], [-19, 35, 'broadleaf', 0.9], [-52, -47, 'broadleaf', 1.2],
    ];
    forest.forEach(([x, z, type, scale], index) => {
      const tree = makeTree(type); tree.scale.setScalar(scale);
      this.place(tree, x, z, 0.03, index * 0.78);
      if (index < 4) this.heroTrees.push({ object: tree, key: type });
      this.addCollision(x, z, 0.55 * scale);
    });

    const ruins = new THREE.Group();
    for (const x of [-3, 0, 3]) {
      for (const z of [-2.5, 2.5]) {
        const pillar = mesh(new THREE.CylinderGeometry(0.38, 0.55, 3.9, 10), stone, x, 1.9, z);
        ruins.add(pillar);
        ruins.add(mesh(new THREE.BoxGeometry(1, 0.23, 1), moss, x, 3.85, z));
      }
    }
    ruins.add(mesh(new THREE.BoxGeometry(7.2, 0.55, 0.85), stone, 0, 4.2, -2.5));
    ruins.add(mesh(new THREE.BoxGeometry(7.2, 0.55, 0.85), stone, 0, 4.2, 2.5));
    const altar = mesh(new THREE.CylinderGeometry(1.1, 1.35, 0.75, 10), stone, 0, 0.38, 0);
    ruins.add(altar);
    ruins.add(mesh(new THREE.OctahedronGeometry(0.58, 0), crystal, 0, 1.55, 0));
    this.place(ruins, -47, 19, 0.04, 0.14);
    for (const x of [-3, 0, 3]) for (const z of [-2.5, 2.5]) this.addCollision(-47 + x, 19 + z, 0.55);

    // The bridge is slightly south of the walking trail and crosses a flowing river.
    const bridgeX = -34, bridgeZ = this.world.riverCenter(bridgeX);
    const bridge = new THREE.Group();
    for (let index = -6; index <= 6; index++) {
      bridge.add(mesh(new THREE.BoxGeometry(4.5, 0.24, 0.86), index % 3 ? stone : moss, 0, 0.42 + Math.cos(index / 7 * Math.PI) * 0.22, index * 0.91));
    }
    for (const x of [-2.15, 2.15]) {
      for (const z of [-4.8, 0, 4.8]) bridge.add(mesh(new THREE.BoxGeometry(0.3, 1.15, 0.3), stone, x, 1, z));
      bridge.add(mesh(new THREE.BoxGeometry(0.24, 0.22, 10.4), gold, x, 1.6, 0));
    }
    this.place(bridge, bridgeX, bridgeZ, 0.65);

    // Rounded rock masses strengthen the far ridge without a wall of pyramids.
    [[-134, -35, 13], [-145, -12, 16], [-151, 12, 14], [-130, 35, 11]].forEach(([x, z, size], index) => {
      const rock = makeRock(); rock.scale.set(size, size * 1.35, size * 1.1);
      this.place(rock, x, z, -size * 0.24, index * 0.63);
    });
    for (const [x, z, size] of [[-18, 18, 1.6], [-27, 38, 1.2], [-63, 9, 1.4], [-91, 11, 1.7], [-58, -28, 1.2]]) {
      const rock = makeRock(); rock.scale.set(size, size * 0.65, size * 1.15);
      this.place(rock, x, z, size * 0.2);
      this.addCollision(x, z, size * 0.6);
    }

    this.buildRiver(crystal);
    this.buildWaterfall(crystal);
  }

  buildRiver(crystal) {
    const positions = [], indices = [], colors = [];
    const waterColor = new THREE.Color(0x2e94b4);
    const foamColor = new THREE.Color(0x9de5de);
    const steps = 110;
    for (let index = 0; index <= steps; index++) {
      const x = -128 + index / steps * 182;
      const center = this.world.riverCenter(x);
      for (const side of [-1, 1]) {
        const z = center + side * 3.55;
        const { lat, lon } = this.coordinates(x, z);
        const point = this.world.surfacePoint(lat, lon, 0.18);
        positions.push(point.x, point.y, point.z);
        const tint = waterColor.clone().lerp(foamColor, Math.abs(side) * 0.11);
        colors.push(tint.r, tint.g, tint.b);
      }
      if (index < steps) {
        const a = index * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const water = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.14, transparent: true, opacity: 0.83, side: THREE.DoubleSide, depthWrite: false });
    water.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterTime = this.waterTime;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWaterTime;');
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed += normal * (sin(uWaterTime * 2.2 + position.x * 0.43 + position.z * 0.31) * 0.045);`);
    };
    const river = new THREE.Mesh(geometry, water);
    river.name = 'Azure River'; river.receiveShadow = true; this.group.add(river);

    const foam = new THREE.MeshBasicMaterial({ color: 0xd3f6ea, transparent: true, opacity: 0.56, depthWrite: false, side: THREE.DoubleSide });
    for (let index = 0; index < 18; index++) {
      const x = -120 + index * 9.6;
      const z = this.world.riverCenter(x) + (index % 2 ? -3.65 : 3.65);
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.34, 12, 1, 0, Math.PI), foam);
      ripple.rotateX(-Math.PI / 2);
      this.place(ripple, x, z, 0.23, index * 0.8);
    }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(9, 36), water);
    pool.rotation.x = -Math.PI / 2;
    this.place(pool, 54, this.world.riverCenter(54), 0.16);
    const source = new THREE.Group();
    source.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.1), crystal));
    this.place(source, -122, this.world.riverCenter(-122), 3.5);
  }

  buildWaterfall(crystal) {
    const x = -122, z = this.world.riverCenter(x);
    const curtain = new THREE.Group();
    const water = new THREE.MeshStandardMaterial({ color: 0x9ddfeb, emissive: 0x1a6d97, emissiveIntensity: 0.2, transparent: true, opacity: 0.67, side: THREE.DoubleSide, roughness: 0.23, depthWrite: false });
    for (let index = 0; index < 7; index++) {
      const width = index % 2 ? 0.56 : 0.75;
      const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(width, 11.5), water);
      ribbon.position.set(0.12 + index * 0.015, 6.3, (index - 3) * 0.68);
      ribbon.rotation.y = Math.PI / 2;
      curtain.add(ribbon);
    }
    const basin = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.14, 6, 32), new THREE.MeshBasicMaterial({ color: 0xbbeeff, transparent: true, opacity: 0.66 }));
    basin.rotation.x = Math.PI / 2; basin.position.y = 0.35; curtain.add(basin);
    curtain.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.4), crystal));
    this.place(curtain, x, z, 0.17);
    this.waterfall = curtain;
  }

  async upgradeOptionalArt() {
    this.assetRegistry = await EnvironmentAssetRegistry.fromManifest();
    for (const { object, key } of this.heroTrees) {
      const model = await this.assetRegistry.load(key);
      if (!model || !object.parent) continue;
      object.geometry.computeBoundingBox();
      const desiredHeight = (object.geometry.boundingBox.max.y - object.geometry.boundingBox.min.y) * object.scale.y;
      const clone = model.clone(true);
      clone.traverse((part) => {
        if (part.isMesh) { part.castShadow = part.receiveShadow = true; part.userData.sharedResource = true; }
      });
      const bounds = new THREE.Box3().setFromObject(clone);
      const scale = desiredHeight / Math.max(0.001, bounds.max.y - bounds.min.y);
      const anchor = new THREE.Group();
      anchor.position.copy(object.position); anchor.quaternion.copy(object.quaternion);
      clone.scale.setScalar(scale); clone.position.y = -bounds.min.y * scale;
      anchor.add(clone); object.parent.add(anchor); object.visible = false;
    }
  }

  update(time, playerPosition) {
    this.group.visible = playerPosition.distanceTo(this.world.surfacePoint(this.world.spawnLat, this.world.spawnLon)) < 280;
    this.waterTime.value = time;
    if (this.waterfall) this.waterfall.children.at(-1).rotation.y = time * 0.6;
  }
}
