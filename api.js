// ============================================================
// API LAYER: sesi challenge (HMAC + cookie) -> data
// ============================================================
(function () {
  var CONFIGURED = CF_CONFIG.workerUrl.indexOf("YOUR-WORKER") === -1;

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
          "Konfigurasi belum lengkap. Admin harus mengisi workerUrl di config.js."
        )
      );
    }
    return getChallenge()
      .then(function (ch) {
        return fetch(CF_CONFIG.workerUrl + "/api/" + path, {
          credentials: "include",
          headers: { "x-db-token": ch.token }
        });
      })
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("Akses ditolak sistem keamanan. Muat ulang halaman untuk mencoba lagi.");
        }
        if (!res.ok) throw new Error("Server bermasalah. Coba lagi nanti.");
        return res.json();
      });
  };

  // --- Tulis data (dipakai halaman admin) ---
  var WRITE_MESSAGES = {
    forbidden: "Token admin salah.",
    bad_request: "Data yang dikirim tidak valid.",
    too_many: "Terlalu banyak nama dalam sekali kirim.",
    unavailable: "Server sedang tidak bisa menghubungi spreadsheet. Coba lagi."
  };

  window.dbPost = function (path, body, extraHeaders) {
    if (!CONFIGURED) {
      return Promise.reject(
        new Error(
          "Konfigurasi belum lengkap. Admin harus mengisi workerUrl di config.js."
        )
      );
    }
    return getChallenge()
      .then(function (ch) {
        var headers = { "content-type": "application/json", "x-db-token": ch.token };
        Object.keys(extraHeaders || {}).forEach(function (k) {
          headers[k] = extraHeaders[k];
        });
        return fetch(CF_CONFIG.workerUrl + "/api/" + path, {
          method: "POST",
          credentials: "include",
          headers: headers,
          body: JSON.stringify(body)
        });
      })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          if (res.status === 401) {
            throw new Error("Akses ditolak sistem keamanan. Muat ulang halaman untuk mencoba lagi.");
          }
          if (!res.ok) {
            throw new Error(WRITE_MESSAGES[data.error] || "Server bermasalah. Coba lagi nanti.");
          }
          return data;
        });
      });
  };

  // --- Baca daftar lengkap, hanya untuk admin ---
  window.dbAdminGet = function (path, adminToken) {
    if (!CONFIGURED) {
      return Promise.reject(
        new Error(
          "Konfigurasi belum lengkap. Admin harus mengisi workerUrl di config.js."
        )
      );
    }
    return getChallenge()
      .then(function (ch) {
        return fetch(CF_CONFIG.workerUrl + "/api/" + path, {
          credentials: "include",
          headers: { "x-db-token": ch.token, "x-admin-token": adminToken }
        });
      })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          if (res.status === 401) {
            throw new Error("Akses ditolak sistem keamanan. Muat ulang halaman untuk mencoba lagi.");
          }
          if (res.status === 403) throw new Error("Token admin salah.");
          if (!res.ok) {
            throw new Error(WRITE_MESSAGES[data.error] || "Server bermasalah. Coba lagi nanti.");
          }
          return data;
        });
      });
  };
})();
