import { PPT_DB, DRIVE_DB } from "./db.js";

const COOKIE_NAME = "_dbn";
const TOKEN_TTL_MS = 5 * 60 * 1000;
const RATE = {
  challenge: { limit: 30, windowMs: 60000 },
  data: { limit: 9, windowMs: 60000 }
};

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

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  const fd = new FormData();
  fd.append("secret", secret);
  fd.append("response", token);
  if (ip) fd.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: fd
    });
    const data = await res.json();
    return data && data.success === true;
  } catch {
    return false;
  }
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-db-token, x-turnstile-token",
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
  const ts = request.headers.get("x-turnstile-token");
  if (!(await verifyTurnstile(env.TURNSTILE_SECRET, ts, ip))) return false;
  const cookie = getCookie(request, COOKIE_NAME);
  const raw = request.headers.get("x-db-token");
  if (!cookie || !raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!(await verify(env.API_SECRET, payload, sig))) return false;
  let data;
  try {
    data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
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

    return json({ error: "not_found" }, 404, cors);
  }
};