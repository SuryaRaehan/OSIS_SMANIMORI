gsap.registerPlugin(ScrollTrigger);

// ============================================================
// INITIAL STATES + APPLY DATA-ROT
// ============================================================
gsap.set("#nav", { opacity: 0, y: -20 });
gsap.set(".small-team .word > span", { y: "105%" });
gsap.set(".big-results .letter", { y: 80, opacity: 0 });
gsap.set("#subline", { opacity: 0, y: 20 });
gsap.set(".stats-table-wrap", { opacity: 0, y: 40 });

// ============================================================
// INTRO TIMELINE (diputar setelah splash screen selesai)
// ============================================================
const intro = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
intro
  .to("#nav", { opacity: 1, y: 0, duration: 0.8 }, 0.1)
  .to(
    ".small-team .word > span",
    {
      y: "0%",
      duration: 0.9,
      stagger: 0.08,
      ease: "power3.out"
    },
    0.3
  )
  .to(
    ".big-results .letter",
    {
      y: 0,
      opacity: 1,
      duration: 0.9,
      stagger: 0.05,
      ease: "back.out(1.6)"
    },
    0.55
  )
  .to("#subline", { opacity: 1, y: 0, duration: 0.8 }, 1.6);

function playIntro() {
  intro.play();
}
if (window.__SPLASH_DONE) playIntro();
else window.addEventListener("SplashDone", playIntro);
setTimeout(function () {
  if (intro.progress() === 0) playIntro();
}, 6000);

// ============================================================
// SCROLL: "big results" SCALES UP
// Tween scrub langsung (tanpa onUpdate / gsap.set per frame)
// ============================================================
gsap.to(".big-results", {
  scale: 1.15,
  opacity: 0.6,
  ease: "none",
  scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.8 }
});
gsap.to(".small-team", {
  y: -60,
  opacity: 0,
  ease: "none",
  scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.8 }
});
gsap.fromTo("#subline",
  { opacity: 1 },
  {
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.8 }
  }
);
gsap.to(".fan-carousel", {
  y: 80,
  opacity: 0,
  ease: "none",
  scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.8 }
});

// ============================================================
// EDGE FADE: memudarkan hanya di TEPI ATAS (sekitar navbar)
// Overlay gradasi ber-opacity sesuai jarak, dan hanya muncul
// ketika elemen (bukan hero) mulai mendekati posisi navbar.
// Tidak memudarkan seluruh section -> tidak kasar & tidak
// bentrok dengan animasi reveal masing-masing section.
// ============================================================
ScrollTrigger.create({
  trigger: ".hero",
  start: "bottom 140px",
  end: "bottom top",
  scrub: true,
  onUpdate: (self) => {
    gsap.set("#scrollEdgeFade", { opacity: self.progress });
  }
});

// ============================================================
// TEAM GRID REVEAL ON SCROLL
// ============================================================
gsap.from(".eyebrow, .team-head h2, .team-head p", {
  opacity: 0,
  y: 30,
  duration: 0.9,
  stagger: 0.1,
  ease: "power3.out",
  scrollTrigger: { trigger: ".motto", start: "top 80%" }
});

gsap.from(".org-card", {
  opacity: 0,
  y: 60,
  scale: 0.92,
  duration: 1,
  stagger: 0.08,
  ease: "back.out(1.3)",
  scrollTrigger: { trigger: ".org-leaders", start: "top 85%" }
});

gsap.from(".team-title > *", {
  opacity: 0,
  y: 24,
  duration: 0.9,
  stagger: 0.1,
  ease: "power3.out",
  scrollTrigger: { trigger: ".team-title", start: "top 88%" }
});

// ============================================================
// SIE 1-10: ACCORDION (KLIK -> MUNCUL 3 ANGGOTA)
// ============================================================
document.querySelectorAll(".sie").forEach((sie) => {
  const btn = sie.querySelector(".sie-btn");
  const body = sie.querySelector(".sie-body");
  gsap.set(body, { height: 0, opacity: 0, overflow: "hidden" });
  btn.addEventListener("click", () => {
    const isOpen = sie.classList.contains("open");
    document.querySelectorAll(".sie.open").forEach((other) => {
      if (other !== sie) {
        other.classList.remove("open");
        gsap.to(other.querySelector(".sie-body"), {
          height: 0,
          opacity: 0,
          duration: 0.35,
          ease: "power2.inOut"
        });
      }
    });
    if (isOpen) {
      sie.classList.remove("open");
      gsap.to(body, { height: 0, opacity: 0, duration: 0.35, ease: "power2.inOut" });
    } else {
      sie.classList.add("open");
      gsap.to(body, { height: "auto", opacity: 1, duration: 0.5, ease: "power3.out" });
    }
  });
});

// ============================================================
// SIE 1-10: TOMBOL FOLDER (BUKA HALAMAN folder.html)
// ============================================================
document.querySelectorAll(".sie").forEach((sie, index) => {
  const folderBtn = sie.querySelector(".sie-folder");
  if (!folderBtn) return;
  folderBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.open("folder.html?sie=" + (index + 1), "_blank", "noopener");
  });
});

// ============================================================
// PENGURUS INTI: TOMBOL FOLDER (BUKA folder.html?sie=pengurus)
// ============================================================
document.querySelectorAll(".org-folder").forEach((btn) => {
  btn.addEventListener("click", () => {
    window.open("folder.html?sie=pengurus", "_blank", "noopener");
  });
});

// ============================================================
// TABEL PROJECT: REVEAL + COUNTERS
// ============================================================
gsap.to(".stats-table-wrap", {
  opacity: 1,
  y: 0,
  duration: 1.2,
  ease: "power3.out",
  scrollTrigger: { trigger: ".stats-table-wrap", start: "top 85%" }
});
gsap.from(".stats-table-wrap", {
  y: 60,
  scale: 0.98,
  duration: 1.2,
  ease: "power3.out",
  scrollTrigger: { trigger: ".stats-table-wrap", start: "top 85%" }
});

ScrollTrigger.create({
  trigger: ".stats-table-wrap",
  start: "top 75%",
  onEnter: () => {
    document.querySelectorAll(".stats-table .num").forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = "true";
      const target = parseFloat(el.dataset.count);
      const span = el.querySelector("span");
      const state = { v: 0 };
      gsap.to(state, {
        v: target,
        duration: 2,
        ease: "power2.out",
        onUpdate: () => {
          span.textContent = Math.floor(state.v).toLocaleString();
        },
        onComplete: () => {
          span.textContent = target.toLocaleString();
        }
      });
    });
  },
  once: true
});

// ============================================================
// GALERI: SCROLL VERTIKAL -> GULIR HORIZONTAL BERSILANGAN
// Duplikasi isi baris via cloneNode (4 set) agar strip selalu
// menutupi layar di posisi scroll mana pun.
// ============================================================
gsap.utils.toArray(".g-row").forEach((row) => {
  const frag = document.createDocumentFragment();
  for (let n = 0; n < 3; n++) {
    Array.from(row.children).forEach((el) => frag.appendChild(el.cloneNode(true)));
  }
  row.appendChild(frag);
  row.querySelectorAll("img").forEach((img) => {
    img.decoding = "async";
    img.loading = "lazy";
  });
});

gsap.utils.toArray(".g-row").forEach((row, i) => {
  // Baris 1 & 3 bergerak ke kiri (0 -> -50%).
  // Baris tengah bergerak ke kanan (-50% -> 0) dengan konten sudah
  // digeser ke kiri terlebih dahulu, sehingga strip selalu menutupi
  // layar dan tidak pernah "mentok" atau hilang saat di-scroll.
  const starts = [0, -50, 0];
  const ends = [-50, 0, -50];
  gsap.fromTo(
    row,
    { xPercent: starts[i] },
    {
      xPercent: ends[i],
      ease: "none",
      scrollTrigger: {
        trigger: ".gallery",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.1
      }
    }
  );
});

// ============================================================
// MOBILE NAV TOGGLE
// ============================================================
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
if (navToggle && navLinks) {
  const closeMenu = () => {
    navLinks.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  };
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", closeMenu)
  );
}

// ============================================================
// DROPDOWN "YUK JOIN" (desktop)
// ============================================================
const joinBtn = document.getElementById("joinBtn");
const joinDropdown = document.getElementById("joinDropdown");
if (joinBtn && joinDropdown) {
  const isMobile = () => window.matchMedia("(max-width: 767.98px)").matches;
  joinBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isMobile()) {
      if (navLinks) {
        const open = navLinks.classList.toggle("open");
        navToggle.classList.toggle("open", open);
        navToggle.setAttribute("aria-expanded", String(open));
      }
      return;
    }
    const open = joinDropdown.classList.toggle("open");
    joinBtn.setAttribute("aria-expanded", String(open));
  });
  joinBtn.addEventListener("mouseenter", () => {
    if (isMobile()) return;
    joinDropdown.classList.add("open");
    joinBtn.setAttribute("aria-expanded", "true");
  });
  joinDropdown.addEventListener("mouseleave", () => {
    joinDropdown.classList.remove("open");
    joinBtn.setAttribute("aria-expanded", "false");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-cta-wrap")) {
      joinDropdown.classList.remove("open");
      joinBtn.setAttribute("aria-expanded", "false");
    }
  });
}

// ============================================================
// CTA / BUTTON CLICKS
// ============================================================
document.querySelectorAll(".nav-cta, .arrow-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    gsap.fromTo(
      btn,
      { scale: 1 },
      {
        scale: 0.93,
        duration: 0.12,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      }
    );
  });
});

// Big results: subtle letter rise on hover of the wrap
document
  .querySelector(".big-results-wrap")
  .addEventListener("mouseenter", () => {
    gsap.to(".big-results .letter", {
      y: -8,
      duration: 0.5,
      stagger: 0.03,
      ease: "back.out(1.6)"
    });
  });
document
  .querySelector(".big-results-wrap")
  .addEventListener("mouseleave", () => {
    gsap.to(".big-results .letter", {
      y: 0,
      duration: 0.6,
      stagger: 0.03,
      ease: "elastic.out(1, 0.6)"
    });
  });

// ============================================================
// POPUP VIDEO EXPLORE: KLIK "Explore" -> VIDEO 9:16 MENGAMBANG
// ============================================================
const videoPopup = document.getElementById("videoPopup");
const popupVideo = videoPopup.querySelector(".video-popup-video");

const openPopup = () => {
  videoPopup.classList.add("open");
  videoPopup.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const play = popupVideo.play();
  if (play !== undefined) {
    play.catch(() => {});
  }
};

const closePopup = () => {
  if (!videoPopup.classList.contains("open")) return;
  videoPopup.classList.remove("open");
  videoPopup.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  popupVideo.pause();
};

document.querySelector(".subline .arrow-pill").addEventListener("click", openPopup);
videoPopup
  .querySelectorAll("[data-close-popup]")
  .forEach((el) => el.addEventListener("click", closePopup));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePopup();
});

// ============================================================
// GALERI EXPANDABLE: klik gambar -> modal prev/next/counter
// ============================================================
(function () {
  const items = Array.from(document.querySelectorAll(".eg-item"));
  const modal = document.getElementById("egModal");
  const img = document.getElementById("egImg");
  const counter = document.getElementById("egCounter");
  if (!items.length || !modal || !img) return;

  const sources = items.map((el) => el.dataset.src);
  let index = null;

  const render = () => {
    img.src = sources[index];
    img.alt = "Galeri " + (index + 1);
    img.classList.remove("animate");
    void img.offsetWidth;
    img.classList.add("animate");
    if (counter) counter.textContent = index + 1 + " / " + sources.length;
  };

  const open = (i) => {
    index = i;
    render();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  const next = () => {
    if (index === null) return;
    index = (index + 1) % sources.length;
    render();
  };

  const prev = () => {
    if (index === null) return;
    index = (index - 1 + sources.length) % sources.length;
    render();
  };

  items.forEach((item, i) => item.addEventListener("click", () => open(i)));
  modal.querySelectorAll("[data-eg-close]").forEach((el) => el.addEventListener("click", close));
  const nextBtn = modal.querySelector("[data-eg-next]");
  const prevBtn = modal.querySelector("[data-eg-prev]");
  if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); next(); });
  if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); prev(); });

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });
})();
