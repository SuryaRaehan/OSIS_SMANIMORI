// ============================================================
// API LAYER: Turnstile (anti-bot) -> challenge token -> data
// ============================================================
(function () {
  var CONFIGURED =
    CF_CONFIG.workerUrl.indexOf("YOUR-WORKER") === -1 &&
    CF_CONFIG.turnstileSiteKey.indexOf("...") === -1;

  function getTurnstileToken() {
    if (!window.turnstile) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var host = document.createElement("div");
      host.id = "cf-widget-host";
      document.body.appendChild(host);
      window.turnstile.render(host, {
        sitekey: CF_CONFIG.turnstileSiteKey,
        callback: resolve,
        "error-callback": function () { resolve(null); },
        "timeout-callback": function () { resolve(null); },
        "expired-callback": function () { resolve(null); }
      });
    });
  }

  window.dbRequest = function (path) {
    if (!CONFIGURED) {
      return Promise.reject(
        new Error(
          "Konfigurasi belum lengkap. Admin harus mengisi workerUrl & turnstileSiteKey di config.js."
        )
      );
    }
    return getTurnstileToken().then(function (ts) {
      if (!ts) throw new Error("Gagal verifikasi manusia. Silakan muat ulang halaman.");
      return (
        fetch(CF_CONFIG.workerUrl + "/api/challenge", { credentials: "include" })
          .then(function (r) {
            if (!r.ok) throw new Error("Server tidak merespons. Coba lagi nanti.");
            return r.json();
          })
          .then(function (ch) {
            if (!ch.token) throw new Error("Sesi akses tidak valid. Muat ulang halaman.");
            return fetch(CF_CONFIG.workerUrl + "/api/" + path, {
              credentials: "include",
              headers: {
                "x-db-token": ch.token,
                "x-turnstile-token": ts
              }
            });
          })
          .then(function (res) {
            if (res.status === 401 || res.status === 403) {
              throw new Error("Akses ditolak sistem keamanan. Muat ulang halaman untuk mencoba lagi.");
            }
            if (!res.ok) throw new Error("Server bermasalah. Coba lagi nanti.");
            return res.json();
          })
      );
    });
  };
})();