/* Bilfen 3D Yarış Ligi — araç ve engel modelleri (tamamı kodla üretilir) */
(function () {
  "use strict";
  var THREE = window.THREE, BY = window.BY, U = BY.U;
  var lam = U.lam, mesh = U.mesh, glow = U.glow, shade = U.shade;
  var SKIN = 0xf2c18f, DARK = 0x1d1f26, METAL = 0xc5ccd6;

  function G() { return new THREE.Group(); }
  function box(w, h, d, c, x, y, z, mat) { return mesh(new THREE.BoxGeometry(w, h, d), mat || lam(c), x, y, z); }
  function cyl(rt, rb, h, seg, c, x, y, z, mat) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), mat || lam(c), x, y, z); }
  function sph(r, c, x, y, z, mat) { return mesh(new THREE.SphereGeometry(r, 16, 12), mat || lam(c), x, y, z); }
  function rod(a, b, r, c) { // iki nokta arasında silindir
    var A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]);
    var len = A.distanceTo(B), m = cyl(r, r, len, 8, c);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  }
  function wheel(r, w, hub) {
    var g = G(), t = cyl(r, r, w, 18, DARK); t.rotation.z = Math.PI / 2; g.add(t);
    var h = cyl(r * 0.55, r * 0.55, w + 0.02, 10, hub || METAL); h.rotation.z = Math.PI / 2; g.add(h);
    var sp = box(w + 0.04, r * 1.1, 0.08, 0x8a929e); g.add(sp);
    return g;
  }
  function helmet(c, x, y, z, r) {
    var g = G(); g.position.set(x, y, z);
    g.add(sph(r, c));
    var v = box(r * 1.3, r * 0.5, r * 0.5, 0x15202e, 0, 0, -r * 0.75); g.add(v);
    g.add(box(r * 0.25, r * 0.3, r * 1.9, 0xffffff, 0, r * 0.75, 0));
    return g;
  }
  function spinWheels(ws, r, dt, v) { for (var i = 0; i < ws.length; i++) ws[i].rotation.x -= (v * dt) / r; }

  var V = (BY.Vehicles = {});

  /* ---------- yarış arabası ---------- */
  V.car = function (color) {
    var root = G(), b = G(); root.add(b);
    var c2 = shade(color, -0.35);
    b.add(box(1.8, 0.42, 3.4, color, 0, 0.58, 0.1));
    var nose = box(1.6, 0.28, 1.0, color, 0, 0.5, -1.95); nose.rotation.x = 0.12; b.add(nose);
    b.add(box(1.9, 0.18, 3.9, c2, 0, 0.38, -0.05));
    b.add(box(1.38, 0.46, 1.5, 0x1b2b40, 0, 1.0, 0.35));
    b.add(box(1.42, 0.08, 1.2, color, 0, 1.26, 0.42));
    b.add(box(0.26, 0.02, 4.0, 0xffffff, -0.22, 0.8, -0.1)); b.add(box(0.26, 0.02, 4.0, 0xffffff, 0.22, 0.8, -0.1));
    b.add(box(0.1, 0.4, 0.1, c2, -0.62, 0.95, 1.6)); b.add(box(0.1, 0.4, 0.1, c2, 0.62, 0.95, 1.6));
    b.add(box(1.95, 0.08, 0.5, color, 0, 1.17, 1.66));
    b.add(box(0.08, 0.32, 0.55, c2, -0.98, 1.08, 1.66)); b.add(box(0.08, 0.32, 0.55, c2, 0.98, 1.08, 1.66));
    b.add(box(0.4, 0.14, 0.05, 0, -0.55, 0.62, -2.47, glow(0xfff4c2))); b.add(box(0.4, 0.14, 0.05, 0, 0.55, 0.62, -2.47, glow(0xfff4c2)));
    b.add(box(0.45, 0.14, 0.05, 0, -0.6, 0.66, 1.83, glow(0xff2a2a))); b.add(box(0.45, 0.14, 0.05, 0, 0.6, 0.66, 1.83, glow(0xff2a2a)));
    b.add(box(1.0, 0.1, 0.3, DARK, 0, 0.36, 1.95));
    (function (o) { o.rotation.x = Math.PI / 2; b.add(o); })(cyl(0.08, 0.1, 0.3, 8, METAL, -0.4, 0.4, 2.0));
    // kask görünen sürücü
    b.add(helmet(0xffffff, 0, 1.0, 0.45, 0.26));
    var ws = [];
    [[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.2], [0.95, 1.2]].forEach(function (p) { var w = wheel(0.42, 0.38, 0xffc93c); w.position.set(p[0], 0.42, p[1]); b.add(w); ws.push(w); });
    return { root: root, body: b, anim: function (dt, r, t, lean) { spinWheels(ws, 0.42, dt, r.v); ws[0].rotation.y = ws[1].rotation.y = lean * 0.35; } };
  };

  /* ---------- motosiklet ---------- */
  V.moto = function (color) {
    var root = G(), b = G(); root.add(b);
    var c2 = shade(color, -0.35);
    var wf = wheel(0.46, 0.18), wr = wheel(0.46, 0.22);
    wf.position.set(0, 0.46, -0.9); wr.position.set(0, 0.46, 0.85); b.add(wf); b.add(wr);
    b.add(box(0.24, 0.3, 1.3, c2, 0, 0.78, 0));
    b.add(box(0.42, 0.34, 0.55, 0x4d5562, 0, 0.62, 0.05));
    b.add(box(0.48, 0.3, 0.66, color, 0, 1.02, -0.25));
    var fr = box(0.56, 0.48, 0.4, color, 0, 1.1, -0.78); fr.rotation.x = 0.45; b.add(fr);
    var ws_ = box(0.46, 0.3, 0.04, 0x9fdcff, 0, 1.42, -0.86); ws_.rotation.x = 0.6; b.add(ws_);
    b.add(box(0.38, 0.12, 0.7, DARK, 0, 1.0, 0.35));
    b.add(box(0.42, 0.24, 0.5, color, 0, 1.0, 0.82));
    b.add(box(0.2, 0.08, 0.05, 0, 0, 1.0, 1.08, glow(0xff2a2a)));
    b.add(box(0.2, 0.12, 0.05, 0, 0, 1.12, -1.0, glow(0xfff4c2)));
    var fork = box(0.07, 0.75, 0.07, METAL, -0.12, 0.82, -0.82); fork.rotation.x = -0.35; b.add(fork);
    var fork2 = fork.clone(); fork2.position.x = 0.12; b.add(fork2);
    b.add(box(0.84, 0.05, 0.05, DARK, 0, 1.25, -0.62));
    var ex = cyl(0.07, 0.09, 0.8, 8, METAL, 0.26, 0.55, 0.55); ex.rotation.x = Math.PI / 2 - 0.2; b.add(ex);
    // sürücü
    var torso = box(0.52, 0.6, 0.34, color, 0, 1.42, 0.05); torso.rotation.x = -0.85; b.add(torso);
    (function (o) { o.rotation.x = -0.85; b.add(o); })(box(0.4, 0.15, 0.36, 0xffffff, 0, 1.52, -0.05));
    b.add(helmet(color, 0, 1.75, -0.32, 0.25));
    [-1, 1].forEach(function (s) {
      b.add(rod([s * 0.24, 1.55, -0.1], [s * 0.38, 1.25, -0.6], 0.07, DARK));
      b.add(rod([s * 0.2, 1.12, 0.25], [s * 0.26, 0.9, -0.2], 0.09, 0x23324a));
      b.add(rod([s * 0.26, 0.9, -0.2], [s * 0.28, 0.5, 0.05], 0.08, 0x23324a));
    });
    return { root: root, body: b, anim: function (dt, r, t) { spinWheels([wf, wr], 0.46, dt, r.v); b.position.y = Math.sin(t * 20 + r.s) * 0.015; } };
  };

  /* ---------- kızak ---------- */
  V.sled = function (color) {
    var root = G(), b = G(); root.add(b);
    var wood = 0xb5652e, c2 = shade(color, -0.3);
    b.add(box(1.1, 0.1, 2.2, wood, 0, 0.42, 0));
    for (var i = -2; i <= 2; i++) b.add(box(1.12, 0.02, 0.06, 0x7a3e17, 0, 0.475, i * 0.42));
    var curl = mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 14, 1, true, 0, Math.PI), lam(wood, { side: THREE.DoubleSide }), 0, 0.72, -1.1);
    curl.rotation.z = Math.PI / 2; curl.rotation.y = Math.PI; b.add(curl);
    [-1, 1].forEach(function (s) {
      b.add(box(0.07, 0.07, 2.5, METAL, s * 0.48, 0.12, 0.05));
      var tip = mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 12, Math.PI), lam(METAL), s * 0.48, 0.34, -1.2);
      tip.rotation.y = Math.PI / 2; tip.rotation.z = Math.PI / 2; b.add(tip);
      [-0.7, 0, 0.7].forEach(function (z) { b.add(box(0.06, 0.3, 0.06, METAL, s * 0.48, 0.27, z)); });
    });
    // çocuk sürücü
    b.add(box(0.46, 0.22, 0.95, 0x2b3a67, 0, 0.6, -0.35));
    b.add(box(0.5, 0.18, 0.22, DARK, 0, 0.6, -0.86));
    var torso = box(0.58, 0.62, 0.38, color, 0, 0.98, 0.25); torso.rotation.x = 0.12; b.add(torso);
    b.add(box(0.6, 0.14, 0.42, 0xffffff, 0, 1.24, 0.22));
    b.add(sph(0.25, SKIN, 0, 1.52, 0.18));
    b.add(box(0.16, 0.05, 0.05, DARK, -0.09, 1.56, -0.05)); b.add(box(0.16, 0.05, 0.05, DARK, 0.09, 1.56, -0.05));
    var hat = cyl(0.03, 0.27, 0.42, 12, c2, 0, 1.82, 0.18); b.add(hat);
    b.add(cyl(0.27, 0.27, 0.1, 12, 0xffffff, 0, 1.62, 0.18));
    b.add(sph(0.09, 0xffffff, 0, 2.05, 0.18));
    var scarf = box(0.18, 0.5, 0.06, 0xe53935, 0.22, 1.05, 0.48); b.add(scarf);
    [-1, 1].forEach(function (s) { b.add(rod([s * 0.3, 1.15, 0.2], [s * 0.3, 0.75, -0.5], 0.08, color)); });
    return { root: root, body: b, anim: function (dt, r, t) { scarf.rotation.x = 0.6 + Math.sin(t * 14) * 0.25 * Math.min(1, r.v / 20); } };
  };

  /* ---------- uzay gemisi ---------- */
  V.ship = function (color) {
    var root = G(), b = G(); root.add(b);
    var c2 = shade(color, -0.4);
    var fus = mesh(new THREE.ConeGeometry(0.62, 3.2, 10), lam(color), 0, 0.95, -0.6); fus.rotation.x = -Math.PI / 2; b.add(fus);
    var rear = cyl(0.62, 0.5, 1.0, 10, c2, 0, 0.95, 1.4); rear.rotation.x = Math.PI / 2; b.add(rear);
    var cp = sph(0.4, 0, 0, 1.25, -0.2, new THREE.MeshLambertMaterial({ color: 0x73e6ff, emissive: 0x1a6f90 })); cp.scale.set(0.9, 0.65, 1.7); b.add(cp);
    var wingShape = new THREE.Shape(); wingShape.moveTo(0, -0.6); wingShape.lineTo(1.9, 0.5); wingShape.lineTo(1.9, 1.0); wingShape.lineTo(0, 1.0);
    var wg = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: false });
    [-1, 1].forEach(function (s) {
      var w = mesh(wg, lam(color)); w.rotation.x = Math.PI / 2; w.scale.x = s; w.position.set(s * 0.4, 0.88, 0.1); b.add(w);
      b.add(box(0.1, 0.55, 0.8, 0, s * 2.28, 1.05, 1.0, lam(c2)));
      b.add(box(1.4, 0.04, 0.08, 0, s * 1.3, 0.94, 0.9, glow(0x49e6ff)));
      var eng = cyl(0.24, 0.3, 1.0, 10, 0x3a4150, s * 0.78, 0.9, 1.5); eng.rotation.x = Math.PI / 2; b.add(eng);
    });
    var flames = [];
    [-0.78, 0.78, 0].forEach(function (x, i) {
      var f = mesh(new THREE.ConeGeometry(i === 2 ? 0.34 : 0.22, 1.3, 10), new THREE.MeshBasicMaterial({ color: i === 2 ? 0x7af3ff : 0xffa640, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      f.rotation.x = Math.PI / 2; f.position.set(x, i === 2 ? 0.95 : 0.9, i === 2 ? 2.5 : 2.6); b.add(f); flames.push(f);
    });
    b.add(box(0.06, 0.6, 0.7, c2, 0, 1.45, 1.4));
    return { root: root, body: b, anim: function (dt, r, t, lean) {
      b.position.y = 0.4 + Math.sin(t * 3 + r.s * 0.1) * 0.12;
      b.rotation.z = lean * 0.55;
      var k = 0.45 + Math.min(1, r.v / 44) * 0.55 * (r.boost > 0 ? 1.7 : 1) + Math.random() * 0.15;
      flames.forEach(function (f) { f.scale.set(1, k, 1); f.position.z = (f.position.x === 0 ? 2.3 : 2.4) + k * 0.55; });
    } };
  };

  /* ---------- jet ski ---------- */
  V.jetski = function (color) {
    var root = G(), b = G(); root.add(b);
    var hg = new THREE.BoxGeometry(1.15, 0.5, 2.7, 1, 1, 6), pa = hg.attributes.position;
    for (var i = 0; i < pa.count; i++) {
      var z = pa.getZ(i), y = pa.getY(i);
      if (z < 0) pa.setX(i, pa.getX(i) * (1 - (-z / 1.35) * 0.75));
      if (z < -0.4 && y < 0) pa.setY(i, y + (-z - 0.4) * 0.35);
    }
    hg.computeVertexNormals();
    b.add(mesh(hg, lam(0xf4f7fb), 0, 0.35, 0));
    var deck = box(0.9, 0.14, 1.5, color, 0, 0.66, 0.35); b.add(deck);
    b.add(box(1.17, 0.1, 2.0, color, 0, 0.3, 0.3));
    b.add(box(0.46, 0.2, 1.0, DARK, 0, 0.82, 0.45));
    var col = box(0.14, 0.45, 0.14, 0x333a44, 0, 0.92, -0.4); col.rotation.x = 0.35; b.add(col);
    b.add(box(0.8, 0.06, 0.06, DARK, 0, 1.14, -0.5));
    // sürücü (can yelekli)
    var torso = box(0.56, 0.62, 0.36, 0xff7a1a, 0, 1.35, 0.15); torso.rotation.x = -0.45; b.add(torso);
    (function (o) { o.rotation.x = -0.45; b.add(o); })(box(0.58, 0.1, 0.38, 0xffe066, 0, 1.3, 0.13));
    b.add(sph(0.23, SKIN, 0, 1.78, -0.05));
    var cap = sph(0.24, color, 0, 1.86, -0.05); cap.scale.set(1, 0.6, 1); b.add(cap);
    b.add(box(0.3, 0.04, 0.2, color, 0, 1.83, -0.27));
    [-1, 1].forEach(function (s) {
      b.add(rod([s * 0.26, 1.5, 0.0], [s * 0.38, 1.14, -0.48], 0.07, SKIN));
      b.add(rod([s * 0.2, 1.05, 0.35], [s * 0.3, 0.85, -0.05], 0.09, 0x1c4f7a));
      b.add(rod([s * 0.3, 0.85, -0.05], [s * 0.32, 0.72, 0.4], 0.08, 0x1c4f7a));
    });
    return { root: root, body: b, anim: function (dt, r, t) {
      b.position.y = Math.sin(t * 4 + r.s * 0.2) * 0.08;
      b.rotation.x = 0.06 + Math.sin(t * 3.1 + r.s * 0.13) * 0.05 + Math.min(1, r.v / 30) * 0.05;
    } };
  };

  /* ---------- bisiklet ---------- */
  V.bike = function (color) {
    var root = G(), b = G(); root.add(b);
    function bw(z) {
      var g = G(); g.position.set(0, 0.46, z);
      var t = mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 26), lam(DARK)); t.rotation.y = Math.PI / 2; g.add(t);
      for (var i = 0; i < 3; i++) { var s = box(0.02, 0.82, 0.02, METAL); s.rotation.x = (i / 3) * Math.PI; g.add(s); }
      var h = cyl(0.06, 0.06, 0.12, 8, METAL); h.rotation.z = Math.PI / 2; g.add(h);
      b.add(g); return g;
    }
    var wf = bw(-0.66), wr = bw(0.64);
    var seat = [0, 1.08, 0.18], head = [0, 1.1, -0.42], crank = [0, 0.46, 0.0];
    b.add(rod(seat, head, 0.045, color)); b.add(rod(head, crank, 0.05, color)); b.add(rod(seat, crank, 0.045, color));
    b.add(rod(crank, [0, 0.46, 0.64], 0.035, color)); b.add(rod(seat, [0, 0.46, 0.64], 0.035, color));
    b.add(rod(head, [0, 0.46, -0.66], 0.04, METAL));
    b.add(rod([0, 1.1, -0.42], [0, 1.28, -0.48], 0.04, METAL));
    b.add(box(0.62, 0.05, 0.05, DARK, 0, 1.28, -0.5));
    b.add(box(0.18, 0.06, 0.32, DARK, 0, 1.13, 0.2));
    // sürücü
    var torso = box(0.48, 0.6, 0.3, color, 0, 1.5, -0.02); torso.rotation.x = -0.8; b.add(torso);
    (function (o) { o.rotation.x = -0.8; b.add(o); })(box(0.5, 0.1, 0.32, 0xffffff, 0, 1.56, -0.06));
    b.add(sph(0.2, SKIN, 0, 1.82, -0.3));
    var hm = sph(0.23, shade(color, 0.35), 0, 1.92, -0.28); hm.scale.set(1, 0.7, 1.3); b.add(hm);
    [-1, 1].forEach(function (s) { b.add(rod([s * 0.22, 1.62, -0.15], [s * 0.27, 1.28, -0.5], 0.06, SKIN)); });
    var legs = [];
    [-1, 1].forEach(function (s) {
      var hip = G(); hip.position.set(s * 0.15, 1.15, 0.12);
      var th = box(0.15, 0.5, 0.15, 0x22314d, 0, -0.25, 0); hip.add(th);
      var knee = G(); knee.position.set(0, -0.5, 0); hip.add(knee);
      knee.add(box(0.13, 0.46, 0.13, SKIN, 0, -0.22, 0));
      knee.add(box(0.15, 0.1, 0.26, DARK, 0, -0.46, -0.05));
      b.add(hip); legs.push({ hip: hip, knee: knee, s: s });
    });
    var crankA = 0;
    return { root: root, body: b, anim: function (dt, r, t) {
      spinWheels([wf, wr], 0.42, dt, r.v);
      crankA += dt * r.v * 0.9;
      legs.forEach(function (l) { var a = crankA + (l.s > 0 ? Math.PI : 0); l.hip.rotation.x = -1.0 + Math.sin(a) * 0.45; l.knee.rotation.x = 0.9 + Math.cos(a) * 0.5; });
    } };
  };

  /* ================= engeller ================= */
  var O = (BY.Obstacles = {});
  O.cone = function () {
    var g = G();
    g.add(box(0.9, 0.08, 0.9, 0xff6a00, 0, 0.04, 0));
    g.add(cyl(0.07, 0.38, 1.0, 14, 0xff6a00, 0, 0.55, 0));
    g.add(cyl(0.2, 0.26, 0.2, 14, 0xffffff, 0, 0.55, 0));
    return { obj: g, r: 0.5, knock: true };
  };
  O.barrel = function (U, rng) {
    var g = G(), c = [0x1e6bd6, 0xe53935, 0xffc400][(rng() * 3) | 0];
    g.add(cyl(0.48, 0.48, 1.2, 16, c, 0, 0.6, 0));
    g.add(cyl(0.5, 0.5, 0.08, 16, shade(c, -0.3), 0, 0.25, 0)); g.add(cyl(0.5, 0.5, 0.08, 16, shade(c, -0.3), 0, 0.95, 0));
    g.add(box(0.5, 0.2, 0.02, 0xffffff, 0, 0.6, -0.49));
    return { obj: g, r: 0.6, knock: true };
  };
  O.oil = function () {
    var g = G(), m = mesh(new THREE.CircleGeometry(1.0, 20), new THREE.MeshLambertMaterial({ color: 0x111418, emissive: 0x0a0a12 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(1.2, 0.8, 1); g.add(m);
    var hl = mesh(new THREE.CircleGeometry(0.3, 12), new THREE.MeshBasicMaterial({ color: 0x5a6aa0, transparent: true, opacity: 0.5 })); hl.rotation.x = -Math.PI / 2; hl.position.set(0.3, 0.01, -0.2); g.add(hl);
    return { obj: g, r: 1.0, effect: "slip", flat: true, len: 0.9 };
  };
  O.rock = function (U, rng, c) {
    var g = G(), m = mesh(new THREE.DodecahedronGeometry(0.8, 0), lam(c || 0x8a7f74, { flatShading: true }), 0, 0.5, 0);
    m.scale.set(1.1 + rng() * 0.3, 0.75 + rng() * 0.3, 1); m.rotation.set(rng(), rng() * 3, rng()); g.add(m);
    var m2 = mesh(new THREE.DodecahedronGeometry(0.4, 0), lam(shade(c || 0x8a7f74, -0.15), { flatShading: true }), 0.6, 0.25, 0.3); g.add(m2);
    return { obj: g, r: 0.95 };
  };
  O.tumble = function (U, rng) {
    var g = G(), m = mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshLambertMaterial({ color: 0xa8733d, wireframe: true }), 0, 0.6, 0);
    var m2 = mesh(new THREE.IcosahedronGeometry(0.45, 0), new THREE.MeshLambertMaterial({ color: 0x8b5a2b, wireframe: true }), 0, 0.6, 0);
    g.add(m); g.add(m2);
    return { obj: g, r: 0.6, move: 2.5 + rng() * 1.5, knock: true };
  };
  O.log = function (U, rng) {
    var g = G(), l = cyl(0.34, 0.34, 2.6, 12, 0x7b4a24, 0, 0.34, 0); l.rotation.z = Math.PI / 2; g.add(l);
    [-1, 1].forEach(function (s) { var e = cyl(0.3, 0.3, 0.02, 12, 0xd9a86c, s * 1.31, 0.34, 0); e.rotation.z = Math.PI / 2; g.add(e); });
    return { obj: g, r: 1.35 };
  };
  O.snowman = function () {
    var g = G();
    g.add(sph(0.6, 0xffffff, 0, 0.55, 0)); g.add(sph(0.44, 0xffffff, 0, 1.35, 0)); g.add(sph(0.32, 0xffffff, 0, 1.95, 0));
    var n = mesh(new THREE.ConeGeometry(0.07, 0.35, 8), lam(0xff7a1a), 0, 1.95, -0.45); n.rotation.x = -Math.PI / 2; g.add(n);
    g.add(cyl(0.22, 0.22, 0.35, 12, DARK, 0, 2.38, 0)); g.add(cyl(0.34, 0.34, 0.04, 12, DARK, 0, 2.22, 0));
    g.add(box(0.06, 0.06, 0.06, DARK, -0.1, 2.05, -0.29)); g.add(box(0.06, 0.06, 0.06, DARK, 0.1, 2.05, -0.29));
    g.add(box(0.5, 0.1, 0.5, 0xe53935, 0, 1.68, 0));
    return { obj: g, r: 0.65, knock: true };
  };
  O.ice = function (U, rng) {
    var g = G(), m = mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), new THREE.MeshLambertMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.85, emissive: 0x1b4a66 }), 0, 0.5, 0);
    m.rotation.y = rng(); g.add(m);
    return { obj: g, r: 0.75 };
  };
  O.asteroid = function (U, rng) {
    var geo = new THREE.IcosahedronGeometry(1, 1), pa = geo.attributes.position, v = new THREE.Vector3();
    for (var i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); v.multiplyScalar(0.8 + U.vnoise(v.x * 2 + 9, v.y * 2 + v.z) * 0.45); pa.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    var g = G(), m = mesh(geo, lam(0x7a6f86, { flatShading: true }), 0, 0, 0); m.scale.setScalar(0.9); g.add(m);
    return { obj: g, r: 1.0, y: 1.0, spinY: 1 + rng(), bob: 0.3 };
  };
  O.mine = function () {
    var g = G();
    g.add(sph(0.5, 0, 0, 0, 0, new THREE.MeshLambertMaterial({ color: 0xff2d55, emissive: 0x80001a })));
    for (var i = 0; i < 8; i++) {
      var sp = mesh(new THREE.ConeGeometry(0.1, 0.4, 6), glow(0xffe066));
      var a = (i / 8) * Math.PI * 2, e = i % 2 ? 0.6 : -0.6;
      sp.position.set(Math.cos(a) * 0.55, e * 0.4, Math.sin(a) * 0.55);
      sp.lookAt(0, 0, 0); sp.rotateX(-Math.PI / 2); g.add(sp);
    }
    var hl = BY.glowSprite("rgba(255,40,80,.6)", 2.6); g.add(hl);
    return { obj: g, r: 0.75, y: 1.0, spinY: 2, bob: 0.25, move: 1.5 };
  };
  O.floatBarrel = function (U, rng) {
    var o = O.barrel(U, rng); o.obj.children.forEach(function (c) { c.position.y -= 0.3; }); o.effect = "hit"; o.bob = 0.12; return o;
  };
  O.buoyMine = function () {
    var g = G();
    g.add(cyl(0.55, 0.65, 0.6, 14, 0xffc400, 0, 0.2, 0));
    g.add(cyl(0.1, 0.1, 1.0, 8, DARK, 0, 0.9, 0));
    g.add(sph(0.16, 0, 0, 1.45, 0, glow(0xff3030)));
    g.add(cyl(0.57, 0.57, 0.12, 14, 0xffffff, 0, 0.3, 0));
    return { obj: g, r: 0.7, bob: 0.15 };
  };
  O.wave = function () {
    var g = G(), m = mesh(new THREE.CircleGeometry(1.3, 20), new THREE.MeshBasicMaterial({ color: 0xe6fbff, transparent: true, opacity: 0.75 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(1.1, 0.7, 1); g.add(m);
    return { obj: g, r: 1.2, effect: "slow", flat: true, len: 1.0 };
  };
  O.puddle = function () {
    var g = G(), m = mesh(new THREE.CircleGeometry(1.1, 20), new THREE.MeshLambertMaterial({ color: 0x6b4b2e, emissive: 0x1c120a }));
    m.rotation.x = -Math.PI / 2; m.scale.set(1.3, 0.8, 1); g.add(m);
    var w = mesh(new THREE.CircleGeometry(0.75, 16), new THREE.MeshBasicMaterial({ color: 0x9fc6e0, transparent: true, opacity: 0.55 }));
    w.rotation.x = -Math.PI / 2; w.position.y = 0.01; g.add(w);
    return { obj: g, r: 1.1, effect: "slow", flat: true, len: 0.9, splash: 0x8a6a40 };
  };
  O.hay = function () {
    var g = G(), m = cyl(0.6, 0.6, 1.2, 16, 0xe2b84a, 0, 0.6, 0); m.rotation.z = Math.PI / 2; g.add(m);
    [-1, 1].forEach(function (s) { var e = cyl(0.55, 0.55, 0.02, 16, 0xc49a30, s * 0.61, 0.6, 0); e.rotation.z = Math.PI / 2; g.add(e); });
    return { obj: g, r: 0.75, knock: true };
  };
  O.cactus = function () {
    var g = G(), c = 0x3f8f3a;
    g.add(cyl(0.25, 0.28, 1.8, 10, c, 0, 0.9, 0)); g.add(sph(0.25, c, 0, 1.8, 0));
    (function (o) { o.rotation.z = Math.PI / 2; g.add(o); })(cyl(0.14, 0.14, 0.6, 8, c, 0.42, 1.1, 0)); g.add(cyl(0.14, 0.14, 0.4, 8, c, 0.28, 0.85, 0));
    return { obj: g, r: 0.55 };
  };
})();
