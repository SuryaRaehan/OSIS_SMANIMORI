// ============================================================
// GOOGLE APPS SCRIPT — sumber data daftar lolos seleksi OSIS
// ------------------------------------------------------------
// Cara pasang:
//   1. Buka Google Sheet daftar peserta Anda.
//   2. Menu "Extensions" -> "Apps Script".
//   3. Hapus isi editor, tempel seluruh kode ini, lalu Save.
//   4. Klik ikon gear "Project Settings" > tab "Script Properties",
//     lalu tambahkan satu baris:
//        Key   : SHEET_WRITE_TOKEN
//        Value : token acak panjang milik Anda sendiri
//     Token SENGAJA TIDAK ditulis di file ini. Karena itu file ini
//     aman di-commit dan aman dibagikan ke siapa pun tanpa
//     membocorkan apa pun. Nilai token yang sama juga disimpan
//     sebagai Worker secret bernama ADMIN_TOKEN.
//   5. Klik "Deploy" -> "New deployment" -> type "Web app".
//      Execute as  : Me
//      Who has access: Anyone
//   6. Klik Deploy, lalu salin URL yang berakhiran /exec.
//      URL itu WAJIB rahasia: siapa pun yang memilikinya bisa
//      membaca dan menulis daftar. Jangan pernah di-commit,
//      jangan ditaruh di file frontend, hanya di Worker secret.
//
// Catatan: script ini hanya membaca sheet PERTAMA di spreadsheet.
// Kalau nanti Anda menambah sheet lain, pastikan daftar nama
// tetap berada di sheet pertama.
// ============================================================

var TOKEN_PROP = "SHEET_WRITE_TOKEN";

var FIRST_DATA_ROW = 5; // baris pertama nama (baris 4 = header NAMA)
var NAME_HEADER = "NAMA";

function writeToken_() {
  return String(
    PropertiesService.getScriptProperties().getProperty(TOKEN_PROP) || ""
  ).trim();
}

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ambil semua nama dari kolom B, lewati header dan baris kosong.
function readNames() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 1) return [];

  var values = sh.getRange(1, 2, last, 1).getDisplayValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var s = String(values[i][0] || "").trim();
    if (!s) continue;
    if (s.toUpperCase() === NAME_HEADER) continue;
    out.push(s);
  }
  return out;
}

function doGet() {
  return json_({ ok: true, names: readNames() });
}

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) || "");
  } catch (err) {
    return json_({ ok: false, error: "bad_json" });
  }

  // Dicek lebih dulu supaya kalau Script Properties belum diisi,
  // pesannya langsung menunjuk masalahnya, bukan sekadar "bad_token".
  var expected = writeToken_();
  if (!expected) return json_({ ok: false, error: "no_token_configured" });

  if (!payload || payload.token !== expected) {
    return json_({ ok: false, error: "bad_token" });
  }
  if (!Array.isArray(payload.names)) {
    return json_({ ok: false, error: "bad_request" });
  }

  var clean = [];
  var seen = {};
  for (var i = 0; i < payload.names.length; i++) {
    var s = String(payload.names[i] == null ? "" : payload.names[i])
      .trim()
      .replace(/\s+/g, " ");
    if (!s) continue;
    var key = s.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
    if (!key || seen[key]) continue;
    seen[key] = true;
    clean.push(s);
  }

  var sh = sheet_();
  var last = sh.getLastRow();
  if (last >= FIRST_DATA_ROW) {
    sh.getRange(FIRST_DATA_ROW, 2, last - FIRST_DATA_ROW + 1, 1).clearContent();
  }
  if (clean.length) {
    sh.getRange(FIRST_DATA_ROW, 2, clean.length, 1)
      .setValues(clean.map(function (n) { return [n]; }));
    sh.getRange(FIRST_DATA_ROW, 1, clean.length, 1)
      .setValues(clean.map(function (_, idx) { return [idx + 1]; }));
  }

  return json_({ ok: true, count: clean.length });
}
