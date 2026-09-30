// ============================================================
// API LAYER: sesi challenge (HMAC + cookie) -> data
// ============================================================
(function () {
  var CONFIGURED = CF_CONFIG.workerUrl.indexOf("YOUR-WORKER") === -1;

  // --- Sesi challenge: cache token + cookie selama 4 menit ---
  var SESSION_TTL = 240000;
  var sessState = { token: null, exp: 0 };

  // 404 di /api/challenge berarti workerUrl salah ketik atau Worker
  // sudah dihapus, bukan server yang sedang lambat.
  var CHALLENGE_404 =
    "Alamat Worker di config.js salah, atau Worker sudah dihapus.";

  function getChallenge() {
    var now = Date.now();
    if (sessState.token && sessState.exp > now + 5000) {
      return Promise.resolve({ token: sessState.token });
    }
    return fetch(CF_CONFIG.workerUrl + "/api/challenge", { credentials: "include" })
      .then(function (r) {
        if (r.status === 404) throw new Error(CHALLENGE_404);
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

  // 404 berarti Worker yang berjalan masih versi lama, jadi rute ini
  // belum ada. Pesan khusus jauh lebih berguna daripada "Server
  // bermasalah", yang membuat orang menyalahkan Google Sheet.
  var NOT_DEPLOYED =
    "Worker belum punya fitur ini. Admin perlu menjalankan wrangler deploy.";

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
        if (res.status === 404) throw new Error(NOT_DEPLOYED);
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
          if (res.status === 404) throw new Error(NOT_DEPLOYED);
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
          if (res.status === 404) throw new Error(NOT_DEPLOYED);
          if (!res.ok) {
            throw new Error(WRITE_MESSAGES[data.error] || "Server bermasalah. Coba lagi nanti.");
          }
          return data;
        });
      });
  };
})();
