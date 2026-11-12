import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/entities/Character.js';
import { applyReferenceCharacterModel } from '../src/entities/ReferenceCharacterModel.js';

test('both portrait based 3D appearances attach to the animated character rig', () => {
  for (const appearance of ['male', 'female']) {
    const scene = new THREE.Scene();
    const character = new Character(scene, { color: 0x267bb4, accent: 0x5ee3ff, name: 'Wayfarer', position: new THREE.Vector3(0, 700, 0), gender: appearance });
    applyReferenceCharacterModel(character, appearance);
    assert.equal(character.referenceModel, appearance);
    assert.ok(character.head.children.length > 5);
    assert.ok(character.rightArm.children.length > 3);
    assert.ok(character.leftLeg.children.length > 2);
    assert.ok(character.cape.children.length > 0);
    const before = character.rightArm.rotation.x;
    assert.equal(character.startAttack(), true);
    character.update(0.2, 0);
    assert.notEqual(character.rightArm.rotation.x, before);
    character.dispose();
  }
});
