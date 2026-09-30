// Harness: menguji jalur error api.js dengan fetch & CF_CONFIG dipalsukan.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync("api.js", "utf8");
const html = readFileSync("pengumuman.html", "utf8");

function makeSandbox(responses) {
  const calls = [];
  const sandbox = {
    CF_CONFIG: { workerUrl: "https://example.workers.dev" },
    console,
    Date,
    Promise,
    Object,
    Array,
    String,
    Error,
    JSON,
    setTimeout,
    fetch: (url, opts) => {
      calls.push({ url, opts });
      const raw = String(url);
      const path = raw.replace(/^https?:\/\/[^/]+/, "").split("?")[0] || "/";
      const entry = responses[path] || responses["*"];
      const res = typeof entry === "function" ? entry(url, opts) : entry;
      if (res instanceof Error) return Promise.reject(res);
      return Promise.resolve({
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        json: () => Promise.resolve(res.body || {}),
      });
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { sandbox, calls };
}

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra ? " -> " + extra : "")); }
}

async function expectError(name, fn, wanted) {
  try {
    await fn();
    check(name, false, "tidak melempar error");
  } catch (e) {
    const got = e.message;
    const ok = wanted instanceof RegExp ? wanted.test(got) : got === wanted;
    check(name, ok, ok ? "" : `dapat: "${got}" | harap: ${wanted}`);
    // tidak boleh ada kata "lagi" dobel
    const doubled = (got.match(/Coba lagi/g) || []).length > 1;
    check(name + " | tidak ada 'Coba lagi' ganda", !doubled, got);
  }
}

console.log("\n=== dbRequest (GET /api/kelulusan) ===");
await expectError(
  "404 -> pesan wrangler deploy, bukan 'Server bermasalah'",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan": { status: 404, body: { error: "not_found" } } });
    return sandbox.dbRequest("kelulusan?nama=BUDI");
  },
  /wrangler deploy/
);
await expectError(
  "401 -> 'Akses ditolak sistem keamanan'",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan": { status: 401, body: {} } });
    return sandbox.dbRequest("kelulusan?nama=BUDI");
  },
  "Akses ditolak sistem keamanan. Muat ulang halaman untuk mencoba lagi."
);
await expectError(
  "500 -> 'Server bermasalah'",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan": { status: 500, body: {} } });
    return sandbox.dbRequest("kelulusan?nama=BUDI");
  },
  "Server bermasalah. Coba lagi nanti."
);
await expectError(
  "challenge 404 -> pesan workerUrl salah, bukan 'tidak merespons'",
  () => {
    const { sandbox } = makeSandbox({ "*": { status: 404, body: {} } });
    return sandbox.dbRequest("kelulusan?nama=BUDI");
  },
  "Alamat Worker di config.js salah, atau Worker sudah dihapus."
);
await expectError(
  "challenge 500 -> 'Server tidak merespons'",
  () => {
    const { sandbox } = makeSandbox({ "*": { status: 500, body: {} } });
    return sandbox.dbRequest("kelulusan?nama=BUDI");
  },
  "Server tidak merespons. Coba lagi nanti."
);

console.log("\n=== dbPost (POST /api/kelulusan/import) ===");
await expectError(
  "404 -> pesan wrangler deploy",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan/import": { status: 404, body: { error: "not_found" } } });
    return sandbox.dbPost("kelulusan/import", { names: [] });
  },
  /wrangler deploy/
);
await expectError(
  "403 -> 'Token admin salah'",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan/import": { status: 403, body: { error: "forbidden" } } });
    return sandbox.dbPost("kelulusan/import", { names: [] });
  },
  "Token admin salah."
);
await expectError(
  "413 -> 'Terlalu banyak nama'",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan/import": { status: 400, body: { error: "too_many" } } });
    return sandbox.dbPost("kelulusan/import", { names: [] });
  },
  "Terlalu banyak nama dalam sekali kirim."
);
await expectError(
  "503 -> 'Server sedang tidak bisa menghubungi spreadsheet'",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan/import": { status: 503, body: { error: "unavailable" } } });
    return sandbox.dbPost("kelulusan/import", { names: [] });
  },
  "Server sedang tidak bisa menghubungi spreadsheet. Coba lagi."
);

console.log("\n=== dbAdminGet (GET /api/kelulusan/list) ===");
await expectError(
  "404 -> pesan wrangler deploy",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan/list": { status: 404, body: { error: "not_found" } } });
    return sandbox.dbAdminGet("kelulusan/list", "adm");
  },
  /wrangler deploy/
);
await expectError(
  "403 -> 'Token admin salah'",
  () => {
    const { sandbox } = makeSandbox({ "/api/challenge": { status: 200, body: { token: "t" } }, "/api/kelulusan/list": { status: 403, body: { error: "forbidden" } } });
    return sandbox.dbAdminGet("kelulusan/list", "salah");
  },
  "Token admin salah."
);

console.log("\n=== jalur sukses ===");
{
  const { sandbox } = makeSandbox({
    "/api/challenge": { status: 200, body: { token: "t" } },
    "/api/kelulusan": { status: 200, body: { found: true, nama: "BUDI" } },
  });
  const r = await sandbox.dbRequest("kelulusan?nama=BUDI");
  check("dbRequest mengembalikan found", r.found === true, JSON.stringify(r));
  check("dbRequest mengembalikan nama", r.nama === "BUDI", JSON.stringify(r));
}
{
  const { sandbox, calls } = makeSandbox({
    "/api/challenge": { status: 200, body: { token: "t" } },
    "/api/kelulusan/import": { status: 200, body: { ok: true, count: 2 } },
  });
  const r = await sandbox.dbPost("kelulusan/import", { names: ["A", "B"] }, { "x-admin-token": "adm" });
  check("dbPost mengembalikan count", r.count === 2, JSON.stringify(r));
  const call = calls.find((c) => c.url.includes("import"));
  check("dbPost mengirim x-admin-token", call.opts.headers["x-admin-token"] === "adm");
  check("dbPost memakai method POST", call.opts.method === "POST");
  check("dbPost memakai credentials include", call.opts.credentials === "include");
}

console.log("\n=== pengumuman.html tidak lagi menambah sufiks ===");
check(
  "sufiks 'Coba lagi dalam beberapa saat.' dihapus",
  !html.includes("Coba lagi dalam beberapa saat")
);
check(
  "showError menerima pesan apa adanya",
  html.includes('showError(err && err.message ? err.message : "Gagal memuat data.");')
);

console.log(`\n=== RINGKASAN: ${pass} lulus, ${fail} gagal ===\n`);
process.exit(fail === 0 ? 0 : 1);
