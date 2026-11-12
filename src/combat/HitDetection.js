import * as THREE from 'three';

export function circleOverlap(a, aRadius, b, bRadius) {
  return a.distanceToSquared(b) <= (aRadius + bRadius) ** 2;
}

export function inMeleeArc(attacker, target, range = 2.5, arc = 1.35) {
  const toTarget = target.position.clone().sub(attacker.position).projectOnPlane(attacker.up);
  const distance = toTarget.length();
  if (distance > range + target.radius) return false;
  return attacker.facing.dot(toTarget.normalize()) >= Math.cos(arc / 2);
}

export function pointNearSegment(point, start, end, radius) {
  const segment = end.clone().sub(start);
  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / Math.max(segment.lengthSq(), 0.001), 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, t)) <= radius;
}
