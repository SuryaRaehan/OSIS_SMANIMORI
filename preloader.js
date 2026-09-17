// ============================================================
// SPLASH SCREEN: progress berbasis waktu (tidak menunggu
// unduhan gambar) agar halaman selalu terbuka dengan cepat,
// lalu memicu event SplashDone untuk animasi intro.
// ============================================================
(function () {
  var DURATION = 1000;
  var start = performance.now();
  var finished = false;

  var fill = document.getElementById("splashFill");
  var pct = document.getElementById("splashPct");

  function setProgress(p) {
    p = Math.max(0, Math.min(100, p));
    if (fill) fill.style.width = p + "%";
    if (pct) pct.textContent = Math.round(p) + "%";
  }

  function finish() {
    if (finished) return;
    finished = true;
    window.__SPLASH_DONE = true;
    document.body.classList.remove("splash-lock");
    var splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("done");
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 700);
    }
    window.dispatchEvent(new Event("SplashDone"));
  }

  function tick() {
    var p = ((performance.now() - start) / DURATION) * 100;
    if (p >= 100) {
      setProgress(100);
      finish();
      return;
    }
    setProgress(p);
    requestAnimationFrame(tick);
  }

  // Preload hanya kartu tengah carousel (cukup untuk tampilan awal),
  // tidak memblokir splash.
  ["asset/web/ft brsm4.jpg", "asset/web/ft brsm5.jpg"].forEach(function (url) {
    var img = new Image();
    img.src = url;
  });

  requestAnimationFrame(tick);
})();