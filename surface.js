// Vida menuda sobre el agua: ramas, troncos y hojas a la deriva, libélulas, zapateros y nubes de mosquitos.
import * as THREE from 'three';

const R = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const TAU = Math.PI * 2;

export function createSurface({ scene, groundY, EYE, loadGLTF, perches, waveY }) {
  const inWater = (x, z) => groundY(x, z) < -0.18;
  const dummy = new THREE.Object3D(), col = new THREE.Color();

  // ---------- cosas flotando a la deriva ----------
  const floaters = [];
  const place = (f, edge) => {
    for (let k = 0; k < 30; k++) {
      const D = (f.minD || 4) + 18 * Math.pow(Math.random(), 1.4);
      f.z = EYE.z - D; f.x = edge ? edge * (0.68 * D + 1.5) : R(-0.6, 0.6) * D;
      if (inWater(f.x, f.z)) return;
    }
  };
  const addFloater = (mesh, o) => {
    // el giro de rumbo va en un grupo aparte, para que el cabeceo no hunda y saque la pieza del agua
    const holder = new THREE.Group(); holder.add(mesh);
    const f = { mesh: holder, inner: mesh, yaw: R(0, TAU), spin: R(-0.03, 0.03), ph: R(0, TAU), speed: R(0.6, 1.4), sink: 0, rx: 0, ax: 0, rz: 0, ...o };
    place(f); scene.add(holder); floaters.push(f);
  };
  // troncos: pocos, con corteza fotografiada, algo torcidos, de grosor irregular y con los extremos partidos
  const texL = new THREE.TextureLoader(), barkTex = (f, srgb) => { const t = texL.load('assets/tex/' + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const barkMat = new THREE.MeshStandardMaterial({ map: barkTex('bark_brown_02_diff.jpg', true), normalMap: barkTex('bark_brown_02_nor_gl.jpg'), normalScale: new THREE.Vector2(1.6, 1.6), color: 0x8f8375, roughness: 0.82 });
  const endMat = new THREE.MeshStandardMaterial({ color: 0x8a7350, roughness: 1 });
  const logGeo = (r0, L, seed, stub) => {
    const NS = 18, NR = 14, pos = [], uv = [], idx = [], bend = R(-0.06, 0.06) * L, bend2 = R(-0.03, 0.03) * L;
    const rad = (u, a) => r0 * (1 - 0.22 * u) * (1 + 0.10 * Math.sin(u * 11 + seed) + 0.07 * Math.sin(a * 3 + u * 6 + seed * 2) + 0.05 * Math.sin(a * 7 - u * 17 + seed));
    for (let i = 0; i <= NS; i++) for (let j = 0; j <= NR; j++) {
      const u = i / NS, a = j / NR * TAU, r = rad(u, a), end = i === 0 || i === NS ? R(-0.5, 0.5) * r0 : 0;   // extremo astillado
      pos.push((u - 0.5) * L + end, Math.cos(a) * r + bend2 * Math.sin(u * Math.PI * 2), Math.sin(a) * r + bend * Math.sin(u * Math.PI));
      uv.push(j / NR * 2, u * L / (TAU * r0) * 2);
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const k = i * (NR + 1) + j; idx.push(k, k + 1, k + NR + 1, k + 1, k + NR + 2, k + NR + 1); }
    const nBark = idx.length;
    for (const [i, x] of [[0, -0.5 * L], [NS, 0.5 * L]]) {   // tapas: la madera clara del corte
      const c = pos.length / 3; pos.push(x + R(-0.2, 0.2) * r0, bend2 * Math.sin(i / NS * Math.PI * 2), bend * Math.sin(i / NS * Math.PI)); uv.push(0.5, 0.5);
      for (let j = 0; j < NR; j++) { const k = i * (NR + 1) + j; if (i === 0) idx.push(c, k + 1, k); else idx.push(c, k, k + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.addGroup(0, nBark, 0); g.addGroup(nBark, idx.length - nBark, 1); g.computeVertexNormals();
    return g;
  };
  for (let i = 0; i < 2; i++) {
    const r = R(0.04, 0.07), L = R(0.7, 1.3), log = new THREE.Group();
    log.add(new THREE.Mesh(logGeo(r, L, i * 3.1 + 1), [barkMat, endMat]));
    const st = new THREE.Mesh(logGeo(r * 0.38, r * R(2.2, 4), i + 5), [barkMat, endMat]);   // el muñón de una rama rota
    st.position.set(R(-0.25, 0.25) * L, r * 0.6, R(-0.4, 0.4) * r); st.rotation.z = R(0.8, 1.3) * (Math.random() < 0.5 ? 1 : -1); st.rotation.y = R(-0.6, 0.6); log.add(st);
    addFloater(log, { sink: r * 0.22, ax: 0.07, rz: R(-0.015, 0.015), minD: 7 });   // medio hundidos: asoma algo más de la mitad
  }
  // manojos de caña seca
  const caneMat = new THREE.MeshStandardMaterial({ color: 0xa08a52, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const grp = new THREE.Group();
    for (let k = 0; k < 3 + Math.floor(R(0, 4)); k++) {
      const g = new THREE.CylinderGeometry(0.005, 0.004, R(0.4, 1.2), 5); g.rotateZ(Math.PI / 2);
      const m = new THREE.Mesh(g, caneMat); m.position.set(R(-0.15, 0.15), 0.003, R(-0.05, 0.05)); m.rotation.y = R(-0.25, 0.25); grp.add(m);
    }
    addFloater(grp, { sink: -0.007 });
  }
  // ramas escaneadas
  loadGLTF('assets/dry_branches_medium_01/dry_branches_medium_01.gltf').then(g => {
    const src = []; g.scene.traverse(m => { if (m.isMesh) src.push(m); });
    // ramas finas de verdad (escaneadas), a tamaño natural: cada una girada a su manera y medio hundida, con las puntas asomando
    for (let i = 0; i < 9; i++) {
      const s = src[i % src.length], m = new THREE.Mesh(s.geometry, s.material), k = R(0.65, 1.35);
      m.scale.set(k, k * R(0.55, 0.8), k);   // algo aplastadas: una rama flotando queda tumbada
      addFloater(m, { sink: -0.004 * k, rx: R(-0.04, 0.04), rz: R(0, TAU), ax: 0.015, minD: i < 3 ? 3.5 : 5 });
    }
  }).catch(e => console.error(e));
  // hojas
  const NL = 46, leafGeo = new THREE.PlaneGeometry(1, 0.55, 2, 1); leafGeo.rotateX(-Math.PI / 2);
  { const p = leafGeo.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, p.getZ(k) * (1 - 0.9 * x * x * 4 * 0.6)); p.setY(k, 0.08 * x * x * 4); } leafGeo.computeVertexNormals(); }
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), NL), leafData = [];
  for (let i = 0; i < NL; i++) {
    const f = { yaw: R(0, TAU), spin: R(-0.15, 0.15), ph: R(0, TAU), speed: R(0.9, 1.8), size: R(0.035, 0.075) }; place(f); leafData.push(f);
    const k = Math.random(); leaves.setColorAt(i, col.setRGB(0.25 + 0.4 * k, 0.20 + 0.22 * k, 0.04 + 0.05 * k));
  }
  leaves.frustumCulled = false; scene.add(leaves);

  const drift = (f, t, dt, wind) => {
    const v = 0.010 * wind * f.speed;   // deriva apenas perceptible: en la laguna no hay corriente
    f.x += (v + 0.012 * Math.sin(t * 0.07 + f.ph)) * dt; f.z += (v * 0.18 + 0.010 * Math.sin(t * 0.05 + f.ph * 2)) * dt;
    f.yaw += f.spin * dt;
    const D = EYE.z - f.z;
    if (Math.abs(f.x) > 0.72 * D + 2.5 || D < 2 || D > 24 || !inWater(f.x, f.z)) place(f, -1);   // vuelve a entrar por barlovento
  };

  // ---------- libélulas ----------
  const flies = [];
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const wingGeo = new THREE.PlaneGeometry(0.036, 0.010); wingGeo.rotateX(-Math.PI / 2); wingGeo.translate(0.02, 0, 0);
  for (const hex of [0xb3261c, 0xb3261c, 0x2f6fa8, 0x8a8f2a, 0x2f6fa8, 0xb3261c]) {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, metalness: 0.2 });
    const body = new THREE.CylinderGeometry(0.0035, 0.0018, 0.05, 6); body.rotateX(Math.PI / 2); body.translate(0, 0, -0.022);
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), m); thorax.scale.z = 1.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), m); head.position.z = 0.012;
    g.add(new THREE.Mesh(body, m), thorax, head);
    const wings = [];
    for (const sx of [1, -1]) for (const wz of [0.004, -0.007]) { const w = new THREE.Mesh(wingGeo, wingMat); w.position.set(0, 0.004, wz); w.scale.x = sx; g.add(w); wings.push(w); }
    const home = new THREE.Vector3(R(-4.5, 4.5), R(0.3, 0.9), R(-9, -2.5));
    g.position.copy(home); g.rotation.order = 'YXZ'; scene.add(g);
    flies.push({ g, wings, home, from: home.clone(), to: home.clone(), t0: 0, dur: 0.01, until: R(0, 2), state: 'hover', yaw: R(0, TAU) });
  }
  const perchSpots = () => perches.filter(p => p.pos.z > -14 && Math.abs(p.pos.x) < 7);
  function updateFly(f, t, dt, active) {
    f.g.visible = active; if (!active) return;
    const p = f.g.position;
    if (f.state === 'dart') {
      const k = clamp((t - f.t0) / f.dur, 0, 1), e = k * k * (3 - 2 * k);
      p.lerpVectors(f.from, f.to, e);
      if (k >= 1) { f.state = f.perch ? 'perch' : 'hover'; f.until = t + (f.perch ? R(4, 14) : R(0.3, 2.4)); }
    } else {
      if (f.state === 'hover') { p.x = f.to.x + 0.012 * Math.sin(t * 7 + f.yaw); p.y = f.to.y + 0.010 * Math.sin(t * 5.3 + f.yaw * 2); p.z = f.to.z + 0.012 * Math.cos(t * 6.1); }
      if (t > f.until) {
        f.from.copy(p); f.perch = false;
        const spots = Math.random() < 0.14 ? perchSpots() : [];
        if (spots.length) { f.to.copy(spots[Math.floor(Math.random() * spots.length)].pos); f.to.y += 0.012; f.perch = true; }
        else {
          f.to.set(p.x + R(-2.2, 2.2), clamp(p.y + R(-0.4, 0.4), 0.12, 1.3), p.z + R(-2.2, 2.2));
          if (f.to.distanceTo(f.home) > 4.5) f.to.lerp(f.home, 0.6);
          if (groundY(f.to.x, f.to.z) + 0.1 > f.to.y) f.to.y = Math.max(groundY(f.to.x, f.to.z), 0) + 0.2;
        }
        f.t0 = t; f.dur = Math.max(0.12, f.from.distanceTo(f.to) / R(3.5, 6.5)); f.state = 'dart';
        f.yawT = Math.atan2(f.to.x - f.from.x, f.to.z - f.from.z);
      }
    }
    let dy = (f.yawT ?? f.yaw) - f.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.yaw += dy * Math.min(1, 14 * dt);
    f.g.rotation.set(f.state === 'dart' ? 0.25 : 0, f.yaw, 0);
    const beat = f.state === 'perch' ? 0.05 : 0.55;
    f.wings.forEach((w, i) => { w.rotation.z = Math.sign(w.scale.x) * (0.1 + beat * Math.sin(t * 190 + i * 1.7)); });
  }
  // dos que se cruzan se espantan
  function quarrel(t) {
    for (let i = 0; i < flies.length; i++) for (let j = i + 1; j < flies.length; j++) {
      const a = flies[i], b = flies[j];
      if (a.state === 'hover' && b.state === 'hover' && a.g.position.distanceTo(b.g.position) < 0.7) { a.until = t; b.until = t; }
    }
  }

  // ---------- zapateros sobre el agua somera ----------
  const NS = 14, legA = new THREE.BoxGeometry(0.034, 0.0012, 0.0016), strGeo = legA.clone();
  { const b = legA.clone(); b.rotateY(0.9); const c = legA.clone(); c.rotateY(-0.9); const body = new THREE.BoxGeometry(0.004, 0.003, 0.014);
    const parts = [b, c, body], pos = [], idx = []; let off = 0;
    for (const g of parts) { const p = g.attributes.position; for (let k = 0; k < p.count; k++) pos.push(p.getX(k), p.getY(k), p.getZ(k)); for (const k of g.index.array) idx.push(k + off); off += p.count; }
    strGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); strGeo.setIndex(idx); strGeo.deleteAttribute('normal'); strGeo.deleteAttribute('uv'); strGeo.computeVertexNormals(); }
  const striders = new THREE.InstancedMesh(strGeo, new THREE.MeshStandardMaterial({ color: 0x1b1712, roughness: 0.6 }), NS), strData = [];
  for (let i = 0; i < NS; i++) {
    const s = { x: 0, z: 0, yaw: R(0, TAU), fx: 0, fz: 0, tx: 0, tz: 0, t0: -1, until: R(0, 2) };
    for (let k = 0; k < 40; k++) { s.x = R(-3.5, 3.5); s.z = R(-7, -2.6); const g = groundY(s.x, s.z); if (g < -0.04 && g > -0.45) break; }
    s.tx = s.x; s.tz = s.z; strData.push(s);
  }
  striders.frustumCulled = false; scene.add(striders);

  // ---------- nubes de mosquitos ----------
  // Cada insecto vuela por su cuenta: empujones al azar, arrancadas y un tirón suave hacia el centro del enjambre,
  // que a su vez deambula. Solo unos pocos brillan a la vez, cuando les da el sol de canto.
  const swarms = [[-4.4, 1.0, -8.6], [3.7, 1.15, -8.4], [-5.6, 0.9, -15.0]].map(([x, y, z]) => {
    const n = 75, pos = new Float32Array(n * 3), colr = new Float32Array(n * 3), bugs = [];
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    for (let i = 0; i < n; i++) bugs.push({
      x: gauss() * 0.6, y: gauss() * 0.7, z: gauss() * 0.6, vx: 0, vy: 0, vz: 0,
      pull: R(0.5, 2.2), nerve: R(0.6, 1.8), dartAt: R(0, 4), f: R(2, 9), ph: R(0, TAU), gate: Math.random(), gateAt: R(0, 5), loner: Math.random() < 0.12,
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    const m = new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
    return { x, y, z, cx: x, cy: y, cz: z, wx: 0, wz: 0, pos, colr, bugs, g, m };
  });
  function updateSwarm(s, t, dt, glow, sunColor) {
    // el enjambre entero vaga despacio alrededor de su sitio
    s.wx += (R(-1, 1) * 0.25 - (s.cx - s.x) * 0.15 - s.wx * 0.4) * dt; s.wz += (R(-1, 1) * 0.25 - (s.cz - s.z) * 0.15 - s.wz * 0.4) * dt;
    s.cx += s.wx * dt; s.cz += s.wz * dt; s.cy = s.y + 0.18 * Math.sin(t * 0.13 + s.x);
    const h = Math.min(dt, 0.05);
    s.bugs.forEach((b, i) => {
      const k = b.loner ? 0.25 : 1;
      b.vx += (R(-1, 1) * 5.5 * b.nerve - b.x * b.pull * k * 1.6 - b.vx * 2.4) * h;
      b.vy += (R(-1, 1) * 5.5 * b.nerve - b.y * b.pull * k * 1.0 - b.vy * 2.4) * h;
      b.vz += (R(-1, 1) * 5.5 * b.nerve - b.z * b.pull * k * 1.6 - b.vz * 2.4) * h;
      if (t > b.dartAt) { b.dartAt = t + R(0.4, 3.5); const a = R(0, TAU), up = R(-0.6, 0.6), v = R(0.5, 1.6); b.vx += Math.cos(a) * v; b.vz += Math.sin(a) * v; b.vy += up * v; }   // arrancada
      b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
      const j = i * 3; s.pos[j] = s.cx + b.x; s.pos[j + 1] = Math.max(0.05, s.cy + b.y); s.pos[j + 2] = s.cz + b.z;
      // destello: la mayoría del tiempo apenas se ven
      if (t > b.gateAt) { b.gateAt = t + R(0.8, 5); b.gate = Math.random(); }
      const lit = b.gate > 0.62 ? Math.pow(Math.max(0, Math.sin(t * b.f + b.ph)), 6) : 0, v = (0.07 + 1.4 * lit) * glow;
      s.colr[j] = sunColor.r * v; s.colr[j + 1] = sunColor.g * v; s.colr[j + 2] = sunColor.b * v;
    });
    s.g.attributes.position.needsUpdate = true; s.g.attributes.color.needsUpdate = true;
    s.m.visible = glow > 0.04;
  }

  return {
    update(t, dt, day, tw, wind, sunColor, chop = 0) {
      for (const f of floaters) {
        drift(f, t, dt, wind);
        f.mesh.position.set(f.x, -f.sink + waveY(f.x, f.z, t) + 0.003 * Math.sin(t * 1.1 + f.ph), f.z);
        f.mesh.rotation.y = f.yaw;
        f.inner.rotation.set(f.rx + f.ax * (1 + 1.5 * chop) * Math.sin(t * (0.5 + 0.6 * chop) + f.ph), 0, f.rz + 0.008 * (1 + 2 * chop) * Math.sin(t * 0.9 + f.ph));
      }
      leafData.forEach((f, i) => {
        drift(f, t, dt, wind);
        dummy.position.set(f.x, 0.004 + waveY(f.x, f.z, t) + 0.003 * Math.sin(t * 1.3 + f.ph), f.z); dummy.rotation.set(0.04 * Math.sin(t + f.ph), f.yaw, 0.05 * Math.sin(t * 0.8 + f.ph));
        dummy.scale.setScalar(f.size); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
      });
      leaves.instanceMatrix.needsUpdate = true;

      const active = day > 0.4;
      for (const f of flies) updateFly(f, t, dt, active);
      if (active) quarrel(t);

      strData.forEach((s, i) => {
        if (t > s.until) {
          const a = s.yaw + R(-1.2, 1.2), d = R(0.05, 0.26), nx = s.x + Math.sin(a) * d, nz = s.z + Math.cos(a) * d, g = groundY(nx, nz);
          s.until = t + R(0.35, 2.4);
          if (g < -0.03 && g > -0.5 && Math.abs(nx) < 4.5) { s.fx = s.x; s.fz = s.z; s.tx = nx; s.tz = nz; s.t0 = t; s.yaw = a; } else s.yaw += Math.PI * 0.7;
        }
        const k = clamp((t - s.t0) / 0.13, 0, 1), e = 1 - (1 - k) * (1 - k);
        s.x = s.fx !== 0 || s.fz !== 0 ? s.fx + (s.tx - s.fx) * e : s.x; s.z = s.fx !== 0 || s.fz !== 0 ? s.fz + (s.tz - s.fz) * e : s.z;
        dummy.position.set(s.x, 0.0035, s.z); dummy.rotation.set(0, s.yaw, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); striders.setMatrixAt(i, dummy.matrix);
      });
      striders.instanceMatrix.needsUpdate = true; striders.visible = day > 0.2;

      const glow = (0.10 + 0.9 * tw) * day;
      for (const sw of swarms) updateSwarm(sw, t, dt, glow, sunColor);
    },
  };
}
