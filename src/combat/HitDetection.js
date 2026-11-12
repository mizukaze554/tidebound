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

// Closest squared distance between two finite 3D segments. Used for continuous
// collision so a fast projectile cannot tunnel through a body between frames.
export function segmentSegmentDistanceSquared(p1, q1, p2, q2) {
  const d1 = q1.clone().sub(p1);
  const d2 = q2.clone().sub(p2);
  const r = p1.clone().sub(p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const epsilon = 1e-8;
  let s = 0;
  let t = 0;

  if (a <= epsilon && e <= epsilon) return p1.distanceToSquared(p2);
  if (a <= epsilon) {
    t = THREE.MathUtils.clamp(d2.dot(r) / e, 0, 1);
  } else {
    const c = d1.dot(r);
    if (e <= epsilon) {
      s = THREE.MathUtils.clamp(-c / a, 0, 1);
    } else {
      const b = d1.dot(d2);
      const denominator = a * e - b * b;
      if (denominator !== 0) s = THREE.MathUtils.clamp((b * d2.dot(r) - c * e) / denominator, 0, 1);
      t = (b * s + d2.dot(r)) / e;
      if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((b - c) / a, 0, 1); }
    }
  }
  const c1 = p1.clone().addScaledVector(d1, s);
  const c2 = p2.clone().addScaledVector(d2, t);
  return c1.distanceToSquared(c2);
}

export function sweptSphereIntersectsCapsule(start, end, sphereRadius, capsuleStart, capsuleEnd, capsuleRadius) {
  const radius = sphereRadius + capsuleRadius;
  return segmentSegmentDistanceSquared(start, end, capsuleStart, capsuleEnd) <= radius * radius;
}
