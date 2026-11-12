import * as THREE from 'three';

// Lightweight 3D interpretations of the two supplied character portraits.
// The parts attach to the existing animated arms, legs, torso, head and cape.
export function applyReferenceCharacterModel(character, appearance) {
  const female = appearance === 'female';
  const navy = new THREE.MeshStandardMaterial({ color: 0x17264e, roughness: 0.72, side: THREE.DoubleSide });
  const deep = new THREE.MeshStandardMaterial({ color: 0x0c1939, roughness: 0.65, side: THREE.DoubleSide });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xf3f1ed, roughness: 0.8, side: THREE.DoubleSide });
  const silver = new THREE.MeshStandardMaterial({ color: 0xbbb8cd, roughness: 0.82, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8a25e, metalness: 0.6, roughness: 0.34, side: THREE.DoubleSide });
  const blue = new THREE.MeshStandardMaterial({ color: 0x50baf4, emissive: 0x1d83d9, emissiveIntensity: 0.8 });
  const hair = new THREE.MeshStandardMaterial({ color: female ? 0xc9c6d6 : 0x252336, roughness: 0.85 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3e2b2d, roughness: 0.86 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xbfc9da, metalness: 0.68, roughness: 0.3 });

  const add = (parent, geometry, material, position, scale, rotation) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    if (scale) object.scale.set(...scale);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.owner = character;
    parent.add(object);
    return object;
  };
  const box = (parent, material, position, size, rotation) => add(parent, new THREE.BoxGeometry(...size), material, position, null, rotation);
  const gem = (parent, position, scale = 0.13) => {
    add(parent, new THREE.OctahedronGeometry(scale), gold, position);
    add(parent, new THREE.OctahedronGeometry(scale * 0.69), blue, [position[0], position[1], position[2] + scale * 0.6]);
  };
  const panel = (parent, material, points, z = 0) => {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    return add(parent, new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false }), material, [0, 0, z]);
  };
  const lock = (parent, points, radius, material) => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    add(parent, new THREE.TubeGeometry(curve, 8, radius, 5, false), material, [0, 0, 0]);
  };

  character.torso.material = female ? deep : ivory;
  character.torso.geometry.dispose();
  character.torso.geometry = new THREE.CylinderGeometry(female ? 0.42 : 0.5, female ? 0.33 : 0.42, 1.25, 8);
  character.torso.scale.z = 0.72;
  character.leftArm.children[0].material = female ? ivory : navy;
  character.rightArm.children[0].material = female ? ivory : navy;
  character.leftLeg.children[0].material = female ? ivory : deep;
  character.rightLeg.children[0].material = female ? ivory : deep;
  character.head.children[0].material = hair;
  for (const eye of character.head.children.slice(1, 5)) if (eye.material?.emissive) eye.material = blue;

  // Coat, fitted corset, raised collar, shoulder armor and crystal pendant.
  box(character.group, female ? deep : navy, [0, 1.69, 0.15], [female ? 0.72 : 0.9, 1.16, 0.47]);
  if (female) {
    panel(character.group, ivory, [[-0.39, 2.18], [-0.13, 2.12], [-0.07, 1.58], [-0.3, 1.26]], 0.42);
    panel(character.group, ivory, [[0.39, 2.18], [0.13, 2.12], [0.07, 1.58], [0.3, 1.26]], 0.42);
    box(character.group, gold, [0, 1.65, 0.5], [0.05, 0.85, 0.035]);
    add(character.group, new THREE.CylinderGeometry(0.55, 0.76, 0.82, 10, 1, true), ivory, [0, 0.83, -0.03], [1, 1, 0.79]);
    panel(character.group, ivory, [[-0.65, 1.0], [-0.05, 1.02], [-0.13, 0.42], [-0.8, 0.37]], 0.35);
    panel(character.group, ivory, [[0.65, 1.0], [0.05, 1.02], [0.13, 0.42], [0.8, 0.37]], 0.35);
  } else {
    panel(character.group, navy, [[-0.52, 2.24], [-0.13, 2.05], [-0.07, 1.45], [-0.46, 1.16]], 0.46);
    panel(character.group, navy, [[0.52, 2.24], [0.13, 2.05], [0.07, 1.45], [0.46, 1.16]], 0.46);
    panel(character.group, gold, [[-0.5, 2.24], [-0.45, 2.21], [-0.09, 1.47], [-0.14, 1.45]], 0.49);
    panel(character.group, gold, [[0.5, 2.24], [0.45, 2.21], [0.09, 1.47], [0.14, 1.45]], 0.49);
    box(character.group, leather, [0, 1.26, 0.42], [0.92, 0.16, 0.11]);
    box(character.group, gold, [0.05, 1.26, 0.51], [0.24, 0.21, 0.05]);
    box(character.group, navy, [0, 2.34, -0.14], [0.93, 0.3, 0.62]);
  }
  gem(character.group, [0, 2.18, 0.55], 0.17);
  box(character.group, leather, [0.15, 1.75, 0.54], [0.09, 1.15, 0.08], [0, 0, -0.58]);
  for (const [arm, side] of [[character.leftArm, -1], [character.rightArm, 1]]) {
    add(arm, new THREE.SphereGeometry(0.3, 10, 7), gold, [side * 0.04, -0.12, 0], [1.2, 0.58, 1.1]);
    add(arm, new THREE.SphereGeometry(0.25, 10, 7), female ? ivory : navy, [side * 0.04, -0.14, 0.02], [1.1, 0.58, 1.1]);
    box(arm, gold, [0, -0.75, 0.17], [0.31, 0.17, 0.31]);
    gem(arm, [0, -0.16, 0.26], 0.1);
  }
  for (const leg of [character.leftLeg, character.rightLeg]) {
    box(leg, female ? ivory : deep, [0, -0.72, 0.01], [0.39, 0.75, 0.43]);
    box(leg, gold, [0, -0.76, 0.24], [0.25, 0.45, 0.04]);
    gem(leg, [0, -0.88, 0.29], 0.1);
  }

  // Layered coat tails move with the existing cape animation.
  character.cape.material = female ? ivory : navy;
  character.cape.scale.set(female ? 1.7 : 1.5, 1.35, 1);
  for (const side of [-1, 1]) {
    panel(character.cape, female ? silver : deep, [[side * 0.16, 0.49], [side * 0.46, 0.48], [side * 0.65, -1.06], [side * 0.2, -0.9]], -0.08);
    box(character.cape, gold, [side * 0.4, -0.57, 0.01], [0.025, 0.9, 0.04], [0, 0, -side * 0.13]);
  }

  // Silvery flowing hair or short dark layered locks, all true 3D curves.
  if (female) {
    for (const side of [-1, 1]) for (let strand = 0; strand < 4; strand++) {
      const x = side * (0.17 + strand * 0.085);
      lock(character.head, [[x, 0.24, -0.13], [x + side * 0.12, -0.19, -0.28], [x + side * 0.23, -0.75, -0.36], [x + side * 0.2, -1.43, -0.43]], 0.055 - strand * 0.005, hair);
    }
    lock(character.head, [[-0.25, 0.36, 0.09], [0, 0.42, 0.22], [0.23, 0.24, 0.33]], 0.1, hair);
  } else {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      add(character.head, new THREE.ConeGeometry(0.13, 0.36, 5), hair, [Math.cos(angle) * 0.25, 0.31, Math.sin(angle) * 0.23], null, [Math.sin(angle) * 0.45, 0, -Math.cos(angle) * 0.45]);
    }
  }

  // Three dimensional blade and guard follow the combat arm.
  character.weapon.visible = false;
  box(character.rightArm, leather, [0, -0.87, -0.07], [0.12, 0.6, 0.12]);
  box(character.rightArm, gold, [0, -0.54, -0.07], [0.57, 0.12, 0.18]);
  add(character.rightArm, new THREE.ConeGeometry(0.12, 1.3, 4), steel, [0, -1.77, -0.07], [1, 1, 0.52], [0, 0, Math.PI]);
  gem(character.rightArm, [0, -0.55, 0.03], 0.09);
  character.referenceModel = appearance;
  character.fallbackObjects = [...character.group.children];
}
