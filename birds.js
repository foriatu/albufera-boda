// Aves de la Albufera: garza real, garceta, cormorán y charrán.
// Cada ave es un esqueleto articulado (torso, cuello, cabeza, alas de dos tramos, patas)
// movido por una máquina de estados: llegar, posarse, acechar, pescar, zambullirse, irse.
import * as THREE from 'three';

const R = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const TAU = Math.PI * 2;
const V = () => new THREE.Vector3();

const SPECIES = {
  heron: {
    body: [0.105, 0.115, 0.26], neckN: 4, neckL: 0.115, neckR: [0.036, 0.020], head: [0.028, 0.030, 0.050], beak: [0.13, 0.013],
    leg: [0.24, 0.25], legR: 0.008, standH: 0.55, wing: [0.40, 0.50, 0.27], flapHz: 2.3, flapA: 0.55, cruise: 9,
    col: { body: 0xa9adb0, neck: 0xdcdcda, head: 0xe6e6e4, wing: 0x8f9498, tip: 0x2b2f36, beak: 0xd8a54a, leg: 0x7d6f4c },
    poses: {
      stand: [-0.55, [-1.95, -1.45, -1.05, -1.35], 0.05], hunch: [-0.45, [-2.5, -1.1, 0.2, -0.5], 0.1],
      alert: [-0.6, [-1.7, -1.6, -1.5, -1.5], 0.0], aim: [-0.15, [-1.2, -0.6, -0.2, 0.2], 0.6],
      strike: [0.25, [0.5, 0.7, 0.85, 0.95], 1.0], fly: [0, [-2.3, -0.7, 0.5, -0.1], 0.05], flare: [-0.6, [-1.6, -1.2, -0.8, -0.6], 0.1],
    },
  },
  cormorant: {
    body: [0.10, 0.105, 0.25], neckN: 3, neckL: 0.085, neckR: [0.034, 0.024], head: [0.026, 0.026, 0.045], beak: [0.07, 0.011],
    leg: [0.05, 0.06], legR: 0.010, standH: 0.23, wing: [0.30, 0.36, 0.22], flapHz: 5.0, flapA: 0.72, cruise: 13,
    col: { body: 0x17191c, neck: 0x1a1c1f, head: 0x1a1c1f, wing: 0x202327, tip: 0x121315, beak: 0x8a7a4a, leg: 0x101010 },
    poses: {
      stand: [-1.0, [-1.5, -1.35, -1.1], -0.1], hunch: [-0.95, [-1.9, -1.0, -0.6], 0.0], alert: [-1.05, [-1.5, -1.5, -1.4], -0.2],
      fly: [0.03, [-0.05, -0.08, -0.05], 0], swim: [-0.05, [-1.2, -1.35, -1.2], -0.15], dive: [0.9, [0.6, 0.9, 1.1], 1.2], flare: [-0.7, [-0.9, -0.8, -0.6], 0],
    },
  },
  tern: {
    body: [0.045, 0.045, 0.14], neckN: 2, neckL: 0.025, neckR: [0.026, 0.022], head: [0.024, 0.024, 0.034], beak: [0.045, 0.006],
    leg: [0.02, 0.03], legR: 0.004, standH: 0.075, wing: [0.20, 0.31, 0.10], flapHz: 3.4, flapA: 0.75, cruise: 8,
    col: { body: 0xf2f2f0, neck: 0xf2f2f0, head: 0x16171a, wing: 0xc9cdd2, tip: 0x565a61, beak: 0xc2402a, leg: 0xb23a2a },
    poses: {
      stand: [-0.15, [-0.9, -0.6], 0], hunch: [-0.1, [-1.1, -0.4], 0.1], alert: [-0.2, [-1.0, -0.8], -0.1],
      fly: [0, [0, 0], 0.25], hover: [-0.5, [-0.2, 0.1], 0.7], dive: [1.25, [1.25, 1.25], 1.25], flare: [-0.5, [-0.4, -0.2], 0.1],
    },
  },
};

// Flamenco: solo se usa de lejos, en grupos quietos sobre el agua somera
SPECIES.flamingo = {
  body: [0.12, 0.13, 0.26], neckN: 4, neckL: 0.19, neckR: [0.030, 0.016], head: [0.030, 0.032, 0.050], beak: [0.09, 0.020],
  leg: [0.42, 0.45], legR: 0.007, standH: 0.93, wing: [0.34, 0.42, 0.24], flapHz: 2.6, flapA: 0.6, cruise: 11, legStand: [-0.06, 0.12],
  col: { body: 0xf2a7a0, neck: 0xf4b8b0, head: 0xf4b8b0, wing: 0xee8d88, tip: 0x2a2020, beak: 0x33282a, leg: 0xe58a8a },
  poses: { up: [-0.25, [-1.75, -1.6, -1.45, -1.3], 0.5], look: [-0.3, [-1.9, -1.5, -1.2, -1.0], 0.2], feed: [0.15, [-0.9, 0.3, 1.35, 1.9], 2.6] },
};
Object.assign(SPECIES.heron, { neckSeg: 7, legStand: [-0.22, 0.42], crest: true, stripe: true, plumes: { breast: 0.17, back: 0.30, n: 6 } });
Object.assign(SPECIES.heron.col, { body: 0x9a9d9f, belly: 0xe9e8e3, neck: 0xe3e2dd, head: 0xf0efea, wing: 0x878b8f, tip: 0x26282c, beak: 0xd9a441, beakTip: 0xb9892f, leg: 0x8a7355, eye: 0xd8b21c });
Object.assign(SPECIES.cormorant, { neckSeg: 5, legStand: [0, 0], hook: true });
Object.assign(SPECIES.cormorant.col, { body: 0x1b1d1f, belly: 0x232527, neck: 0x1d1f21, head: 0x1f2123, wing: 0x2a2620, tip: 0x121314, beak: 0xb9a060, beakTip: 0x4a4638, leg: 0x111111, eye: 0x2f8f6a });
Object.assign(SPECIES.tern, { neckSeg: 3, legStand: [0, 0], forked: true, cap: 0x121316 });
Object.assign(SPECIES.tern.col, { body: 0xc4c8cc, belly: 0xf6f6f4, neck: 0xf4f4f2, head: 0xf4f4f2, wing: 0xbfc4c9, tip: 0x5a5e65, beak: 0xc8402a, beakTip: 0x2a1512, leg: 0xb23a2a });
SPECIES.flamingo.neckSeg = 8;
SPECIES.egret = {
  ...SPECIES.heron, scale: 0.62, flapHz: 3.1, crest: false, stripe: false, plumes: { breast: 0.12, back: 0.46, n: 9 },
  col: { body: 0xf5f5f2, belly: 0xfafaf8, neck: 0xf6f6f3, head: 0xf8f8f6, wing: 0xf2f2ef, tip: 0xe9e9e5, beak: 0x1f1d1b, leg: 0x1a1918, foot: 0xc9b23a },
};
// Cuello con más vértebras: las poses, definidas con pocas claves, se reparten entre todas
for (const sp of Object.values(SPECIES)) {
  if (!sp.neckSeg || sp.poses.__fine) continue;
  const m = sp.neckN, n = sp.neckSeg;
  for (const P of Object.values(sp.poses)) P[1] = Array.from({ length: n }, (_, j) => { const x = j / (n - 1) * (m - 1), i = Math.min(m - 2, Math.floor(x)); return P[1][i] + (P[1][i + 1] - P[1][i]) * (x - i); });
  Object.defineProperty(sp.poses, '__fine', { value: true });
}
for (const [k, sp] of Object.entries(SPECIES)) if (sp.neckSeg) { if (!sp.__len) { sp.neckLfine = sp.neckL * sp.neckN / sp.neckSeg; } }
SPECIES.egret.neckLfine = SPECIES.heron.neckLfine;

// Textura de plumaje: vetas finas que rompen el color plano
const featherTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1100; i++) { const v = 120 + Math.floor(Math.random() * 90); g.fillStyle = `rgba(${v},${v},${v},${0.10 + Math.random() * 0.20})`; g.fillRect(Math.random() * 128, Math.random() * 128, 5 + Math.random() * 16, 1.3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 5); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const mats = {};
const mat = (hex, double) => mats[hex + (double ? 'd' : '')] ||= new THREE.MeshStandardMaterial({ color: hex, map: featherTex, roughness: 0.68, side: double ? THREE.DoubleSide : THREE.FrontSide });
const ball = (rx, ry, rz, hex) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(hex)); m.scale.set(rx, ry, rz); return m; };

const featherMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: featherTex, roughness: 0.64, side: THREE.DoubleSide });
const C = hex => new THREE.Color(hex);
const mkGeo = (pos, col, uv, idx) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
// Piel tendida sobre secciones: [z, medio ancho, alto arriba, alto abajo, centro y, color lomo, color vientre]
function loft(secs, M = 16) {
  const pos = [], col = [], uv = [], idx = [], c = new THREE.Color();
  secs.forEach(([z, w, hu, hd, cy, ct, cb], i) => {
    for (let j = 0; j <= M; j++) {
      const a = j / M * TAU, sn = Math.sin(a);
      pos.push(w * Math.cos(a), cy + (sn > 0 ? hu : hd) * sn, z);
      c.copy(cb).lerp(ct, THREE.MathUtils.smoothstep(sn, -0.55, 0.30)); col.push(c.r, c.g, c.b); uv.push(j / M * 2, i * 0.7);
    }
  });
  for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  return mkGeo(pos, col, uv, idx);
}
// Plumas sueltas: cada una nace en una raíz y apunta con un ángulo dentro del plano del ala (0 = hacia atrás)
function feathers(list, cBase, cTip) {
  const pos = [], col = [], uv = [], idx = [], c = new THREE.Color();
  const shape = [[-0.5, 0], [0.5, 0], [0.47, 0.62], [0.30, 0.90], [0, 1], [-0.30, 0.90], [-0.47, 0.62]];
  list.forEach((f, n) => {
    const k = pos.length / 3, sn = Math.sin(f.a), cs = Math.cos(f.a);
    for (const [u, v] of shape) {
      const lx = u * f.w, lz = -v * f.len;
      pos.push(f.x + lx * cs - lz * sn, f.y - v * v * (f.droop || 0) * f.len, f.z + lx * sn + lz * cs);
      c.copy(cBase).lerp(cTip, THREE.MathUtils.smoothstep(v, 0.25, 0.95) * (f.tip ?? 1)); col.push(c.r, c.g, c.b); uv.push(u + 0.5 + n * 0.37, v * 1.5);
    }
    idx.push(k, k + 1, k + 2, k, k + 2, k + 6, k + 6, k + 2, k + 3, k + 6, k + 3, k + 5, k + 5, k + 3, k + 4);
  });
  return mkGeo(pos, col, uv, idx);
}

function build(sp) {
  const c = sp.col, [bx, by, bz] = sp.body, root = new THREE.Group(), torso = new THREE.Group();
  const nN = sp.neckSeg || sp.neckN, nL = sp.neckLfine || sp.neckL;
  const cBody = C(c.body), cBelly = C(c.belly ?? c.neck), cWing = C(c.wing), cTip = C(c.tip), cNeck = C(c.neck), cHead = C(c.head), cBeak = C(c.beak);
  root.rotation.order = 'YXZ'; root.add(torso);

  // cuerpo: lomo en pendiente, pecho lleno, vientre y rabadilla que se afina; el vientre más claro
  const B = [[-1.15, 0.15, 0.12, 0.12, 0.10], [-0.85, 0.55, 0.45, 0.42, 0.05], [-0.40, 0.90, 0.78, 0.80, 0.0], [0.10, 1.0, 0.85, 1.0, -0.03],
    [0.55, 0.88, 0.80, 0.98, 0.0], [0.85, 0.62, 0.60, 0.72, 0.15], [1.02, 0.40, 0.42, 0.42, 0.36], [1.10, sp.neckR[0] / bx, sp.neckR[0] / by, sp.neckR[0] / by, 0.45]];
  torso.add(new THREE.Mesh(loft(B.map(([z, w, hu, hd, cy]) => [z * bz, w * bx, hu * by, hd * by, cy * by, cBody, cBelly])), featherMat));

  // cola: timoneras en abanico (más largas las de fuera en el charrán)
  const tailN = sp.forked ? 6 : 7, tl = [];
  for (let i = 0; i < tailN; i++) { const u = i / (tailN - 1) * 2 - 1; tl.push({ x: u * bx * 0.22, y: by * 0.10 - Math.abs(u) * 0.004, z: -bz * 1.02, a: u * 0.42, len: bz * (sp.forked ? 0.45 + 0.85 * Math.abs(u) : 0.78 - 0.12 * u * u), w: bx * (sp.forked ? 0.22 : 0.42), droop: 0.05 }); }
  torso.add(new THREE.Mesh(feathers(tl, cWing, cTip), featherMat));

  // plumas ornamentales: pecho y espalda de la garza, airones de la garceta
  if (sp.plumes) {
    const breast = new THREE.Group(), back = new THREE.Group(), pb = [], pk = [], P = sp.plumes;
    for (let i = 0; i < 7; i++) { const u = i / 6 * 2 - 1; pb.push({ x: u * bx * 0.45, y: 0, z: 0, a: u * 0.35, len: P.breast * (0.7 + 0.3 * Math.random()), w: 0.016, tip: 0 }); }
    for (let i = 0; i < P.n; i++) { const u = i / (P.n - 1) * 2 - 1; pk.push({ x: u * bx * 0.55, y: -Math.abs(u) * 0.01, z: 0, a: u * 0.22, len: P.back * (0.75 + 0.25 * Math.random()), w: 0.02, droop: 0.12, tip: 0 }); }
    breast.add(new THREE.Mesh(feathers(pb, cBelly, cBelly), featherMat)); breast.position.set(0, -by * 0.25, bz * 0.72); breast.rotation.x = -1.2; torso.add(breast);
    back.add(new THREE.Mesh(feathers(pk, C(P.col ?? c.neck), C(P.col ?? c.neck)), featherMat)); back.position.set(0, by * 0.72, -bz * 0.15); back.rotation.x = -0.22; torso.add(back);
  }

  // cuello en cadena de vértebras
  const neck = []; let parent = torso;
  for (let i = 0; i < nN; i++) {
    const g = new THREE.Group(), r0 = THREE.MathUtils.lerp(sp.neckR[0], sp.neckR[1], i / nN), r1 = THREE.MathUtils.lerp(sp.neckR[0], sp.neckR[1], (i + 1) / nN);
    const cg = new THREE.CylinderGeometry(r1, r0, nL, 12); cg.rotateX(Math.PI / 2); cg.translate(0, 0, nL / 2);
    g.add(new THREE.Mesh(cg, mat(c.neck)), ball(r0, r0, r0, c.neck));
    g.position.set(0, i ? 0 : by * 0.45, i ? nL : bz * 1.08);
    parent.add(g); neck.push(g); parent = g;
  }
  // cabeza y pico de una pieza: cráneo que se afila en el pico
  const head = new THREE.Group(); head.position.z = nL; parent.add(head);
  const [hx, hy, hz] = sp.head, [bl, br] = sp.beak, nr = sp.neckR[1], hook = sp.hook ? br * 1.4 : 0;
  head.add(new THREE.Mesh(loft([
    [-hz * 0.25, nr * 0.9, nr * 0.9, nr * 0.9, 0, cNeck, cNeck], [hz * 0.25, hx * 0.92, hy * 0.95, hy * 0.85, hy * 0.08, cHead, cNeck], [hz * 0.75, hx, hy, hy * 0.9, hy * 0.10, cHead, cHead],
    [hz * 1.15, hx * 0.72, hy * 0.72, hy * 0.70, hy * 0.02, cHead, cHead], [hz * 1.42, br * 1.25, br * 1.15, br * 1.15, 0, cBeak, cBeak],
    [hz * 1.42 + bl * 0.5, br * 0.72, br * 0.70, br * 0.72, -hook * 0.1, cBeak, cBeak], [hz * 1.42 + bl * 0.9, br * 0.28, br * 0.30, br * 0.32, -hook * 0.5, cBeak, C(sp.col.beakTip ?? c.beak)],
    [hz * 1.42 + bl, br * 0.04, br * 0.05, br * 0.05, -hook, C(sp.col.beakTip ?? c.beak), C(sp.col.beakTip ?? c.beak)]], 12), featherMat));
  for (const s of [1, -1]) {
    const eye = ball(hx * 0.20, hx * 0.20, hx * 0.20, c.eye ?? 0x0c0c0c); eye.position.set(s * hx * 0.80, hy * 0.30, hz * 0.95); head.add(eye);
    if (sp.stripe) { const st = ball(hx * 0.16, hy * 0.26, hz * 0.95, 0x141518); st.position.set(s * hx * 0.80, hy * 0.62, hz * 0.45); st.rotation.x = 0.25; head.add(st); }
  }
  if (sp.cap) { const cap = ball(hx * 0.98, hy * 0.55, hz * 0.95, sp.cap); cap.position.set(0, hy * 0.55, hz * 0.55); head.add(cap); }
  if (sp.crest) for (const s of [1, -1]) {          // penacho negro de la garza
    const cg = new THREE.ConeGeometry(0.006, 0.12, 5); cg.rotateX(-Math.PI / 2); cg.translate(0, 0, -0.06);
    const cr = new THREE.Mesh(cg, mat(0x16171a)); cr.position.set(s * 0.008, hy * 0.6, hz * 0.15); cr.rotation.x = 0.4; head.add(cr);
  }
  const tip = new THREE.Object3D(); tip.position.z = hz * 1.42 + bl; head.add(tip);

  // alas: brazo y mano con su borde de ataque, cobertoras, secundarias y primarias pluma a pluma
  const [wi, wo, ch] = sp.wing, wings = [];
  for (const s of [1, -1]) {
    const shoulder = new THREE.Group(), outer = new THREE.Group();
    shoulder.rotation.order = 'ZYX'; outer.rotation.order = 'ZYX';
    shoulder.position.set(s * bx * 0.72, by * 0.48, bz * 0.30);
    const sec = [], cov = [], pri = [], pcov = [], nS = 9, nP = 9;
    for (let i = 0; i < nS; i++) { const u = (i + 0.5) / nS; sec.push({ x: s * wi * u, y: -0.0006 * i, z: -ch * 0.08, a: s * 0.10 * u, len: ch * (0.66 + 0.06 * u), w: wi / nS * 1.55, droop: 0.04 }); }
    for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7; cov.push({ x: s * wi * u, y: 0.006, z: ch * 0.26, a: s * 0.06 * u, len: ch * 0.52, w: wi / 7 * 1.5, tip: 0.25 }); }
    for (let i = 0; i < nP; i++) {
      const u = i / (nP - 1), len = THREE.MathUtils.lerp(ch * 0.80, wo * 0.62, THREE.MathUtils.smoothstep(u, 0, 0.75)) * (i === nP - 1 ? 0.92 : 1);
      pri.push({ x: s * wo * 0.44 * u, y: -0.0006 * i, z: THREE.MathUtils.lerp(-ch * 0.06, ch * 0.10, u), a: s * THREE.MathUtils.lerp(0.14, 1.22, Math.pow(u, 0.85)), len, w: Math.max(ch * 0.17, len * 0.17), droop: 0.03 });
    }
    for (let i = 0; i < 5; i++) { const u = (i + 0.5) / 5; pcov.push({ x: s * wo * 0.42 * u, y: 0.006, z: ch * (0.26 - 0.10 * u), a: s * (0.10 + 0.7 * u), len: ch * 0.42, w: wo * 0.11, tip: 0.3 }); }
    const edge = (len, r, x1, z1) => { const g = new THREE.CylinderGeometry(r * 0.7, r, len, 8); g.rotateZ(-s * Math.PI / 2); const m = new THREE.Mesh(g, mat(c.wing)); m.position.set(s * len / 2, 0.004, z1); return m; };
    shoulder.add(new THREE.Mesh(feathers(sec, cWing, cTip), featherMat), new THREE.Mesh(feathers(cov, cWing, cWing), featherMat), edge(wi, ch * 0.055, 0, ch * 0.25));
    outer.position.set(s * wi, 0, 0);
    const hand = edge(wo * 0.46, ch * 0.04, 0, ch * 0.22); hand.rotation.y = -s * 0.24;
    outer.add(new THREE.Mesh(feathers(pri, cTip.clone().lerp(cWing, 0.35), cTip), featherMat), new THREE.Mesh(feathers(pcov, cWing, cWing), featherMat), hand);
    shoulder.add(outer); torso.add(shoulder);
    // ala cerrada: una lámina pegada al costado, con las puntas de las primarias cruzando sobre la cola
    const folded = new THREE.Mesh(loft([[0.42, 0.10, 0.30, 0.30, 0.15], [0.0, 0.20, 0.62, 0.62, 0.08], [-0.60, 0.16, 0.45, 0.45, 0.02], [-1.05, 0.08, 0.20, 0.18, -0.02], [-1.38, 0.01, 0.03, 0.03, -0.05]]
      .map(([z, w, hu, hd, cy], n) => [z * bz, w * bx, hu * by, hd * by, cy * by, n > 2 ? cTip : cWing, n > 2 ? cTip : cWing.clone().lerp(cTip, 0.3)]), 10), featherMat);
    folded.position.set(s * bx * 0.74, by * 0.10, 0); folded.rotation.y = s * 0.09; torso.add(folded);
    wings.push({ s, shoulder, outer, folded, fs: [1, 1, 1] });
  }

  // patas: muslo emplumado, tibia hacia delante y tarso hacia atrás, con dedos
  const legs = [];
  for (const s of [1, -1]) {
    const hip = new THREE.Group(), knee = new THREE.Group(), [l0, l1] = sp.leg;
    hip.position.set(s * bx * 0.45, -by * 0.55, -bz * 0.05);
    const g0 = new THREE.CylinderGeometry(sp.legR * 1.5, sp.legR, l0, 8); g0.translate(0, -l0 / 2, 0);
    const g1 = new THREE.CylinderGeometry(sp.legR, sp.legR * 0.9, l1, 8); g1.translate(0, -l1 / 2, 0);
    const thigh = ball(bx * 0.30, Math.min(l0 * 0.45, by * 0.55), bx * 0.34, c.belly ?? c.neck); thigh.position.y = -Math.min(l0 * 0.25, by * 0.3);
    hip.add(new THREE.Mesh(g0, mat(c.leg)), thigh, knee); knee.position.y = -l0;
    knee.add(new THREE.Mesh(g1, mat(c.leg)), ball(sp.legR * 1.6, sp.legR * 1.6, sp.legR * 1.6, c.leg));
    for (const a of [-0.5, 0, 0.5, Math.PI]) {
      const tg = new THREE.BoxGeometry(sp.legR * 1.2, sp.legR, sp.legR * (a === Math.PI ? 4 : 9)); tg.translate(0, 0, sp.legR * (a === Math.PI ? 2 : 4.5));
      const toe = new THREE.Mesh(tg, mat(c.foot ?? c.leg)); toe.position.y = -l1; toe.rotation.y = a; knee.add(toe);
    }
    root.add(hip); legs.push({ hip, knee });
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.scale.setScalar(sp.scale || 1);
  return { root, torso, neck, head, tip, wings, legs };
}
// Coloca las alas: w = 1 abiertas, w = 0 recogidas. Al plegarse barren hacia atrás y se encogen
// hasta fundirse con el bulto del ala cerrada, que crece a la vez en el costado.
function poseWings(wings, w, inner, outer, dry) {
  const fold = 1 - w, k = Math.max(0.02, Math.pow(w, 0.8)), lump = Math.max(0, 1 - w / 0.4);
  for (const wg of wings) {
    wg.shoulder.visible = w > 0.05;
    wg.shoulder.rotation.set(0, wg.s * (fold * 1.15 + (dry ? 0.35 : 0)), wg.s * inner * w);
    wg.shoulder.scale.setScalar(k);
    wg.outer.rotation.set(0, -wg.s * fold * 1.5, wg.s * outer * w);
    wg.folded.visible = lump > 0.01;
    wg.folded.scale.set(wg.fs[0] * lump, wg.fs[1] * (0.4 + 0.6 * lump), wg.fs[2] * (0.4 + 0.6 * lump));
  }
}

export function createBirds(ctx) {
  const { scene, ripple, perches } = ctx;
  const boatNear = (x, z) => { let d = 1e9, bx = 0, bz = 0; for (const p of ctx.boats()) { const q = Math.hypot(p.x - x, p.z - z); if (q < d) { d = q; bx = p.x; bz = p.z; } } return { d, x: bx, z: bz }; };
  const wadeSpots = [[-10.0, -15.2, 1.2], [-9.6, -20.6, 1.0], [5.6, -12.5, -1.3], [6.4, -21.5, -1.1], [-21, -58, 0.5], [24, -66, -0.6], [-36, -92, 1.0]]
    .map(([x, z, yaw]) => ({ pos: new THREE.Vector3(x, -0.16, z), yaw, taken: false, kind: 'wade' }));
  perches.forEach(pc => { pc.kind = 'perch'; pc.taken = false; });
  const exitPoint = () => new THREE.Vector3((Math.random() < 0.5 ? -1 : 1) * R(55, 85), R(8, 18), R(-110, -25));
  // Entre los sitios libres, casi siempre eligen uno de los cercanos a la orilla
  // Cada ave tiene su zona: las de cerca eligen sitios junto a la orilla; las de lejos, de 30 m en adelante
  const freeOf = (list, near, zone) => {
    let f = list.filter(s => !s.taken && (!near || s.pos.z > near) && boatNear(s.pos.x, s.pos.z).d > 16);
    const close = f.filter(s => s.pos.z > -30), farS = f.filter(s => s.pos.z <= -30);
    if (zone === 'far') { if (farS.length) f = farS; }
    else if (close.length && (zone === 'near' || Math.random() < 0.75)) f = close;
    return f.length ? f[Math.floor(Math.random() * f.length)] : null;
  };

  // salpicadura
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sg = sc.getContext('2d'), gr = sg.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
  const splash = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  splash.visible = false; scene.add(splash);
  let splashT = -9;
  const doSplash = (x, z, t, size = 1) => { splash.position.set(x, 0.12 * size, z); splash.userData.size = size; splashT = t; ripple(x, z, t); ripple(x + 0.05, z + 0.05, t + 0.15); };

  const tmp = V(), tmp2 = V();

  // ---------- bandadas lejanas ----------
  // Un solo dibujo instanciado: cada ave son un cuerpo y dos alas que baten en el shader.
  const MAXF = 420;
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.5, 0.06, 0, 0, -0.06, 0, 0, 0, 0, -0.5,
    0.06, 0, 0.18, 1, 0, 0.05, 1, 0, -0.12, 0.06, 0, -0.22,
    -0.06, 0, 0.18, -1, 0, 0.05, -1, 0, -0.12, -0.06, 0, -0.22], 3));
  fg.setIndex([0, 1, 2, 3, 2, 1, 4, 5, 6, 4, 6, 7, 8, 10, 9, 8, 11, 10]);
  const flapAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAXF * 3), 3);
  fg.setAttribute('aFlap', flapAttr);
  const farMat = new THREE.MeshBasicMaterial({ color: 0x1a1c20, side: THREE.DoubleSide });
  farMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = ctx.time;
    sh.vertexShader = 'attribute vec3 aFlap;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { float w = abs(position.x) - 0.06;
        if (w > 0.0) { float a = sin(uTime * aFlap.y + aFlap.x) * aFlap.z + 0.08; transformed.x = sign(position.x) * (0.06 + w * cos(a)); transformed.y = w * sin(a); } }`);
  };
  const farMesh = new THREE.InstancedMesh(fg, farMat, MAXF);
  farMesh.frustumCulled = false; farMesh.count = 0; scene.add(farMesh);
  const far = [], dm = new THREE.Object3D();
  const edgeX = (z, dir) => -dir * (Math.abs(z) * 0.75 + 70);
  const member = (extra) => ({ ph: R(0, TAU), px: 0, pz: 0, yaw: 0, ...extra });
  const spawners = {
    // formación en V: moritos, cormoranes
    v(t) {
      const dir = Math.random() < 0.5 ? 1 : -1, z = R(-650, -130), n = 9 + Math.floor(R(0, 24)), sc = R(0.55, 0.9), gap = sc * R(2.6, 3.4);
      const f = { type: 'v', dir, z, y: R(12, 55), x: edgeX(z, dir), v: R(11, 15), sc, hz: R(3, 4.2), birds: [] };
      for (let i = 0; i < n; i++) { const k = Math.ceil(i / 2), side = i % 2 ? 1 : -1; f.birds.push(member({ ox: -dir * k * gap * R(0.9, 1.1), oz: side * k * gap * 0.75, k })); }
      return f;
    },
    // gaviotas planeando en círculos
    wheel(t) {
      const dir = Math.random() < 0.5 ? 1 : -1, z = R(-420, -120), n = 14 + Math.floor(R(0, 22));
      const f = { type: 'wheel', dir, z, y: R(22, 60), x: edgeX(z, dir) - dir * 30, v: R(2.5, 4.5), sc: R(0.6, 0.8), hz: 2.6, birds: [] };
      for (let i = 0; i < n; i++) f.birds.push(member({ r: R(6, 36), w: R(0.22, 0.5) * (Math.random() < 0.85 ? 1 : -1), h: R(-12, 12), a: R(0, TAU) }));
      return f;
    },
    // nube de estorninos al atardecer
    swarm(t) {
      const dir = Math.random() < 0.5 ? 1 : -1, z = R(-650, -320), n = 150;
      const f = { type: 'swarm', dir, z, y: R(35, 70), x: edgeX(z, dir) - dir * 40, v: R(4, 6.5), sc: 0.22, hz: 9, birds: [] };
      for (let i = 0; i < n; i++) f.birds.push(member({ a: R(0.3, 1.1), b: R(0.3, 1.1), c: R(0.3, 1.1), pa: R(0, TAU), pb: R(0, TAU), pc: R(0, TAU) }));
      return f;
    },
  };
  const nextFar = { v: 18, wheel: 90, swarm: 40 };
  function updateFar(t, dt, day, tw) {
    if (day > 0.12) {
      if (t > nextFar.v && !far.some(f => f.type === 'v')) { nextFar.v = t + R(50, 130) * (1 - 0.3 * tw); far.push(spawners.v(t)); }
      if (t > nextFar.wheel && !far.some(f => f.type === 'wheel')) { nextFar.wheel = t + R(160, 340); far.push(spawners.wheel(t)); }
      if (tw > 0.35 && t > nextFar.swarm && !far.some(f => f.type === 'swarm')) { nextFar.swarm = t + R(150, 300); far.push(spawners.swarm(t)); }
    }
    let n = 0;
    for (let fi = far.length - 1; fi >= 0; fi--) {
      const f = far[fi];
      f.x += f.dir * f.v * dt;
      if (Math.abs(f.x) > Math.abs(f.z) * 0.75 + 140) { far.splice(fi, 1); continue; }
      const breathe = 0.75 + 0.25 * Math.sin(t * 0.37 + f.z);
      for (const b of f.birds) {
        if (n >= MAXF) break;
        let x, y, z, amp = 0.7, roll = 0;
        if (f.type === 'v') { x = f.x + b.ox; z = f.z + b.oz; y = f.y + 0.7 * Math.sin(t * 0.8 - b.k * 0.5 + f.z); }
        else if (f.type === 'wheel') { b.a += b.w * dt; x = f.x + Math.cos(b.a) * b.r; z = f.z + Math.sin(b.a) * b.r * 0.7; y = f.y + b.h + 2 * Math.sin(t * 0.2 + b.ph); amp = 0.07 + 0.5 * Math.max(0, Math.sin(t * 0.3 + b.ph) - 0.6); roll = -0.45 * Math.sign(b.w); }
        else {
          const rr = 26 * breathe;
          x = f.x + rr * 1.9 * Math.sin(b.a * t * 0.7 + b.pa) + 14 * Math.sin(t * 0.21 + f.z);
          y = f.y + rr * 0.5 * Math.sin(b.b * t * 0.7 + b.pb) + 9 * Math.sin(t * 0.45 + x * 0.04);
          z = f.z + rr * Math.sin(b.c * t * 0.7 + b.pc);
        }
        const dx = x - b.px, dz = z - b.pz;
        if (dx * dx + dz * dz > 1e-6) b.yaw = Math.atan2(dx, dz);
        b.px = x; b.pz = z;
        dm.position.set(x, y, z); dm.rotation.set(0, b.yaw, roll, 'YXZ'); dm.scale.setScalar(f.sc); dm.updateMatrix();
        farMesh.setMatrixAt(n, dm.matrix); flapAttr.setXYZ(n, b.ph, f.hz * TAU, amp); n++;
      }
    }
    farMesh.count = n; farMesh.instanceMatrix.needsUpdate = true; flapAttr.needsUpdate = true;
    farMat.color.setScalar(0.02 + 0.10 * day);
  }

  class Bird {
    constructor(kind, zone) {
      this.kind = kind; this.zone = zone; this.sp = SPECIES[kind]; this.sc = this.sp.scale || 1;
      Object.assign(this, build(this.sp));
      this.pos = this.root.position; this.vel = V(); this.yaw = 0; this.roll = 0;
      this.pose = { torso: 0, neck: this.sp.poses.fly[1].slice(), head: 0 }; this.nN = this.sp.neckSeg || this.sp.neckN; this.legStand = this.sp.legStand || [0, 0]; this.poseT = 'fly'; this.poseK = 4;
      this.w = 1; this.wT = 1; this.effort = 1; this.amp = 1; this.phase = R(0, TAU);
      this.hip = 1.5; this.hipT = 1.5; this.knee = 0; this.kneeT = 0;
      this.headYaw = 0; this.headYawT = 0; this.lookAt = 0; this.dry = false;
      this.state = 'away'; this.until = 0; this.root.visible = false;
      scene.add(this.root);
    }
    setPose(name, k = 4) { this.poseT = this.sp.poses[name] ? name : 'stand'; this.poseK = k; }
    standH() { return this.sp.standH * this.sc; }
    enter(state, t) { this.state = state; this.tS = t; }

    // --- vuelo ---
    steer(target, speed, accel, dt) {
      tmp.copy(target).sub(this.pos); const d = tmp.length();
      tmp.multiplyScalar(speed / Math.max(d, 1e-4)).sub(this.vel).clampLength(0, accel * dt);
      this.vel.add(tmp); this.pos.addScaledVector(this.vel, dt);
      const sp = this.vel.length();
      if (sp > 0.3) {
        let dy = Math.atan2(this.vel.x, this.vel.z) - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        const turn = clamp(dy, -3 * dt, 3 * dt); this.yaw += turn;
        this.roll += (clamp(-turn / Math.max(dt, 1e-3) * 0.3, -0.75, 0.75) - this.roll) * Math.min(1, 4 * dt);
        this.pitch = -Math.asin(clamp(this.vel.y / sp, -1, 1)) * 0.6;
      }
      return d;
    }
    appear(t) {
      this.pos.copy(exitPoint()); this.vel.set(-Math.sign(this.pos.x) * this.sp.cruise, 0, 0); this.yaw = Math.atan2(this.vel.x, this.vel.z);
      this.root.visible = true; this.w = this.wT = 1; this.setPose('fly'); this.hipT = 1.5; this.amp = 1; this.effort = 1; this.dry = false;
    }
    flyTo(target, cb, t) { this.target = target.clone(); this.cb = cb; this.enter('fly', t); this.setPose('fly'); this.wT = 1; this.hipT = 1.5; this.kneeT = 0; this.effort = 1; }
    landAt(spot, t) {
      spot.taken = true; this.spot = spot; this.enter('land', t);
      this.target = spot.pos.clone(); this.target.y += this.standH(); this.wT = 1; this.setPose('fly');
    }
    takeoff(cb, t) {
      if (this.spot) { this.spot.taken = false; this.spot = null; }
      this.cb = cb; this.enter('takeoff', t); this.dry = false;
      this.vel.set(Math.sin(this.yaw) * 2.6, 2.9, Math.cos(this.yaw) * 2.6); this.w = 0.6; this.wT = 1; this.effort = 1.8; this.amp = 1.2; this.setPose('fly', 6); this.hipT = 0.6;
    }
    leave(t) { this.flyTo(exitPoint(), tt => { this.root.visible = false; this.state = 'away'; this.until = tt + R(30, 110); }, t); }

    // --- decisiones por especie ---
    arrive(t) {
      if (this.kind === 'tern') return this.patrol(t);
      const perch = freeOf(perches, -95, this.zone), wade = freeOf(wadeSpots, 0, this.zone);
      if (this.kind === 'cormorant') return perch ? this.landAt(perch, t) : this.landAt(this.waterSpot(), t);
      if (wade && Math.random() < 0.7) return this.landAt(wade, t);
      return perch ? this.landAt(perch, t) : this.leave(t);
    }
    waterSpot() { return { pos: new THREE.Vector3(R(-7, 7), 0.03 - this.standH(), R(-23, -12)), taken: false, kind: 'swim' }; }
    patrol(t) {
      const r = Math.random();
      if (r < 0.14 && this.day > 0.15) { const pc = freeOf(perches, -50); if (pc) return this.landAt(pc, t); }
      if (r < 0.24 || this.day < 0.15) return this.leave(t);
      const wp = this.zone === 'far' ? new THREE.Vector3(R(-45, 45), R(5, 11), R(-110, -40)) : new THREE.Vector3(R(-22, 22), R(4, 8.5), R(-60, -12));
      this.flyTo(wp, tt => (Math.random() < 0.45 ? this.startHover(tt) : this.patrol(tt)), t);
    }
    startHover(t) { this.enter('hover', t); this.until = t + R(1.2, 2.8); this.hoverAt = this.pos.clone(); this.setPose('hover', 6); this.effort = 1.9; this.amp = 1.1; }

    settle(t) {
      const s = this.spot; this.pos.copy(this.target); this.vel.set(0, 0, 0); this.roll = 0; this.pitch = 0;
      if (s.yaw !== undefined) this.yawT = s.yaw; else this.yawT = this.yaw;
      [this.hipT, this.kneeT] = this.legStand; this.effort = 1; this.amp = 1;
      if (s.kind === 'swim') { this.enter('swim', t); this.wT = 0; this.setPose('swim', 5); this.dives = Math.floor(R(2, 5)); this.until = t + R(4, 9); doSplash(this.pos.x, this.pos.z, t, 0.6); return; }
      this.wT = 0; this.setPose('stand', 4); this.leaveAt = t + (this.kind === 'tern' ? R(15, 50) : R(55, 170));
      if (s.kind === 'wade') { this.enter('wade', t); this.sub = 'still'; this.subUntil = t + R(4, 12); ripple(this.pos.x, this.pos.z, t); }
      else { this.enter('perch', t); this.dryAt = this.kind === 'cormorant' ? t + (this.wet ? R(2, 6) : R(18, 45)) : Infinity; this.wet = false; }
    }

    update(t, dt, day, storm) {
      this.day = day;
      // Empieza a llover: lo dejan todo y se marchan; no vuelven hasta que escampa
      if (storm && this.state !== 'away' && !this.fleeing && !['under', 'dunk', 'plunge', 'takeoff'].includes(this.state)) {
        this.fleeing = true; this.dry = false; this.busy = false; this.sub = null; this.diving = 0;
        if (this.state === 'fly' || this.state === 'hover' || this.state === 'land') { if (this.spot) { this.spot.taken = false; this.spot = null; } this.leave(t); }
        else this.takeoff(tt => this.leave(tt), t);
      }
      if (!storm) this.fleeing = false;
      const sp = this.sp;
      switch (this.state) {
        case 'away':
          if (t > this.until && day > 0.15 && !storm) { this.appear(t); this.arrive(t); }
          return;
        case 'fly': {
          const d = this.steer(this.target, sp.cruise, 7, dt);
          // las garzas alternan aleteo y planeo
          this.amp += ((this.kind !== 'cormorant' && Math.sin(t * 0.5 + this.phase) > 0.75 ? 0.12 : 1) - this.amp) * Math.min(1, 3 * dt);
          if (d < 2.2) this.cb(t);
          break;
        }
        case 'land': {
          tmp2.copy(this.target); const d0 = tmp2.distanceTo(this.pos);
          if (d0 > 6) tmp2.y += Math.min(3, d0 * 0.22);
          const d = this.steer(tmp2, clamp(d0 * 1.1, 0.9, sp.cruise), 14, dt);
          if (d0 < 3) { this.setPose('flare', 5); this.effort = 1.7; this.amp = 1.15; this.hipT = -0.5; this.kneeT = 0.3; this.pitch = -0.25; } else this.amp = 1;
          if (d0 < 0.2 || (d0 < 0.6 && d > d0 + 0.5)) this.settle(t);
          break;
        }
        case 'takeoff':
          this.vel.y -= 1.2 * dt; this.pos.addScaledVector(this.vel, dt); this.pitch = -0.35;
          if (t - this.tS > 1.0) { this.effort = 1; this.amp = 1; this.cb(t); }
          break;
        case 'perch': if (this.boatCheck(t, 6)) break; this.idle(t, dt); this.perched(t); break;
        case 'wade': if (this.boatCheck(t, 9)) break; this.idle(t, dt); this.wade(t, dt); break;
        case 'swim': this.boatCheck(t, 8); if (this.state === 'swim') this.swim(t, dt); break;
        case 'under':
          if (t > this.until) {
            this.pos.x = clamp(this.pos.x + R(-6, 6), -9, 9); this.pos.z = clamp(this.pos.z + R(-6, 6), -24, -11); this.pos.y = 0.03;
            this.root.visible = true; this.yawT = this.yaw = R(0, TAU); ripple(this.pos.x, this.pos.z, t);
            this.enter('swim', t); this.setPose('swim', 6); this.until = t + R(4, 10);
          }
          return;
        case 'hover':
          this.steer(this.hoverAt, 0.6, 12, dt); this.pitch = -0.35;
          if (t > this.until) { this.enter('plunge', t); this.setPose('dive', 9); this.wT = 0.45; this.vel.set(Math.sin(this.yaw) * 1.5, -2, Math.cos(this.yaw) * 1.5); }
          break;
        case 'plunge':
          this.vel.y -= 22 * dt; this.pos.addScaledVector(this.vel, dt); this.pitch = 0;
          if (this.pos.y < 0.05) { doSplash(this.pos.x, this.pos.z, t, 1); this.root.visible = false; this.enter('dunk', t); }
          break;
        case 'dunk':
          if (t - this.tS > 0.55) {
            this.root.visible = true; this.pos.y = 0.12; this.vel.set(Math.sin(this.yaw) * 3, 4.6, Math.cos(this.yaw) * 3);
            this.w = 0.5; this.wT = 1; this.setPose('fly', 6); this.effort = 1.8; this.amp = 1.2; ripple(this.pos.x, this.pos.z, t);
            this.cb = tt => this.patrol(tt); this.enter('takeoff', t);
          }
          return;
      }
      this.animate(t, dt);
    }

    // Una barca que se acerca: primero la vigilan, y si pasa muy cerca levantan el vuelo (o se zambullen)
    boatCheck(t, flushR) {
      const b = boatNear(this.pos.x, this.pos.z);
      if (b.d > flushR + 9) { this.wary = false; return false; }
      if (b.d > flushR) {
        if (this.sub !== 'strike') {
          if (!this.wary && this.state !== 'swim') this.setPose('alert', 5);
          let a = Math.atan2(b.x - this.pos.x, b.z - this.pos.z) - this.yaw; a = Math.atan2(Math.sin(a), Math.cos(a));
          this.headYawT = clamp(a, -1.4, 1.4); this.lookAt = t + 1.5; this.wary = true; this.busy = false;
        }
        return false;
      }
      this.wary = false;
      if (this.state === 'swim') { if (!this.diving) { this.dives = Math.max(this.dives, 1); this.until = t; } return false; }
      this.yaw = Math.atan2(this.pos.x - b.x, this.pos.z - b.z);     // huyen en dirección contraria
      this.dry = false; this.busy = false; this.sub = null;
      this.takeoff(tt => { const pc = Math.random() < 0.6 && freeOf(perches, -95); pc ? this.landAt(pc, tt) : this.leave(tt); }, t);
      return true;
    }
    // mirar alrededor, cambiar de postura
    idle(t, dt) {
      if (t > this.lookAt) {
        this.lookAt = t + R(1.5, 6);
        this.headYawT = Math.random() < 0.15 ? 0 : R(-1.3, 1.3);
        if (!this.busy && Math.random() < 0.25) this.setPose(Math.random() < 0.5 ? 'hunch' : Math.random() < 0.5 ? 'alert' : 'stand', 2.5);
      }
      let dy = (this.yawT ?? this.yaw) - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, 2 * dt);
    }
    perched(t) {
      if (this.kind === 'cormorant') {        // secarse las alas abiertas
        if (!this.dry && t > this.dryAt) { this.dry = true; this.dryUntil = t + R(14, 32); this.wT = 1; this.setPose('stand', 3); this.busy = true; }
        if (this.dry && t > this.dryUntil) { this.dry = false; this.wT = 0; this.dryAt = t + R(40, 90); this.busy = false; }
      }
      if (t > this.leaveAt && !this.dry) {
        if (this.day < 0.15) { this.leaveAt = t + 60; return; }
        const r = Math.random();
        if (this.kind === 'tern') this.takeoff(tt => this.patrol(tt), t);
        else if (this.kind === 'cormorant' && r < 0.55) this.takeoff(tt => { this.wet = true; this.landAt(this.waterSpot(), tt); }, t);
        else if (this.kind !== 'cormorant' && r < 0.5) { const w = freeOf(wadeSpots); if (w) this.takeoff(tt => this.landAt(w, tt), t); else this.takeoff(tt => this.leave(tt), t); }
        else this.takeoff(tt => this.leave(tt), t);
      }
    }
    // garza: quieta, acecha andando, apunta y lanza el pico
    wade(t, dt) {
      const s = this.spot;
      if (this.sub === 'stalk') {
        const sp = 0.22 * this.sc;
        this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt;
        const ph = t * 2.2; this.hipT = 0.32 * Math.sin(ph); this.kneeT = Math.max(0, Math.cos(ph)) * 0.5; this.hip2 = -this.hipT;
        if (t > this.stepAt) { this.stepAt = t + 1.43; ripple(this.pos.x, this.pos.z, t); }
        if (tmp.copy(this.pos).setY(s.pos.y).distanceTo(s.pos) > 2.6) this.yawT = Math.atan2(s.pos.x - this.pos.x, s.pos.z - this.pos.z);
      } else { [this.hipT, this.kneeT] = this.legStand; this.hip2 = 0; }
      if (t > this.subUntil) {
        if (this.sub === 'still') {
          if (t > this.leaveAt && this.day > 0.15) return this.takeoff(tt => { const pc = Math.random() < 0.4 && freeOf(perches, -50); pc ? this.landAt(pc, tt) : this.leave(tt); }, t);
          if (Math.random() < 0.55) { this.sub = 'stalk'; this.subUntil = t + R(3, 7); this.stepAt = t; this.yawT = this.yaw + R(-0.5, 0.5); this.setPose('aim', 1.5); this.busy = true; }
          else { this.sub = 'aim'; this.subUntil = t + R(1.5, 4); this.setPose('aim', 2); this.headYawT = 0; this.busy = true; }
        } else if (this.sub === 'stalk') { this.sub = 'aim'; this.subUntil = t + R(1.5, 4); this.setPose('aim', 2); this.headYawT = 0; }
        else if (this.sub === 'aim') { this.sub = 'strike'; this.subUntil = t + 0.26; this.setPose('strike', 20); this.hit = false; }
        else if (this.sub === 'strike') { this.sub = 'recover'; this.subUntil = t + 1.6; this.setPose('alert', 5); }
        else { this.sub = 'still'; this.subUntil = t + R(6, 18); this.setPose('stand', 2.5); this.busy = false; }
      }
      if (this.sub === 'strike' && !this.hit && t > this.subUntil - 0.12) { this.hit = true; this.tip.getWorldPosition(tmp); doSplash(tmp.x, tmp.z, t, 0.35); }
      if (this.sub === 'recover') this.headYawT = 0.25 * Math.sin(t * 9);   // traga
    }
    // cormorán: nada hundido, se zambulle y reaparece
    swim(t, dt) {
      this.yawT = (this.yawT ?? this.yaw) + 0.25 * Math.sin(t * 0.4 + this.phase) * dt; let dy = this.yawT - this.yaw; this.yaw += Math.atan2(Math.sin(dy), Math.cos(dy)) * Math.min(1, 2 * dt);
      this.pos.x += Math.sin(this.yaw) * 0.45 * dt; this.pos.z += Math.cos(this.yaw) * 0.45 * dt; this.pos.y = 0.03 + 0.008 * Math.sin(t * 1.3);
      if (t > (this.wakeAt || 0)) { this.wakeAt = t + 1.1; ripple(this.pos.x, this.pos.z, t); }
      if (t > this.lookAt) { this.lookAt = t + R(1, 4); this.headYawT = R(-0.9, 0.9); }
      if (t > this.until) {
        if (this.dives-- > 0) { this.setPose('dive', 9); this.diving = t; this.until = Infinity; }
        else { this.wet = true; const pc = freeOf(perches, -95); this.spot = null; this.takeoff(tt => (pc && !pc.taken ? this.landAt(pc, tt) : this.leave(tt)), t); return; }
      }
      if (this.diving) {
        const f = (t - this.diving) / 0.55; this.pos.y = 0.03 - 0.3 * f * f; this.pitch = 0.6 * f;
        if (f >= 1) { this.diving = 0; this.pitch = 0; ripple(this.pos.x, this.pos.z, t); this.root.visible = false; this.enter('under', t); this.until = t + R(5, 13); }
      }
    }

    animate(t, dt) {
      const sp = this.sp, P = sp.poses[this.poseT], k = Math.min(1, this.poseK * dt), ps = this.pose;
      ps.torso += (P[0] - ps.torso) * k; ps.head += (P[2] - ps.head) * k;
      for (let i = 0; i < this.nN; i++) ps.neck[i] += (P[1][i] - ps.neck[i]) * k;
      this.torso.rotation.x = ps.torso;
      for (let i = 0; i < this.nN; i++) this.neck[i].rotation.x = ps.neck[i] - (i ? ps.neck[i - 1] : ps.torso);
      this.headYaw += (this.headYawT - this.headYaw) * Math.min(1, 5 * dt);
      this.head.rotation.set(ps.head - ps.neck[this.nN - 1], this.headYaw, 0, 'YXZ');

      // alas
      this.w += (this.wT - this.w) * Math.min(1, 4 * dt);
      const flying = this.state === 'fly' || this.state === 'land' || this.state === 'takeoff' || this.state === 'hover' || this.state === 'plunge';
      if (flying) this.phase += dt * TAU * sp.flapHz * this.effort;
      const A = sp.flapA * this.amp, s = Math.sin(this.phase);
      let inner = flying ? A * s + 0.08 : 0, outer = flying ? A * 0.7 * Math.sin(this.phase - 1.0) - 0.12 - Math.max(0, -Math.cos(this.phase)) * 0.3 * this.amp : 0;
      if (this.dry) { inner = 0.12 + 0.03 * Math.sin(t * 9); outer = -0.6; }
      if (this.state === 'plunge') { inner = 0.5; outer = -0.9; }
      poseWings(this.wings, this.w, inner, outer, this.dry);
      // patas
      this.hip += (this.hipT - this.hip) * Math.min(1, 6 * dt); this.knee += (this.kneeT - this.knee) * Math.min(1, 6 * dt);
      const walking = this.state === 'wade' && this.sub === 'stalk';
      this.legs[0].hip.rotation.x = this.hip; this.legs[1].hip.rotation.x = walking ? -this.hip : this.hip;
      this.legs[0].knee.rotation.x = this.knee; this.legs[1].knee.rotation.x = walking ? Math.max(0, -Math.cos(t * 2.2)) * 0.5 : this.knee;
      // cuerpo: en vuelo sube y baja a contratiempo del aleteo
      const grounded = !flying;
      if (grounded && this.state !== 'swim') { this.pitch = 0; this.roll = 0; }
      this.root.rotation.set(this.pitch || 0, this.yaw, this.roll);
      this.torso.position.y = flying ? -Math.cos(this.phase) * 0.018 * this.amp : 0;
    }
  }

  // Pocas aves: una garza y un cormorán cerca, una garceta y un charrán más lejos
  const birds = [['heron', 'near'], ['cormorant', 'near'], ['egret', 'far'], ['tern', 'far']].map(([k, z]) => new Bird(k, z));
  birds.forEach((b, i) => { b.until = [4, 35, 12, 22][i]; });

  // ---------- flamencos a lo lejos ----------
  // Tres posturas (erguido, atento, comiendo) cocidas en una malla cada una y repetidas por instancias.
  const flamPoses = ['up', 'look', 'feed'].map(name => {
    const sp = SPECIES.flamingo, b = build(sp), P = sp.poses[name], n = sp.neckSeg;
    b.torso.rotation.x = P[0];
    for (let i = 0; i < n; i++) b.neck[i].rotation.x = P[1][i] - (i ? P[1][i - 1] : P[0]);
    b.head.rotation.x = P[2] - P[1][n - 1];
    poseWings(b.wings, 0, 0, 0, false);
    b.legs.forEach(l => { l.hip.rotation.x = sp.legStand[0]; l.knee.rotation.x = sp.legStand[1]; });
    b.root.position.y = sp.standH; b.root.updateMatrixWorld(true);
    const pos = [], nor = [], colr = [], idx = [], cc = new THREE.Color(), nm = new THREE.Matrix3();
    b.root.traverse(o => {
      if (!o.isMesh) return;
      for (let a = o; a; a = a.parent) if (!a.visible) return;   // alas abiertas ocultas: no entran en la figura
      const g = o.geometry, off = pos.length / 3, vp = g.attributes.position, vn = g.attributes.normal, vc = g.attributes.color, v = V();
      nm.getNormalMatrix(o.matrixWorld); cc.copy(o.material.color);
      for (let i = 0; i < vp.count; i++) {
        v.fromBufferAttribute(vp, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(vn, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
        vc ? colr.push(vc.getX(i), vc.getY(i), vc.getZ(i)) : colr.push(cc.r, cc.g, cc.b);
      }
      for (const k of g.index.array) idx.push(k + off);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx);
    return g;
  });
  const NFL = 13, flamMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
  const flamMesh = flamPoses.map(g => { const m = new THREE.InstancedMesh(g, flamMat, NFL); m.frustumCulled = false; scene.add(m); return m; });
  const flams = [], fd = new THREE.Object3D();
  for (const [cx, cz, n] of [[52, -166, 5], [-98, -242, 8]]) for (let i = 0; i < n; i++)
    flams.push({ x: cx + R(-11, 11), z: cz + R(-5, 5), yaw: R(0, TAU), yawT: R(0, TAU), sc: R(0.9, 1.1), pose: Math.random() < 0.55 ? 2 : Math.floor(R(0, 2)), next: R(2, 25), walk: 0, cx, cz, gone: R(0.3, 0.9) });
  function updateFlamingos(t, dt, rain) {
    flams.forEach((f, i) => {
      if (t > f.next) { f.next = t + R(6, 30); f.pose = Math.random() < 0.55 ? 2 : Math.floor(R(0, 2)); f.yawT = f.yaw + R(-1.2, 1.2); f.walk = Math.random() < 0.5 ? R(2, 6) : 0; }
      let dy = f.yawT - f.yaw; f.yaw += Math.atan2(Math.sin(dy), Math.cos(dy)) * Math.min(1, 0.8 * dt);
      if (f.walk > 0) { f.walk -= dt; f.x += Math.sin(f.yaw) * 0.18 * dt; f.z += Math.cos(f.yaw) * 0.18 * dt; if (Math.hypot(f.x - f.cx, f.z - f.cz) > 20) f.yawT = Math.atan2(f.cx - f.x, f.cz - f.z); }
      const here = rain < f.gone;   // con lluvia se van yendo de uno en uno
      for (let k = 0; k < 3; k++) {
        fd.position.set(f.x, -0.18, f.z); fd.rotation.set(0, f.yaw, 0); fd.scale.setScalar(here && k === f.pose ? f.sc : 0.0001); fd.updateMatrix();
        flamMesh[k].setMatrixAt(i, fd.matrix);
      }
    });
    for (const m of flamMesh) m.instanceMatrix.needsUpdate = true;
  }

  return {
    birds, far,
    update(t, dt, day, tw = 0, rain = 0) {
      for (const b of birds) b.update(t, dt, day, rain > 0.3);
      updateFar(t, dt * (1 + 4 * rain), rain > 0.3 ? 0 : day, tw);
      updateFlamingos(t, dt, rain);   // las bandadas lejanas apuran y no entran más
      const a = (t - splashT) / 0.55;
      splash.visible = a >= 0 && a < 1;
      if (splash.visible) { const z = splash.userData.size; splash.scale.set(z * (0.35 + 1.1 * a), z * (0.5 + 0.9 * a), 1); splash.material.opacity = 0.75 * (1 - a); splash.material.color.setScalar(0.12 + 0.88 * day); }
    },
  };
}
