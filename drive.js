// ============================================================
// DRIVE KEGIATAN — data diambil dari Cloudflare Worker (terproteksi)
// ============================================================
(function () {
  function driveIcon(id) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 287.5 250" width="20" height="17.4" aria-hidden="true">' +
      '<mask id="' + id + '">' +
      '<path fill="#fff" d="M190.7,0H96.8L0,168.8l45.8,81.2h195.9l45.8-81.2C287.5,168.8,190.7,0,190.7,0z M92.9,168.8l50.9-87.8l50.9,87.8H92.9z"/>' +
      "</mask>" +
      '<g mask="url(#' + id + ')">' +
      '<path fill="#4285F4" d="M45.8,168.8V250h195.9l45.8-81.2H45.8z"/>' +
      '<path fill="#0F9D58" d="M96.8,0L0,168.8L45.8,250L156.2,59.4L96.8,0z"/>' +
      '<path fill="#FFCD40" d="M190.7,0H96.8l97.8,168.8h92.9L190.7,0z"/>' +
      "</g></svg>");
  }

  var list = document.getElementById("driveList");

  function renderItems(items) {
    list.innerHTML = "";
    items.forEach(function (item, i) {
      var link = document.createElement("a");
      link.className = "folder-file";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.title = "Buka di Google Drive";

      var ic = document.createElement("span");
      ic.className = "folder-file-ic";
      ic.style.background = "#fff";
      ic.style.color = "var(--orange-1)";
      ic.innerHTML = driveIcon("drv-mask-" + i);

      var meta = document.createElement("span");
      meta.className = "folder-file-meta";
      var nm = document.createElement("span");
      nm.className = "folder-file-name";
      nm.textContent = item.name;
      var sz = document.createElement("span");
      sz.className = "folder-file-size";
      sz.textContent = "Google Drive · Buka di tab baru";
      meta.appendChild(nm);
      meta.appendChild(sz);

      var open = document.createElement("span");
      open.className = "folder-file-open";
      open.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="9 18 15 12 9 6"/></svg>';

      link.appendChild(ic);
      link.appendChild(meta);
      link.appendChild(open);
      list.appendChild(link);
    });
  }

  list.innerHTML = '<p class="folder-empty">Sedang memuat…</p>';

  dbRequest("drive")
    .then(function (res) {
      renderItems(res.items || []);
    })
    .catch(function (err) {
      list.innerHTML =
        '<div class="folder-empty"><p>' + (err && err.message ? err.message : "Gagal memuat folder. Coba lagi.") + "</p></div>";
      var retry = document.createElement("button");
      retry.type = "button";
      retry.className = "folder-retry";
      retry.textContent = "Coba Lagi";
      retry.addEventListener("click", function () { location.reload(); });
      list.querySelector(".folder-empty").appendChild(retry);
    });
})();