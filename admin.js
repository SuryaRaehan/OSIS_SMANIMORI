// ============================================================
// ADMIN DAFTAR LOLOS — baca/tulis daftar lewat Worker
// ============================================================
// Token disimpan di sessionStorage saja (hilang saat tab ditutup),
// bukan localStorage, supaya tidak tertinggal di komputer umum.
(function () {
  var TOKEN_KEY = "osisAdminToken";
  var TITLE = "DAFTAR LOLOS SLEKSI OSIS";
  var PERIOD = "PERIODE 2026-2027";
  var NAME_HEADER = "NAMA";

  var gate = document.getElementById("gate");
  var panel = document.getElementById("panel");
  var tokenInput = document.getElementById("tokenInput");
  var gateBtn = document.getElementById("gateBtn");
  var gateNote = document.getElementById("gateNote");
  var namesInput = document.getElementById("namesInput");
  var saveBtn = document.getElementById("saveBtn");
  var reloadBtn = document.getElementById("reloadBtn");
  var exportBtn = document.getElementById("exportBtn");
  var fileInput = document.getElementById("fileInput");
  var panelNote = document.getElementById("panelNote");
  var countNote = document.getElementById("countNote");

  var token = "";
  var loaded = [];

  function say(el, msg, kind) {
    el.textContent = msg;
    el.className = "note" + (kind ? " " + kind : "");
  }

  function lines(value) {
    var seen = {};
    var out = [];
    String(value || "").split(/\r?\n/).forEach(function (raw) {
      var s = raw.trim().replace(/\s+/g, " ");
      if (!s) return;
      var key = s
        .normalize("NFKC")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(s);
    });
    return out;
  }

  function updateCount() {
    var n = lines(namesInput.value).length;
    countNote.textContent = n
      ? "Siap dikirim: " + n + " nama."
      : "Belum ada nama.";
    countNote.className = "note count";
  }

  function busy(on) {
    gateBtn.disabled = on;
    saveBtn.disabled = on;
    reloadBtn.disabled = on;
    exportBtn.disabled = on;
  }

  function showPanel() {
    gate.classList.add("hidden");
    panel.classList.remove("hidden");
  }

  function load() {
    say(panelNote, "Memuat daftar…", "");
    return dbAdminGet("kelulusan/list", token)
      .then(function (res) {
        loaded = res.names || [];
        namesInput.value = loaded.join("\n");
        showPanel();
        updateCount();
        say(panelNote, "Daftar termuat. " + loaded.length + " nama.", "ok");
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : "Gagal memuat daftar.";
        if (/Token admin salah/.test(msg)) {
          sessionStorage.removeItem(TOKEN_KEY);
          gate.classList.remove("hidden");
          panel.classList.add("hidden");
          say(gateNote, msg, "err");
        } else {
          say(panelNote, msg, "err");
        }
      });
  }

  gateBtn.addEventListener("click", function () {
    token = tokenInput.value.trim();
    if (!token) {
      say(gateNote, "Isi token admin dulu.", "err");
      return;
    }
    say(gateNote, "Memeriksa token…", "");
    busy(true);
    load().then(function () {
      busy(false);
      gateBtn.disabled = false;
    });
  });

  tokenInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") gateBtn.click();
  });

  saveBtn.addEventListener("click", function () {
    var names = lines(namesInput.value);
    if (!names.length) {
      say(panelNote, "Tidak ada nama untuk disimpan.", "err");
      return;
    }
    if (
      !confirm(
        "Timpa daftar di spreadsheet dengan " + names.length + " nama?\n\n" +
        "Seluruh nama yang ada sekarang akan diganti."
      )
    ) {
      return;
    }
    say(panelNote, "Menyimpan…", "");
    busy(true);
    dbPost("kelulusan/import", { names: names }, { "x-admin-token": token })
      .then(function (res) {
        namesInput.value = (res.count ? names.slice(0, res.count) : []).join("\n");
        updateCount();
        say(panelNote, "Tersimpan. " + res.count + " nama aktif di situs.", "ok");
        sessionStorage.setItem(TOKEN_KEY, token);
      })
      .catch(function (err) {
        say(panelNote, err && err.message ? err.message : "Gagal menyimpan.", "err");
      })
      .then(function () { busy(false); });
  });

  reloadBtn.addEventListener("click", function () {
    busy(true);
    load().then(function () { busy(false); });
  });

  // --- Ekspor .xlsx dengan bentuk yang sama seperti template ---
  exportBtn.addEventListener("click", function () {
    var names = lines(namesInput.value);
    if (!names.length) {
      say(panelNote, "Tidak ada nama untuk diunduh.", "err");
      return;
    }
    var rows = [[TITLE], [PERIOD], [], ["NO", NAME_HEADER]];
    names.forEach(function (n, i) { rows.push([i + 1, n]); });

    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 55 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    XLSX.writeFile(wb, "DAFTAR PESERTA LOLOS SELEKSI OSIS.xlsx");
    say(panelNote, "File .xlsx diunduh (" + names.length + " nama).", "ok");
  });

  // --- Impor .xlsx: ambil kolom B, lewati header dan baris kosong ---
  fileInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    say(panelNote, "Membaca " + file.name + "…", "");

    var reader = new FileReader();
    reader.onerror = function () {
      say(panelNote, "Gagal membaca file.", "err");
    };
    reader.onload = function (ev) {
      var names = [];
      try {
        var wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        rows.forEach(function (r) {
          var cell = r[1];
          var s = cell == null ? "" : String(cell).trim();
          if (!s) return;
          if (s.toUpperCase() === NAME_HEADER) return;
          names.push(s);
        });
      } catch (err) {
        say(panelNote, "File tidak bisa dibaca. Pastikan format .xlsx benar.", "err");
        return;
      }
      var clean = lines(names.join("\n"));
      if (!clean.length) {
        say(panelNote, "Tidak ada nama ditemukan di kolom B.", "err");
        return;
      }
      namesInput.value = clean.join("\n");
      updateCount();
      say(
        panelNote,
        clean.length + " nama dimuat dari file. Klik \"Simpan ke Spreadsheet\" untuk menerapkan.",
        "ok"
      );
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  });

  namesInput.addEventListener("input", updateCount);

  // Kalau token masih ada di tab ini, langsung coba buka.
  var saved = "";
  try { saved = sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { /* abaikan */ }
  if (saved) {
    token = saved;
    busy(true);
    load().then(function () { busy(false); gateBtn.disabled = false; });
  }
})();
