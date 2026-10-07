// Una pareja de ánades reales (macho y hembra) jugando cerca de la orilla:
// nadan juntos, se persiguen, meten la cabeza con la cola al aire, se bañan aleteando y se hacen la corte con la cabeza.
import * as THREE from 'three';

const R = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const TAU = Math.PI * 2;
const ease = k => k * k * (3 - 2 * k);
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y, z) => {   // ruido suave para el moteado del plumaje
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), h = (a, b, c) => hash(ix + a, iy + b, iz + c);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w);
};
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// esfera deformada y pintada vértice a vértice: shape(x, y, z) devuelve la posición, paint(x, y, z) el color (en la esfera unidad)
function part(shape, paint, mat, ws = 40, hs = 28) {   // muchos vértices: el plumaje va pintado en ellos
  const g = new THREE.SphereGeometry(1, ws, hs), p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), c = paint(x, y, z), q = shape(x, y, z);
    p.setXYZ(i, q[0], q[1], q[2]); col.push(...c.map(v => Math.pow(v, 2.2)));   // los tonos están pensados en sRGB; el sombreado trabaja en lineal
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}

// relieve de plumas: escamas superpuestas, como tejas, para que la luz rasante saque el plumaje
let featherBump = null;
function feathers() {
  if (featherBump) return featherBump;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  for (let row = -1; row < 11; row++) for (let col = -1; col < 9; col++) {
    const x = col * 32 + (row % 2) * 16 + (Math.random() - 0.5) * 5, y = row * 24 + (Math.random() - 0.5) * 4;
    const gr = g.createRadialGradient(x, y - 6, 2, x, y, 22); gr.addColorStop(0, '#fff'); gr.addColorStop(0.75, '#999'); gr.addColorStop(1, '#222');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 17, 20, 0, 0, Math.PI); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 18); g.stroke();   // raquis
  }
  featherBump = new THREE.CanvasTexture(c); featherBump.wrapS = featherBump.wrapT = THREE.RepeatWrapping; featherBump.repeat.set(8, 5); featherBump.anisotropy = 4;
  return featherBump;
}

function buildDuck(male) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, bumpMap: feathers(), bumpScale: 0.45 });
  const sheen = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.06, bumpMap: feathers(), bumpScale: 0.35 });   // la cabeza verde del macho tornasola
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const speck = (x, y, z, s) => vnoise(x * s, y * s, z * s);
  // plumaje de la hembra (y del dorso del macho): pardo con el centro de cada pluma más oscuro
  const scallop = (x, y, z, base, dark) => { const f = Math.sin(z * 26 + Math.sin(x * 19) * 2) * Math.sin(x * 23 + y * 17), n = speck(x, y, z, 7); return mix3(base, dark, clamp(0.25 + 0.45 * f + 0.5 * (n - 0.5), 0, 1)); };

  // cuerpo: pecho redondo delante, la popa se estrecha y sube hacia la cola; la panza, aplanada como un casco
  const bodyShape = (x, y, z) => {
    const taper = z < 0 ? 1 + 0.38 * z : 1 - 0.10 * z * z;
    let yy = (y < 0 ? y * 0.78 : y) * (z < 0 ? 1 + 0.25 * z : 1);
    yy += z < 0 ? 0.42 * z * z * (0.6 + 0.4 * y) : 0;
    return [x * 0.098 * taper, yy * 0.072, z * (z < 0 ? 0.20 : 0.15)];
  };
  const bodyPaint = male
    ? (x, y, z) => {
      const grey = mix3([0.66, 0.66, 0.63], [0.50, 0.50, 0.48], speck(x, y, z, 30));                   // flancos gris vermiculado
      let c = grey;
      c = mix3(c, [0.33, 0.15, 0.08], sm(0.35, 0.6, z) * sm(-0.6, 0.1, y));                               // pecho castaño
      c = mix3(c, [0.36, 0.33, 0.29], sm(0.45, 0.8, y) * sm(0.5, -0.2, z) * sm(-0.9, -0.4, z) + 0.0);    // dorso pardo grisáceo
      c = mix3(c, [0.04, 0.04, 0.05], sm(-0.55, -0.8, z) * sm(-0.3, 0.2, y));                             // popa negra
      c = mix3(c, [0.85, 0.85, 0.82], sm(-0.85, -0.97, z));                                               // borde blanco de la cola
      return mix3(c, [0.82, 0.82, 0.80], sm(-0.4, -0.85, y) * 0.6);                                        // panza clara
    }
    : (x, y, z) => mix3(scallop(x, y, z, [0.50, 0.37, 0.22], [0.20, 0.13, 0.07]), [0.62, 0.52, 0.38], sm(-0.4, -0.85, y) * 0.6);
  body.add(part(bodyShape, bodyPaint, mat));

  // alas plegadas sobre el lomo, con el espejuelo azul y su ribete blanco hacia atrás
  const wings = [];
  for (const sx of [1, -1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.044, 0.038, 0.075); body.add(piv);
    const w = part(
      (x, y, z) => [x * 0.038 + sx * 0.006, y * 0.022 - (z < 0 ? z * z * 0.012 : 0), z * 0.145 - 0.105],
      (x, y, z) => {
        let c = male ? mix3([0.43, 0.39, 0.34], [0.32, 0.29, 0.25], speck(x, y, z, 9)) : scallop(x, y, z, [0.46, 0.34, 0.21], [0.19, 0.12, 0.07]);
        const spec = sm(-0.15, -0.35, z) * sm(-0.9, -0.7, z) * sm(0.2, -0.3, y * sx * 0 + y);
        c = mix3(c, [0.08, 0.16, 0.55], spec);
        return mix3(c, [0.9, 0.9, 0.9], (sm(-0.10, -0.17, z) * sm(-0.24, -0.17, z) + sm(-0.72, -0.78, z) * sm(-0.86, -0.78, z)) * sm(0.2, -0.3, y));
      }, mat, 14, 10);
    w.rotation.x = -0.12; piv.add(w); piv.rotation.z = -sx * 0.18; wings.push({ piv, sx });
  }
  // cola: abanico corto y, en el macho, los rizos negros
  const tail = new THREE.Group(); tail.position.set(0, 0.050, -0.17); tail.rotation.x = -0.25; body.add(tail);
  tail.add(part((x, y, z) => [x * 0.024 * (0.55 - 0.45 * z), y * 0.006, z * 0.032 - 0.022],   // abanico: estrecho en la base, ancho y fino en la punta
     (x, y, z) => male ? [0.80, 0.80, 0.78] : scallop(x, y, z, [0.55, 0.43, 0.30], [0.25, 0.17, 0.10]), mat, 10, 6));
  if (male) {
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0028, 6, 12, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.5 }));
    curl.rotation.y = Math.PI / 2; curl.position.set(0, 0.016, -0.012); tail.add(curl);
  }

  // cuello y cabeza: el cuello se dobla en su base y la cabeza gira sobre él
  const neck = new THREE.Group(); neck.position.set(0, 0.030, 0.105); body.add(neck);
  const neckPaint = male
    ? (x, y, z) => { const ring = sm(-0.55, -0.40, y) * sm(-0.15, -0.30, y); return mix3(mix3([0.33, 0.15, 0.08], [0.03, 0.20, 0.10], sm(-0.6, -0.2, y)), [0.92, 0.92, 0.90], ring); }
    : (x, y, z) => scallop(x, y, z, [0.52, 0.40, 0.26], [0.26, 0.18, 0.10]);
  neck.add(part((x, y, z) => { const k = (y + 1) / 2; return [x * (0.045 - 0.019 * k), k * 0.085, z * (0.046 - 0.020 * k) + k * 0.022]; }, neckPaint, male ? sheen : mat, 24, 16));
  const head = new THREE.Group(); head.position.set(0, 0.083, 0.024); neck.add(head);
  const headPaint = male
    ? (x, y, z) => mix3([0.03, 0.22, 0.11], [0.02, 0.10, 0.12], speck(x, y, z, 3) * 0.8)
    : (x, y, z) => {
      let c = mix3([0.60, 0.48, 0.33], [0.42, 0.31, 0.19], speck(x, y, z, 14));
      c = mix3(c, [0.16, 0.11, 0.06], sm(0.55, 0.85, y));                                    // píleo oscuro
      return mix3(c, [0.18, 0.12, 0.07], sm(0.2, 0.0, Math.abs(y - 0.18 + z * 0.25)) * sm(-0.5, 0.2, z));   // lista ocular
    };
  head.add(part((x, y, z) => [x * 0.026 * (1 + 0.22 * Math.max(0, -y)) * (1 - 0.18 * Math.max(0, z)), y * 0.029 * (1 - (y > 0 ? 0.35 * Math.max(0, z) : 0)), z * 0.040 + (z < 0 ? -0.004 * (1 - y * y) : 0)], headPaint, male ? sheen : mat, 32, 22));
  // pico: ancho y plano, amarillo en el macho, anaranjado con mancha oscura en la hembra
  const billPaint = male
    ? (x, y, z) => mix3([0.78, 0.70, 0.20], [0.10, 0.10, 0.06], sm(0.8, 0.95, z))
    : (x, y, z) => mix3(mix3([0.80, 0.43, 0.12], [0.20, 0.13, 0.08], sm(0.35, 0.1, Math.abs(x)) * sm(0.0, 0.5, y) * sm(-0.8, 0.6, z)), [0.10, 0.08, 0.05], sm(0.8, 0.95, z));
  const bill = part((x, y, z) => [x * 0.016 * (1 + 0.08 * z), y * 0.008 * (1 - 0.40 * z) - 0.002 * z, z * 0.028], billPaint, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }), 12, 8);
  bill.position.set(0, -0.007, 0.060); bill.rotation.x = 0.30; head.add(bill);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 0.15 });
  for (const sx of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 10, 8), eyeMat); e.position.set(sx * 0.0225, 0.007, 0.016); head.add(e); }

  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { root, body, neck, head, wings, tail };
}

export function createDucks({ scene, groundY, waveY, ring, wake, splash, sound }) {
  const wet = (x, z) => groundY(x, z) < -0.14;
  // su rincón: agua somera delante, a la vista desde el punto de partida, apartado de las cañas
  let home = new THREE.Vector2(0.9, -7.0);
  for (let best = 1e9, z = -14; z <= -2; z += 0.25) for (let x = -1; x <= 6; x += 0.25) {
    const d = groundY(x, z); if (d > -0.22 || d < -0.7) continue;
    const s = Math.hypot(x - 0.9, z + 7.0); if (s < best) { best = s; home.set(x, z); }
  }
  const spot = (cx, cz, r) => { for (let k = 0; k < 40; k++) { const a = R(0, TAU), d = r * Math.sqrt(Math.random()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (wet(x, z) && groundY(x, z) > -1.2) return new THREE.Vector2(x, z); } return home.clone(); };

  const ducks = [true, false].map((male, i) => {
    const m = buildDuck(male), sc = male ? 1.06 : 0.96; m.root.scale.setScalar(sc); scene.add(m.root);
    const p = spot(home.x, home.y, 1.2);
    return { ...m, male, pos: new THREE.Vector3(p.x, 0, p.y), yaw: R(0, TAU), speed: 0, target: p.clone(), state: 'paddle', until: R(2, 6), t0: 0,
      pitch: 0, sink: 0, neckP: 0, headY: 0, headYT: 0, flap: 0, wingOpen: 0, rip: 0, phase: R(0, TAU), hidden: false, i };
  });
  const [drake, hen] = ducks;
  ducks.forEach(d => { d.mate = d === drake ? hen : drake; });
  let nextQuack = 6, away = false;

  const go = (d, state, t, dur) => { d.state = state; d.t0 = t; d.until = t + dur; };
  function decide(d, t, day) {
    if (day < 0.15) return go(d, 'sleep', t, R(20, 40));
    const r = Math.random(), m = d.mate;
    if (d === drake && r < 0.16 && m.state !== 'dabble' && m.state !== 'chase') {   // la persigue: ella sale corriendo sobre el agua
      go(d, 'chase', t, R(2.2, 3.4)); go(m, 'flee', t, R(1.6, 2.4)); m.target = spot(m.pos.x, m.pos.z, 2.5); if (sound) sound.duck(Math.random() < 0.5 ? 'pato' : 'pato2', d.pos); return;
    }
    if (r < 0.36) return go(d, 'dabble', t, R(2.5, 5.5));
    if (r < 0.46) return go(d, 'bathe', t, R(2.2, 3.4));
    if (r < 0.58) { go(d, 'pump', t, R(2.5, 4)); if (m.state === 'paddle' || m.state === 'rest') go(m, 'pump', t + R(0.2, 0.6), R(2, 3.5)); return; }
    if (r < 0.70) return go(d, 'preen', t, R(3, 6));
    if (r < 0.80) return go(d, 'rest', t, R(3, 7));
    // nadar a otro sitio, sin separarse mucho de su pareja
    d.target = spot(m.pos.x + R(-0.8, 0.8), m.pos.z + R(-0.8, 0.8), 1.4); go(d, 'paddle', t, R(4, 9));
  }

  function update(t, dt, day, rain) {
    // con lluvia se van nadando mar adentro y desaparecen; vuelven cuando escampa
    if (rain > 0.3 && !away) { away = true; ducks.forEach(d => { d.target = new THREE.Vector2(home.x + R(-2, 2), home.y - 30); go(d, 'leave', t, 999); }); }
    if (away && rain < 0.08) {
      away = false;
      ducks.forEach((d, k) => { d.pos.set(home.x + R(-3, 3), 0, home.y - R(14, 18)); d.target = spot(home.x, home.y, 1.2); d.hidden = false; d.root.visible = true; go(d, 'paddle', t, 60); });
    }
    if (t > nextQuack && !away && day > 0.2) { nextQuack = t + R(7, 22); if (sound) { const d = Math.random() < 0.6 ? hen : drake; sound.duck(Math.random() < 0.55 ? 'pato2' : 'pato', d.pos); } }

    for (const d of ducks) {
      if (d.hidden) { wake(d.i, 0, 0, 0, 0); continue; }
      const a = t - d.t0, m = d.mate;
      if (t > d.until && d.state !== 'leave') { if (d.state === 'paddle' || d.state === 'flee' || d.state === 'chase') d.target = spot(m.pos.x, m.pos.z, 1.0); decide(d, t, day); }
      // a dónde va y a qué velocidad
      let want = 0, tgt = d.target;
      if (d.state === 'paddle') want = 0.16;
      else if (d.state === 'leave') want = 0.30;
      else if (d.state === 'chase') { tgt = new THREE.Vector2(m.pos.x, m.pos.z); want = 0.85; }
      else if (d.state === 'flee') want = 1.0;
      else if (d.state === 'rest' || d.state === 'preen' || d.state === 'pump') { want = 0.03; tgt = new THREE.Vector2(m.pos.x, m.pos.z); }
      const dx = tgt.x - d.pos.x, dz = tgt.y - d.pos.z, dist = Math.hypot(dx, dz);
      if (dist < 0.25 && want > 0.1 && d.state !== 'chase' && d.state !== 'leave') want = 0.04;
      if (d.state === 'chase' && dist < 0.35) want = 0.3;
      if ((d.state === 'rest' || d.state === 'preen' || d.state === 'pump') && dist < 0.45) want = 0;   // ya están juntos
      if (dist > 0.05 && want > 0) {
        let dy = Math.atan2(dx, dz) - d.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        d.yaw += clamp(dy, -2.2 * dt, 2.2 * dt) * (want > 0.5 ? 1.6 : 1);
      }
      d.speed += (want - d.speed) * Math.min(1, (want > d.speed ? 1.6 : 1.0) * dt);
      const nx = d.pos.x + Math.sin(d.yaw) * d.speed * dt, nz = d.pos.z + Math.cos(d.yaw) * d.speed * dt;
      if (wet(nx, nz) || d.state === 'leave') { d.pos.x = nx; d.pos.z = nz; }
      else { d.speed *= 0.5; d.yaw += 1.4 * dt; d.target = spot(home.x, home.y, 1.2); }   // tocaría tierra: gira hacia el agua abierta
      if (d.state === 'leave' && dist < 2) { d.hidden = true; d.root.visible = false; wake(d.i, 0, 0, 0, 0); continue; }
      // separación mínima: no se meten uno dentro del otro
      const sx = d.pos.x - m.pos.x, sz = d.pos.z - m.pos.z, sd = Math.hypot(sx, sz);
      if (sd < 0.30 && sd > 1e-4 && !m.hidden) { d.pos.x += sx / sd * (0.30 - sd) * 0.5; d.pos.z += sz / sd * (0.30 - sd) * 0.5; }

      // postura según lo que hace
      let pitchT = 0, sinkT = 0, neckT = 0.05, flapT = 0, openT = 0;
      d.headYT = 0;
      switch (d.state) {
        case 'dabble': {   // se zambulle de cabeza con la cola al aire, patalea y vuelve a subir
          const k = sm(0, 0.45, a) * sm(d.until - d.t0, d.until - d.t0 - 0.45, a);
          pitchT = 1.25 * k + 0.08 * Math.sin(t * 11) * k; sinkT = 0.05 * k; neckT = 0.55 * k;
          if (a < dt * 1.5 || Math.abs(a - (d.until - d.t0) + 0.3) < dt) ring(d.pos.x + Math.sin(d.yaw) * 0.12, d.pos.z + Math.cos(d.yaw) * 0.12, t, 1.0);
          if (k > 0.9 && Math.random() < 1.2 * dt) ring(d.pos.x + Math.sin(d.yaw) * 0.12, d.pos.z + Math.cos(d.yaw) * 0.12, t, 0.4);   // patalea bajo el agua
          break;
        }
        case 'bathe': {   // chapuzones rápidos de pecho y aleteo, salpicando
          const s = Math.max(0, Math.sin(a * 9));
          pitchT = 0.45 * s; neckT = 0.5 * s; openT = 0.7 + 0.3 * Math.sin(a * 5); flapT = 1;
          if (Math.random() < 6 * dt) splash(d.pos.x + R(-0.12, 0.12), d.pos.z + R(-0.12, 0.12), 3, 0.45);
          if (Math.random() < 5 * dt) ring(d.pos.x + R(-0.1, 0.1), d.pos.z + R(-0.1, 0.1), t, 1.2);
          break;
        }
        case 'flee': openT = 0.8; flapT = 1; pitchT = -0.25; if (Math.random() < 10 * dt) { splash(d.pos.x - Math.sin(d.yaw) * 0.15, d.pos.z - Math.cos(d.yaw) * 0.15, 2, 0.4); ring(d.pos.x, d.pos.z, t, 0.8); } break;   // medio vuela, medio corre sobre el agua
        case 'chase': pitchT = 0.12; neckT = 0.75; if (Math.random() < 4 * dt) splash(d.pos.x, d.pos.z, 1, 0.25); break;   // cuello estirado a ras de agua
        case 'pump': neckT = -0.25 + 0.35 * Math.max(0, Math.sin(a * 7)); pitchT = 0.05 * Math.sin(a * 7); break;   // cabeceo de cortejo
        case 'preen': d.headYT = 2.3 * Math.sin(a * 0.7 + d.phase) > 0 ? 2.4 : -2.4; neckT = -0.35 + 0.08 * Math.sin(a * 6); openT = 0.15 * Math.max(0, Math.sin(a * 2.3)); break;
        case 'sleep': d.headYT = 2.7; neckT = -0.7; sinkT = 0.005; break;   // cabeza metida en el lomo
        case 'rest': case 'paddle': default: d.headYT = 0.5 * Math.sin(t * 0.37 + d.phase * 3) + 0.4 * Math.sin(t * 0.13 + d.i); break;
      }
      const k = Math.min(1, 5 * dt);
      d.pitch += (pitchT - d.pitch) * k; d.sink += (sinkT - d.sink) * k; d.neckP += (neckT - d.neckP) * Math.min(1, 7 * dt);
      d.headY += (d.headYT - d.headY) * Math.min(1, 3 * dt); d.flap += (flapT - d.flap) * k; d.wingOpen += (openT - d.wingOpen) * Math.min(1, 6 * dt);

      // flota con las olas, se mece con cada palada
      const wy = waveY(d.pos.x, d.pos.z, t), paddle = Math.sin(t * 7 + d.phase) * Math.min(1, d.speed * 4);
      d.root.position.set(d.pos.x, wy + 0.018 - d.sink + 0.003 * paddle, d.pos.z);
      d.root.rotation.set(0, d.yaw, 0);
      d.body.rotation.set(d.pitch, 0, 0.04 * paddle);
      d.neck.rotation.x = d.neckP; d.head.rotation.set(-d.neckP * 0.6, d.headY, 0);
      d.tail.rotation.y = 0.25 * Math.sin(t * 9 + d.phase) * (d.state === 'dabble' || d.state === 'bathe' ? 1 : 0.15);
      const beat = d.flap * Math.sin(t * 24 + d.phase);
      for (const w of d.wings) w.piv.rotation.set(0, 0, -w.sx * (0.18 - d.wingOpen * (1.1 + 0.6 * beat)));
      // estela: la V que abre al nadar, en el propio agua
      wake(d.i, d.pos.x, d.pos.z, Math.PI / 2 - d.yaw, d.speed);
    }
  }
  return { ducks, home, update };
}
