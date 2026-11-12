import * as THREE from 'three';

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.pitch = 0.25;
    this.distance = 9;
    this.position = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.groundForward = new THREE.Vector3(0, 0, -1);
    this.groundRight = new THREE.Vector3(1, 0, 0);
    this.shake = 0;
    this.shakeTime = 0;
    this.sensitivity = 1;
  }

  addShake(strength = 0.15, duration = 0.16) { this.shake = Math.max(this.shake, strength); this.shakeTime = Math.max(this.shakeTime, duration); }

  update(dt, player, enemy, input, locked) {
    const up = player.up;
    this.groundForward.projectOnPlane(up).normalize();
    if (this.groundForward.lengthSq() < 0.01) this.groundForward.copy(player.facing);
    if (!locked) {
      this.groundForward.applyAxisAngle(up, -input.mouseDelta.x * 0.0023 * this.sensitivity).normalize();
      this.pitch = THREE.MathUtils.clamp(this.pitch - input.mouseDelta.y * 0.0017 * this.sensitivity, -0.05, 0.72);
    } else if (enemy?.alive) {
      const targetForward = enemy.position.clone().sub(player.position).projectOnPlane(up).normalize();
      this.groundForward.lerp(targetForward, 1 - Math.exp(-dt * 5)).normalize();
    }
    this.groundRight.crossVectors(this.groundForward, up).normalize();
    const focus = player.position.clone().addScaledVector(up, 1.65);
    let cameraDistance = this.distance;
    if (locked && enemy?.alive) {
      focus.lerp(enemy.position.clone().addScaledVector(enemy.up, 1.2), 0.42);
      cameraDistance = THREE.MathUtils.clamp(7.8 + player.position.distanceTo(enemy.position) * 0.18, 8.2, 12);
    }
    const desired = player.position.clone()
      .addScaledVector(up, 2.25 + Math.sin(this.pitch) * cameraDistance)
      .addScaledVector(this.groundForward, -Math.cos(this.pitch) * cameraDistance);
    this.position.lerp(desired, 1 - Math.exp(-dt * 7));
    this.lookAt.lerp(focus, 1 - Math.exp(-dt * 10));
    this.camera.position.copy(this.position);
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      this.camera.position.addScaledVector(this.groundRight, (Math.random() - 0.5) * this.shake)
        .addScaledVector(up, (Math.random() - 0.5) * this.shake);
      this.shake *= Math.max(0, 1 - dt * 9);
    } else this.shake = 0;
    this.camera.up.copy(up);
    this.camera.lookAt(this.lookAt);
  }

  forward() { return this.groundForward.clone(); }
  right() { return this.groundRight.clone(); }
}
