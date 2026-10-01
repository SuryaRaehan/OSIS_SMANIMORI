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

  // Browser menyembunyikan alasan sebenarnya ketika fetch ditolak
  // CORS: pesannya hanya "Failed to fetch". Yang paling sering
  // jadi penyebab di situs ini: domain Vercel belum masuk
  // ALLOWED_ORIGINS milik Worker.
  var NETWORK_MSG =
    "Gagal menghubungi server data (" + CF_CONFIG.workerUrl + "). " +
    "Kalau domain ini baru dipindah ke Vercel, minta admin menambahkan " +
    "domain Vercel ke ALLOWED_ORIGINS di Worker lalu deploy ulang.";

  function isNetworkFail(err) {
    return err instanceof TypeError || (err && /failed to fetch|networkerror|load failed/i.test(err.message || ""));
  }

  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  // Satu kali coba ulang: sebagian kegagalan CORS bersifat sementara
  // karena cookie sesi belum tersimpan setelah reload pertama.
  function withRetry(run, attempts) {
    return Promise.resolve()
      .then(run)
      .catch(function (err) {
        if (attempts <= 1) throw err;
        return wait(600).then(run);
      });
  }

  function getChallenge() {
    var now = Date.now();
    if (sessState.token && sessState.exp > now + 5000) {
      return Promise.resolve({ token: sessState.token });
    }
    return withRetry(function () {
      return fetch(CF_CONFIG.workerUrl + "/api/challenge", { credentials: "include" })
        .then(function (r) {
          if (r.status === 404) throw new Error(CHALLENGE_404);
          if (r.status === 403) {
            throw new Error(
              "Domain ini belum diizinkan Worker. Minta admin menambahkan " +
              "alamat situs ini ke ALLOWED_ORIGINS lalu deploy ulang Worker."
            );
          }
          if (!r.ok) throw new Error("Server tidak merespons. Coba lagi nanti.");
          return r.json();
        })
        .catch(function (err) {
          if (isNetworkFail(err)) throw new Error(NETWORK_MSG);
          throw err;
        });
    }, 2)
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

  var ORIGIN_MSG =
    "Domain ini belum diizinkan Worker. Minta admin menambahkan alamat " +
    "situs ini ke ALLOWED_ORIGINS lalu jalankan wrangler deploy.";

  function readJson(res) {
    return res.json().catch(function () {
      return {};
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
      .catch(function (err) {
        if (isNetworkFail(err)) throw new Error(NETWORK_MSG);
        throw err;
      })
      .then(function (res) {
        return readJson(res).then(function (data) {
          if (data.error === "origin_not_allowed") throw new Error(ORIGIN_MSG);
          if (res.status === 401 || res.status === 403) {
            throw new Error("Akses ditolak sistem keamanan. Muat ulang halaman untuk mencoba lagi.");
          }
          if (res.status === 404) throw new Error(NOT_DEPLOYED);
          if (!res.ok) throw new Error("Server bermasalah. Coba lagi nanti.");
          return data;
        });
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
      .catch(function (err) {
        if (isNetworkFail(err)) throw new Error(NETWORK_MSG);
        throw err;
      })
      .then(function (res) {
        return readJson(res).then(function (data) {
          if (data.error === "origin_not_allowed") throw new Error(ORIGIN_MSG);
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
      .catch(function (err) {
        if (isNetworkFail(err)) throw new Error(NETWORK_MSG);
        throw err;
      })
      .then(function (res) {
        return readJson(res).then(function (data) {
          if (data.error === "origin_not_allowed") throw new Error(ORIGIN_MSG);
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
