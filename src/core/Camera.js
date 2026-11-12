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
  }

  update(dt, player, enemy, input, locked) {
    const up = player.up;
    this.groundForward.projectOnPlane(up).normalize();
    if (this.groundForward.lengthSq() < 0.01) this.groundForward.copy(player.facing);
    if (!locked) {
      this.groundForward.applyAxisAngle(up, -input.mouseDelta.x * 0.0023).normalize();
      this.pitch = THREE.MathUtils.clamp(this.pitch - input.mouseDelta.y * 0.0017, -0.05, 0.72);
    } else if (enemy?.alive) {
      const targetForward = enemy.position.clone().sub(player.position).projectOnPlane(up).normalize();
      this.groundForward.lerp(targetForward, 1 - Math.exp(-dt * 5)).normalize();
    }
    this.groundRight.crossVectors(this.groundForward, up).normalize();
    const focus = player.position.clone().addScaledVector(up, 1.65);
    if (locked && enemy?.alive) focus.lerp(enemy.position.clone().addScaledVector(enemy.up, 1.2), 0.24);
    const desired = player.position.clone()
      .addScaledVector(up, 2.25 + Math.sin(this.pitch) * this.distance)
      .addScaledVector(this.groundForward, -Math.cos(this.pitch) * this.distance);
    this.position.lerp(desired, 1 - Math.exp(-dt * 7));
    this.lookAt.lerp(focus, 1 - Math.exp(-dt * 10));
    this.camera.position.copy(this.position);
    this.camera.up.copy(up);
    this.camera.lookAt(this.lookAt);
  }

  forward() { return this.groundForward.clone(); }
  right() { return this.groundRight.clone(); }
}
