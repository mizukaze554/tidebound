import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sweptSphereIntersectsCapsule } from '../src/combat/HitDetection.js';
import { inMeleeArc } from '../src/combat/HitDetection.js';

test('swept projectile registers a body-height pass-through', () => {
  const projectileStart = new THREE.Vector3(-5, 1.5, 0);
  const projectileEnd = new THREE.Vector3(5, 1.5, 0);
  const bodyStart = new THREE.Vector3(0, 0.5, 0);
  const bodyEnd = new THREE.Vector3(0, 2.5, 0);
  assert.equal(sweptSphereIntersectsCapsule(projectileStart, projectileEnd, 0.2, bodyStart, bodyEnd, 0.7), true);
});

test('melee arc accepts targets in front and rejects targets behind', () => {
  const attacker = { position: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), facing: new THREE.Vector3(0, 0, 1) };
  assert.equal(inMeleeArc(attacker, { position: new THREE.Vector3(0, 0, 2), radius: 0.7 }, 2.5, 1.35), true);
  assert.equal(inMeleeArc(attacker, { position: new THREE.Vector3(0, 0, -1), radius: 0.7 }, 2.5, 1.35), false);
});

test('swept projectile misses outside the body capsule', () => {
  const projectileStart = new THREE.Vector3(-5, 4, 0);
  const projectileEnd = new THREE.Vector3(5, 4, 0);
  const bodyStart = new THREE.Vector3(0, 0.5, 0);
  const bodyEnd = new THREE.Vector3(0, 2.5, 0);
  assert.equal(sweptSphereIntersectsCapsule(projectileStart, projectileEnd, 0.2, bodyStart, bodyEnd, 0.7), false);
});

test('sweep catches tunneling that endpoint overlap would miss', () => {
  const start = new THREE.Vector3(-3, 1.4, 0);
  const end = new THREE.Vector3(3, 1.4, 0);
  const bodyStart = new THREE.Vector3(0, 0.5, 0);
  const bodyEnd = new THREE.Vector3(0, 2.5, 0);
  assert.ok(start.distanceTo(bodyStart) > 1);
  assert.ok(end.distanceTo(bodyStart) > 1);
  assert.equal(sweptSphereIntersectsCapsule(start, end, 0.15, bodyStart, bodyEnd, 0.65), true);
});
