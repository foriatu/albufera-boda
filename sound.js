// Sonido ambiente: grabaciones reales mezcladas según la hora, el viento y la lluvia.
// Nada suena hasta que la persona lo enciende (los navegadores no permiten audio sin un gesto).
const R = (a, b) => a + Math.random() * (b - a);
const FILES = ['agua', 'lluvia', 'lluvia2', 'ranas', 'charca', 'carricero', 'garza', 'gaviota', 'charran', 'cormoran', 'trueno1', 'trueno2', 'trueno3', 'pato', 'pato2'];

export function createSound(base = 'assets/audio/') {
  let ctx = null, master = null, on = false, ready = false, loading = null;
  const buf = {}, norm = {}, loops = {}, env = { day: 1, tw: 0, rain: 0, wind: 0.5 };
  let windGain = null, windFilter = null, nextCall = 0;

  async function load() {
    await Promise.all(FILES.map(async k => {
      try {
        const b = await ctx.decodeAudioData(await (await fetch(base + k + '.mp3')).arrayBuffer());
        // cada grabación viene a un volumen distinto: se igualan por su energía media
        const d = b.getChannelData(0); let s = 0, n = 0;
        let pk = 0; for (let i = 0; i < d.length; i += 23) { s += d[i] * d[i]; n++; pk = Math.max(pk, Math.abs(d[i])); }
        buf[k] = b; norm[k] = Math.min(6, Math.max(0.15, 0.05 / Math.max(1e-4, Math.sqrt(s / n))));
        if (k.startsWith('trueno')) norm[k] = Math.min(4, 0.85 / Math.max(0.05, pk));   // los truenos se igualan por su pico, no por la media
      } catch (e) { console.warn('sonido no disponible:', k, e); }
    }));
    // viento: ruido filtrado, que es lo que es el viento en las cañas
    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = nb.getChannelData(0);
    let last = 0; for (let i = 0; i < nd.length; i++) { last = last * 0.96 + (Math.random() * 2 - 1) * 0.04; nd[i] = last * 6; }
    const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 600; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    src.connect(windFilter).connect(windGain).connect(master); src.start();
    for (const k of ['agua', 'lluvia', 'lluvia2', 'ranas', 'charca']) if (buf[k]) { const g = ctx.createGain(); g.gain.value = 0; g.connect(master); loops[k] = { g, next: 0 }; }
    ready = true;
  }
  // bucle con fundido cruzado: cada pasada entra mientras la anterior se apaga, sin corte audible
  function feedLoop(k) {
    const L = loops[k], b = buf[k], xf = Math.min(4, b.duration * 0.25), now = ctx.currentTime;
    if (now < L.next - 1) return;
    const t0 = Math.max(now + 0.05, L.next), s = ctx.createBufferSource(), e = ctx.createGain();
    s.buffer = b; s.connect(e).connect(L.g);
    e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(1, t0 + xf);
    e.gain.setValueAtTime(1, t0 + b.duration - xf); e.gain.linearRampToValueAtTime(0, t0 + b.duration);
    s.start(t0); L.next = t0 + b.duration - xf;
  }
  // un canto suelto: un trozo de la grabación, colocado a un lado y más o menos lejos
  function call(k, vol, far, panAt) {
    const b = buf[k]; if (!b) return;
    const len = Math.min(b.duration, R(2.5, 7)), off = R(0, Math.max(0, b.duration - len)), t0 = ctx.currentTime + 0.05;
    const s = ctx.createBufferSource(), e = ctx.createGain(), pan = ctx.createStereoPanner(), lp = ctx.createBiquadFilter();
    s.buffer = b; lp.type = 'lowpass'; lp.frequency.value = far ? R(2200, 4000) : R(6000, 12000); pan.pan.value = panAt ?? R(-0.8, 0.8);
    const v = vol * norm[k] * (far ? 0.35 : 1);
    e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(v, t0 + 0.4); e.gain.setValueAtTime(v, t0 + len - 0.8); e.gain.linearRampToValueAtTime(0, t0 + len);
    s.connect(lp).connect(pan).connect(e).connect(master); s.start(t0, off, len + 0.1);
  }
  const ramp = (param, v) => param.setTargetAtTime(v, ctx.currentTime, 0.8);

  return {
    get on() { return on; },
    get info() { return { state: ctx && ctx.state, ready, loaded: Object.keys(buf), norm: Object.fromEntries(Object.entries(norm).map(([k, v]) => [k, +v.toFixed(2)])), secs: Object.fromEntries(Object.entries(buf).map(([k, b]) => [k, Math.round(b.duration)])) }; },
    async toggle() {
      on = !on;
      if (on) {
        if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); loading = load(); }
        await ctx.resume(); await loading;
        master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);
      } else if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, 0.25); setTimeout(() => { if (!on) ctx.suspend(); }, 900); }
      return on;
    },
    // graznido de los patos: cerca y del lado en que están
    duck(k, pos) { if (on && ready && buf[k]) call(k, 0.55, false, Math.max(-0.8, Math.min(0.8, pos.x / 5))); },
    // trueno: llega `delay` segundos después del rayo; cuanto más lejos, más sordo y flojo
    thunder(delay, dist) {
      if (!on || !ready) return;
      const ks = ['trueno1', 'trueno2', 'trueno3'].filter(k => buf[k]); if (!ks.length) return;
      const k = ks[Math.floor(Math.random() * ks.length)], b = buf[k], far = Math.min(1, Math.max(0, (dist - 450) / 1050));
      const t0 = ctx.currentTime + delay, len = Math.min(b.duration, 16), v = norm[k] * (0.95 - 0.55 * far);
      const s = ctx.createBufferSource(), e = ctx.createGain(), pan = ctx.createStereoPanner(), lp = ctx.createBiquadFilter();
      s.buffer = b; s.playbackRate.value = R(0.86, 1.06); lp.type = 'lowpass'; lp.frequency.value = 9000 - 7600 * far; pan.pan.value = R(-0.5, 0.5);
      e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(v, t0 + 0.03); e.gain.setValueAtTime(v, t0 + len - 4); e.gain.linearRampToValueAtTime(0, t0 + len);
      s.connect(lp).connect(pan).connect(e).connect(master); s.start(t0, 0, len + 0.1);
    },
    // day: 0 noche, 1 día; tw: crepúsculo; rain: 0–1; wind: 0–1 aprox.
    update(t, day, tw, rain, wind, storm = 0) {
      if (!on || !ready) return;
      const dry = 1 - rain, night = 1 - day;
      for (const k in loops) feedLoop(k);
      ramp(loops.agua.g.gain, (0.30 + 0.30 * wind + 0.05 * rain + 0.20 * storm) * norm.agua);
      if (loops.lluvia) ramp(loops.lluvia.g.gain, rain * 1.1 * norm.lluvia);
      if (loops.lluvia2) ramp(loops.lluvia2.g.gain, rain * 0.6 * norm.lluvia2);
      if (loops.ranas) ramp(loops.ranas.g.gain, (night * 0.55 + tw * 0.18) * dry * norm.ranas);
      if (loops.charca) ramp(loops.charca.g.gain, (tw * 0.40 + day * 0.14) * dry * norm.charca);
      ramp(windGain.gain, 0.02 + 0.10 * wind + 0.02 * rain + 0.18 * storm); ramp(windFilter.frequency, 420 + 500 * wind);
      // cantos sueltos, solo de día y sin lluvia; más al atardecer
      if (t > nextCall) {
        nextCall = t + R(4, 14) / (0.6 + 0.8 * tw);
        if (day > 0.25 && rain < 0.3) {
          const r = Math.random();
          if (r < 0.45) call('carricero', 0.55, Math.random() < 0.4);
          else if (r < 0.65) call('gaviota', 0.45, true);
          else if (r < 0.82) call('charran', 0.40, Math.random() < 0.7);
          else if (r < 0.93) call('garza', 0.50, Math.random() < 0.5);
          else call('cormoran', 0.40, false);
        }
      }
    },
  };
}
