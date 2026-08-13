// ============================================================
// API LAYER: Turnstile (anti-bot) -> challenge token -> data
// ============================================================
(function () {
  var CONFIGURED =
    CF_CONFIG.workerUrl.indexOf("YOUR-WORKER") === -1 &&
    CF_CONFIG.turnstileSiteKey.indexOf("...") === -1;

  // --- Turnstile: satu widget tersembunyi, pre-solve, cache token ---
  var TURNSTILE_TTL = 240000;
  var tsState = { token: null, at: 0, pending: null };

  function turnstileReady() {
    return new Promise(function (resolve) {
      if (window.turnstile) return resolve(window.turnstile);
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        if (window.turnstile) {
          clearInterval(timer);
          resolve(window.turnstile);
        } else if (tries > 100) {
          clearInterval(timer);
          resolve(null);
        }
      }, 100);
    });
  }

  function solveTurnstile() {
    if (tsState.token && Date.now() - tsState.at < TURNSTILE_TTL) {
      return Promise.resolve(tsState.token);
    }
    if (tsState.pending) return tsState.pending;
    tsState.pending = new Promise(function (resolve) {
      turnstileReady().then(function (turnstile) {
        if (!turnstile) return resolve(null);
        var host = document.createElement("div");
        host.id = "cf-widget-host";
        host.style.cssText =
          "position:fixed;left:-9999px;top:0;width:0;height:0;visibility:hidden;";
        document.body.appendChild(host);
        turnstile.render(host, {
          sitekey: CF_CONFIG.turnstileSiteKey,
          appearance: "execute",
          execution: "render",
          callback: function (t) {
            tsState.token = t;
            tsState.at = Date.now();
            tsState.pending = null;
            resolve(t);
          },
          "error-callback": function () {
            tsState.pending = null;
            resolve(null);
          },
          "timeout-callback": function () {
            tsState.pending = null;
            resolve(null);
          },
          "expired-callback": function () {
            tsState.token = null;
          }
        });
      });
    });
    return tsState.pending;
  }

  // --- Sesi challenge: cache token + cookie selama 4 menit ---
  var SESSION_TTL = 240000;
  var sessState = { token: null, exp: 0 };

  function getChallenge() {
    var now = Date.now();
    if (sessState.token && sessState.exp > now + 5000) {
      return Promise.resolve({ token: sessState.token });
    }
    return fetch(CF_CONFIG.workerUrl + "/api/challenge", { credentials: "include" })
      .then(function (r) {
        if (!r.ok) throw new Error("Server tidak merespons. Coba lagi nanti.");
        return r.json();
      })
      .then(function (ch) {
        if (!ch.token) throw new Error("Sesi akses tidak valid. Muat ulang halaman.");
        sessState.token = ch.token;
        sessState.exp = now + SESSION_TTL;
        return ch;
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
    return solveTurnstile().then(function (ts) {
      if (!ts) throw new Error("Gagal verifikasi manusia. Silakan muat ulang halaman.");
      return getChallenge()
        .then(function (ch) {
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
        });
    });
  };

  // --- Pre-solve di background segera setelah halaman dimuat ---
  if (CONFIGURED) {
    solveTurnstile();
  }
})();
