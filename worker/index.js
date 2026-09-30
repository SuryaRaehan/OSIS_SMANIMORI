import { PPT_DB, DRIVE_DB } from "./db.js";

const COOKIE_NAME = "_dbn";
const TOKEN_TTL_MS = 5 * 60 * 1000;
const RATE = {
  challenge: { limit: 30, windowMs: 60000 },
  data: { limit: 9, windowMs: 60000 },
  // Satu kelas sering berbagi satu IP (NAT), jadi bucket lookup
  // harus longgar supaya tidak ikut throttle saat pengumuman dibuka.
  lookup: { limit: 30, windowMs: 60000 },
  import: { limit: 6, windowMs: 60000 }
};

const SHEET_TTL_MS = 60000;
const SHEET_TIMEOUT_MS = 5000;
const IMPORT_MAX_NAMES = 2000;

const enc = (s) => new TextEncoder().encode(s);

function b64url(bytes) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sign(secret, payload) {
  const key = await crypto.subtle.importKey("raw", enc(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc(payload))));
}

async function verify(secret, payload, sig) {
  try {
    const key = await crypto.subtle.importKey("raw", enc(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), enc(payload));
  } catch {
    return false;
  }
}

function randomHex(len) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const attempts = new Map();

function limited(key, limit, windowMs, now) {
  const t = (attempts.get(key) || []).filter((x) => now - x < windowMs);
  if (t.length >= limit) {
    attempts.set(key, t);
    return true;
  }
  t.push(now);
  attempts.set(key, t);
  return false;
}





// ============================================================
// SUMBER DATA: Google Sheet (tidak dipublish) via Apps Script
// ============================================================
// Cache di memori isolate. Sengaja tidak memakai KV supaya tidak
// ada binding tambahan; kalau isolate mati, cache hilang dan
// Apps Script dipanggil lagi (kuotanya jauh lebih besar dari
// kebutuhan satu situs sekolah).
let sheetCache = { names: null, exp: 0 };

// Samakan huruf non-ASCII ke ASCII, jadikan huruf besar, lalu
// rapatkan spasi. " sury  r.a " -> "SURY RA"
function norm(s) {
  return String(s == null ? "" : s)
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanNames(list) {
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    // Rapatkan spasi di dalam juga, bukan cuma di tepi: nilai yang
    // disimpan ini ikut tampil di modal hasil, jadi harus rapi.
    const name = String(raw == null ? "" : raw).trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = norm(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

async function sheetFetch(env, init) {
  const target = env.SHEET_API_URL;
  if (!target) throw new Error("SHEET_API_URL belum diatur");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), SHEET_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      ...init,
      signal: ctl.signal,
      headers: { Accept: "application/json", ...(init && init.headers) }
    });
    const text = await res.text();
    if (!res.ok) throw new Error("Sheet HTTP " + res.status);
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Sheet tidak mengembalikan JSON");
    }
  } finally {
    clearTimeout(timer);
  }
}

async function readNames(env) {
  const now = Date.now();
  if (sheetCache.names && sheetCache.exp > now) return sheetCache.names;

  try {
    const data = await sheetFetch(env);
    const list = Array.isArray(data) ? data : data && data.names;
    if (!Array.isArray(list)) throw new Error("Format sheet tidak dikenali");
    const names = cleanNames(list);
    sheetCache = { names, exp: now + SHEET_TTL_MS };
    return names;
  } catch (err) {
    // Lebih baik pakai data basi daripada hidup-hitung gagal total.
    if (sheetCache.names) return sheetCache.names;
    throw err;
  }
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function rawOrigin(request) {
  return (request.headers.get("Origin") || request.headers.get("Referer") || "").trim();
}

function originAllowed(env, request) {
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (!allowed.length) return true;
  const probe = rawOrigin(request);
  if (!probe) return false;
  return allowed.some((a) => probe === a || probe.startsWith(a + "/"));
}

function corsFor(env, request) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : "",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-db-token, x-admin-token",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
}

function json(data, status, extra) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(extra || {}) }
  });
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const pair = header.split(";").map((p) => p.trim()).find((p) => p.startsWith(name + "="));
  return pair ? pair.slice(name.length + 1) : null;
}

async function isAuthorized(request, env, ip, now) {
  if (!originAllowed(env, request)) return false;
  const cookie = getCookie(request, COOKIE_NAME);
  const raw = request.headers.get("x-db-token");
  if (!cookie || !raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return false;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  let payload;
  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    payload = atob(b64);
  } catch {
    return false;
  }
  if (!(await verify(env.API_SECRET, payload, sig))) return false;
  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return false;
  }
  if (!data || !data.n || data.exp < now || data.n !== cookie) return false;
  return true;
}

export default {
  async fetch(request, env) {
    const now = Date.now();
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const cors = corsFor(env, request);
    const originOk = originAllowed(env, request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/api/challenge" && request.method === "GET") {
      if (!originOk) return json({ error: "origin_not_allowed" }, 403, cors);
      if (limited("ch:" + ip, RATE.challenge.limit, RATE.challenge.windowMs, now)) {
        return json({ error: "rate_limited" }, 429, cors);
      }
      const nonce = randomHex(8);
      const payload = JSON.stringify({ n: nonce, exp: now + TOKEN_TTL_MS });
      const token = b64url(enc(payload)) + "." + (await sign(env.API_SECRET, payload));
      return json({ token, expiresIn: TOKEN_TTL_MS }, 200, {
        ...cors,
        "Set-Cookie":
          COOKIE_NAME + "=" + nonce + "; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=None"
      });
    }

    if (url.pathname === "/api/files" && request.method === "GET") {
      if (limited("d:" + ip, RATE.data.limit, RATE.data.windowMs, now)) {
        return json({ error: "rate_limited" }, 429, cors);
      }
      if (!(await isAuthorized(request, env, ip, now))) {
        return json({ error: "unauthorized" }, 401, cors);
      }
      const sle = url.searchParams.get("sle") || "1";
      const num = Number(sle);
      const files =
        sle === "pengurus"
          ? PPT_DB.pengurus
          : num >= 1 && num <= 10
            ? PPT_DB[num]
            : null;
      if (!files) return json({ error: "not_found" }, 404, cors);
      return json({ sie: sle, files }, 200, cors);
    }

    if (url.pathname === "/api/drive" && request.method === "GET") {
      if (limited("d:" + ip, RATE.data.limit, RATE.data.windowMs, now)) {
        return json({ error: "rate_limited" }, 429, cors);
      }
      if (!(await isAuthorized(request, env, ip, now))) {
        return json({ error: "unauthorized" }, 401, cors);
      }
      return json({ items: DRIVE_DB }, 200, cors);
    }

    // --- Cek kelulusan: pencocokan dilakukan di server, jadi
    //     browser hanya menerima true/false untuk satu nama. ---
    if (url.pathname === "/api/kelulusan" && request.method === "GET") {
      if (!originOk) return json({ error: "origin_not_allowed" }, 403, cors);
      if (limited("l:" + ip, RATE.lookup.limit, RATE.lookup.windowMs, now)) {
        return json({ error: "rate_limited" }, 429, cors);
      }
      if (!(await isAuthorized(request, env, ip, now))) {
        return json({ error: "unauthorized" }, 401, cors);
      }
      const typed = url.searchParams.get("nama") || "";
      const key = norm(typed);
      if (!key) return json({ error: "bad_request" }, 400, cors);

      let names;
      try {
        names = await readNames(env);
      } catch {
        return json({ error: "unavailable" }, 503, cors);
      }
      return json({ found: names.some((n) => norm(n) === key), nama: typed.trim() }, 200, cors);
    }

    // --- Baca daftar lengkap: hanya untuk admin (butuh token). ---
    if (url.pathname === "/api/kelulusan/list" && request.method === "GET") {
      if (!originOk) return json({ error: "origin_not_allowed" }, 403, cors);
      if (limited("l:" + ip, RATE.lookup.limit, RATE.lookup.windowMs, now)) {
        return json({ error: "rate_limited" }, 429, cors);
      }
      if (!(await isAuthorized(request, env, ip, now))) {
        return json({ error: "unauthorized" }, 401, cors);
      }
      if (!safeEqual(request.headers.get("x-admin-token") || "", env.ADMIN_TOKEN || "")) {
        return json({ error: "forbidden" }, 403, cors);
      }
      try {
        return json({ names: await readNames(env) }, 200, cors);
      } catch {
        return json({ error: "unavailable" }, 503, cors);
      }
    }

    // --- Tulis daftar dari halaman admin (butuh token admin). ---
    if (url.pathname === "/api/kelulusan/import" && request.method === "POST") {
      if (!originOk) return json({ error: "origin_not_allowed" }, 403, cors);
      if (limited("i:" + ip, RATE.import.limit, RATE.import.windowMs, now)) {
        return json({ error: "rate_limited" }, 429, cors);
      }
      if (!(await isAuthorized(request, env, ip, now))) {
        return json({ error: "unauthorized" }, 401, cors);
      }
      if (!safeEqual(request.headers.get("x-admin-token") || "", env.ADMIN_TOKEN || "")) {
        return json({ error: "forbidden" }, 403, cors);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "bad_request" }, 400, cors);
      }
      if (!body || !Array.isArray(body.names)) {
        return json({ error: "bad_request" }, 400, cors);
      }
      if (body.names.length > IMPORT_MAX_NAMES) {
        return json({ error: "too_many" }, 400, cors);
      }

      const names = cleanNames(body.names);
      try {
        await sheetFetch(env, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: env.ADMIN_TOKEN, names })
        });
      } catch {
        return json({ error: "unavailable" }, 503, cors);
      }
      // Buang cache supaya pengecekan berikutnya langsung pakai data baru.
      sheetCache = { names: null, exp: 0 };
      return json({ ok: true, count: names.length }, 200, cors);
    }

    return json({ error: "not_found" }, 404, cors);
  }
};
