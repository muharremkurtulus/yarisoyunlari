/* Bilfen 3D Yarış Ligi — menü, HUD ve ekran akışı */
(function () {
  "use strict";
  var BY = window.BY;
  function $(id) { return document.getElementById(id); }
  if (!window.THREE || !BY.Game) { $("err").hidden = false; return; }

  var THEMES = BY.THEMES, Audio = BY.Audio;
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("bilfenYaris:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("bilfenYaris:" + k, JSON.stringify(v)); } catch (e) {} }
  };
  Audio.muted = store.get("muted", false);

  var screen = "menu", sel = store.get("lastTheme", 0), current = sel, attractTimer = null, game;
  var hasTouch = ("ontouchstart" in window) || (window.matchMedia && matchMedia("(pointer: coarse)").matches);
  if (hasTouch) document.body.classList.add("has-touch");

  /* ---------- logo görüntüsünü yükle, sonra motoru başlat ---------- */
  var img = new Image();
  img.onload = img.onerror = function () { BY.logoImg = img.naturalWidth ? img : null; (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot); };
  img.src = window.BILFEN_LOGO || "img/logo.png";

  function boot() {
    game = BY.game = new BY.Game($("c"), hooks);
    buildCards();
    showMenu();
    updateMuteBtn();
  }

  /* ---------- menü ---------- */
  function buildCards() {
    var wrap = $("cards"); wrap.innerHTML = "";
    THEMES.forEach(function (t, i) {
      var b = document.createElement("button");
      b.className = "rcard"; b.setAttribute("role", "option");
      b.style.setProperty("--a", t.grad[0]); b.style.setProperty("--b", t.grad[1]);
      var best = store.get("best:" + t.id, null);
      b.innerHTML = '<span class="num">' + (i + 1) + '</span><span class="emo">' + t.emoji + "</span><h3>" + t.title + "</h3><p><b>" + t.kind + "</b> · " + t.desc + "</p>" +
        '<span class="best">' + (best ? (["🥇", "🥈", "🥉"][best.place - 1] || "🏁") + " En iyi: " + best.place + ". · " + best.time.toFixed(1) + " sn · " + best.score + " puan" : "Henüz yarışılmadı") + "</span>";
      b.addEventListener("mouseenter", function () { if (!hasTouch) select(i); });
      b.addEventListener("click", function () { Audio.unlock(); select(i); startRace(i); });
      wrap.appendChild(b);
    });
    select(sel, true);
  }
  function select(i, quiet) {
    sel = (i + THEMES.length) % THEMES.length;
    var cards = $("cards").children;
    for (var k = 0; k < cards.length; k++) cards[k].classList.toggle("sel", k === sel);
    if (!quiet) Audio.sfx("select");
    if (screen === "menu") {
      clearTimeout(attractTimer);
      attractTimer = setTimeout(function () { if (screen === "menu" && current !== sel) { current = sel; game.load(THEMES[sel].id, "attract"); } }, quiet ? 0 : 350);
    }
  }
  function showMenu() {
    screen = "menu";
    ["hud", "pause", "result", "countdown", "touch"].forEach(function (id) { $(id).hidden = true; });
    $("menu").hidden = false;
    buildCards();
    current = sel; game.load(THEMES[sel].id, "attract");
    Audio.engineSet(0, false, false);
  }

  /* ---------- yarış ---------- */
  function startRace(i) {
    clearTimeout(attractTimer);
    sel = current = i; store.set("lastTheme", i);
    screen = "loading";
    $("menu").hidden = true; $("result").hidden = true; $("pause").hidden = true;
    $("loading").hidden = false;
    setTimeout(function () {
      game.load(THEMES[i].id, "race");
      $("loading").hidden = true;
      $("hud").hidden = false; $("touch").hidden = !hasTouch;
      $("hTheme").textContent = THEMES[i].emoji + " " + THEMES[i].title + " · " + THEMES[i].kind;
      buildDots();
      lastHud = {};
      screen = "intro";
      setTimeout(function () { if (screen === "intro") { screen = "race"; game.startCountdown(); } }, 1600);
    }, 60);
  }
  function buildDots() {
    var d = $("hDots"); d.innerHTML = "";
    game.racers.forEach(function (r) {
      var e = document.createElement("span"); e.className = "h-dot" + (r.me ? " me" : "");
      e.style.background = "#" + new THREE.Color(r.color).getHexString();
      if (r.me) e.textContent = "SEN";
      d.appendChild(e);
    });
  }

  var lastHud = {};
  var hooks = {
    hud: function (h) {
      if (h.place !== lastHud.place) { $("hPlace").textContent = h.place; $("hPlaceOf").textContent = "/" + h.total; }
      var t = h.t.toFixed(1); if (t !== lastHud.t) $("hTime").textContent = t;
      if (h.speed !== lastHud.speed) $("hSpeed").textContent = h.speed;
      $("spArc").style.strokeDashoffset = (157.1 * (1 - h.ratio)).toFixed(1);
      if (h.boost !== lastHud.boost) { $("boostTag").hidden = !h.boost; document.querySelector(".speedo").classList.toggle("boost", h.boost); }
      var me = h.prog.filter(function (p) { return p.me; })[0];
      $("hFill").style.width = (me.k * 100).toFixed(1) + "%";
      var dots = $("hDots").children;
      for (var i = 0; i < dots.length && i < h.prog.length; i++) dots[i].style.left = (h.prog[i].k * 100).toFixed(2) + "%";
      lastHud = { place: h.place, t: t, speed: h.speed, boost: h.boost };
    },
    star: function (n) { $("hStars").textContent = n; bump($("hStars").parentNode); },
    placeUp: function (p) { var e = $("hPlace").parentNode; e.classList.remove("up"); void e.offsetWidth; e.classList.add("up"); popup("Geçtin! " + p + ". sıradasın", "gold"); },
    popup: function (t, c) { popup(t, c); },
    flash: function (c) { var f = $("flash"); f.className = "flash on" + (c === "blue" ? " blue" : ""); setTimeout(function () { f.className = "flash" + (c === "blue" ? " blue" : ""); }, 60); },
    count: function (n) {
      var c = $("countdown"); c.hidden = false;
      c.innerHTML = n > 0 ? "<b>" + n + "</b>" : '<b class="go">BAŞLA!</b>';
      if (n === 0) setTimeout(function () { c.hidden = true; }, 950);
    },
    finish: function (res) { showResult(res); }
  };
  function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  function popup(text, cls) {
    var box = $("popups"); if (box.children.length > 2) box.firstChild.remove();
    var p = document.createElement("div"); p.className = "popup " + (cls || ""); p.textContent = text;
    p.style.top = (30 + box.children.length * 8) + "%";
    box.appendChild(p); setTimeout(function () { p.remove(); }, 1150);
  }

  /* ---------- sonuç ---------- */
  var resTheme = 0;
  function showResult(res) {
    screen = "result"; resTheme = sel;
    var place = res.place, t = res.theme;
    var score = res.stars * 10 + [500, 350, 250, 150, 100, 50][place - 1] + Math.max(0, Math.round((t.length / t.vmax * 1.25 - res.time) * 5));
    $("rMedal").textContent = ["🥇", "🥈", "🥉", "🏁", "🏁", "🏁"][place - 1];
    $("rTitle").textContent = ["Birinci oldun! 🎉", "Harika! İkinci oldun!", "Tebrikler, üçüncüsün!", "Dördüncü oldun!", "Beşinci oldun!", "Altıncı oldun!"][place - 1];
    $("rTheme").textContent = t.emoji + " " + t.title + " · " + t.kind + (place > 3 ? " — Bir daha dene, podyum çok yakın!" : "");
    $("rPlace").textContent = place + ".";
    $("rTime").textContent = res.time.toFixed(1) + " sn";
    $("rStars").textContent = "⭐ " + res.stars;
    $("rScore").textContent = score;
    var best = store.get("best:" + t.id, null), be = $("rBest");
    if (!best || score > best.score) {
      store.set("best:" + t.id, { place: place, time: res.time, score: score });
      be.textContent = best ? "🎉 Yeni rekor! Eski rekor: " + best.score + " puan" : "🎉 İlk rekorun kaydedildi!"; be.className = "best new";
    } else { be.textContent = "Rekorun: " + best.score + " puan (" + best.place + ". · " + best.time.toFixed(1) + " sn)"; be.className = "best"; }
    $("hud").hidden = true; $("touch").hidden = true;
    openModal("result");
  }

  /* ---------- modallar (ok tuşlarıyla gezilebilir) ---------- */
  var modalSel = 0;
  function modalBtns() { var m = $(screen === "pause" ? "pause" : "result"); return m.querySelectorAll("[data-act]"); }
  function openModal(id) { $(id).hidden = false; modalSel = 0; paintModal(); }
  function paintModal() { var b = modalBtns(); for (var i = 0; i < b.length; i++) b[i].classList.toggle("sel", i === modalSel); }
  function doAct(act) {
    Audio.unlock();
    if (act === "resume") { $("pause").hidden = true; screen = "race"; game.setPaused(false); }
    else if (act === "restart") { game.setPaused(false); startRace(sel); }
    else if (act === "next") { game.setPaused(false); select(sel + 1, true); startRace(sel); }
    else if (act === "menu") { game.setPaused(false); showMenu(); }
  }
  document.querySelectorAll("[data-act]").forEach(function (b) { b.addEventListener("click", function () { doAct(b.dataset.act); }); });
  function pause() {
    if (screen !== "race" || game.state === "finished") return;
    screen = "pause"; game.setPaused(true); openModal("pause");
  }
  $("pauseBtn").addEventListener("click", pause);

  /* ---------- klavye ---------- */
  function setKey(dir, on) { if (game) game.keys[dir] = on; var b = $(dir === "left" ? "tLeft" : "tRight"); b.classList.toggle("on", on); }
  window.addEventListener("keydown", function (e) {
    Audio.unlock();
    var k = e.key;
    if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown" || k === " ") e.preventDefault();
    if (screen === "menu") {
      if (k === "ArrowLeft" || k === "ArrowUp") select(sel - 1);
      else if (k === "ArrowRight" || k === "ArrowDown") select(sel + 1);
      else if (k === "Enter" || k === " ") startRace(sel);
      else if (k >= "1" && k <= "6") { select(+k - 1); startRace(+k - 1); }
      return;
    }
    if (screen === "race" || screen === "intro") {
      if (k === "ArrowLeft") setKey("left", true);
      else if (k === "ArrowRight") setKey("right", true);
      else if (k === "Escape" || k === "p" || k === "P") pause();
      return;
    }
    if (screen === "pause" || screen === "result") {
      var b = modalBtns();
      if (k === "ArrowLeft" || k === "ArrowUp") { modalSel = (modalSel - 1 + b.length) % b.length; paintModal(); Audio.sfx("select"); }
      else if (k === "ArrowRight" || k === "ArrowDown") { modalSel = (modalSel + 1) % b.length; paintModal(); Audio.sfx("select"); }
      else if (k === "Enter" || k === " ") doAct(b[modalSel].dataset.act);
      else if (k === "Escape") doAct(screen === "pause" ? "resume" : "menu");
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft") setKey("left", false);
    else if (e.key === "ArrowRight") setKey("right", false);
  });
  window.addEventListener("blur", function () { if (game) { setKey("left", false); setKey("right", false); } if (screen === "race") pause(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && screen === "race") pause(); });

  /* ---------- dokunmatik ---------- */
  [["tLeft", "left"], ["tRight", "right"]].forEach(function (p) {
    var b = $(p[0]);
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); Audio.unlock(); setKey(p[1], true); try { b.setPointerCapture(e.pointerId); } catch (x) {} });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { b.addEventListener(ev, function () { setKey(p[1], false); }); });
  });

  /* ---------- ses ---------- */
  function updateMuteBtn() { $("menuMute").textContent = Audio.muted ? "🔇 Ses kapalı" : "🔊 Ses açık"; }
  $("menuMute").addEventListener("click", function () { Audio.unlock(); Audio.setMuted(!Audio.muted); store.set("muted", Audio.muted); updateMuteBtn(); });
  window.addEventListener("pointerdown", function () { Audio.unlock(); }, { once: true });
})();
