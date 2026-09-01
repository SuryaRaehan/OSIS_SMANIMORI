// ============================================================
// SPLASH SCREEN: preload foto hero (fan carousel) sambil
// menampilkan progress bar, lalu membuka halaman (SplashDone).
// ============================================================
(function () {
  var IMAGES = [
    "asset/web/ft brsm.png",
    "asset/web/ft brsm2.png",
    "asset/web/ft brsm3.png",
    "asset/web/ft brsm4.png",
    "asset/web/ft brsm5.png",
    "asset/web/ft brsm6.png",
    "asset/web/ft brsm7.png",
    "asset/web/ft brsm8.png"
  ];
  var MIN_MS = 1200;
  var MAX_MS = 4000;

  var start = performance.now();
  var loaded = 0;
  var finished = false;

  var fill = document.getElementById("splashFill");
  var pct = document.getElementById("splashPct");

  function setProgress() {
    var p = Math.round((loaded / IMAGES.length) * 100);
    if (fill) fill.style.width = p + "%";
    if (pct) pct.textContent = p + "%";
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

  function maybeFinish() {
    var elapsed = performance.now() - start;
    var allLoaded = loaded >= IMAGES.length;
    if (!allLoaded && elapsed < MAX_MS) return;
    setTimeout(finish, Math.max(0, MIN_MS - elapsed));
  }

  IMAGES.forEach(function (url) {
    var img = new Image();
    img.onload = img.onerror = function () {
      loaded++;
      setProgress();
      maybeFinish();
    };
    img.src = url;
  });

  setProgress();
  setTimeout(maybeFinish, MAX_MS);
})();