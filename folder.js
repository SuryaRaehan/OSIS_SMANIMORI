// ============================================================
// FOLDER PPT — data diambil dari Cloudflare Worker (terproteksi)
// ============================================================
(function () {
  var params = new URLSearchParams(window.location.search);
  var group = params.get("sie") || "1";
  var isPengurus = group === "pengurus";
  var sie = parseInt(group, 10);
  if (isNaN(sie)) sie = 1;
  sie = Math.min(10, Math.max(1, sie));
  var folderKey = isPengurus ? "pengurus" : sie;

  document.getElementById("folderTitle").textContent = isPengurus
    ? "Folder PPT Pengurus Inti"
    : "Folder PPT Sie " + sie;
  document.getElementById("folderSub").textContent = isPengurus
    ? "Presentasi dari pengurus inti OSIS SMAN 1 Imogiri."
    : "Presentasi dari Seksi " + sie + " OSIS SMAN 1 Imogiri.";

  var list = document.getElementById("folderList");

  function getPPTViewerUrl(file, embed) {
    var base = embed
      ? "https://view.officeapps.live.com/op/embed.aspx?src="
      : "https://view.officeapps.live.com/op/view.aspx?src=";
    return base + encodeURIComponent(file.url);
  }

  var modal = document.getElementById("pptModal");
  var frame = document.getElementById("pptFrame");
  var modalName = document.getElementById("pptModalName");
  var modalOpen = document.getElementById("pptModalOpen");

  function viewPPT(file) {
    frame.src = getPPTViewerUrl(file, true);
    modalName.textContent = file.name;
    modalOpen.href = getPPTViewerUrl(file, false);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closePPT() {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    frame.src = "";
  }

  modal.querySelectorAll("[data-ppt-close]").forEach(function (el) {
    el.addEventListener("click", closePPT);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePPT();
  });

  function renderFiles(files) {
    list.innerHTML = "";
    if (!files.length) {
      list.innerHTML = '<p class="folder-empty">Folder ini masih kosong.</p>';
      return;
    }
    files.forEach(function (file) {
      var item = document.createElement("a");
      item.className = "folder-file";
      item.href = "#";
      item.setAttribute("role", "button");
      item.title = "Lihat tanpa unduh";

      var ic = document.createElement("span");
      ic.className = "folder-file-ic";
      ic.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
        '<polyline points="14 2 14 8 20 8"/>' +
        '<line x1="9" y1="15" x2="15" y2="15"/></svg>';

      var meta = document.createElement("span");
      meta.className = "folder-file-meta";
      var nm = document.createElement("span");
      nm.className = "folder-file-name";
      nm.textContent = file.name;
      var sz = document.createElement("span");
      sz.className = "folder-file-size";
      sz.textContent = file.size + " · PPT · Klik untuk lihat";
      meta.appendChild(nm);
      meta.appendChild(sz);

      var open = document.createElement("span");
      open.className = "folder-file-open";
      open.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="9 18 15 12 9 6"/></svg>';

      item.appendChild(ic);
      item.appendChild(meta);
      item.appendChild(open);
      item.addEventListener("click", function (e) {
        e.preventDefault();
        viewPPT(file);
      });
      list.appendChild(item);
    });
  }

  list.innerHTML = '<p class="folder-empty">Sedang memuat…</p>';

  dbRequest("files?sle=" + folderKey)
    .then(function (res) {
      renderFiles(res.files || []);
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