// Harness: menguji logika cek nama + aturan tombol WA di pengumuman.html
// dengan DOM minimal, tanpa browser sungguhan.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("pengumuman.html", "utf8");
const dataSrc = readFileSync("pengumuman-data.js", "utf8");

// --- Ambil skrip inline terakhir (blok cek nama) ---
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length === 0) throw new Error("tidak ada skrip inline ditemukan");
const inline = scripts[scripts.length - 1][1];

// --- DOM minimal: cukup untuk event listener + DOM yang disentuh kode ---
function makeEl(id) {
  const el = {
    id,
    value: "",
    textContent: "",
    placeholder: "",
    className: "",
    attrs: {},
    children: [],
    style: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    listeners: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    removeAttribute(k) { delete this.attrs[k]; },
    hasAttribute(k) { return k in this.attrs; },
    // Kode halaman menulis el.href = ... lewat properti, bukan
    // setAttribute, jadi href harus dicerminkan ke attrs supaya
    // getAttribute("href") ikut berubah.
    get href() { return this.attrs.href; },
    set href(v) {
      if (v === undefined || v === null) delete this.attrs.href;
      else this.attrs.href = String(v);
    },
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); },
    appendChild(c) { this.children.push(c); },
    focus() {},
    querySelectorAll() { return []; },
  };
  return el;
}

const els = {};
const getEl = (id) => (els[id] ||= makeEl(id));
const results = {
  hasilModal: getEl("hasilModal"),
  hasilCard: getEl("hasilCard"),
  hasilTag: getEl("hasilTag"),
  hasilTitle: getEl("hasilTitle"),
  hasilName: getEl("hasilName"),
  hasilSub: getEl("hasilSub"),
  hasilNote: getEl("hasilNote"),
  hasilWa: getEl("hasilWa"),
  confetti: getEl("confetti"),
  namaInput: getEl("namaInput"),
  cekBtn: getEl("cekBtn"),
  navToggle: getEl("navToggle"),
  navLinks: getEl("navLinks"),
  joinBtn: getEl("joinBtn"),
  joinDropdown: getEl("joinDropdown"),
};
// Tombol WA dimulai dengan atribut hidden + data-wa, seperti di HTML asli.
results.hasilWa.setAttribute("hidden", "");
{
  const m = html.match(/id="hasilWa"[\s\S]*?data-wa="([^"]*)"/);
  if (!m) throw new Error("atribut data-wa tidak ditemukan di pengumuman.html");
  results.hasilWa.setAttribute("data-wa", m[1]);
}

const documentStub = {
  getElementById: (id) => els[id] || null,
  querySelectorAll: () => [],
  createElement: () => makeEl("piece"),
  addEventListener() {},
  body: { style: {} },
};

const sandbox = {
  window: {},
  document: documentStub,
  console,
  setTimeout() {},
  clearTimeout() {},
  Math,
  Date,
  String,
  Array,
  Object,
  JSON,
  document: documentStub,
};
sandbox.window = sandbox;
sandbox.matchMedia = () => ({ matches: false });
sandbox.addEventListener = () => {};
vm.createContext(sandbox);

// Muat daftar nama
vm.runInContext(dataSrc, sandbox);
// Muat logika halaman
vm.runInContext(inline, sandbox);

const PENGUMUMAN = sandbox.window.PENGUMUMAN;
const cekBtn = results.cekBtn;

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? " -> " + extra : "")); }
}

// Status modal dikembalikan ke tertutup tiap klik supaya pengujian
// input kosong tidak tertinggal-jejak dari klik sebelumnya.
function clickWith(input) {
  results.hasilModal.classList.remove("open");
  results.namaInput.value = input;
  cekBtn.listeners.click.forEach((fn) => fn());
}

console.log("\n== isi daftar ==");
check("daftar berisi 38 nama", PENGUMUMAN.length === 38, "panjang " + PENGUMUMAN.length);
check("tidak ada nama kosong", PENGUMUMAN.every((n) => String(n).trim() !== ""));
check("tidak ada nama duplikat", new Set(PENGUMUMAN.map((n) => n.toLowerCase())).size === PENGUMUMAN.length);

console.log("\n== nama yang ADA di daftar -> LOLOS + link WA ==");
let cacahLolos = 0;
const gagalLolos = [];
for (const nama of PENGUMUMAN) {
  clickWith(nama);
  const tag = results.hasilTag.textContent;
  const adaLink = !!results.hasilWa.getAttribute("href");
  const tidakHidden = !results.hasilWa.hasAttribute("hidden");
  if (tag === "LOLOS" && adaLink && tidakHidden) cacahLolos++;
  else gagalLolos.push(`"${nama}" tag=${tag} href=${adaLink} hidden=${results.hasilWa.hasAttribute("hidden")}`);
}
check(`semua ${PENGUMUMAN.length} nama mendapat LOLOS + link WA`, cacahLolos === PENGUMUMAN.length, `${cacahLolos}/${PENGUMUMAN.length} lolos. Gagal: ${gagalLolos.join(" | ")}`);

console.log("\n== toleransi ejaan ==");
const tol = [
  ["  andreas   davioso  ", "spasi berlebih + huruf kecil"],
  ["ANDREAS DAVIOSO", "huruf besar semua"],
  ["Andreas\tDavioso", "tab sebagai spasi"],
];
for (const [input, ket] of tol) {
  clickWith(input);
  check(`toleran: ${ket}`, results.hasilTag.textContent === "LOLOS", results.hasilTag.textContent);
}

console.log("\n== nama DI LUAR daftar -> TIDAK LOLOS, TANPA link WA ==");
const asing = [
  "BUDI SANTOSO",
  "Siti Amelia",
  "Zulfikar",
  "Andreas",
  "Davioso",
  "Andreas Daviosoa",
  "a",
  "12345",
];
for (const n of asing) {
  clickWith(n);
  const tag = results.hasilTag.textContent;
  const adaHref = results.hasilWa.hasAttribute("href");
  const hidden = results.hasilWa.hasAttribute("hidden");
  check(`"${n}" ditolak tanpa link`, tag === "TIDAK LOLOS" && !adaHref && hidden, `tag=${tag} href=${adaHref} hidden=${hidden}`);
}

console.log("\n== input kosong / hanya spasi ==");
for (const n of ["", "   ", "\t\n"]) {
  clickWith(n);
  check(`"${n.replace(/\n/g, "\\n")}" tidak buka modal`, !results.hasilModal.classList.contains("open"));
}

console.log("\n== href WA persis dan aman ==");
clickWith("Andreas Davioso");
const href = results.hasilWa.getAttribute("href");
check("href adalah link grup yang benar", href === "https://chat.whatsapp.com/DudpRuFCZsH7dPGhU48pPi", href);
check("href pakai https", /^https:\/\//.test(href));
check("tanpa parameter tracking", !/[?&](s|utm_|igsh)=/.test(href), href);
check("target=_blank ada di HTML", html.includes('target="_blank"'));
check("rel noopener ada di HTML", /rel="noopener noreferrer"/.test(html));

console.log("\n== transisi LOLOS -> TIDAK LOLOS melepas link ==");
clickWith("Andreas Davioso");
check("sebelum: punya href", results.hasilWa.hasAttribute("href"));
clickWith("BUDI SANTOSO");
check("sesudah: href dilepas", !results.hasilWa.hasAttribute("href"));
check("sesudah: disembunyikan", results.hasilWa.hasAttribute("hidden"));
clickWith("BUDI SANTOSO");
check("cek ulang yang gagal tetap tanpa link", !results.hasilWa.hasAttribute("href"));

console.log("\n== halaman tidak lagi menyentuh server ==");
check("tidak memanggil dbRequest", !html.includes("dbRequest"));
check("tidak memuat api.js", !html.includes('src="api.js"'));
check("tidak memuat config.js", !html.includes('src="config.js"'));
check("memuat pengumuman-data.js", html.includes('src="pengumuman-data.js"'));
check("elemen cekNote dihapus", !html.includes("cekNote"));
check("tidak ada .then( di logika cek", !/dbRequest[\s\S]{0,80}then/.test(inline));

console.log(`\n=== ${pass} lulus, ${fail} gagal ===\n`);
process.exit(fail === 0 ? 0 : 1);
