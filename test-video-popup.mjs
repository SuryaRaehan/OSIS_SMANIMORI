// Harness: memastikan script.js menyembunyikan tombol Explore dengan
// benar saat data-video-src kosong, dan popup tetap bekerja saat diisi.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("index.html", "utf8");
const script = readFileSync("script.js", "utf8");
const css = readFileSync("style.css", "utf8");

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? " -> " + extra : "")); }
}

// Ambil blok script popup video saja
const m = script.match(/\/\/ POPUP VIDEO EXPLORE[\s\S]*?\n\}\);\n/);
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
  const { arrowPill, popupVideo, videoPopup } = run("https://www.youtube.com/watch?v=abc");
  check("tombol Explore tetap terlihat", arrowPill.hidden === false);
  check("error handler terpasang (popup menutup sendiri saat video gagal)", (popupVideo.listeners.error || []).length > 0);
}

console.log("\n== CSS tidak menimpa [hidden] ==");
check("ada aturan .subline .arrow-pill[hidden] { display: none }",
  /\.subline \.arrow-pill\[hidden\]\s*\{\s*display:\s*none/s.test(css));
check("display:inline-flex ada di .arrow-pill (besar pasti menimpa hidden)", /\.subline \.arrow-pill\s*\{[^}]*display:\s*inline-flex/s.test(css));

console.log("\n== index.html ==");
check("data-video-src dikosongkan", html.includes('data-video-src=""'));
check("tidak ada referensi .mp4 lokal lagi", !/data-video-src="[^"]*\.mp4"/.test(html));
check("ada catatan cara menghidupkan lagi", html.includes("YouTube"));

console.log(`\n=== ${pass} lulus, ${fail} gagal ===\n`);
process.exit(fail === 0 ? 0 : 1);
