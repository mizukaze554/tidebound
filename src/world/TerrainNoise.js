const smooth = (value) => value * value * (3 - 2 * value);
const mix = (a, b, t) => a + (b - a) * t;

function corner(x, y, z) {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

export function valueNoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz);
  const a = mix(corner(ix, iy, iz), corner(ix + 1, iy, iz), fx);
  const b = mix(corner(ix, iy + 1, iz), corner(ix + 1, iy + 1, iz), fx);
  const c = mix(corner(ix, iy, iz + 1), corner(ix + 1, iy, iz + 1), fx);
  const d = mix(corner(ix, iy + 1, iz + 1), corner(ix + 1, iy + 1, iz + 1), fx);
  return mix(mix(a, b, fy), mix(c, d, fy), fz);
}

export function fbm3(x, y, z, octaves = 4) {
  let sum = 0, amplitude = 0.5, total = 0;
  for (let index = 0; index < octaves; index++) {
    sum += (valueNoise3(x, y, z) * 2 - 1) * amplitude;
    total += amplitude;
    x = x * 2.03 + 17.17; y = y * 2.03 - 5.41; z = z * 2.03 + 9.83;
    amplitude *= 0.5;
  }
  return sum / total;
}

export function smoothstep(a, b, value) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return smooth(t);
}
