/* Bilfen 3D Yarış Ligi — 6 yarış teması: dokular, dekor, engeller */
(function () {
  "use strict";
  var THREE = window.THREE, BY = window.BY, U = BY.U, O = BY.Obstacles;
  var cnv = U.cnv, ctex = U.ctex, lam = U.lam, mesh = U.mesh, part = U.part, prefab = U.prefab, speck = U.speck, smooth = U.smooth;

  /* ---------- ortak yardımcılar ---------- */
  function base(w, h, color) { var c = cnv(w, h), g = c.getContext("2d"); g.fillStyle = color; g.fillRect(0, 0, w, h); return { c: c, g: g, w: w, h: h }; }
  function groundY(ctx, s, u) { var th = ctx.th; return ctx.T.hy(s) + (th.groundH ? th.groundH(u, s, U.fbm, ctx.T) : 0); }
  function scatterSides(ctx, opt) { // yolun iki yanına rastgele dekor
    var T = ctx.T, r = ctx.rng, s = opt.s0 != null ? opt.s0 : -150;
    while (s < T.TL + 60) {
      var side = r() < 0.5 ? -1 : 1, u = side * (opt.u0 + r() * (opt.u1 - opt.u0));
      var pf = Array.isArray(opt.pf) ? opt.pf[(r() * opt.pf.length) | 0] : opt.pf;
      var sc = opt.sc ? opt.sc(r) : 0.8 + r() * 0.5;
      var y = opt.y != null ? T.hy(s) + opt.y(r) : groundY(ctx, s, u) - (opt.sink || 0);
      ctx.scatter.add(pf, T.cx(s) + u, y, -s, r() * 6.28, sc, r);
      s += opt.step[0] + r() * (opt.step[1] - opt.step[0]);
    }
  }
  function edgeRow(ctx, pfs, u, step, y) { // yol kenarı boyunca dizi (direk, şamandıra, bayrak)
    var T = ctx.T, k = 0;
    for (var s = -40; s < T.TL; s += step, k++) [-1, 1].forEach(function (sd) {
      ctx.scatter.add(pfs[k % pfs.length], T.cx(s) + sd * u, T.hy(s) + (y || 0), -s, -Math.atan(T.dx(s)), 1);
    });
  }
  function silhouette(draw, fog) {
    var c = cnv(2048, 256), g = c.getContext("2d");
    draw(g, 2048, 256);
    var gr = g.createLinearGradient(0, 150, 0, 200); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, fog);
    g.fillStyle = gr; g.fillRect(0, 150, 2048, 50); g.fillStyle = fog; g.fillRect(0, 199, 2048, 57);
    return c;
  }
  function trailDust(color, size, up) {
    var col = new THREE.Color(color);
    return function (game, r, dt) {
      if (Math.random() > Math.min(1, r.v / 25) * 0.9) return;
      var T = game.track, p = game.tmp2;
      T.pos(r.s + 1.6, r.u + (Math.random() - 0.5) * 1.3, p);
      game.parts.emit(p.x, p.y + 0.25, p.z, (Math.random() - 0.5) * 1.5, (up || 1.2) + Math.random(), r.v * 0.08, 0.7, size, col, 0.55, 0, size * 1.6);
    };
  }
  function leafyTree(trunkC, leafC, h) {
    var tg = new THREE.CylinderGeometry(0.22, 0.32, h, 7), lg = new THREE.IcosahedronGeometry(1, 0);
    return prefab([
      part(tg, trunkC, { p: [0, h / 2, 0] }),
      part(lg, leafC, { p: [0, h + 0.6, 0], s: [1.9, 1.7, 1.9], mat: lam(0xffffff, { flatShading: true }) }),
      part(lg, leafC, { p: [0.7, h + 0.1, 0.3], s: [1.2, 1.1, 1.2], mat: lam(0xffffff, { flatShading: true }) }),
      part(lg, leafC, { p: [-0.6, h + 0.3, -0.4], s: [1.3, 1.2, 1.3], mat: lam(0xffffff, { flatShading: true }) })
    ]);
  }
  function pine(snow) {
    var cg = new THREE.ConeGeometry(1, 1, 8), parts = [part(new THREE.CylinderGeometry(0.2, 0.3, 1.4, 6), 0x6b4226, { p: [0, 0.7, 0] })];
    [[2.2, 2.0, 1.4], [1.7, 1.9, 2.6], [1.15, 1.7, 3.7]].forEach(function (l) {
      parts.push(part(cg, [0x1f5e3a, 0x24704a, 0x2d6b3f], { p: [0, l[2] + 0.4, 0], s: [l[0], l[1], l[0]], mat: lam(0xffffff, { flatShading: true }) }));
      if (snow) parts.push(part(cg, 0xffffff, { p: [0, l[2] + 0.85, 0], s: [l[0] * 0.62, l[1] * 0.5, l[0] * 0.62], mat: lam(0xffffff, { flatShading: true }) }));
    });
    return prefab(parts);
  }
  function rockPf(cols) {
    return prefab([part(new THREE.DodecahedronGeometry(1, 0), cols, { p: [0, 0.4, 0], s: [1.4, 0.9, 1.1], mat: lam(0xffffff, { flatShading: true }) }),
      part(new THREE.DodecahedronGeometry(0.6, 0), cols, { p: [0.9, 0.2, 0.4], mat: lam(0xffffff, { flatShading: true }) })]);
  }
  function crowdStand(ctx, s, side) { // tribün + seyirciler
    var T = ctx.T, c = cnv(256, 128), g = c.getContext("2d");
    g.fillStyle = "#24364f"; g.fillRect(0, 0, 256, 128);
    var cols = ["#e53935", "#ffc93c", "#1f6fd1", "#2fbf4a", "#ffffff", "#ff7a1a", "#8e44ec"];
    for (var y = 6; y < 128; y += 16) for (var x = 4; x < 256; x += 10 + Math.random() * 4) {
      g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.fillRect(x, y + 6, 7, 9);
      g.fillStyle = "#f2c18f"; g.beginPath(); g.arc(x + 3.5, y + 3, 3.2, 0, 7); g.fill();
    }
    var t = ctex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1);
    var grp = new THREE.Group(), len = 26;
    var st = mesh(new THREE.BoxGeometry(len, 4.5, 4), [lam(0x8a96a8), lam(0x8a96a8), lam(0x8a96a8), lam(0x8a96a8), lam(0xffffff, { map: t }), lam(0x8a96a8)], 0, 2.25, 0);
    st.rotation.x = -0.45; grp.add(st);
    var roof = mesh(new THREE.BoxGeometry(len + 1, 0.3, 5), lam(0x0b2d5b), 0, 5.6, -1.4); grp.add(roof);
    [-len / 2, 0, len / 2].forEach(function (x) { grp.add(mesh(new THREE.BoxGeometry(0.3, 5.6, 0.3), lam(0xdddddd), x, 2.8, -3.4)); });
    T.orient(grp, s, side * (T.hw + 9), 0, true);
    grp.rotation.y += side * Math.PI / 2;
    ctx.W.add(grp);
  }

  var THEMES = [];

  /* ======================================================
     1) ŞEHİR RALLİSİ — Araba Yarışı
     ====================================================== */
  THEMES.push({
    id: "araba", title: "Şehir Rallisi", kind: "Araba Yarışı", emoji: "🏎️", grad: ["#1f6fd1", "#0b2d5b"],
    desc: "Gökdelenler arasında virajlı asfalt pistte tam gaz!",
    vehicle: "car", engine: "car", length: 1750, roadHalf: 6.2, vmax: 40, accel: 15, steer: 11, kmh: 4.5, lean: 0.06,
    curves: [[24, 0.0055], [10, 0.016]], hills: [[2, 0.01]],
    sky: [[0, "#2f80d8"], [0.55, "#8cc8ff"], [0.75, "#e3f3ff"], [1, "#e3f3ff"]], fogColor: 0xd6ecff, fog: [70, 300],
    light: { sky: 0xffffff, ground: 0x6d8a5a, hemi: 0.95, sun: 0xfff2d6, dir: 0.6, pos: [-30, 50, 20] },
    sunGlow: { color: "rgba(255,240,200,.8)", size: 70, pos: [-120, 140, -260] },
    slogans: ["HAYDİ HIZLAN!", "6. SINIFLAR", "HEDEF: ZİRVE!"], dustColor: 0xbbbbbb,
    roadTex: function () {
      var b = base(512, 512, "#3f444c"), g = b.g;
      speck(g, 512, 512, 2600, ["#4a5059", "#353a41", "#545b64"], 0.6, 2.2, 0.8);
      g.fillStyle = "#fff"; g.fillRect(14, 0, 12, 512); g.fillRect(486, 0, 12, 512);
      g.fillStyle = "rgba(255,255,255,.9)"; [171, 341].forEach(function (x) { g.fillRect(x - 5, 0, 10, 220); });
      return ctex(b.c);
    }, roadTexLen: 18,
    curbTex: function () { var b = base(64, 128, "#e53935"); b.g.fillStyle = "#fff"; b.g.fillRect(0, 64, 64, 64); return ctex(b.c); }, curbW: 0.9, curbLen: 4,
    groundTex: function () {
      var b = base(256, 256, "#5aa64a"), g = b.g;
      g.fillStyle = "#62b052"; g.fillRect(0, 0, 128, 256);
      speck(g, 256, 256, 1500, ["#4d9640", "#6cbd5b", "#3f8a35"], 0.8, 2, 0.7);
      return ctex(b.c);
    }, groundTexLen: 14,
    groundH: function (u, s, f) { var a = Math.abs(u); return a < 7.4 ? -0.1 : smooth(70, 160, a) * f(s * 0.01, u * 0.02) * 18; },
    backdrop: function () {
      return silhouette(function (g, w, h) {
        for (var x = 0; x < w;) {
          var bw = 30 + Math.random() * 70, bh = 30 + Math.random() * 110;
          g.fillStyle = ["#9db7d4", "#8eaacb", "#adc4dd"][(Math.random() * 3) | 0]; g.fillRect(x, 190 - bh, bw, bh + 10);
          g.fillStyle = "rgba(255,255,255,.35)";
          for (var wy = 190 - bh + 6; wy < 185; wy += 9) for (var wx = x + 4; wx < x + bw - 6; wx += 8) if (Math.random() < 0.6) g.fillRect(wx, wy, 4, 4);
          x += bw + Math.random() * 8;
        }
      }, "#d6ecff");
    },
    scenery: function (ctx) {
      var T = ctx.T, r = ctx.rng;
      function win(cols, rows) {
        var b = base(256, 256, "#ffffff"), g = b.g, cw = 256 / cols, rh = 256 / rows;
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
          g.fillStyle = Math.random() < 0.2 ? "#ffe9a8" : "#5d7896"; g.fillRect(x * cw + cw * 0.18, y * rh + rh * 0.2, cw * 0.64, rh * 0.55);
        }
        return lam(0xffffff, { map: ctex(b.c) });
      }
      var bc = [0xe9e2d6, 0xd7e3ef, 0xf3d9c4, 0xcfd8dc, 0xb7c9e2, 0xf5e6a8];
      var tall = prefab([part(new THREE.BoxGeometry(9, 34, 9), bc, { p: [0, 17, 0], mat: win(4, 14) }), part(new THREE.BoxGeometry(9.4, 0.8, 9.4), 0x5b6675, { p: [0, 34.4, 0] }), part(new THREE.BoxGeometry(2, 3, 2), 0x8a94a3, { p: [1.5, 36, 1] })]);
      var mid = prefab([part(new THREE.BoxGeometry(12, 18, 10), bc, { p: [0, 9, 0], mat: win(6, 7) }), part(new THREE.BoxGeometry(12.4, 0.7, 10.4), 0x5b6675, { p: [0, 18.3, 0] })]);
      var low = prefab([part(new THREE.BoxGeometry(14, 8, 10), bc, { p: [0, 4, 0], mat: win(7, 3) }), part(new THREE.BoxGeometry(14.4, 0.6, 10.4), 0xc0392b, { p: [0, 8.3, 0] })]);
      scatterSides(ctx, { pf: [tall, mid, low, mid], u0: 26, u1: 70, step: [7, 14], sc: function (r) { return 0.8 + r() * 0.5; } });
      scatterSides(ctx, { pf: [tall, tall, mid], u0: 75, u1: 140, step: [10, 20] });
      var tree = leafyTree(0x7a4b2a, [0x3f9d3a, 0x56b04a, 0x2f8a3a], 2.2);
      scatterSides(ctx, { pf: tree, u0: 10, u1: 22, step: [3, 7] });
      var bush = prefab([part(new THREE.IcosahedronGeometry(1, 0), [0x3d8f37, 0x4fa645], { p: [0, 0.5, 0], s: [1.3, 0.8, 1.1], mat: lam(0xffffff, { flatShading: true }) })]);
      scatterSides(ctx, { pf: bush, u0: 9, u1: 14, step: [4, 9] });
      var lamp = prefab([part(new THREE.CylinderGeometry(0.1, 0.14, 6, 6), 0x4a5563, { p: [0, 3, 0] }), part(new THREE.BoxGeometry(0.12, 0.12, 2), 0x4a5563, { p: [0, 6, 0.9] }),
        part(new THREE.BoxGeometry(0.5, 0.2, 0.8), 0xfff4c2, { p: [0, 5.9, 1.8], mat: U.glow(0xffffff) })]);
      for (var s = 0; s < T.TL; s += 34) [-1, 1].forEach(function (sd) { ctx.scatter.add(lamp, T.cx(s) + sd * (T.hw + 2.6), T.hy(s), -s, -Math.atan(T.dx(s)) + (sd < 0 ? Math.PI : 0), 1); });
      crowdStand(ctx, 22, -1); crowdStand(ctx, 22, 1); crowdStand(ctx, T.L - 20, -1); crowdStand(ctx, T.L - 20, 1);
    },
    obstacles: [{ make: O.cone, w: 3 }, { make: O.barrel, w: 2 }, { make: O.oil, w: 1.5 }],
    trail: function (game, r, dt) { if (r.boost > 0 || r.spin > 0) trailDust(0xdddddd, 0.7, 1)(game, r, dt); }
  });

  /* ======================================================
     2) KANYON MOTOR YARIŞI
     ====================================================== */
  THEMES.push({
    id: "motor", title: "Kanyon Turu", kind: "Motor Yarışı", emoji: "🏍️", grad: ["#ff8a1f", "#a3361b"],
    desc: "Gün batımında kızıl kayalıkların arasından toz kaldırarak geç!",
    vehicle: "moto", engine: "moto", length: 1800, roadHalf: 5.8, vmax: 42, accel: 17, steer: 12, kmh: 4.6, lean: 0.55, offMul: 0.65,
    shadowW: 1.2, shadowL: 3, tagY: 2.6,
    curves: [[26, 0.006], [12, 0.018]], hills: [[5, 0.012], [2, 0.03]],
    sky: [[0, "#3b2a6b"], [0.35, "#c2547a"], [0.6, "#ff9a4a"], [0.75, "#ffd39a"], [1, "#ffd39a"]], fogColor: 0xf3b98a, fog: [60, 280],
    light: { sky: 0xffd8b0, ground: 0x8a4a2a, hemi: 0.9, sun: 0xffb070, dir: 0.75, pos: [40, 30, -60] },
    sunGlow: { color: "rgba(255,170,90,.9)", size: 120, pos: [60, 40, -320] },
    slogans: ["TOZU DUMANA KAT!", "6. SINIFLAR", "HEDEF: ZİRVE!"], dustColor: 0xd9a16b,
    roadTex: function () {
      var b = base(256, 512, "#b9824f"), g = b.g;
      speck(g, 256, 512, 2200, ["#a8713f", "#c99460", "#9c6636", "#d4a272"], 0.8, 3, 0.8);
      g.fillStyle = "rgba(90,55,25,.35)"; [70, 90, 166, 186].forEach(function (x) { g.fillRect(x, 0, 8, 512); });
      return ctex(b.c);
    }, roadTexLen: 14,
    groundTex: function () { var b = base(256, 256, "#e1a46a"), g = b.g; speck(g, 256, 256, 1800, ["#d39257", "#eab580", "#c98448", "#f0c08d"], 0.8, 2.5, 0.8); return ctex(b.c); }, groundTexLen: 10,
    groundH: function (u, s, f) { var a = Math.abs(u); if (a < 7) return -0.1; return smooth(24, 46, a) * (20 + f(s * 0.02, u * 0.04) * 22) + f(s * 0.08, u * 0.1) * 1.2 * smooth(7, 12, a); },
    groundColor: function (u, s, h, out) { var k = Math.min(1, h / 30); out.setRGB(1 - k * 0.12, 0.92 - k * 0.38, 0.85 - k * 0.45); },
    backdrop: function () {
      return silhouette(function (g, w) {
        for (var x = 0; x < w;) {
          var mw = 80 + Math.random() * 220, mh = 40 + Math.random() * 80;
          g.fillStyle = ["#b0573f", "#9e4b3c", "#c26a48"][(Math.random() * 3) | 0];
          g.beginPath(); g.moveTo(x, 195); g.lineTo(x + 18, 190 - mh); g.lineTo(x + mw - 18, 190 - mh); g.lineTo(x + mw, 195); g.fill();
          g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(x + 18, 190 - mh + 10, mw - 36, 6);
          x += mw + Math.random() * 120;
        }
      }, "#f3b98a");
    },
    scenery: function (ctx) {
      var c = 0x3f8f3a;
      var cactus = prefab([part(new THREE.CylinderGeometry(0.35, 0.4, 3.4, 8), c, { p: [0, 1.7, 0] }), part(new THREE.SphereGeometry(0.35, 8, 6), c, { p: [0, 3.4, 0] }),
        part(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 7), c, { p: [0.7, 2.2, 0] }), part(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 7), c, { p: [0.42, 1.6, 0], r: [0, 0, Math.PI / 2] }),
        part(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 7), c, { p: [-0.6, 2.6, 0] }), part(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 7), c, { p: [-0.38, 2.1, 0], r: [0, 0, Math.PI / 2] }),
        part(new THREE.SphereGeometry(0.16, 6, 5), 0xff5f8f, { p: [0, 3.75, 0] })]);
      scatterSides(ctx, { pf: cactus, u0: 9, u1: 26, step: [4, 10] });
      scatterSides(ctx, { pf: rockPf([0xa0563c, 0xb8704a, 0x8a4a34]), u0: 8.5, u1: 30, step: [3, 8], sc: function (r) { return 0.5 + r() * 1.5; } });
      var mesa = prefab([part(new THREE.CylinderGeometry(1, 1.25, 1, 7), [0xb35a3c, 0xa04c34, 0xc46b45], { p: [0, 0.5, 0], mat: lam(0xffffff, { flatShading: true }) }),
        part(new THREE.CylinderGeometry(1.02, 1.02, 0.08, 7), 0xe0a070, { p: [0, 0.75, 0] })]);
      scatterSides(ctx, { pf: mesa, u0: 60, u1: 160, step: [18, 40], sc: function (r) { var w = 10 + r() * 16; return [w, 20 + r() * 35, w]; }, sink: 2 });
      var weed = prefab([part(new THREE.IcosahedronGeometry(0.5, 0), [0x9a8a3a, 0x7d7a33], { p: [0, 0.3, 0], s: [1, 0.6, 1], mat: lam(0xffffff, { flatShading: true }) })]);
      scatterSides(ctx, { pf: weed, u0: 7.5, u1: 20, step: [2, 5] });
    },
    obstacles: [{ make: function (U, r) { return O.rock(U, r, 0x9a5a3c); }, w: 3 }, { make: O.tumble, w: 2 }, { make: O.cactus, w: 1.2 }, { make: O.barrel, w: 1 }],
    trail: trailDust(0xe0b083, 0.9, 1.5)
  });

  /* ======================================================
     3) KARLI DAĞ KIZAK YARIŞI
     ====================================================== */
  THEMES.push({
    id: "kizak", title: "Karlı Zirve", kind: "Kızak Yarışı", emoji: "🛷", grad: ["#7fd3ff", "#2a62b8"],
    desc: "Karlı dağın tepesinden aşağı, çam ağaçlarının arasından kay!",
    vehicle: "sled", engine: "wind", length: 1700, roadHalf: 6, vmax: 39, accel: 14, steer: 10.5, kmh: 4.2, lean: 0.35, offMul: 0.55,
    shadowW: 1.6, shadowL: 3.2, tagY: 2.6,
    curves: [[22, 0.0065], [9, 0.02]], hills: [[3, 0.02]], slope: 0.11,
    sky: [[0, "#5c9be0"], [0.5, "#a9d4f5"], [0.75, "#eaf6ff"], [1, "#eaf6ff"]], fogColor: 0xe6f2fb, fog: [55, 260],
    light: { sky: 0xffffff, ground: 0xa8c0d8, hemi: 1.0, sun: 0xffffff, dir: 0.45, pos: [-20, 40, 30] },
    sunGlow: { color: "rgba(255,255,240,.8)", size: 60, pos: [-100, 160, -280] },
    slogans: ["KAY KAY KAY!", "6. SINIFLAR", "HEDEF: ZİRVE!"], dustColor: 0xffffff, weather: { n: 1000, size: 0.22, fall: 2.2, sway: 0.9 },
    camH: 4.0,
    roadTex: function () {
      var b = base(256, 512, "#f4f9ff"), g = b.g;
      speck(g, 256, 512, 1200, ["#e3eef9", "#ffffff", "#d6e6f5"], 1, 3, 0.8);
      g.fillStyle = "rgba(150,185,220,.35)"; for (var i = 0; i < 9; i++) g.fillRect(20 + i * 27 + Math.random() * 4, 0, 3, 512);
      g.fillStyle = "rgba(30,120,230,.75)"; g.fillRect(0, 0, 10, 512); g.fillRect(246, 0, 10, 512);
      return ctex(b.c);
    }, roadTexLen: 14,
    groundTex: function () { var b = base(256, 256, "#ffffff"), g = b.g; speck(g, 256, 256, 900, ["#e8f1fa", "#f6faff", "#dce9f6"], 1, 4, 0.8); return ctex(b.c); }, groundTexLen: 12,
    groundH: function (u, s, f) { var a = Math.abs(u); if (a < 7.2) return -0.1; return smooth(12, 110, a) * (16 + f(s * 0.01, u * 0.02) * 46) + f(s * 0.06, u * 0.08) * 1.6 * smooth(7, 14, a); },
    groundColor: function (u, s, h, out) { var k = Math.min(1, h / 50); out.setRGB(1 - k * 0.12, 1 - k * 0.06, 1); },
    backdrop: function () {
      return silhouette(function (g, w) {
        for (var x = -100; x < w;) {
          var mw = 160 + Math.random() * 260, mh = 70 + Math.random() * 100, px = x + mw / 2;
          g.fillStyle = ["#7a9cc4", "#8aaad0", "#6d8fba"][(Math.random() * 3) | 0];
          g.beginPath(); g.moveTo(x, 196); g.lineTo(px, 190 - mh); g.lineTo(x + mw, 196); g.fill();
          g.fillStyle = "#f4f9ff"; g.beginPath(); g.moveTo(px - mw * 0.16, 190 - mh * 0.66); g.lineTo(px, 190 - mh); g.lineTo(px + mw * 0.16, 190 - mh * 0.66);
          g.lineTo(px + mw * 0.06, 190 - mh * 0.72); g.lineTo(px - mw * 0.04, 190 - mh * 0.62); g.fill();
          x += mw * 0.6 + Math.random() * 60;
        }
      }, "#e6f2fb");
    },
    scenery: function (ctx) {
      var T = ctx.T;
      scatterSides(ctx, { pf: pine(true), u0: 9.5, u1: 60, step: [1.2, 3.2], sc: function (r) { return 0.8 + r() * 0.9; }, sink: 0.3 });
      scatterSides(ctx, { pf: pine(true), u0: 60, u1: 150, step: [3, 7], sc: function (r) { return 1.2 + r() * 1; }, sink: 0.3 });
      scatterSides(ctx, { pf: rockPf([0x9aa6b4, 0xb9c3cf]), u0: 8.5, u1: 25, step: [8, 18] });
      var flagR = prefab([part(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), 0x333333, { p: [0, 1.1, 0] }), part(new THREE.BoxGeometry(0.03, 0.6, 0.9), 0xe53935, { p: [0, 1.9, 0.45] })]);
      var flagB = prefab([part(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), 0x333333, { p: [0, 1.1, 0] }), part(new THREE.BoxGeometry(0.03, 0.6, 0.9), 0x1f6fd1, { p: [0, 1.9, 0.45] })]);
      edgeRow(ctx, [flagR, flagB], T.hw + 0.9, 14, -0.1);
      // başlangıçta küçük dağ evi
      var cab = new THREE.Group();
      cab.add(mesh(new THREE.BoxGeometry(6, 3.5, 5), lam(0x8a5530), 0, 1.75, 0));
      var roof = mesh(new THREE.ConeGeometry(4.8, 2.6, 4), lam(0xffffff, { flatShading: true }), 0, 4.8, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.85); cab.add(roof);
      cab.add(mesh(new THREE.BoxGeometry(1.2, 1, 0.1), U.glow(0xffd36b), -1.4, 1.9, 2.52));
      cab.add(mesh(new THREE.BoxGeometry(1.1, 2.2, 0.1), lam(0x4a2b16), 1.3, 1.1, 2.52));
      cab.add(mesh(new THREE.BoxGeometry(0.7, 2, 0.7), lam(0x777777), 1.8, 5, -1));
      T.orient(cab, 10, -15, 0, true); cab.position.y = groundY(ctx, 10, -15); cab.rotation.y += 0.5; ctx.W.add(cab);
    },
    obstacles: [{ make: O.snowman, w: 3 }, { make: O.ice, w: 2 }, { make: function (U, r) { return O.rock(U, r, 0x8d99a8); }, w: 1.5 }, { make: O.log, w: 1 }],
    trail: function (game, r, dt) {
      if (Math.random() > 0.8) return;
      var p = game.tmp2, col = new THREE.Color(0xffffff);
      [-0.5, 0.5].forEach(function (o) { game.track.pos(r.s + 1.3, r.u + o, p); game.parts.emit(p.x, p.y + 0.15, p.z, o * 2 + (Math.random() - 0.5), 1 + Math.random() * 1.5, r.v * 0.1, 0.5, 0.45, col, 0.8, 4, 0.8); });
    }
  });

  /* ======================================================
     4) GALAKSİ UZAY YARIŞI
     ====================================================== */
  THEMES.push({
    id: "uzay", title: "Galaksi Kupası", kind: "Uzay Yarışı", emoji: "🚀", grad: ["#7b3fe4", "#170b3b"],
    desc: "Neon ışıklı pistte asteroitlerden ve mayınlardan kaç!",
    vehicle: "ship", engine: "space", length: 1850, roadHalf: 6.2, vmax: 44, accel: 17, steer: 12, kmh: 9, lean: 0.1, edge: 0.6, offMul: 0.7,
    shadowW: 3.6, shadowL: 4, tagY: 3, playerColor: 0x2f8fd8,
    curves: [[26, 0.0055], [12, 0.015]], hills: [[9, 0.009], [3, 0.025]],
    sky: [[0, "#05020f"], [0.5, "#120a35"], [0.8, "#2a1460"], [1, "#2a1460"]], fogColor: 0x1a0e40, fog: [80, 330],
    light: { sky: 0xb8a8ff, ground: 0x2a1460, hemi: 0.85, sun: 0xffffff, dir: 0.8, pos: [30, 40, 20] },
    slogans: ["YILDIZLARA!", "6. SINIFLAR", "BİLİM • FEN"], dustColor: 0xb094ff,
    roadTex: function () {
      var b = base(256, 256, "#151036"), g = b.g;
      g.strokeStyle = "rgba(73,230,255,.35)"; g.lineWidth = 2;
      for (var i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke(); }
      g.fillStyle = "#ff4fd8"; g.fillRect(124, 20, 8, 90);
      g.fillStyle = "#49e6ff"; g.fillRect(0, 0, 8, 256); g.fillRect(248, 0, 8, 256);
      return ctex(b.c);
    }, roadTexLen: 12,
    roadMat: function (t) { return new THREE.MeshBasicMaterial({ map: t }); },
    roadSide: { depth: 0.6, mat: U.keepM(new THREE.MeshBasicMaterial({ color: 0x3a1f8a, side: THREE.DoubleSide })) },
    curbTex: function () { var b = base(32, 128, "#49e6ff"); b.g.fillStyle = "#ffffff"; b.g.fillRect(0, 0, 32, 20); return ctex(b.c); }, curbW: 0.35, curbLen: 3,
    curbMat: function (t) { return new THREE.MeshBasicMaterial({ map: t }); },
    shadow: true, billboardGap: 3.5, billboardY: -2,
    skyExtras: function (ctx) {
      var N = 2500, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new THREE.Color();
      for (var i = 0; i < N; i++) {
        var v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.4, Math.random() - 0.5).normalize().multiplyScalar(360);
        pos.set([v.x, v.y, v.z], i * 3); c.setHSL(0.55 + Math.random() * 0.3, 0.6, 0.75 + Math.random() * 0.25); col.set([c.r, c.g, c.b], i * 3);
      }
      var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      ctx.sky.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, vertexColors: true, fog: false, sizeAttenuation: true })));
      // Bilfen logosundaki gibi halkalı gezegen
      function planet(r, c1, c2, x, y, z, ring) {
        var cv = cnv(256, 256), gg = cv.getContext("2d"), gr = gg.createLinearGradient(0, 0, 256, 256);
        gr.addColorStop(0, c1); gr.addColorStop(1, c2); gg.fillStyle = gr; gg.fillRect(0, 0, 256, 256);
        gg.globalAlpha = 0.2; for (var k = 0; k < 14; k++) { gg.fillStyle = k % 2 ? "#fff" : "#000"; gg.fillRect(0, k * 18 + Math.random() * 8, 256, 6 + Math.random() * 8); }
        var grp = new THREE.Group();
        grp.add(mesh(new THREE.SphereGeometry(r, 40, 28), new THREE.MeshBasicMaterial({ map: ctex(cv), fog: false })));
        if (ring) {
          var rg = mesh(new THREE.TorusGeometry(r * 1.75, r * 0.1, 4, 80), new THREE.MeshBasicMaterial({ color: 0x0e5c93, fog: false }));
          rg.scale.z = 0.25; rg.rotation.x = 1.25; rg.rotation.y = 0.35; grp.add(rg);
        }
        grp.position.set(x, y, z); ctx.sky.add(grp); return grp;
      }
      ctx.game.planetA = planet(42, "#e8f1ff", "#0b2d5b", -150, 70, -280, true);
      planet(16, "#ff9f6b", "#a3361b", 190, 110, -230, false);
      planet(9, "#7dffb2", "#167a5a", 120, 40, -320, false);
      var neb = BY.glowSprite("rgba(255,80,200,.35)", 260); neb.position.set(80, 60, -330); ctx.sky.add(neb);
      var neb2 = BY.glowSprite("rgba(80,140,255,.3)", 220); neb2.position.set(-60, 20, -340); ctx.sky.add(neb2);
    },
    scenery: function (ctx) {
      var T = ctx.T, r = ctx.rng;
      var ag = new THREE.IcosahedronGeometry(1, 1), pa = ag.attributes.position, v = new THREE.Vector3();
      for (var i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); v.multiplyScalar(0.75 + U.vnoise(v.x * 2 + 5, v.y * 2 + v.z * 3) * 0.5); pa.setXYZ(i, v.x, v.y, v.z); }
      ag.computeVertexNormals();
      var ast = prefab([part(ag, [0x6d6280, 0x857a96, 0x5a5070, 0x9a7f6a], { mat: lam(0xffffff, { flatShading: true }) })]);
      scatterSides(ctx, { pf: ast, u0: 14, u1: 120, step: [1.5, 4], sc: function (r) { var k = 0.8 + Math.pow(r(), 3) * 9; return [k, k * (0.7 + r() * 0.5), k]; }, y: function (r) { return (r() - 0.5) * 60; } });
      var cry = prefab([part(new THREE.ConeGeometry(0.6, 3, 5), [0xff4fd8, 0x49e6ff, 0x9dff6b], { p: [0, 1.5, 0], mat: new THREE.MeshBasicMaterial({ color: 0xffffff }) }),
        part(new THREE.ConeGeometry(0.4, 2, 5), [0xff4fd8, 0x49e6ff, 0x9dff6b], { p: [0.6, 1, 0.2], r: [0, 0, -0.4], mat: new THREE.MeshBasicMaterial({ color: 0xffffff }) })]);
      scatterSides(ctx, { pf: cry, u0: 16, u1: 60, step: [10, 22], y: function (r) { return -6 - r() * 10; } });
      // neon halkalar
      var ringM = new THREE.MeshBasicMaterial({ color: 0xff4fd8 }), ringM2 = new THREE.MeshBasicMaterial({ color: 0x49e6ff });
      var rg = new THREE.TorusGeometry(10.5, 0.35, 8, 48);
      for (var s = 140, k = 0; s < T.L; s += 150, k++) {
        var ring = mesh(rg, k % 2 ? ringM : ringM2); var gp = new THREE.Group(); gp.add(ring); ring.position.y = 3;
        T.orient(gp, s, 0, 0, false); ctx.W.add(gp);
      }
      // uzay istasyonu
      var st = new THREE.Group();
      st.add(mesh(new THREE.TorusGeometry(14, 1.6, 10, 40), lam(0xc8d2e0)));
      st.add(mesh(new THREE.CylinderGeometry(2.5, 2.5, 10, 16), lam(0x9aa6b8)));
      for (var j = 0; j < 4; j++) { var sp = mesh(new THREE.BoxGeometry(28, 0.6, 0.6), lam(0x9aa6b8)); sp.rotation.y = j * Math.PI / 4; st.add(sp); }
      st.add(mesh(new THREE.TorusGeometry(14, 0.25, 6, 40), U.glow(0x49e6ff)));
      st.position.set(T.cx(500) + 60, T.hy(500) + 25, -500); st.rotation.x = 1.1; ctx.W.add(st); ctx.game.station = st;
    },
    animate: function (game, dt) {
      if (game.planetA) game.planetA.rotation.y += dt * 0.05;
      if (game.station) game.station.rotation.z += dt * 0.15;
    },
    obstacles: [{ make: O.asteroid, w: 3 }, { make: O.mine, w: 2 }],
    trail: function (game, r, dt) {
      var p = game.tmp2; game.track.pos(r.s + 2.6, r.u, p);
      game.glowP.emit(p.x + (Math.random() - 0.5) * 1.5, p.y + 1.2 + (Math.random() - 0.5) * 0.3, p.z, 0, 0, 2, 0.35, 0.6, new THREE.Color(r.me ? 0x49e6ff : r.color), 0.7, 0, -1);
    }
  });

  /* ======================================================
     5) OKYANUS JET SKİ YARIŞI
     ====================================================== */
  THEMES.push({
    id: "jetski", title: "Mavi Lagün", kind: "Jet Ski Yarışı", emoji: "🌊", grad: ["#16c4d8", "#0e5c93"],
    desc: "Tropik adaların arasında dalgaları yararak yarış!",
    vehicle: "jetski", engine: "water", length: 1750, roadHalf: 6.4, vmax: 38, accel: 14, steer: 10, kmh: 4.2, lean: 0.4, edge: 2.4, offMul: 0.7,
    shadow: false, tagY: 2.7, rideY: -0.05,
    curves: [[24, 0.006], [10, 0.017]], hills: [],
    sky: [[0, "#1aa0f0"], [0.55, "#7fd6ff"], [0.75, "#dff7ff"], [1, "#dff7ff"]], fogColor: 0xc6eefc, fog: [70, 300],
    light: { sky: 0xffffff, ground: 0x2a8ab0, hemi: 0.95, sun: 0xfff3d6, dir: 0.65, pos: [-40, 50, 10] },
    sunGlow: { color: "rgba(255,250,210,.9)", size: 80, pos: [100, 120, -280] },
    slogans: ["DALGALARI YAR!", "6. SINIFLAR", "HEDEF: ZİRVE!"], dustColor: 0xffffff,
    groundTex: function () {
      var b = base(256, 256, "#1b8fc4"), g = b.g;
      speck(g, 256, 256, 500, ["#2aa3d6", "#1580b5", "#36b4e0"], 4, 12, 0.6);
      g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 3;
      for (var i = 0; i < 40; i++) { var x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.arc(x, y, 6 + Math.random() * 10, 3.6, 5.8); g.stroke(); }
      return ctex(b.c);
    }, groundTexLen: 16,
    groundH: function () { return -0.15; },
    groundCols: [-220, -120, -60, -25, -8, 0, 8, 25, 60, 120, 220],
    backdrop: function () {
      return silhouette(function (g, w) {
        for (var x = 0; x < w;) {
          var mw = 60 + Math.random() * 160, mh = 10 + Math.random() * 40;
          g.fillStyle = "#5aa27a"; g.beginPath(); g.ellipse(x + mw / 2, 192, mw / 2, mh, 0, Math.PI, 0); g.fill();
          for (var k = 0; k < 3; k++) { var px = x + mw * (0.25 + k * 0.25); g.fillStyle = "#3f7d5a"; g.fillRect(px, 192 - mh - 14, 2, 16); g.beginPath(); g.arc(px + 1, 192 - mh - 16, 7, 0, 7); g.fill(); }
          x += mw + 100 + Math.random() * 260;
        }
      }, "#c6eefc");
    },
    scenery: function (ctx) {
      var T = ctx.T;
      var by1 = prefab([part(new THREE.SphereGeometry(0.42, 10, 8), 0xe53935, { p: [0, 0.05, 0] }), part(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), 0x333333, { p: [0, 0.6, 0] })]);
      var by2 = prefab([part(new THREE.SphereGeometry(0.42, 10, 8), 0xffffff, { p: [0, 0.05, 0] }), part(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), 0x333333, { p: [0, 0.6, 0] })]);
      edgeRow(ctx, [by1, by2], T.hw + 0.6, 6, -0.1);
      var palm = function () {
        var parts = [part(new THREE.SphereGeometry(1, 14, 8), 0xf1d9a0, { p: [0, -0.6, 0], s: [7, 1.6, 6] })];
        var tg = new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6);
        for (var i = 0; i < 5; i++) parts.push(part(tg, 0x9c6b3e, { p: [i * 0.18, 0.7 + i * 1.3, 0], r: [0, 0, -0.12] }));
        var lg = new THREE.BoxGeometry(3.2, 0.06, 0.8);
        for (var k = 0; k < 6; k++) { var a = (k / 6) * Math.PI * 2; parts.push(part(lg, [0x2f9e4a, 0x3cb55a], { p: [0.9 + Math.cos(a) * 1.4, 7.0, Math.sin(a) * 1.4], r: [0, -a, -0.35] })); }
        return prefab(parts);
      }();
      scatterSides(ctx, { pf: palm, u0: 22, u1: 130, step: [9, 22], sc: function (r) { return 0.9 + r() * 0.8; }, y: function () { return 0; } });
      scatterSides(ctx, { pf: rockPf([0x7c8a96, 0x9aa6b0]), u0: 11, u1: 40, step: [10, 22], sc: function (r) { return 0.8 + r() * 1.6; }, y: function () { return -0.5; } });
      // deniz feneri
      var lh = new THREE.Group();
      for (var j = 0; j < 5; j++) lh.add(mesh(new THREE.CylinderGeometry(1.5 - j * 0.15, 1.6 - j * 0.15, 3, 14), lam(j % 2 ? 0xe53935 : 0xffffff), 0, 1.5 + j * 3, 0));
      lh.add(mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.4, 10), U.glow(0xfff2a8), 0, 16.2, 0));
      lh.add(mesh(new THREE.ConeGeometry(1.3, 1.6, 10), lam(0x0b2d5b), 0, 17.7, 0));
      var lhRock = mesh(new THREE.SphereGeometry(1, 12, 8), lam(0x8a96a0, { flatShading: true }), 0, -1, 0); lhRock.scale.set(5, 2, 5); lh.add(lhRock);
      lh.position.set(T.cx(600) - 34, -0.2, -600); ctx.W.add(lh);
      // yelkenliler
      for (var b = 0; b < 6; b++) {
        var sb = new THREE.Group(), s = 150 + b * 280, sd = b % 2 ? 1 : -1;
        sb.add(mesh(new THREE.BoxGeometry(2, 0.8, 6), lam(0xffffff), 0, 0.2, 0));
        sb.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 5), lam(0x555555), 0, 4, 0));
        var sail = mesh(new THREE.ConeGeometry(2.2, 6, 3), lam([0xffc93c, 0xe53935, 0x1f6fd1][b % 3])); sail.scale.z = 0.08; sail.position.set(0, 4, 1); sb.add(sail);
        sb.position.set(T.cx(s) + sd * (40 + b * 7), 0, -s); sb.rotation.y = b; ctx.W.add(sb);
      }
    },
    animate: function (game, dt) { if (game.groundTex) { game.groundTex.offset.x += dt * 0.03; game.groundTex.offset.y += dt * 0.05; } },
    obstacles: [{ make: O.buoyMine, w: 2.5 }, { make: O.floatBarrel, w: 2 }, { make: O.wave, w: 1.5 }, { make: function (U, r) { var o = O.rock(U, r, 0x7c8a96); o.obj.position.y = -0.3; return o; }, w: 1 }],
    trail: function (game, r, dt) {
      var p = game.tmp2, k = Math.min(1, r.v / 25), col = new THREE.Color(0xffffff);
      for (var i = 0; i < 2; i++) {
        var sd = i ? 1 : -1; game.track.pos(r.s + 1.4, r.u + sd * 0.5, p);
        game.parts.emit(p.x, p.y + 0.1, p.z, sd * (1.5 + Math.random() * 2) * k, (2 + Math.random() * 2) * k, r.v * 0.15, 0.6, 0.45, col, 0.9, 9, 0.8);
      }
    }
  });

  /* ======================================================
     6) ORMAN BİSİKLET YARIŞI
     ====================================================== */
  THEMES.push({
    id: "bisiklet", title: "Sonbahar Ormanı", kind: "Bisiklet Yarışı", emoji: "🚴", grad: ["#ffb03a", "#3f7a2a"],
    desc: "Rengârenk yaprakların döküldüğü orman yolunda pedal çevir!",
    vehicle: "bike", engine: "wind", length: 1500, roadHalf: 5.6, vmax: 33, accel: 13, steer: 10, kmh: 1.5, lean: 0.45, offMul: 0.6,
    shadowW: 1.2, shadowL: 2.8, tagY: 2.6,
    curves: [[22, 0.007], [9, 0.02]], hills: [[4, 0.014], [1.5, 0.04]],
    sky: [[0, "#5aa6e8"], [0.55, "#b3dcf7"], [0.75, "#fff1d6"], [1, "#fff1d6"]], fogColor: 0xf0e6cf, fog: [45, 230],
    light: { sky: 0xfff6e0, ground: 0x6a7a3a, hemi: 0.95, sun: 0xffd9a0, dir: 0.6, pos: [-30, 35, 10] },
    sunGlow: { color: "rgba(255,220,150,.8)", size: 70, pos: [-140, 110, -270] },
    slogans: ["PEDALLA!", "6. SINIFLAR", "HEDEF: ZİRVE!"], dustColor: 0xa8774a, weather: { n: 500, size: 0.35, fall: 1.2, sway: 2.2, leaf: true, color: 0xff9a2a },
    roadTex: function () {
      var b = base(256, 512, "#a77a4c"), g = b.g;
      speck(g, 256, 512, 1800, ["#946a40", "#b88b5c", "#8a5f36"], 0.8, 3, 0.8);
      speck(g, 256, 512, 140, ["#e85d2a", "#ffb03a", "#d93b2b", "#f5d142"], 2, 4, 0.9);
      g.fillStyle = "rgba(80,110,40,.7)"; g.fillRect(0, 0, 12, 512); g.fillRect(244, 0, 12, 512);
      return ctex(b.c);
    }, roadTexLen: 12,
    groundTex: function () {
      var b = base(256, 256, "#6c9a3c"), g = b.g;
      speck(g, 256, 256, 1600, ["#5e8a32", "#7aab48", "#557d2c"], 0.8, 2.2, 0.8);
      speck(g, 256, 256, 260, ["#e85d2a", "#ffb03a", "#d93b2b", "#f5d142"], 1.5, 3.2, 0.9);
      return ctex(b.c);
    }, groundTexLen: 10,
    groundH: function (u, s, f) { var a = Math.abs(u); if (a < 6.8) return -0.1; return smooth(9, 60, a) * f(s * 0.02, u * 0.04) * 10; },
    groundColor: function (u, s, h, out) { var n = U.fbm(s * 0.03, u * 0.05); out.setRGB(0.85 + n * 0.3, 0.85 + n * 0.15, 0.7); },
    backdrop: function () {
      return silhouette(function (g, w) {
        for (var x = -50; x < w; x += 60 + Math.random() * 80) {
          var r = 60 + Math.random() * 80; g.fillStyle = ["#9db07a", "#b3a16a", "#8fa874"][(Math.random() * 3) | 0];
          g.beginPath(); g.arc(x, 200, r, Math.PI, 0); g.fill();
        }
        for (var t = 0; t < w; t += 7) { g.fillStyle = ["#c9864a", "#a8a24e", "#c46a3a"][(Math.random() * 3) | 0]; var th = 8 + Math.random() * 14; g.beginPath(); g.arc(t, 190 - th * 0.3, th * 0.5, 0, 7); g.fill(); }
      }, "#f0e6cf");
    },
    scenery: function (ctx) {
      var T = ctx.T;
      var autumn = leafyTree(0x6b4226, [0xe85d2a, 0xffb03a, 0xd93b2b, 0xf5d142, 0x6aa84f], 2.6);
      var autumn2 = leafyTree(0x5a3a22, [0xff8c1a, 0xc23b22, 0xffd23a], 3.4);
      scatterSides(ctx, { pf: [autumn, autumn2, pine(false)], u0: 8.5, u1: 50, step: [1, 2.8], sc: function (r) { return 0.9 + r() * 0.8; }, sink: 0.2 });
      scatterSides(ctx, { pf: [autumn2, pine(false)], u0: 50, u1: 140, step: [3, 6], sc: function (r) { return 1.3 + r() * 0.9; }, sink: 0.2 });
      var mush = prefab([part(new THREE.CylinderGeometry(0.12, 0.16, 0.4, 7), 0xf6efe0, { p: [0, 0.2, 0] }),
        part(new THREE.SphereGeometry(0.35, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0xe53935, 0xff7a1a], { p: [0, 0.38, 0] }),
        part(new THREE.SphereGeometry(0.06, 5, 4), 0xffffff, { p: [0.15, 0.62, 0.1] }), part(new THREE.SphereGeometry(0.05, 5, 4), 0xffffff, { p: [-0.12, 0.64, -0.08] })]);
      scatterSides(ctx, { pf: mush, u0: 7.2, u1: 14, step: [2, 6], sc: function (r) { return 0.8 + r() * 1.2; } });
      var bush = prefab([part(new THREE.IcosahedronGeometry(1, 0), [0x6aa84f, 0xb5a33a, 0xd2702a], { p: [0, 0.4, 0], s: [1.2, 0.8, 1.1], mat: lam(0xffffff, { flatShading: true }) })]);
      scatterSides(ctx, { pf: bush, u0: 7.5, u1: 16, step: [2, 5] });
      var post = prefab([part(new THREE.BoxGeometry(0.16, 1.1, 0.16), 0x8a5a34, { p: [0, 0.55, 0] }), part(new THREE.BoxGeometry(0.08, 0.12, 4.05), 0xa06a3c, { p: [0, 0.85, 2] }), part(new THREE.BoxGeometry(0.08, 0.12, 4.05), 0xa06a3c, { p: [0, 0.45, 2] })]);
      edgeRow(ctx, [post], T.hw + 1.3, 4, -0.1);
    },
    obstacles: [{ make: O.log, w: 2 }, { make: O.puddle, w: 2 }, { make: function (U, r) { return O.rock(U, r, 0x8d8a80); }, w: 2 }, { make: O.hay, w: 1.5 }],
    trail: trailDust(0xb98c5c, 0.5, 0.8)
  });

  BY.THEMES = THEMES;
  BY.THEMES_BY_ID = {};
  THEMES.forEach(function (t) { BY.THEMES_BY_ID[t.id] = t; });
})();
