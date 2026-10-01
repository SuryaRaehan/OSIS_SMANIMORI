// Harness: memastikan script.js menyembunyikan tombol Explore dengan
// benar saat data-video-src kosong, popup tetap bekerja saat diisi, dan
// berkas video yang ditunjuk benar-benar ada serta muat di GitHub.
import { readFileSync, statSync, existsSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("index.html", "utf8");
const script = readFileSync("script.js", "utf8");
const css = readFileSync("style.css", "utf8");

// Batas keras GitHub: file lebih besar dari ini ditolak saat push.
const GITHUB_MAX = 100 * 1024 * 1024;

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? " -> " + extra : "")); }
}

// Ambil blok script popup video saja, dari komentar penanda sampai
// listener tombol Explore. Regex dibuat tahan CRLF dan LF karena
// checkout di Windows bisa mengganti akhir baris.
const m = script.match(/\/\/ POPUP VIDEO EXPLORE[\s\S]*?\}\);[ \t]*\r?\n/);
if (!m) throw new Error("blok popup video tidak ditemukan di script.js");
const block = m[0];

function run(dataVideoSrc) {
  const el = (extra = {}) => ({
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      contains(c) { return this._s.has(c); },
    },
    attrs: {},
    dataset: { videoSrc: dataVideoSrc },
    hidden: false,
    style: {},
    listeners: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); },
    querySelector(sel) {
      if (sel === ".video-popup-video") return popupVideo;
      if (sel === ".video-popup-card") return popupCard;
      return null;
    },
    play() { return { catch() {} }; },
    pause() {},
    load() {},
  });

  const arrowPill = el();
  const popupVideo = el();
  const popupCard = el();
  const videoPopup = el();

  const documentStub = {
    getElementById: (id) => (id === "videoPopup" ? videoPopup : null),
    querySelector: (sel) => (sel === ".video-popup-video" ? popupVideo : sel === ".subline .arrow-pill" ? arrowPill : sel === ".video-popup-card" ? popupCard : null),
    querySelectorAll: () => [],
    addEventListener() {},
    body: { style: {} },
  };

  const sandbox = { window: { innerWidth: 1280, innerHeight: 800, addEventListener() {} }, document: documentStub, console, Math, String, setTimeout() {} };
  sandbox.window.innerWidth = 1280;
  vm.createContext(sandbox);
  vm.runInContext(block, sandbox);

  return { arrowPill, popupVideo, popupCard, videoPopup };
}

console.log("\n== data-video-src kosong ==");
{
  const { arrowPill, popupVideo, videoPopup } = run("");
  check("tombol Explore disembunyikan", arrowPill.hidden === true);
  check("popup tidak dibuka diam-diam", !videoPopup.classList.contains("open"));
  check("tidak ada src yang dipasang", !("src" in popupVideo.attrs));
}

console.log("\n== data-video-src terisi (video tersedia) ==");
{
  const { arrowPill, popupVideo, videoPopup } = run("asset/video/profil-720p.mp4");
  check("tombol Explore tetap terlihat", arrowPill.hidden === false);
  check("error handler terpasang (popup menutup sendiri saat video gagal)", (popupVideo.listeners.error || []).length > 0);
}

console.log("\n== CSS tidak menimpa [hidden] ==");
check("ada aturan .subline .arrow-pill[hidden] { display: none }",
  /\.subline \.arrow-pill\[hidden\]\s*\{\s*display:\s*none/s.test(css));
check("display:inline-flex ada di .arrow-pill (besar pasti menimpa hidden)", /\.subline \.arrow-pill\s*\{[^}]*display:\s*inline-flex/s.test(css));

console.log("\n== index.html ==");
const srcMatch = html.match(/data-video-src="([^"]*)"/);
const src = srcMatch ? srcMatch[1] : "";
check("data-video-src terisi", src.length > 0, "kosong");
check("menunjuk berkas lokal, bukan URL luar", /^asset\/video\/[\w.-]+$/.test(src), src);
// Master punya nama "PROFIL SMA N 1 WUKIRSARI.mp4" dengan spasi dan
// tidak ditandai '-720p'. Nama kompresnya profil-720p.mp4.
check("bukan master 444 MB (nama master mengandung spasi)",
  !/^asset\/video\/PROFIL SMA N 1 WUKIRSARI\.mp4$/i.test(src), src);
check("nama file menandai versi kompres", /720p/i.test(src), src);
check("ada catatan kenapa video dikompres", /100\s*MB/.test(html) && /kompres/i.test(html));

console.log("\n== berkas video yang ditunjuk ==");
check(`berkas ${src} ada di disk`, existsSync(src), "tidak ditemukan");
if (existsSync(src)) {
  const bytes = statSync(src).size;
  const mib = bytes / 1024 / 1024;
  check(`ukuran ${mib.toFixed(1)} MiB di bawah batas GitHub 100 MiB`, bytes < GITHUB_MAX,
    `${(bytes / 1024 / 1024).toFixed(1)} MiB akan ditolak saat push`);
  check("ukuran tidak nol", bytes > 0);
}

console.log(`\n=== ${pass} lulus, ${fail} gagal ===\n`);
process.exit(fail === 0 ? 0 : 1);
