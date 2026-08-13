// ============================================================
// KONFIGURASI CLOUDFLARE — ISI DUA NILAI DI BAWAH INI
// ============================================================
var CF_CONFIG = {
  // GANTI setelah deploy Worker dengan perintah `npx wrangler deploy`
  // Contoh: "https://smanimori-db.your-subdomain.workers.dev"
  workerUrl: "https://smanimori-db.osissmanimori.workers.dev",

  // GANTI dengan "Site Key" dari dashboard Cloudflare -> Turnstile
  turnstileSiteKey: "0x4AAAAAAEOsD7qQdLI66ibN"
};