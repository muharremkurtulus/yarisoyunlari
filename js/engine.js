/* Bilfen 3D Yarış Ligi — oyun motoru (three.js r149, harici model dosyası yok) */
(function () {
  "use strict";
  var THREE = window.THREE;
  var BY = (window.BY = window.BY || {});

  /* ================= yardımcılar ================= */
  function rngFrom(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function damp(a, b, k, dt) { return lerp(a, b, 1 - Math.exp(-k * dt)); }
  function hash2(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
  }
  function fbm(x, y) { return vnoise(x, y) * 0.6 + vnoise(x * 2.3 + 7, y * 2.3) * 0.28 + vnoise(x * 5.1, y * 5.1 + 3) * 0.12; }
  function cnv(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function ctex(c, rx, ry) {
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    if (rx !== undefined) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
    return t;
  }
  var cache = {};
  function keepM(m) { m.userData.keep = true; return m; }
  function lam(color, opts) {
    if (!opts) { var k = "L" + color; return cache[k] || (cache[k] = keepM(new THREE.MeshLambertMaterial({ color: color }))); }
    var o = { color: color }; for (var p in opts) o[p] = opts[p];
    return new THREE.MeshLambertMaterial(o);
  }
  function glow(color) { var k = "G" + color; return cache[k] || (cache[k] = keepM(new THREE.MeshBasicMaterial({ color: color }))); }
  function mesh(geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; }
  function shade(hex, amt) { var c = new THREE.Color(hex); c.lerp(new THREE.Color(amt < 0 ? 0 : 0xffffff), Math.abs(amt)); return c.getHex(); }
  function hexStr(h) { return "#" + new THREE.Color(h).getHexString(); }
  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function speck(g, w, h, n, colors, r0, r1, a) {
    g.globalAlpha = a == null ? 1 : a;
    for (var i = 0; i < n; i++) {
      g.fillStyle = colors[(Math.random() * colors.length) | 0];
      var r = r0 + Math.random() * (r1 - r0);
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
  var _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
  function part(geo, c, o) {
    o = o || {};
    var p = o.p || [0, 0, 0], r = o.r || [0, 0, 0], s = o.s || [1, 1, 1];
    var m = new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2])), new THREE.Vector3(s[0], s[1], s[2]));
    return { geo: geo, c: c, mat: o.mat, m: m };
  }
  var pfId = 0;
  function prefab(parts) { return { id: "pf" + pfId++, parts: parts }; }

  /* Örnekli (instanced) dekor: binlerce ağaç/kaya tek çizimle */
  function Scatter() { this.map = {}; }
  Scatter.prototype.add = function (pf, x, y, z, ry, sc, rnd) {
    rnd = rnd || Math.random;
    var sx, sy, sz; if (typeof sc === "number" || sc == null) { sx = sy = sz = sc || 1; } else { sx = sc[0]; sy = sc[1]; sz = sc[2]; }
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry || 0, 0)), _s.set(sx, sy, sz));
    var pick = rnd();
    for (var i = 0; i < pf.parts.length; i++) {
      var pt = pf.parts[i], key = pf.id + ":" + i;
      var e = this.map[key] || (this.map[key] = { pt: pt, mats: [], cols: [] });
      e.mats.push(new THREE.Matrix4().multiplyMatrices(_m, pt.m));
      var c = pt.c; if (Array.isArray(c)) c = c[Math.floor((pt.indep ? rnd() : pick) * c.length) % c.length];
      e.cols.push(new THREE.Color(c));
    }
  };
  Scatter.prototype.build = function (parent) {
    var white = lam(0xffffff);
    for (var k in this.map) {
      var e = this.map[k], n = e.mats.length;
      var im = new THREE.InstancedMesh(e.pt.geo, e.pt.mat || white, n);
      for (var i = 0; i < n; i++) { im.setMatrixAt(i, e.mats[i]); im.setColorAt(i, e.cols[i]); }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.frustumCulled = false;
      parent.add(im);
    }
  };

  BY.U = { rngFrom: rngFrom, clamp: clamp, lerp: lerp, smooth: smooth, damp: damp, fbm: fbm, vnoise: vnoise, cnv: cnv, ctex: ctex, lam: lam, glow: glow, mesh: mesh, shade: shade, hexStr: hexStr, rrect: rrect, speck: speck, part: part, prefab: prefab, keepM: keepM };

  /* ================= pist ================= */
  function Track(th, seed) {
    var r = rngFrom(seed);
    this.L = th.length; this.TL = th.length + 450; this.hw = th.roadHalf; this.slope = th.slope || 0;
    function mk(list) { return (list || []).map(function (c) { return { a: c[0] * (0.75 + 0.5 * r()), f: c[1] * (0.85 + 0.3 * r()), p: r() * Math.PI * 2 }; }); }
    this.cv = mk(th.curves); this.hl = mk(th.hills);
  }
  Track.prototype.cx = function (s) {
    var x = 0, cv = this.cv;
    for (var i = 0; i < cv.length; i++) x += cv[i].a * (Math.sin(cv[i].f * s + cv[i].p) - Math.sin(cv[i].p));
    return x * smooth(-20, 170, s);
  };
  Track.prototype.hy = function (s) {
    var y = -this.slope * s, hl = this.hl, k = smooth(0, 140, s);
    for (var i = 0; i < hl.length; i++) y += hl[i].a * (Math.sin(hl[i].f * s + hl[i].p) - Math.sin(hl[i].p)) * k;
    return y;
  };
  Track.prototype.dx = function (s) { return this.cx(s + 0.5) - this.cx(s - 0.5); };
  Track.prototype.dy = function (s) { return this.hy(s + 0.5) - this.hy(s - 0.5); };
  Track.prototype.pos = function (s, u, out) { return (out || new THREE.Vector3()).set(this.cx(s) + u, this.hy(s), -s); };
  /* nesneyi pist yönüne çevir (yerel -z = ileri) */
  Track.prototype.orient = function (obj, s, u, yoff, noPitch) {
    this.pos(s, u, obj.position); obj.position.y += yoff || 0;
    obj.rotation.order = "YXZ";
    obj.rotation.y = -Math.atan(this.dx(s));
    obj.rotation.x = noPitch ? 0 : Math.atan(this.dy(s));
    return obj;
  };

  /* pist boyunca şerit geometrisi */
  function strip(T, o) {
    var step = o.step || 2, rows = Math.ceil((o.s1 - o.s0) / step) + 1, cols = o.cols, nc = cols.length;
    var pos = new Float32Array(rows * nc * 3), uv = new Float32Array(rows * nc * 2), col = o.color ? new Float32Array(rows * nc * 3) : null;
    var tmpC = new THREE.Color();
    for (var r = 0; r < rows; r++) {
      var s = Math.min(o.s1, o.s0 + r * step), cx = T.cx(s), hy = T.hy(s);
      for (var c = 0; c < nc; c++) {
        var u = cols[c], h = o.h ? o.h(u, s, c) : 0, i = r * nc + c;
        pos[i * 3] = cx + u; pos[i * 3 + 1] = hy + h; pos[i * 3 + 2] = -s;
        uv[i * 2] = o.tu ? o.tu(u, c) : c / (nc - 1); uv[i * 2 + 1] = s / (o.tv || 10);
        if (col) { o.color(u, s, h, tmpC); col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b; }
      }
    }
    var idx = [];
    for (r = 0; r < rows - 1; r++) for (c = 0; c < nc - 1; c++) {
      var a = r * nc + c, b = a + 1, d = a + nc, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    if (col) g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  BY.strip = strip;

  /* ================= parçacıklar ================= */
  function Particles(n, additive) {
    this.n = n; this.i = 0;
    var g = (this.geo = new THREE.BufferGeometry());
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n); this.grow = new Float32Array(n); this.a0 = new Float32Array(n);
    for (var i = 0; i < n; i++) this.pos[i * 3 + 1] = -9999;
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("pcolor", new THREE.BufferAttribute(this.col, 3));
    g.setAttribute("psize", new THREE.BufferAttribute(this.size, 1));
    g.setAttribute("palpha", new THREE.BufferAttribute(this.alpha, 1));
    var mat = new THREE.ShaderMaterial({
      vertexShader: "attribute vec3 pcolor; attribute float psize; attribute float palpha; varying vec3 vC; varying float vA;" +
        "void main(){ vC=pcolor; vA=palpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=psize*(420.0/-mv.z); gl_Position=projectionMatrix*mv; }",
      fragmentShader: "varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor=vec4(vC, vA*smoothstep(0.5,0.12,d)); }",
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.obj = new THREE.Points(g, mat); this.obj.frustumCulled = false;
  }
  Particles.prototype.emit = function (x, y, z, vx, vy, vz, life, size, color, alpha, grav, grow) {
    var i = this.i; this.i = (i + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = this.max[i] = life; this.size[i] = size; this.grav[i] = grav || 0; this.grow[i] = grow || 0;
    this.a0[i] = alpha == null ? 1 : alpha;
    this.col[i * 3] = color.r; this.col[i * 3 + 1] = color.g; this.col[i * 3 + 2] = color.b;
  };
  Particles.prototype.update = function (dt) {
    for (var i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      var k = i * 3;
      this.vel[k + 1] -= this.grav[i] * dt;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      this.size[i] = Math.max(0.01, this.size[i] + this.grow[i] * dt);
      var t = this.life[i] / this.max[i];
      this.alpha[i] = this.a0[i] * Math.min(1, t * 2.5);
      if (this.life[i] <= 0) this.pos[k + 1] = -9999;
    }
    var a = this.geo.attributes;
    a.position.needsUpdate = a.psize.needsUpdate = a.palpha.needsUpdate = a.pcolor.needsUpdate = true;
  };

  /* ================= ses (WebAudio, dosyasız) ================= */
  var Audio = (BY.Audio = {
    ctx: null, master: null, muted: false, eng: null,
    unlock: function () {
      if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7;
        this.master.connect(this.ctx.destination);
        var len = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = b;
      } catch (e) { this.ctx = null; }
    },
    setMuted: function (m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.7; },
    tone: function (f, d, type, vol, slide, delay) {
      if (!this.ctx) return;
      var c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.03);
    },
    noise: function (d, vol, freq, delay, q) {
      if (!this.ctx) return;
      var c = this.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; f.type = "bandpass"; f.frequency.value = freq || 800; f.Q.value = q || 1;
      g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + d + 0.03);
    },
    sfx: function (n) {
      switch (n) {
        case "star": this.tone(1046 + Math.random() * 80, 0.09, "triangle", 0.12); this.tone(1568, 0.14, "triangle", 0.09, 0, 0.06); break;
        case "boost": this.tone(260, 0.5, "sawtooth", 0.08, 1100); this.noise(0.5, 0.15, 2400, 0, 0.7); break;
        case "hit": this.tone(140, 0.35, "square", 0.12, 50); this.noise(0.35, 0.35, 500); break;
        case "slip": this.tone(700, 0.4, "sine", 0.08, 300); this.noise(0.4, 0.12, 3000); break;
        case "splash": this.noise(0.5, 0.25, 1200, 0, 0.5); break;
        case "bump": this.noise(0.12, 0.2, 300); this.tone(110, 0.12, "square", 0.06); break;
        case "count": this.tone(587, 0.22, "square", 0.08); break;
        case "go": this.tone(1175, 0.5, "square", 0.09); this.tone(1760, 0.5, "triangle", 0.05); break;
        case "pass": this.tone(784, 0.08, "triangle", 0.08); this.tone(1046, 0.12, "triangle", 0.08, 0, 0.07); break;
        case "select": this.tone(660, 0.06, "triangle", 0.07); break;
        case "finish":
          [523, 659, 784, 1046, 784, 1046].forEach(function (f, i) { Audio.tone(f, i === 5 ? 0.6 : 0.16, "square", 0.07, 0, i * 0.13); Audio.tone(f / 2, 0.16, "triangle", 0.06, 0, i * 0.13); });
          break;
        case "lose": [523, 466, 415, 392].forEach(function (f, i) { Audio.tone(f, 0.25, "triangle", 0.09, 0, i * 0.18); }); break;
      }
    },
    engineStart: function (kind) {
      this.engineStop();
      if (!this.ctx) return;
      var c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
      g.gain.value = 0; f.type = "lowpass"; f.frequency.value = 900;
      f.connect(g); g.connect(this.master);
      var e = { kind: kind, g: g, f: f, oscs: [], src: null };
      function osc(type, freq) { var o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.connect(f); o.start(); e.oscs.push(o); return o; }
      if (kind === "wind" || kind === "water") {
        var s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.connect(f); s.start(); e.src = s;
        f.type = "bandpass"; f.Q.value = kind === "water" ? 0.6 : 0.9;
        if (kind === "water") osc("sawtooth", 60);
      } else if (kind === "space") { osc("sine", 80); osc("sine", 81.5); osc("triangle", 160); f.frequency.value = 600; }
      else if (kind === "moto") { osc("sawtooth", 90); osc("square", 45); }
      else { osc("sawtooth", 60); osc("square", 30); }
      this.eng = e;
    },
    engineSet: function (ratio, boost, on) {
      var e = this.eng; if (!e || !this.ctx) return;
      var t = this.ctx.currentTime, r = clamp(ratio, 0, 1.6);
      var vol = on ? (e.kind === "wind" ? 0.05 + r * 0.12 : e.kind === "water" ? 0.06 + r * 0.1 : 0.035 + r * 0.04) : 0;
      e.g.gain.setTargetAtTime(vol * (boost ? 1.4 : 1), t, 0.08);
      if (e.kind === "wind" || e.kind === "water") e.f.frequency.setTargetAtTime(300 + r * 900, t, 0.1);
      else e.f.frequency.setTargetAtTime(500 + r * 1500, t, 0.1);
      var base = { car: 55, moto: 85, space: 70, water: 45 }[e.kind] || 55, range = { car: 120, moto: 190, space: 90, water: 70 }[e.kind] || 100;
      e.oscs.forEach(function (o, i) {
        var mul = e.kind === "space" ? [1, 1.02, 2][i] : [1, 0.5][i] || 1;
        o.frequency.setTargetAtTime((base + range * r) * mul * (boost ? 1.15 : 1), t, 0.08);
      });
    },
    engineStop: function () {
      var e = this.eng; if (!e) return;
      try { e.oscs.forEach(function (o) { o.stop(); }); if (e.src) e.src.stop(); e.g.disconnect(); } catch (x) {}
      this.eng = null;
    }
  });

  /* ================= dokular (ortak) ================= */
  function blobTex() {
    if (cache.blob) return cache.blob;
    var c = cnv(64, 64), g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(0.6, "rgba(0,0,0,.3)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    var t = ctex(c); t.userData.keep = true;
    return (cache.blob = keepM(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })));
  }
  function skyTex(stops) {
    var c = cnv(4, 512), g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 512);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
    return ctex(c);
  }
  function glowSprite(color, size) {
    var c = cnv(128, 128), g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 4, 64, 64, 63);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, color); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex(c), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(size, size, 1);
    return sp;
  }
  BY.glowSprite = glowSprite;

  function logoBanner(text, sub, bg, fg) {
    var c = cnv(1024, 256), g = c.getContext("2d");
    g.fillStyle = bg || "#ffffff"; g.fillRect(0, 0, 1024, 256);
    g.fillStyle = "#ffc93c"; g.fillRect(0, 232, 1024, 24); g.fillRect(0, 0, 1024, 10);
    var img = BY.logoImg;
    if (text) {
      if (img) g.drawImage(img, 30, 58, 420, 108);
      g.fillStyle = fg || "#0b2d5b"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "800 82px 'Baloo 2', 'Arial Black', sans-serif"; g.fillText(text, 740, sub ? 100 : 124);
      if (sub) { g.font = "800 44px 'Nunito', Arial, sans-serif"; g.fillStyle = "#0e5c93"; g.fillText(sub, 740, 178); }
    } else if (img) g.drawImage(img, 112, 40, 800, 205);
    return ctex(c);
  }
  function checkerTex(cols, rows, text) {
    var c = cnv(1024, 256), g = c.getContext("2d"), w = 1024 / cols, h = 256 / rows;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * w, y * h, w, h); }
    if (text) {
      g.fillStyle = "#ffc93c"; rrect(g, 262, 48, 500, 160, 30); g.fill();
      g.fillStyle = "#0b2d5b"; g.font = "800 110px 'Baloo 2', 'Arial Black', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, 512, 134);
    }
    return ctex(c);
  }
  function tagSprite(name, color, me) {
    var c = cnv(256, 64), g = c.getContext("2d");
    g.font = "800 34px 'Baloo 2', Arial, sans-serif";
    var w = Math.min(248, g.measureText(name).width + 34);
    g.fillStyle = me ? "#ffc93c" : "rgba(6,26,56,.82)"; rrect(g, 128 - w / 2, 6, w, 50, 25); g.fill();
    if (!me) { g.fillStyle = hexStr(color); g.beginPath(); g.arc(128 - w / 2 + 18, 31, 8, 0, 7); g.fill(); }
    g.fillStyle = me ? "#0b2d5b" : "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(name, 128 + (me ? 0 : 8), 33);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex(c), transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(3.4, 0.85, 1);
    return sp;
  }

  /* ================= oyun ================= */
  var RIVALS = [
    { n: "Kırmızı Şimşek", c: 0xe53935 }, { n: "Yeşil Roket", c: 0x2fbf4a }, { n: "Sarı Yıldırım", c: 0xffc400 },
    { n: "Mor Kasırga", c: 0x8e44ec }, { n: "Turuncu Fırtına", c: 0xff7a1a }
  ];
  var SLOTS = [-4.5, -1.5, 1.5, 4.5];

  var Game = (BY.Game = function (canvas, hooks) {
    this.hooks = hooks || {};
    var r = (this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(64, 1, 0.1, 480);
    this.keys = { left: false, right: false };
    this.state = "idle"; this.paused = false; this.time = 0; this.shake = 0;
    this.camU = 0; this.fov = 64; this.fovBase = 64;
    this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3();
    var self = this;
    window.addEventListener("resize", function () { self.resize(); });
    this.resize();
    this.last = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, (now - self.last) / 1000); self.last = now;
      if (self.world) {
        if (!self.paused) self.update(dt);
        self.renderer.render(self.scene, self.camera);
      }
    })(this.last);
  });
  var P = Game.prototype;

  P.resize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    var a = (this.camera.aspect = w / h);
    this.fovBase = a < 1 ? 64 + (1 - a) * 26 : 64;
    this.camera.updateProjectionMatrix();
  };

  P.dispose = function () {
    if (!this.world) return;
    var objs = [this.world, this.skyG];
    objs.forEach(function (root) {
      if (!root) return;
      root.traverse(function (o) {
        if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
        var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach(function (m) {
          if (m.userData.keep) return;
          if (m.map && !m.map.userData.keep) m.map.dispose();
          m.dispose();
        });
      });
    });
    this.scene.remove(this.world); this.scene.remove(this.skyG);
    if (this.scene.background && this.scene.background.dispose) this.scene.background.dispose();
    this.world = null;
  };

  /* mode: "race" | "attract" */
  P.load = function (themeId, mode) {
    this.dispose();
    var th = (this.theme = BY.THEMES_BY_ID[themeId]);
    this.mode = mode;
    var seed = (Math.random() * 1e9) | 0, rng = (this.rng = rngFrom(seed));
    var T = (this.track = new Track(th, seed));
    var W = (this.world = new THREE.Group()), sky = (this.skyG = new THREE.Group());
    this.scene.add(W); this.scene.add(sky);
    this.scene.background = skyTex(th.sky);
    this.scene.fog = new THREE.Fog(th.fogColor, th.fog[0], th.fog[1]);
    var L = th.light;
    W.add(new THREE.HemisphereLight(L.sky, L.ground, L.hemi));
    var sun = new THREE.DirectionalLight(L.sun, L.dir); sun.position.set(L.pos[0], L.pos[1], L.pos[2]); W.add(sun);

    var hw = T.hw;
    // yol
    if (th.roadTex) {
      var rt = th.roadTex(); rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
      var road = new THREE.Mesh(strip(T, { s0: -60, s1: T.TL, step: 2, cols: [-hw, hw], h: function () { return 0.03; }, tv: th.roadTexLen || 16 }),
        th.roadMat ? th.roadMat(rt) : lam(0xffffff, { map: rt }));
      W.add(road);
      if (th.roadSide) { // havada süzülen pistler için yan yüzler
        [-1, 1].forEach(function (sd) {
          W.add(new THREE.Mesh(strip(T, { s0: -60, s1: T.TL, step: 4, cols: sd < 0 ? [-hw, -hw] : [hw, hw], h: function (u, s, c) { return c ? 0.03 : -th.roadSide.depth; }, tv: 8 }), th.roadSide.mat));
        });
        var under = new THREE.Mesh(strip(T, { s0: -60, s1: T.TL, step: 4, cols: [hw, -hw], h: function () { return -th.roadSide.depth; } }), th.roadSide.mat);
        W.add(under);
      }
    }
    // kenar şeritleri
    if (th.curbTex) {
      var ct = th.curbTex(); ct.wrapS = ct.wrapT = THREE.RepeatWrapping;
      var cm = th.curbMat ? th.curbMat(ct) : lam(0xffffff, { map: ct }), cw = th.curbW || 0.8;
      W.add(new THREE.Mesh(strip(T, { s0: -60, s1: T.TL, cols: [-hw - cw, -hw], h: function () { return 0.06; }, tv: th.curbLen || 6 }), cm));
      W.add(new THREE.Mesh(strip(T, { s0: -60, s1: T.TL, cols: [hw, hw + cw], h: function () { return 0.06; }, tv: th.curbLen || 6 }), cm));
    }
    // zemin
    if (th.groundTex) {
      var gt = th.groundTex(); gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
      var gcols = th.groundCols || [-200, -140, -95, -65, -45, -32, -23, -16, -11, -hw - 1.6, -hw - 0.2, hw + 0.2, hw + 1.6, 11, 16, 23, 32, 45, 65, 95, 140, 200];
      var gh = th.groundH || function (u) { return Math.abs(u) < hw + 1 ? -0.1 : 0; };
      var gmat = lam(0xffffff, { map: gt, vertexColors: !!th.groundColor });
      this.groundMat = gmat;
      W.add(new THREE.Mesh(strip(T, { s0: -200, s1: T.TL + 120, step: 4, cols: gcols, h: function (u, s) { return gh(u, s, fbm, T); }, tu: function (u) { return u / (th.groundTexLen || 12); }, tv: th.groundTexLen || 12, color: th.groundColor }), gmat));
      this.groundTex = gt;
    }
    // ufuk siluetleri
    if (th.backdrop) {
      var bt = ctex(th.backdrop()); bt.wrapS = THREE.RepeatWrapping; bt.repeat.set(3, 1);
      var bd = new THREE.Mesh(new THREE.CylinderGeometry(380, 380, th.backdropH || 90, 48, 1, true),
        new THREE.MeshBasicMaterial({ map: bt, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
      bd.position.y = (th.backdropY || 22); bd.renderOrder = -1;
      sky.add(bd);
    }
    if (th.sunGlow) {
      var sg = glowSprite(th.sunGlow.color, th.sunGlow.size);
      sg.position.set(th.sunGlow.pos[0], th.sunGlow.pos[1], th.sunGlow.pos[2]);
      sky.add(sg);
    }
    var ctx = { T: T, th: th, rng: rng, W: W, sky: sky, scatter: new Scatter(), game: this, U: BY.U };
    if (th.skyExtras) th.skyExtras(ctx);
    if (th.scenery) th.scenery(ctx);
    ctx.scatter.build(W);
    this.ctx = ctx;

    this.buildGates();
    this.buildItems();
    this.buildRacers();
    this.parts = new Particles(600, false); W.add(this.parts.obj);
    this.glowP = new Particles(300, true); W.add(this.glowP.obj);
    this.buildWeather();

    this.time = 0; this.raceT = 0; this.cdT = 0; this.starsN = 0; this.finishOrder = []; this.lastPlace = 6;
    this.camU = 0; this.shake = 0; this.paused = false;
    this.state = mode === "attract" ? "attract" : "ready";
    if (mode === "attract") { this.racers.forEach(function (r) { r.v = th.vmax * 0.8; }); }
    this.placeCamera(0.016, true);
    Audio.engineStart(th.engine);
  };

  P.buildGates = function () {
    var T = this.track, W = this.world, hw = T.hw, th = this.theme;
    var postM = lam(th.gateColor || 0x0b2d5b), beamM = lam(0xffc93c);
    var self = this;
    function gate(s, tex, tex2) {
      var g = new THREE.Group(), H = 7.2, x = hw + 1.4;
      [-1, 1].forEach(function (sd) {
        g.add(mesh(new THREE.CylinderGeometry(0.32, 0.4, H, 10), postM, sd * x, H / 2, 0));
        g.add(mesh(new THREE.SphereGeometry(0.5, 12, 8), beamM, sd * x, H + 0.2, 0));
      });
      var bw = x * 2 - 0.6, bh = bw / 4.6;
      g.add(mesh(new THREE.BoxGeometry(bw + 0.4, bh + 0.3, 0.3), postM, 0, H - bh / 2, 0));
      var f = mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: tex }), 0, H - bh / 2, 0.16); g.add(f);
      var b = mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: tex2 || tex }), 0, H - bh / 2, -0.16); b.rotation.y = Math.PI; g.add(b);
      T.orient(g, s, 0, 0, true);
      W.add(g);
      return g;
    }
    gate(0, logoBanner("BAŞLANGIÇ", th.kind.toUpperCase()), logoBanner("", ""));
    gate(T.L, checkerTex(16, 4, "BİTİŞ"));
    var slog = th.slogans || ["HAYDİ HIZLAN!", "6. SINIFLAR"];
    for (var s = 300, k = 0; s < T.L - 150; s += 320, k++) gate(s, logoBanner(slog[k % slog.length], "BİLFEN YARIŞ LİGİ"), logoBanner("", ""));
    // çizgiler
    var lineGeo = function (s0, tex) {
      var m = new THREE.Mesh(strip(T, { s0: s0, s1: s0 + 2.4, step: 0.6, cols: [-hw, hw], h: function () { return 0.05; }, tv: 2.4 }),
        new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
      W.add(m);
    };
    var ck = checkerTex(16, 2); ck.wrapS = ck.wrapT = THREE.RepeatWrapping; ck.repeat.set(1, 1);
    lineGeo(-1.2, ck); lineGeo(T.L - 1.2, ck);
    // kenar reklam panoları
    var bbTex = logoBanner("", "");
    var bbTex2 = logoBanner(slog[0], "6. SINIF");
    for (s = 90, k = 0; s < T.L; s += 130 + this.rng() * 50, k++) {
      var sd = k % 2 ? 1 : -1, bb = new THREE.Group();
      bb.add(mesh(new THREE.BoxGeometry(0.25, 3, 0.25), postM, -2.2, 1.5, 0));
      bb.add(mesh(new THREE.BoxGeometry(0.25, 3, 0.25), postM, 2.2, 1.5, 0));
      bb.add(mesh(new THREE.BoxGeometry(5.6, 1.5, 0.2), postM, 0, 3.4, -0.05));
      bb.add(mesh(new THREE.PlaneGeometry(5.3, 1.25), new THREE.MeshBasicMaterial({ map: k % 3 === 2 ? bbTex2 : bbTex }), 0, 3.4, 0.07));
      T.orient(bb, s, sd * (hw + (th.billboardGap || 5)), th.billboardY || 0, true);
      bb.rotation.y += sd * 0.45;
      W.add(bb);
    }
  };

  P.buildItems = function () {
    var T = this.track, th = this.theme, rng = this.rng, W = this.world, hw = T.hw;
    this.obs = []; this.stars = []; this.boosts = [];
    var obsDefs = th.obstacles, wsum = obsDefs.reduce(function (a, o) { return a + (o.w || 1); }, 0);
    function pickObs() { var r = rng() * wsum; for (var i = 0; i < obsDefs.length; i++) { r -= obsDefs[i].w || 1; if (r <= 0) return obsDefs[i]; } return obsDefs[0]; }
    var self = this;
    function addObs(s, u) {
      var d = pickObs(), o = d.make(BY.U, rng);
      var ob = { s: s, u: u, u0: u, r: o.r, len: o.len || 0.8, effect: o.effect || "hit", obj: o.obj, move: o.move || 0, ph: rng() * 6.28, knock: !!o.knock, spinY: o.spinY || 0, bob: o.bob || 0, y0: o.y || 0, dead: false, fly: null };
      T.orient(o.obj, s, u, ob.y0, o.flat ? false : true);
      if (o.flat) o.obj.position.y += 0.04;
      W.add(o.obj); self.obs.push(ob);
    }
    function addStars(s, u, n, wave) {
      for (var i = 0; i < n; i++) {
        var uu = clamp(u + (wave ? Math.sin(i * 0.7) * wave : 0), -hw + 0.8, hw - 0.8);
        self.stars.push({ s: s + i * 4, u: uu, taken: false, gone: 0 });
      }
    }
    function addBoost(s, u) { self.boosts.push({ s: s, u: u }); }
    var s = 95;
    while (s < T.L - 60) {
      var prog = s / T.L, r = rng(), sl = SLOTS.slice().sort(function () { return rng() - 0.5; });
      if (r < 0.5) {
        var n = 1 + (rng() < 0.35 + prog * 0.4 ? 1 : 0) + (prog > 0.6 && rng() < 0.25 ? 1 : 0);
        for (var i = 0; i < n; i++) addObs(s + (rng() - 0.5) * 3, sl[i] + (rng() - 0.5) * 1.0);
        if (rng() < 0.6) addStars(s - 6, sl[3], 4, 0);
      } else if (r < 0.74) {
        addStars(s, sl[0], 6, rng() < 0.5 ? 2.2 : 0);
      } else if (r < 0.88) {
        addBoost(s, sl[0]); addStars(s + 6, sl[0], 4, 0);
        if (rng() < 0.6) addObs(s + 2, sl[2]);
      } else {
        addObs(s, sl[0]); addObs(s + 12, sl[1]); addStars(s, sl[2], 5, 0);
      }
      s += 30 + rng() * 22 - prog * 8;
    }
    // yıldızlar: tek bir örnekli mesh
    var shp = new THREE.Shape();
    for (var k = 0; k < 10; k++) { var a = (k / 10) * Math.PI * 2 + Math.PI / 2, rad = k % 2 ? 0.24 : 0.56; k ? shp.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : shp.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); }
    var sg = new THREE.ExtrudeGeometry(shp, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1 }); sg.center();
    this.starMesh = new THREE.InstancedMesh(sg, lam(0xffd02a, { emissive: 0x8a5a00 }), Math.max(1, this.stars.length));
    this.starMesh.frustumCulled = false; W.add(this.starMesh);
    this.stars.forEach(function (st) { st.y = 1.1; });
    // hız pedleri
    var bc = cnv(128, 256), bg = bc.getContext("2d");
    bg.fillStyle = "rgba(0,170,255,.55)"; rrect(bg, 4, 4, 120, 248, 18); bg.fill();
    bg.strokeStyle = "#e8fbff"; bg.lineWidth = 14; bg.lineJoin = "round";
    for (k = 0; k < 3; k++) { var y = 40 + k * 80; bg.beginPath(); bg.moveTo(24, y + 44); bg.lineTo(64, y); bg.lineTo(104, y + 44); bg.stroke(); }
    var btex = (this.boostTex = ctex(bc)); btex.wrapS = btex.wrapT = THREE.RepeatWrapping;
    var bmat = new THREE.MeshBasicMaterial({ map: btex, transparent: true, depthWrite: false, fog: false });
    this.boosts.forEach(function (b) {
      var m = mesh(new THREE.PlaneGeometry(2.4, 4.6), bmat);
      var g = new THREE.Group(); m.rotation.x = -Math.PI / 2; g.add(m);
      T.orient(g, b.s, b.u, 0.07);
      W.add(g);
    });
  };

  P.buildRacers = function () {
    var th = this.theme, T = this.track, W = this.world, self = this;
    var grid = [{ s: -4, u: -3.5 }, { s: -4, u: 0 }, { s: -4, u: 3.5 }, { s: -11, u: -3.5 }, { s: -11, u: 3.5 }, { s: -11, u: 0 }];
    var fs = [1.0, 0.975, 0.955, 0.935, 0.91].sort(function () { return self.rng() - 0.5; });
    this.racers = [];
    for (var i = 0; i < 6; i++) {
      var me = i === 5, def = me ? { n: "SEN", c: th.playerColor || 0x1f6fd1 } : RIVALS[i];
      var m = BY.Vehicles[th.vehicle](def.c, me);
      W.add(m.root);
      var sh = mesh(new THREE.PlaneGeometry(th.shadowW || 2.4, th.shadowL || 4.2), blobTex()); sh.rotation.x = -Math.PI / 2;
      var shG = new THREE.Group(); shG.add(sh); W.add(shG);
      var tag = tagSprite(def.n, def.c, me); W.add(tag);
      var r = { name: def.n, color: def.c, me: me, m: m, sh: shG, tag: tag, s: grid[i].s, u: grid[i].u, v: 0, lat: 0, tu: grid[i].u, f: me ? 1 : fs[i],
        boost: 0, spin: 0, spinA: 0, slip: 0, slipDir: 0, inv: 0, fin: false, ftime: 0, wander: 2 + this.rng() * 3, bumpCd: 0, place: i + 1 };
      this.racers.push(r);
      if (me) this.player = r;
    }
    this.updateRacerVisuals(0);
  };

  P.buildWeather = function () {
    var w = this.theme.weather; this.weather = null;
    if (!w) return;
    var N = w.n || 900, pos = new Float32Array(N * 3), ph = new Float32Array(N);
    for (var i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = Math.random() * 30 - 6; pos[i * 3 + 2] = -Math.random() * 90 + 12; ph[i] = Math.random() * 6.28; }
    var geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var c = cnv(64, 64), g = c.getContext("2d");
    if (w.leaf) { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(32, 32, 28, 14, 0.6, 0, 7); g.fill(); }
    else { var gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    var mat = new THREE.PointsMaterial({ size: w.size || 0.25, map: ctex(c), color: w.color || 0xffffff, transparent: true, depthWrite: false, vertexColors: false });
    var pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
    this.skyG.add(pts);
    this.weather = { pts: pts, ph: ph, w: w, last: null };
  };

  /* ---------- akış ---------- */
  P.startCountdown = function () { this.state = "count"; this.cdT = 0; this.cdShown = -1; };
  P.setPaused = function (p) { this.paused = p; Audio.engineSet(0, false, false); };

  P.update = function (dt) {
    this.time += dt;
    var th = this.theme;
    if (this.state === "count") {
      this.cdT += dt;
      var n = Math.floor(this.cdT);
      if (n !== this.cdShown) {
        this.cdShown = n;
        if (n < 3) { Audio.sfx("count"); this.hook("count", 3 - n); }
        else { Audio.sfx("go"); this.hook("count", 0); this.state = "race"; this.raceT = 0; }
      }
    }
    if (this.state === "race") this.raceT += dt;
    if (this.state !== "ready") this.updateRacers(dt);
    this.updateItems(dt);
    this.updateRacerVisuals(dt);
    this.parts.update(dt); this.glowP.update(dt);
    this.placeCamera(dt, false);
    this.skyG.position.copy(this.camera.position);
    this.updateWeather(dt);
    if (th.animate) th.animate(this, dt);
    var p = this.player;
    Audio.engineSet(p.v / th.vmax, p.boost > 0, this.state !== "attract" && !this.paused);
    if (this.state !== "attract") this.hudTick();
  };

  P.hook = function (n, a, b) { if (this.hooks[n]) this.hooks[n](a, b); };
  P.popup = function (t, cls) { this.hook("popup", t, cls); };

  P.updateRacers = function (dt) {
    var th = this.theme, T = this.track, self = this, rs = this.racers, hw = T.hw, p = this.player;
    var racing = this.state === "race" || this.state === "finished" || this.state === "attract";
    rs.forEach(function (r) {
      var ai = !r.me || self.state !== "race" || r.fin;
      var input = 0;
      r.inv -= dt; r.boost -= dt; r.bumpCd -= dt;
      if (r.spin > 0) { r.spin -= dt; r.spinA += dt * 14 * Math.max(0, r.spin); } else r.spinA = damp(r.spinA, Math.round(r.spinA / (Math.PI * 2)) * Math.PI * 2, 8, dt);
      if (ai) {
        self.aiThink(r, dt);
        input = clamp((r.tu - r.u) * 0.9, -1, 1);
      } else {
        input = (self.keys.right ? 1 : 0) - (self.keys.left ? 1 : 0);
      }
      if (r.spin > 0) input *= 0.25;
      var ratio = clamp(r.v / th.vmax, 0, 1.6);
      r.lat = damp(r.lat, input * th.steer * (0.45 + 0.55 * Math.min(1, ratio)), 9, dt);
      r.u += r.lat * dt;
      if (!ai) r.u -= T.dx(r.s) * r.v * dt * 0.22; // virajda dışa savrulma
      if (r.slip > 0) { r.slip -= dt; r.u += r.slipDir * dt * 5; }
      var lim = hw + (th.edge != null ? th.edge : 1.2), off = Math.abs(r.u) > hw - 0.1;
      if (Math.abs(r.u) > lim) {
        r.u = Math.sign(r.u) * lim; r.lat *= -0.3; r.v *= 0.985;
        if (r.me && r.bumpCd <= 0 && self.state === "race") { Audio.sfx("bump"); r.bumpCd = 0.5; self.shake = 0.15; }
      }
      // hız
      var target = 0;
      if (racing) {
        target = th.vmax * r.f * (r.boost > 0 ? 1.45 : 1) * (off ? th.offMul || 0.6 : 1);
        if (!r.me && self.state === "race") target *= 1 + clamp((p.s - r.s) / 170, -0.13, 0.06);
        if (r.fin && !(self.mode === "attract")) target *= r.me ? 0.35 : 0.6;
      }
      var acc = r.boost > 0 ? 42 : th.accel;
      if (r.v < target) r.v = Math.min(target, r.v + acc * dt * (1.15 - 0.55 * Math.min(1, ratio)));
      else r.v = Math.max(target, r.v - (off ? 26 : 14) * dt);
      r.s += r.v * dt;
      if (self.mode === "attract" && r.s > T.L + 200) { r.s = -10 + Math.random() * 5; r.v = th.vmax * 0.8; }
      // bitiş
      if (!r.fin && r.s >= T.L && self.state !== "attract") {
        r.fin = true; r.ftime = self.raceT; self.finishOrder.push(r);
        if (r.me) self.playerFinished();
      }
      // engeller
      for (var i = 0; i < self.obs.length; i++) {
        var o = self.obs[i];
        if (o.dead || Math.abs(o.s - r.s) > o.len + 1.4 || Math.abs(o.u - r.u) > o.r + 0.75 || r.inv > 0) continue;
        self.hitObstacle(r, o);
      }
      // hız pedleri
      for (i = 0; i < self.boosts.length; i++) {
        var b = self.boosts[i];
        if (Math.abs(b.s - r.s) < 2.4 && Math.abs(b.u - r.u) < 1.5 && r.boost < 1.2) {
          r.boost = 1.7;
          if (r.me && self.state === "race") { Audio.sfx("boost"); self.popup("⚡ TURBO!", "blue"); self.hook("flash", "blue"); }
        }
      }
    });
    // yıldızlar (sadece oyuncu)
    if (this.state === "race") {
      for (var i = 0; i < this.stars.length; i++) {
        var st = this.stars[i];
        if (st.taken || Math.abs(st.s - p.s) > 1.6 || Math.abs(st.u - p.u) > 1.35) continue;
        st.taken = true; this.starsN++;
        Audio.sfx("star"); this.hook("star", this.starsN);
        T.pos(st.s, st.u, this.tmp); this.tmp.y += st.y;
        for (var k = 0; k < 12; k++) this.glowP.emit(this.tmp.x, this.tmp.y, this.tmp.z, (Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6 - p.v * 0.6, 0.6, 0.5, new THREE.Color(0xffd640), 1, 6, -0.4);
      }
    }
    // araçlar arası itişme
    for (var a = 0; a < rs.length; a++) for (var b2 = a + 1; b2 < rs.length; b2++) {
      var A = rs[a], B = rs[b2], ds = B.s - A.s, du = B.u - A.u;
      if (Math.abs(ds) < 2.9 && Math.abs(du) < 1.55) {
        var push = (1.55 - Math.abs(du)) * (du >= 0 ? 1 : -1) * 0.5;
        B.u += push; A.u -= push; B.lat += push * 3; A.lat -= push * 3;
        if (ds > 0) A.v *= 0.99; else B.v *= 0.99;
        if ((A.me || B.me) && this.state === "race" && this.player.bumpCd <= 0) { Audio.sfx("bump"); this.player.bumpCd = 0.4; this.shake = 0.12; }
      }
    }
    // sıralama
    var order = rs.slice().sort(function (x, y) { return (y.fin ? 1e6 - y.ftime * 100 : y.s) - (x.fin ? 1e6 - x.ftime * 100 : x.s); });
    order.forEach(function (r, i) { r.place = i + 1; });
    if (this.state === "race") {
      if (p.place < this.lastPlace) { Audio.sfx("pass"); this.hook("placeUp", p.place); }
      this.lastPlace = p.place;
    }
  };

  P.aiThink = function (r, dt) {
    var T = this.track, self = this;
    r.wander -= dt;
    if (r.wander <= 0) { r.wander = 2.5 + this.rng() * 4; r.tu = SLOTS[(this.rng() * 4) | 0] + (this.rng() - 0.5); }
    // önündeki engellere bak
    var danger = false;
    for (var i = 0; i < this.obs.length; i++) {
      var o = this.obs[i], d = o.s - r.s;
      if (o.dead || d < 0 || d > 34) continue;
      if (Math.abs(o.u - r.tu) < o.r + 1.5) { danger = true; break; }
    }
    if (danger) {
      var best = r.tu, bestScore = -1;
      SLOTS.forEach(function (su) {
        var m = 99;
        self.obs.forEach(function (o) { var d = o.s - r.s; if (!o.dead && d > -2 && d < 40) m = Math.min(m, Math.abs(o.u - su) - o.r); });
        var sc = m - Math.abs(su - r.u) * 0.12;
        if (sc > bestScore) { bestScore = sc; best = su; }
      });
      r.tu = best;
    }
    var hw = T.hw - 0.8; r.tu = clamp(r.tu, -hw, hw);
  };

  P.hitObstacle = function (r, o) {
    var me = r.me && this.state === "race", T = this.track;
    T.pos(o.s, o.u, this.tmp);
    var col = new THREE.Color(this.theme.dustColor || 0xcccccc);
    if (o.effect === "slow") {
      r.v *= 0.62; r.inv = 0.8;
      for (var k = 0; k < 18; k++) this.parts.emit(this.tmp.x, this.tmp.y + 0.3, this.tmp.z, (Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 4 - r.v * 0.3, 0.8, 0.5, new THREE.Color(o.splash || 0x8fd3ff), 0.9, 12, 0.5);
      if (me) { Audio.sfx("splash"); this.popup("Yavaşladın!", "blue"); this.shake = 0.15; }
      return;
    }
    if (o.effect === "slip") {
      r.v *= 0.8; r.slip = 0.6; r.slipDir = Math.random() < 0.5 ? -1 : 1; r.spin = 0.5; r.inv = 1;
      if (me) { Audio.sfx("slip"); this.popup("Kaydın!", "red"); this.shake = 0.2; }
      return;
    }
    r.v *= 0.35; r.spin = 0.9; r.inv = 1.5;
    if (o.knock) { o.dead = true; o.fly = { vy: 7 + Math.random() * 3, vu: (o.u - r.u >= 0 ? 1 : -1) * (3 + Math.random() * 3), vs: r.v * 0.6 + 6, rot: (Math.random() - 0.5) * 14, y: 0 }; }
    for (var j = 0; j < 22; j++) this.parts.emit(this.tmp.x, this.tmp.y + 0.6, this.tmp.z, (Math.random() - 0.5) * 9, Math.random() * 6, (Math.random() - 0.5) * 9, 0.7, 0.7, col, 0.9, 10, 1.2);
    if (me) { Audio.sfx("hit"); this.popup("Çarptın! 💥", "red"); this.hook("flash", "red"); this.shake = 0.5; if ("ontouchstart" in window) try { navigator.vibrate && navigator.vibrate(120); } catch (e) {} }
  };

  P.playerFinished = function () {
    var self = this, p = this.player;
    this.state = "finished";
    var place = this.finishOrder.indexOf(p) + 1;
    Audio.sfx(place <= 3 ? "finish" : "lose");
    var T = this.track;
    for (var k = 0; k < 120; k++) {
      T.pos(T.L, (Math.random() - 0.5) * T.hw * 2, this.tmp);
      var c = new THREE.Color().setHSL(Math.random(), 0.9, 0.6);
      this.parts.emit(this.tmp.x, this.tmp.y + 7, this.tmp.z, (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8, 2.4, 0.45, c, 1, 5, 0);
    }
    var res = { place: place, time: this.raceT, stars: this.starsN, theme: this.theme };
    setTimeout(function () { self.hook("finish", res); }, 2200);
  };

  P.updateItems = function (dt) {
    var T = this.track, t = this.time, cs = this.player.s, self = this;
    this.obs.forEach(function (o) {
      if (o.fly) {
        var f = o.fly; f.vy -= 22 * dt; f.y += f.vy * dt; o.u += f.vu * dt; o.s += f.vs * dt;
        T.orient(o.obj, o.s, o.u, o.y0 + Math.max(-2, f.y), true);
        f.a = (f.a || 0) + f.rot * dt; o.obj.rotation.x = f.a; o.obj.rotation.z = f.a * 0.7;
        if (f.y < -1.5) { o.obj.visible = false; o.fly = null; }
        return;
      }
      if (o.dead) return;
      if (Math.abs(o.s - cs) > 160) return;
      if (o.move) { o.u = clamp(o.u0 + Math.sin(t * 1.3 + o.ph) * o.move, -T.hw + 0.5, T.hw - 0.5); T.pos(o.s, o.u, o.obj.position); o.obj.position.y += o.y0; o.obj.rotation.z = -o.u * 1.2; }
      if (o.spinY) o.obj.rotation.y += o.spinY * dt;
      if (o.bob) o.obj.position.y = T.hy(o.s) + o.y0 + Math.sin(t * 2 + o.ph) * o.bob;
    });
    // yıldızlar
    var m = this.starMesh, mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (var i = 0; i < this.stars.length; i++) {
      var st = this.stars[i];
      if (st.taken) { st.gone = Math.min(1, st.gone + dt * 4); }
      if (st.taken && st.gone >= 1 && st.hid) continue;
      if (!st.taken && Math.abs(st.s - cs) > 150 && st.init) continue;
      st.init = true;
      T.pos(st.s, st.u, this.tmp); this.tmp.y += st.y + Math.sin(t * 3 + i) * 0.15 + st.gone * 2;
      q.setFromAxisAngle(up, t * 3 + i * 0.4);
      var k = st.taken ? 1 - st.gone : 1; sc.set(k, k, k);
      mm.compose(this.tmp, q, sc); m.setMatrixAt(i, mm);
      if (st.taken && st.gone >= 1) st.hid = true;
    }
    m.instanceMatrix.needsUpdate = true;
    if (this.boostTex) this.boostTex.offset.y -= dt * 1.6;
  };

  P.updateRacerVisuals = function (dt) {
    var T = this.track, th = this.theme, self = this, cam = this.camera.position;
    this.racers.forEach(function (r) {
      var root = r.m.root;
      T.orient(root, r.s, r.u, th.rideY || 0);
      root.rotation.y += -r.lat * 0.035;
      var lean = clamp(-r.lat / th.steer, -1, 1);
      r.m.body.rotation.y = r.spinA;
      r.m.body.rotation.z = lean * (th.lean || 0.12);
      if (r.m.anim) r.m.anim(dt, r, self.time, lean);
      // gölge
      T.orient(r.sh, r.s, r.u, 0.07); r.sh.rotation.y += r.spinA;
      r.sh.visible = th.shadow !== false;
      // isim etiketi
      r.tag.position.set(root.position.x, root.position.y + (th.tagY || 2.7), root.position.z);
      var d = cam.distanceTo(root.position);
      r.tag.visible = self.state !== "attract" && d < 70 && (r.me ? (self.state === "count" || self.state === "ready") : d > 7);
      var ks = clamp(d / 24, 0.32, 1.3); r.tag.scale.set(3.4 * ks, 0.85 * ks, 1);
      // toz / iz parçacıkları
      if (dt > 0 && r.v > 4 && Math.abs(r.s - self.player.s) < 90 && th.trail) th.trail(self, r, dt);
      if (r.boost > 0 && dt > 0) {
        var bk = self.tmp2; T.pos(r.s + 2.2, r.u, bk); bk.y += 0.7;
        self.glowP.emit(bk.x + (Math.random() - 0.5) * 0.8, bk.y + (Math.random() - 0.5) * 0.4, bk.z, 0, 0.5, 4, 0.35, 0.9, new THREE.Color(0x49e6ff), 0.9, 0, -1.5);
      }
    });
  };

  P.updateWeather = function (dt) {
    var w = this.weather; if (!w) return;
    var a = w.pts.geometry.attributes.position.array, cam = this.camera.position, last = w.last || cam.clone();
    var dx = cam.x - last.x, dy = cam.y - last.y, dz = cam.z - last.z;
    w.last = cam.clone();
    var fall = w.w.fall || 2, t = this.time;
    for (var i = 0; i < w.ph.length; i++) {
      var k = i * 3;
      a[k] += -dx + Math.sin(t * 1.1 + w.ph[i]) * dt * (w.w.sway || 0.8);
      a[k + 1] += -dy - fall * dt * (0.7 + (i % 5) * 0.12);
      a[k + 2] += -dz;
      if (a[k + 1] < -8) a[k + 1] += 30; if (a[k + 1] > 22) a[k + 1] -= 30;
      if (a[k + 2] > 12) a[k + 2] -= 90; if (a[k + 2] < -78) a[k + 2] += 90;
      if (a[k] > 35) a[k] -= 70; if (a[k] < -35) a[k] += 70;
    }
    w.pts.geometry.attributes.position.needsUpdate = true;
  };

  /* ---------- kamera ---------- */
  P.placeCamera = function (dt, instant) {
    var T = this.track, p = this.player, cam = this.camera, th = this.theme;
    var ratio = clamp(p.v / th.vmax, 0, 1.6);
    this.camU = instant ? p.u * 0.7 : damp(this.camU, p.u * 0.7, 5, dt);
    var back = 8.6 + ratio * 1.2, high = th.camH || 3.7;
    var cp = T.pos(p.s - back, this.camU, this.tmp);
    cp.y += high;
    var minY = T.hy(p.s) + 2.2; if (cp.y < minY) cp.y = minY;
    var lk = T.pos(p.s + 9, p.u * 0.9, this.tmp2); lk.y += 1.1;
    if (this.state === "ready" || this.state === "count") {
      // başlangıçta aracın etrafında dönen sinematik kamera
      var k = this.state === "ready" ? 0 : smooth(0, 2.8, this.cdT);
      var ang = lerp(2.4, 0, k), rad = lerp(7, 0, k);
      var pp = T.pos(p.s, p.u, new THREE.Vector3());
      var ox = pp.x + Math.sin(ang) * 7.5, oz = pp.z + Math.cos(ang) * 7.5;
      cp.set(lerp(ox, cp.x, k), lerp(pp.y + 2.4, cp.y, k), lerp(oz, cp.z, k));
      lk.set(lerp(pp.x, lk.x, k), lerp(pp.y + 1.2, lk.y, k), lerp(pp.z, lk.z, k));
      if (this.state === "ready") { var a2 = this.time * 0.35 + 2.4; cp.set(pp.x + Math.sin(a2) * 7.5, pp.y + 2.4, pp.z + Math.cos(a2) * 7.5); lk.copy(pp).y += 1.2; }
    } else if (this.state === "finished") {
      var a3 = this.time * 0.5, pf = T.pos(p.s, p.u, new THREE.Vector3());
      cp.set(pf.x + Math.sin(a3) * 9, pf.y + 3.5, pf.z + Math.cos(a3) * 9); lk.copy(pf).y += 1;
    } else if (this.state === "attract") {
      var sw = Math.sin(this.time * 0.25);
      cp.x += sw * 4; cp.y += 1.6 + Math.sin(this.time * 0.17) * 1.2;
    }
    if (this.shake > 0) { cp.x += (Math.random() - 0.5) * this.shake; cp.y += (Math.random() - 0.5) * this.shake; this.shake = Math.max(0, this.shake - dt * 1.6); }
    cam.position.copy(cp); cam.lookAt(lk);
    var tf = this.fovBase + Math.min(1, ratio) * 9 + (p.boost > 0 ? 9 : 0);
    this.fov = instant ? tf : damp(this.fov, tf, 3, dt);
    if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  };

  P.hudTick = function () {
    var p = this.player, T = this.track;
    this.hook("hud", {
      place: p.place, total: 6, t: this.raceT, stars: this.starsN,
      speed: Math.round(p.v * (this.theme.kmh || 4)), ratio: clamp(p.v / (this.theme.vmax * 1.45), 0, 1), boost: p.boost > 0,
      prog: this.racers.map(function (r) { return { me: r.me, c: r.color, k: clamp(r.s / T.L, 0, 1) }; })
    });
  };
})();
