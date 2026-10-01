// Harness: menguji pencocokan Origin di worker/index.js tanpa
// menjalankan Worker sungguhan. Fokusnya allow-list origin, karena
// domain Vercel yang tidak terdaftar membuat browser hanya
// menampilkan "Failed to fetch" tanpa petunjuk lain.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync("worker/index.js", "utf8");
const toml = readFileSync("worker/wrangler.toml", "utf8");
const dbSrc = readFileSync("worker/db.js", "utf8");

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? " -> " + extra : "")); }
}

// --- Ambil fungsi pencocokan dari worker ---
const wanted = ["rawOrigin", "matchOrigin", "originAllowed", "corsFor"];
const parts = [];
for (const name of wanted) {
  const m = src.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n\\}"));
  if (!m) throw new Error("fungsi " + name + " tidak ditemukan di worker/index.js");
  parts.push(m[0]);
}
const allowedPatterns = src.match(/function allowedPatterns\([\s\S]*?\n\}/)[0];

const env = {
  ALLOWED_ORIGINS: toml.match(/ALLOWED_ORIGINS\s*=\s*"([^"]*)"/)[1],
};

const sandbox = { env, RegExp, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const api = vm.runInContext(
  parts.join("\n\n") + "\n\n" + allowedPatterns + "\n;({ matchOrigin, originAllowed, corsFor, allowedPatterns });",
  sandbox
);

console.log("\n=== ALLOWED_ORIGINS di wrangler.toml ===");
check("domain produksi Vercel terdaftar", api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "https://osissmanimori.vercel.app"));
check("preview acak Vercel tercakup wildcard", api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "https://osissmanimori-a1b2c3.vercel.app"));
check("github pages tetap tercakup", api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "https://suryaraehan.github.io"));
check("localhost tetap tercakup", api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "http://localhost:3000"));

console.log("\n=== wildcard tidak boleh terlalu longgar ===");
check("proyek Vercel lain DITOLAK", !api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "https://evil.vercel.app"));
check("prefix palsu ditolak", !api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "https://osissmanimoriX-a1.vercel.app"));
check("subdomain menipu ditolak", !api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "https://osissmanimori.vercel.app.evil.com"));
check("https://evil.com ditolak", !api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "https://evil.com"));
check("origin kosong ditolak", !api.matchOrigin(env.ALLOWED_ORIGINS.split(","), ""));
check("path pada origin yang sah tetap diterima", api.matchOrigin(env.ALLOWED_ORIGINS.split(","), "https://osissmanimori.vercel.app/drive.html"));

console.log("\n=== originAllowed memakai header yang sama untuk CORS ===");
{
  const req = { headers: { get: (k) => (k === "Origin" ? "https://osissmanimori.vercel.app" : null) } };
  check("originAllowed true untuk Vercel", api.originAllowed(env, req) === true);
  const bad = { headers: { get: (k) => (k === "Origin" ? "https://evil.example" : null) } };
  check("originAllowed false untuk domain asing", api.originAllowed(env, bad) === false);
  const cors = api.corsFor(env, req);
  check("corsFor memantulkan origin Vercel", cors["Access-Control-Allow-Origin"] === "https://osissmanimori.vercel.app", JSON.stringify(cors));
  const corsBad = api.corsFor(env, bad);
  check("corsFor kosong untuk domain asing", corsBad["Access-Control-Allow-Origin"] === "");
  check("Vary: Origin tetap ada", cors["Vary"] === "Origin");
}

console.log("\n=== DRIVE_DB tidak ada tautan my-drive ===");
{
  const sandbox2 = { console };
  sandbox2.globalThis = sandbox2;
  vm.createContext(sandbox2);
  const mod = vm.runInContext(dbSrc.replace(/export /g, "") + ";({ PPT_DB, DRIVE_DB });", sandbox2);
  const drive = mod.DRIVE_DB;
  check("DRIVE_DB tidak kosong", drive.length > 0, String(drive.length));
  const myDrive = drive.filter((d) => String(d.url || "").includes("my-drive"));
  check("tidak ada url my-drive", myDrive.length === 0, JSON.stringify(myDrive));
  const noUrl = drive.filter((d) => !d.url);
  check("semua entri punya url", noUrl.length === 0, JSON.stringify(noUrl));
  const dup = drive.map((d) => d.name).filter((n, i, a) => a.indexOf(n) !== i);
  check("tidak ada nama duplikat", dup.length === 0, JSON.stringify(dup));
}

console.log(`\n=== RINGKASAN: ${pass} lulus, ${fail} gagal ===\n`);
process.exit(fail === 0 ? 0 : 1);
