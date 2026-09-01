// ============================================================
// FAN CAROUSEL (port vanilla dari komponen React card-fan-carousel)
// ============================================================
(function () {
  var MAX_VISIBLE = 7;
  var HALF = 3;

  var FAN_POSITIONS = [
    { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1 },
    { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2 },
    { rot: -7, scale: 0.9346, x: -11, y: 1.3, zIndex: 3 },
    { rot: 0, scale: 1.0, x: 0, y: 0.0, zIndex: 10 },
    { rot: 7, scale: 0.9346, x: 11, y: 1.3, zIndex: 3 },
    { rot: 14, scale: 0.8498, x: 22, y: 4.0, zIndex: 2 },
    { rot: 21, scale: 0.7756, x: 30, y: 7.3, zIndex: 1 }
  ];

  window.FAN_CARDS = [
    {
      imgUrl: "asset/web/ft brsm.png",
      alt: "Pengurus OSIS 1"
    },
    {
      imgUrl: "asset/web/ft brsm2.png",
      alt: "Pengurus OSIS 2"
    },
    {
      imgUrl: "asset/web/ft brsm3.png",
      alt: "Pengurus OSIS 3"
    },
    {
      imgUrl: "asset/web/ft brsm4.png",
      alt: "Pengurus OSIS 4"
    },
    {
      imgUrl: "asset/web/ft brsm5.png",
      alt: "Pengurus OSIS 5"
    },
    {
      imgUrl: "asset/web/ft brsm6.png",
      alt: "Pengurus OSIS 6"
    },
    {
      imgUrl: "asset/web/ft brsm7.png",
      alt: "Pengurus OSIS 7"
    },
    {
      imgUrl: "asset/web/ft brsm8.png",
      alt: "Pengurus OSIS 8"
    }
  ];

  function getResponsiveMultiplier(width) {
    if (width < 480) return 0.28;
    if (width < 640) return 0.38;
    if (width < 768) return 0.5;
    if (width < 1024) return 0.75;
    if (width < 1280) return 1.0;
    return 1.15;
  }

  function getHeightMultiplier(width) {
    var idealPx;
    if (width < 480) idealPx = 22 * 16;
    else if (width < 640) idealPx = 26 * 16;
    else if (width < 768) idealPx = 28 * 16;
    else if (width < 1024) idealPx = 34 * 16;
    else idealPx = 38 * 16;

    var available = window.innerHeight * 0.7;
    if (available >= idealPx) return 1;
    return available / idealPx;
  }

  function getSlotConfig(totalCards, slot) {
    if (totalCards >= MAX_VISIBLE) return FAN_POSITIONS[slot];
    var center = totalCards >> 1;
    var distance = totalCards > 1 ? (slot - center) / center : 0;
    var absDistance = Math.abs(distance);
    return {
      rot: distance * 21,
      scale: 1.0 - 0.2244 * absDistance * absDistance,
      x: distance * 30,
      y: absDistance * absDistance * 7.3,
      zIndex: 10 - Math.abs(slot - center)
    };
  }

  function initFanCarousel(root, cards, options) {
    var opts = options || {};
    var introDelay = typeof opts.introDelay === "number" ? opts.introDelay : 0.75;
    var fanScale = typeof opts.fanScale === "number" ? opts.fanScale : 0.8;
    var autoplayDelay = typeof opts.autoplayDelay === "number" ? opts.autoplayDelay : 4000;

    var layout = root.querySelector(".fan-layout");
    var prevBtn = root.querySelector(".fan-prev");
    var nextBtn = root.querySelector(".fan-next");
    var dotsEl = root.querySelector(".fan-dots");
    if (!layout || !cards.length) return null;

    var totalCards = cards.length;
    var needsPagination = totalCards > MAX_VISIBLE;
    var centerIndex = needsPagination ? HALF : totalCards >> 1;

    var state = {
      isAnimating: false,
      hasEntered: false,
      direction: null,
      prevVisible: new Set()
    };

    var cardElements = cards.map(function (card, index) {
      var el = document.createElement(card.linkUrl ? "a" : "div");
      el.className = "fan-card";
      if (card.linkUrl) {
        el.href = card.linkUrl;
        el.target = card.linkUrl.indexOf("http") === 0 ? "_blank" : "_self";
        el.rel = "noopener noreferrer";
      }
      var img = document.createElement("img");
      img.src = card.imgUrl;
      img.alt = card.alt || "Kartu " + (index + 1);
      img.loading = "lazy";
      el.appendChild(img);
      return el;
    });

    cardElements.forEach(function (el) {
      layout.appendChild(el);
      gsap.set(el, { xPercent: -50, yPercent: -50 });
    });

    function getVisibleMap(center) {
      var map = new Map();
      if (!needsPagination) {
        cards.forEach(function (_, i) {
          map.set(i, i);
        });
        return map;
      }
      for (var slot = 0; slot < MAX_VISIBLE; slot++) {
        map.set(((center + slot - HALF) % totalCards + totalCards) % totalCards, slot);
      }
      return map;
    }

    function renderDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = "";
      cards.forEach(function (_, i) {
        var dot = document.createElement("span");
        dot.className = "fan-dot" + (i === centerIndex ? " active" : "");
        dotsEl.appendChild(dot);
      });
    }

    function cycle(direction) {
      if (state.isAnimating || !needsPagination) return;
      state.isAnimating = true;
      state.direction = direction;
      centerIndex =
        direction === "right"
          ? (centerIndex + 1) % totalCards
          : (centerIndex - 1 + totalCards) % totalCards;
      renderDots();
      update();
      restartAutoplay();
    }

    // ============================================================
    // AUTOPLAY: ganti foto otomatis dengan animasi smooth
    // ============================================================
    var autoplayTimer = null;

    function startAutoplay() {
      stopAutoplay();
      if (!needsPagination || autoplayDelay <= 0) return;
      autoplayTimer = setInterval(function () {
        if (!document.hidden) cycle("right");
      }, autoplayDelay);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function restartAutoplay() {
      if (state.hasEntered || needsPagination) startAutoplay();
    }

    var rootEnterHandler = function () {
      stopAutoplay();
    };
    var rootLeaveHandler = function () {
      if (!state.isAnimating) startAutoplay();
    };
    root.addEventListener("mouseenter", rootEnterHandler);
    root.addEventListener("mouseleave", rootLeaveHandler);

    var onVisibility = function () {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    function update() {
      if (!layout) return;

      var visibleMap = getVisibleMap(centerIndex);
      var previouslyVisible = state.prevVisible;
      var direction = state.direction;
      var isFirstMount = !state.hasEntered;
      var multiplier = getResponsiveMultiplier(window.innerWidth) * fanScale;
      var hMult = getHeightMultiplier(window.innerWidth) * fanScale;
      var slotCount = needsPagination ? MAX_VISIBLE : totalCards;

      function config(slot) {
        return getSlotConfig(slotCount, slot);
      }

      if (isFirstMount) state.isAnimating = true;

      var completedCount = 0;
      var visibleCount = visibleMap.size;

      function onCardDone() {
        completedCount++;
        if (completedCount >= visibleCount) {
          state.isAnimating = false;
          if (isFirstMount) state.hasEntered = true;
        }
      }

      cardElements.forEach(function (card, cardIndex) {
        var slot = visibleMap.get(cardIndex);
        var wasVisible = previouslyVisible.has(cardIndex);

        if (slot !== undefined) {
          var c = config(slot);
          var target = {
            x: c.x * multiplier + "rem",
            y: c.y * hMult + "rem",
            rotation: c.rot,
            scale: c.scale,
            opacity: 1,
            zIndex: c.zIndex
          };

          if (isFirstMount) {
            gsap.set(card, { x: 0, y: 12 * hMult + "rem", rotation: 0, scale: 0.5, opacity: 0 });
            gsap.to(card, {
              x: target.x,
              y: target.y,
              rotation: target.rotation,
              scale: target.scale,
              opacity: target.opacity,
              zIndex: target.zIndex,
              duration: 1.2,
              ease: "elastic.out(1.05,.78)",
              delay: introDelay + 0.2 + slot * 0.06,
              onComplete: onCardDone
            });
          } else if (!wasVisible) {
            var enterX = direction === "right" ? 40 : -40;
            gsap.set(card, {
              x: enterX + "rem",
              y: target.y,
              rotation: direction === "right" ? 30 : -30,
              scale: 0.5,
              opacity: 0
            });
            gsap.to(card, {
              x: target.x,
              y: target.y,
              rotation: target.rotation,
              scale: target.scale,
              opacity: target.opacity,
              zIndex: target.zIndex,
              duration: 0.6,
              ease: "power2.out",
              onComplete: onCardDone
            });
          } else {
            gsap.to(card, {
              x: target.x,
              y: target.y,
              rotation: target.rotation,
              scale: target.scale,
              opacity: target.opacity,
              zIndex: target.zIndex,
              duration: 0.5,
              ease: "power2.out",
              onComplete: onCardDone
            });
          }
        } else if (wasVisible) {
          var exitX = direction === "right" ? -40 : 40;
          gsap.to(card, {
            x: exitX + "rem",
            opacity: 0,
            scale: 0.5,
            rotation: direction === "right" ? -30 : 30,
            duration: 0.4,
            ease: "power2.in",
            zIndex: 0
          });
        } else if (isFirstMount) {
          gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
        }
      });

      state.prevVisible = new Set(visibleMap.keys());

      bindHover(visibleMap);
    }

    var activeSlot = null;
    var leaveTimer = null;
    var windowResizeHandler = null;
    var layoutMouseLeaveHandler = null;

    function bindHover(visibleMap) {
      if (!layout) return;

      var visibleEntries = [];
      cardElements.forEach(function (el, i) {
        var slot = visibleMap.get(i);
        if (slot !== undefined) visibleEntries.push({ el: el, slot: slot });
      });
      visibleEntries.sort(function (a, b) {
        return a.slot - b.slot;
      });

      var centerSlot = visibleEntries.length >> 1;

      function updateHoverLayout(hoveredSlot) {
        var mult = getResponsiveMultiplier(window.innerWidth) * fanScale;
        var hM = getHeightMultiplier(window.innerWidth) * fanScale;

        visibleEntries.forEach(function (entry) {
          var base = config(entry.slot);
          var targetX = base.x * mult;
          var targetY = base.y * hM;
          var targetRot = base.rot;
          var targetScale = base.scale;
          var delay = 0;

          if (hoveredSlot !== null) {
            var distance = Math.abs(entry.slot - hoveredSlot);
            delay = distance * 0.02;

            if (entry.slot === hoveredSlot) {
              targetY -= 2.5 * hM;
              targetScale *= 1.08;
            } else {
              var normalized = centerSlot > 0 ? (entry.slot - centerSlot) / centerSlot : 0;
              var pushStrength =
                8 * (1 - Math.abs(normalized)) * (1 + 0.2 * Math.max(0, 3 - distance));

              if (entry.slot < hoveredSlot) {
                targetX -= pushStrength * mult;
                targetRot -= 3 / (distance + 1);
              } else {
                targetX += pushStrength * mult;
                targetRot += 3 / (distance + 1);
              }

              if (entry.slot === visibleEntries.length - 1 && hoveredSlot < centerSlot)
                targetY -= 1 * hM;
              if (entry.slot === 0 && hoveredSlot > centerSlot) targetY -= 1 * hM;
            }
          } else {
            delay = Math.abs(entry.slot - centerSlot) * 0.02;
          }

          gsap.to(entry.el, {
            x: targetX + "rem",
            y: targetY + "rem",
            rotation: targetRot,
            scale: targetScale,
            duration: 0.5,
            delay: delay,
            ease: "elastic.out(1,.75)",
            overwrite: "auto"
          });
          gsap.set(entry.el, { zIndex: base.zIndex });
        });
      }

      function onMouseLeave() {
        if (state.isAnimating) return;
        if (leaveTimer) clearTimeout(leaveTimer);
        leaveTimer = setTimeout(function () {
          activeSlot = null;
          updateHoverLayout(null);
        }, 50);
      }

      function onResize() {
        if (!state.isAnimating) updateHoverLayout(activeSlot);
      }

      visibleEntries.forEach(function (entry) {
        entry.el.onmouseenter = function () {
          if (state.isAnimating) return;
          if (leaveTimer) {
            clearTimeout(leaveTimer);
            leaveTimer = null;
          }
          if (activeSlot !== entry.slot) {
            activeSlot = entry.slot;
            updateHoverLayout(entry.slot);
          }
        };
      });

      layout.removeEventListener("mouseleave", layoutMouseLeaveHandler);
      layoutMouseLeaveHandler = onMouseLeave;
      layout.addEventListener("mouseleave", onMouseLeave);

      window.removeEventListener("resize", windowResizeHandler);
      windowResizeHandler = onResize;
      window.addEventListener("resize", onResize);
    }

    function config(slot) {
      return getSlotConfig(needsPagination ? MAX_VISIBLE : totalCards, slot);
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { cycle("left"); });
    if (nextBtn) nextBtn.addEventListener("click", function () { cycle("right"); });

    renderDots();
    gsap.set(layout, { opacity: 1 });
    update();

    var controls = root.querySelector(".fan-controls");
    if (controls) {
      gsap.fromTo(
        controls,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.7, delay: introDelay + 0.7 }
      );
    }

    startAutoplay();

    return {
      cards: cards,
      getCenterIndex: function () {
        return centerIndex;
      }
    };
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    function boot() {
      document.querySelectorAll(".fan-carousel").forEach(function (root) {
        initFanCarousel(root, window.FAN_CARDS || []);
      });
    }
    if (window.__SPLASH_DONE) boot();
    else window.addEventListener("SplashDone", boot);
  });
})();
