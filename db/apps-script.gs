// ============================================================
// GOOGLE APPS SCRIPT — sumber data daftar lolos seleksi OSIS
// ------------------------------------------------------------
// Cara pasang:
//   1. Buka Google Sheet daftar peserta Anda.
//   2. Menu "Extensions" -> "Apps Script".
//   3. Hapus isi editor, tempel seluruh kode ini, lalu Save.
//   4. Ganti SHEET_WRITE_TOKEN di bawah dengan token rahasia
//     milik Anda (acak, panjang, jangan dipakai di tempat lain).
//   5. Klik "Deploy" -> "New deployment" -> type "Web app".
//      Execute as  : Me
//      Who has access: Anyone
//   6. Klik Deploy, lalu salin URL yang berakhiran /exec.
//      URL itu WAJIB rahasia: siapa pun yang memilikinya bisa
//      membaca dan menulis daftar. Jangan pernah di-commit,
//      jangan ditaruh di file frontend, hanya di Worker secret.
// ============================================================

var SHEET_WRITE_TOKEN = "GANTI_DENGAN_TOKEN_RAHASIA_ANDA";

var FIRST_DATA_ROW = 5; // baris pertama nama (baris 4 = header NAMA)
var NAME_HEADER = "NAMA";

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

  if (!payload || payload.token !== SHEET_WRITE_TOKEN) {
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
