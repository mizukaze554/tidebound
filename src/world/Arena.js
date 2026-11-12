import * as THREE from 'three';

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.radius = 25;
    this.floaters = [];
    this.build();
  }

  material(color, roughness = 0.8, emissive = 0x000000) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.08, emissive, emissiveIntensity: 0.55 });
  }

  mesh(geometry, material, position, shadows = true) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    this.scene.add(mesh);
    return mesh;
  }

  build() {
    this.scene.background = new THREE.Color(0x91b6c4);
    this.scene.fog = new THREE.FogExp2(0x8daebb, 0.012);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(140, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec3 vPos; void main(){ float h = smoothstep(-0.25, 0.72, normalize(vPos).y); vec3 low = vec3(0.42, 0.62, 0.66); vec3 high = vec3(0.035, 0.12, 0.22); gl_FragColor = vec4(mix(low, high, h), 1.0); }',
      }),
    );
    this.scene.add(sky);
    const groundMat = this.material(0x203f3c, 0.96);
    const ground = this.mesh(new THREE.CylinderGeometry(this.radius, this.radius + 1.5, 0.8, 64), groundMat, new THREE.Vector3(0, -0.5, 0));
    ground.receiveShadow = true;

    const ring = this.mesh(
      new THREE.TorusGeometry(this.radius - 0.7, 0.17, 8, 96),
      this.material(0x6ee7dc, 0.3, 0x1c9c96),
      new THREE.Vector3(0, 0.03, 0),
    );
    ring.rotation.x = Math.PI / 2;

    const innerRing = this.mesh(new THREE.RingGeometry(7, 7.08, 64), this.material(0xa5d8c8, 0.5, 0x215c55), new THREE.Vector3(0, 0.015, 0), false);
    innerRing.rotation.x = -Math.PI / 2;

    const pillarMat = this.material(0x355a59);
    const crystalColors = [0x57d3ff, 0xbe8cff, 0x73f2bd];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const pos = new THREE.Vector3(Math.sin(angle) * 21.5, 0, Math.cos(angle) * 21.5);
      const pillar = this.mesh(new THREE.CylinderGeometry(0.55, 0.8, 4.5, 7), pillarMat, pos.clone().add(new THREE.Vector3(0, 2.25, 0)));
      pillar.rotation.y = angle;
      const crystal = this.mesh(
        new THREE.OctahedronGeometry(0.62, 0),
        this.material(crystalColors[i % 3], 0.18, crystalColors[i % 3]),
        pos.clone().add(new THREE.Vector3(0, 5.5 + (i % 2) * 0.45, 0)),
      );
      this.floaters.push({ mesh: crystal, base: crystal.position.y, phase: i * 0.8 });
    }

    const treeTrunk = this.material(0x4b4336);
    const treeLeaf = this.material(0x315d55);
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + 0.14;
      const r = 30 + (i % 4) * 2.4;
      const p = new THREE.Vector3(Math.sin(angle) * r, 0, Math.cos(angle) * r);
      this.mesh(new THREE.CylinderGeometry(0.25, 0.38, 2.6, 6), treeTrunk, p.clone().add(new THREE.Vector3(0, 1.3, 0)));
      this.mesh(new THREE.SphereGeometry(1.25 + (i % 3) * 0.18, 7, 6), treeLeaf, p.clone().add(new THREE.Vector3(0, 3.1, 0)));
    }

    const mountainMat = this.material(0x536773, 1);
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const r = 65 + (i % 3) * 8;
      const h = 12 + (i * 7 % 12);
      const mountain = this.mesh(new THREE.ConeGeometry(8 + (i % 4) * 2, h, 5), mountainMat, new THREE.Vector3(Math.sin(angle) * r, h / 2 - 1, Math.cos(angle) * r));
      mountain.rotation.y = i;
    }

    const hemi = new THREE.HemisphereLight(0xb9e9ff, 0x172727, 1.8);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffefd0, 3.2);
    sun.position.set(-18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -32;
    sun.shadow.camera.right = sun.shadow.camera.top = 32;
    sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  update(time) {
    for (const item of this.floaters) {
      item.mesh.position.y = item.base + Math.sin(time * 1.3 + item.phase) * 0.28;
      item.mesh.rotation.y = time * 0.55 + item.phase;
    }
  }
}
