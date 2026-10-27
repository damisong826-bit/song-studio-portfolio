(() => {
  const root = document.documentElement;
  const isAdminPreview = new URLSearchParams(window.location.search).has("adminPreview");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  if (isAdminPreview) {
    root.classList.remove("motion-ready");
    root.classList.add("is-loaded", "is-admin-preview");
    return;
  }

  function ready() {
    requestAnimationFrame(() => root.classList.add("is-loaded"));
  }

  function reveal(selector, delayStep = 70, scope = document) {
    $$(selector, scope).forEach((item, index) => {
      item.classList.add("reveal-item");
      item.style.setProperty("--reveal-delay", `${Math.min(index * delayStep, 360)}ms`);
    });
  }

  function setupReveals() {
    reveal("#showcase > p, #showcase .logo-window", 90);
    reveal("#selected .feature-copy > *, #selected .slider-stage", 110);
    reveal("#numbers .numbers-head > *, #numbers .numbers-grid article", 70);
    reveal("#directions .accent-label, #directions .service-list a, #directions .service-preview-space > *", 75);
    $$(".work-category").forEach((section) => {
      reveal(".work-kicker, .work-category-head h3, .work-category-head p, .work-thumb-card", 75, section);
    });
    reveal("#contact .thank-title-wrap, #contact .thank-email, #contact .qr-card, #contact .thank-home, #contact .thank-hero-bottom", 95);
    reveal(".case-title-block .ref-kicker, .case-title-block h1, .case-meta-grid article, .case-thumb-card", 95);
    reveal(".case-cover img, .case-cover video", 80);
    $$(".case-copy-block").forEach((section) => {
      reveal(".case-copy-label, .case-copy-text h2, .case-copy-text p", 95, section);
    });
    reveal(".case-pair-gallery figure", 95);
    reveal(".case-image-stack figure", 90);
    reveal(".case-quote > *, .case-after-quote-gallery figure", 85);
    reveal(".case-other-head > *, .case-other-card", 90);

    const items = $$(".reveal-item");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: .16,
      rootMargin: "0px 0px -8% 0px"
    });

    items.forEach((item) => observer.observe(item));
  }

  function setupSelectedProjects() {
    const stage = $(".slider-stage");
    if (!stage) return;
    const sliderArea = stage.closest("#selected") || stage.parentElement;
    if (stage.dataset.selectedProjectsReady === "true") {
      if (typeof stage._songStudioRefreshSelectedProjects === "function") {
        stage._songStudioRefreshSelectedProjects();
      }
      return;
    }
    const progress = $(".slider-progress i", stage);
    const progressWrap = $(".slider-progress", stage);
    const originalCards = () => $$(".slider-card:not([data-slider-clone='true'])", stage);
    const loopCards = () => $$(".slider-card[data-slider-clone='true']", stage);
    let refreshAutoPaused = () => {};
    const refreshLoopCards = () => {
      loopCards().forEach((card) => card.remove());
      $("[data-slider-loop-spacer]", stage)?.remove();
      $("[data-slider-loop-tail]", stage)?.remove();
      const cards = originalCards();
      cards.forEach((card) => {
        card.setAttribute("role", "link");
        card.setAttribute("tabindex", "0");
        $$("img", card).forEach((img) => {
          img.draggable = false;
        });
      });
      if (cards.length > 1 && progressWrap) {
        cards.forEach((card) => {
          const clone = card.cloneNode(true);
          clone.classList.remove("is-front", "is-middle", "is-back");
          clone.classList.add("is-loop-copy");
          clone.dataset.sliderClone = "true";
          clone.setAttribute("aria-hidden", "true");
          clone.setAttribute("tabindex", "-1");
          stage.insertBefore(clone, progressWrap);
        });
        const firstClone = loopCards()[0];
        const loopDistance = firstClone.offsetLeft - cards[0].offsetLeft;
        const tail = document.createElement("span");
        tail.dataset.sliderLoopTail = "true";
        tail.setAttribute("aria-hidden", "true");
        // A short non-card tail lets a two-group loop reach the clone boundary
        // even when one original group is narrower than the viewport.
        tail.style.flex = `0 0 ${Math.max(1, Math.ceil(stage.clientWidth - loopDistance + 1))}px`;
        stage.insertBefore(tail, progressWrap);
        stage.classList.add("is-scrollable");
        stage.dataset.loopReady = "true";
      } else {
        stage.classList.remove("is-scrollable");
        delete stage.dataset.loopReady;
      }
      refreshAutoPaused();
    };

    function loopWidth() {
      const firstOriginal = originalCards()[0];
      const firstClone = loopCards()[0];
      if (!firstOriginal || !firstClone) return 0;
      return Math.max(0, firstClone.offsetLeft - firstOriginal.offsetLeft);
    }

    function normalizeScroll() {
      if (hoverPaused || pointerActive || dragging || userPaused) return;
      const width = loopWidth();
      if (!width) return;
      while (stage.scrollLeft >= width) stage.scrollLeft -= width;
    }

    function updateProgress() {
      if (!progress || !stage) return;
      const width = loopWidth();
      if (!width) return;
      const ratio = Math.min(1, Math.max(0, stage.scrollLeft / width));
      progress.style.transform = `translateX(${ratio * 400}%)`;
    }

    let autoPaused = originalCards().length <= 1;
    let hoverPaused = false;
    let userPaused = false;
    let userPauseTimer = 0;
    let dragging = false;
    let pointerActive = false;
    refreshAutoPaused = () => {
      autoPaused = originalCards().length <= 1 || hoverPaused || userPaused || pointerActive || dragging;
    };
    refreshAutoPaused();
    const pauseBriefly = (duration = 1300) => {
      userPaused = true;
      refreshAutoPaused();
      window.clearTimeout(userPauseTimer);
      userPauseTimer = window.setTimeout(() => {
        userPaused = false;
        refreshAutoPaused();
      }, duration);
    };

    sliderArea?.addEventListener("pointerenter", () => {
      hoverPaused = true;
      refreshAutoPaused();
    });

    sliderArea?.addEventListener("pointerleave", () => {
      hoverPaused = false;
      refreshAutoPaused();
    });

    stage.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const before = stage.scrollLeft;
      pauseBriefly();
      stage.scrollLeft += event.deltaY * .85;
      updateProgress();
      if (stage.scrollLeft !== before) event.preventDefault();
    }, { passive: false });

    const dragThreshold = 12;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    let suppressNextClick = false;
    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      pointerActive = true;
      dragging = false;
      moved = false;
      suppressNextClick = false;
      startX = event.clientX;
      startScroll = stage.scrollLeft;
      refreshAutoPaused();
    });
    stage.addEventListener("pointermove", (event) => {
      if (!pointerActive) return;
      const delta = event.clientX - startX;
      if (!dragging && Math.abs(delta) < dragThreshold) return;
      if (!dragging) {
        dragging = true;
        moved = true;
        stage.classList.add("is-dragging");
        refreshAutoPaused();
        try {
          if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is a drag aid only; card clicks should keep working without it.
        }
      }
      stage.scrollLeft = startScroll - delta;
      updateProgress();
    });
    const stopDrag = (event) => {
      if (!pointerActive) return;
      pointerActive = false;
      dragging = false;
      stage.classList.remove("is-dragging");
      suppressNextClick = moved;
      refreshAutoPaused();
      if (moved) pauseBriefly(900);
      if (event?.pointerId !== undefined && stage.hasPointerCapture?.(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
      window.setTimeout(() => {
        moved = false;
        suppressNextClick = false;
      }, 250);
    };
    stage.addEventListener("pointerup", stopDrag);
    stage.addEventListener("pointercancel", stopDrag);
    stage.dataset.dragMoved = "false";
    if (stage.dataset.projectClickReady !== "true") {
      stage.addEventListener("click", (event) => {
        const card = event.target.closest(".slider-card");
        if (!card || !stage.contains(card) || card.hidden) return;
        const href = card.getAttribute("href") || card.dataset.detailHref || "";
        if (!href) return;
        event.preventDefault();
        if (suppressNextClick) {
          suppressNextClick = false;
          moved = false;
          return;
        }
        window.location.assign(new URL(href, window.location.href).href);
      });
      stage.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const card = event.target.closest(".slider-card");
        if (!card || card.hidden) return;
        const href = card.getAttribute("href") || card.dataset.detailHref || "";
        if (!href) return;
        event.preventDefault();
        window.location.assign(new URL(href, window.location.href).href);
      });
      stage.dataset.projectClickReady = "true";
    }
    stage.dataset.selectedProjectsReady = "true";
    stage._songStudioRefreshSelectedProjects = refreshLoopCards;
    refreshLoopCards();
    updateProgress();
    let refreshQueued = false;
    const scheduleLoopRefresh = () => {
      if (refreshQueued) return;
      refreshQueued = true;
      requestAnimationFrame(() => {
        refreshQueued = false;
        refreshLoopCards();
        updateProgress();
      });
    };
    const loopObserver = new MutationObserver(() => {
      const cards = originalCards();
      const clones = loopCards();
      const needsClones = cards.length > 1;
      const cloneOrderMatches = clones.length === cards.length
        && clones.every((clone, index) => clone.dataset.projectId === cards[index].dataset.projectId);
      if ((needsClones && !cloneOrderMatches) || (!needsClones && clones.length)) {
        scheduleLoopRefresh();
      }
    });
    loopObserver.observe(stage, { childList: true });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Front-end bindings replace the original cards during initial render.
        scheduleLoopRefresh();
      });
    });

    let lastFrame = performance.now();
    function autoScroll(now) {
      const delta = Math.min(40, now - lastFrame);
      lastFrame = now;
      if (hoverPaused || pointerActive || dragging || userPaused) {
        requestAnimationFrame(autoScroll);
        return;
      }
      if (!autoPaused && !document.hidden && stage.dataset.loopReady === "true") {
        stage.scrollLeft += delta * .075;
        normalizeScroll();
        updateProgress();
      }
      requestAnimationFrame(autoScroll);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(autoScroll);
    });
  }

  function transitionTo(url) {
    if (!url || reduceMotion) {
      window.location.href = url;
      return;
    }
    let overlay = $(".page-transition");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "page-transition";
      overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
    }
    root.classList.add("is-transitioning");
    window.setTimeout(() => {
      window.location.href = url;
    }, 360);
  }

  function setupProjectLinkTransitions() {
    $$("a[href]").forEach((link) => {
      if (link.classList.contains("slider-card")) return;
      const href = link.getAttribute("href") || "";
      const isProjectLink = href.startsWith("project.html") || href.includes("/project.html");
      if (!isProjectLink) return;
      link.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.target && link.target !== "_self") return;
        event.preventDefault();
        transitionTo(link.href);
      });
    });
  }

  function setupNavMenu() {
    const navs = $$(".site-nav");
    if (!navs.length) return;
    const close = (nav) => {
      const toggle = $(".nav-menu-toggle", nav);
      nav.classList.remove("nav-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    };
    navs.forEach((nav) => {
      const toggle = $(".nav-menu-toggle", nav);
      if (!toggle || nav.dataset.navMenuReady === "true") return;
      nav.dataset.navMenuReady = "true";
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
      $$("nav a, .ref-book", nav).forEach((link) => link.addEventListener("click", () => close(nav)));
    });
    document.addEventListener("click", (event) => {
      navs.forEach((nav) => {
        if (!nav.contains(event.target)) close(nav);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") navs.forEach(close);
    });
  }

  function setupDirectionPreview() {
    const directionLinks = $$("[data-direction]");
    const previewSpace = $(".service-preview-space");
    const previewImage = $("[data-direction-preview-image]");
    const previewTitle = $("[data-direction-preview-title]");
    const previewDescription = $("[data-direction-preview-description]");
    if (!directionLinks.length || !previewSpace || !previewImage) return;

    let currentDirection = directionLinks.find((item) => item.classList.contains("active"))?.dataset.direction || "";

    function applyPreviewCrop(link) {
      previewImage.style.setProperty("--media-shift-x", `${link.dataset.previewCropX || 0}%`);
      previewImage.style.setProperty("--media-shift-y", `${link.dataset.previewCropY || 0}%`);
      previewImage.style.setProperty("--media-zoom", link.dataset.previewZoom || 1);
    }

    function setDirectionPreview(link, force = false) {
      const nextDirection = link.dataset.direction;
      if (!force && currentDirection === nextDirection) return;
      directionLinks.forEach((item) => item.classList.toggle("active", item === link));
      previewImage.src = link.dataset.previewImage || "";
      previewImage.alt = `${link.dataset.previewTitle || "Direction"} preview`;
      applyPreviewCrop(link);
      if (previewTitle) previewTitle.textContent = link.dataset.previewTitle || "";
      if (previewDescription) previewDescription.textContent = link.dataset.previewDescription || "";
      currentDirection = nextDirection;
    }

    const activeLink = directionLinks.find((item) => item.classList.contains("active")) || directionLinks[0];
    if (activeLink) setDirectionPreview(activeLink, true);

    directionLinks.forEach((link) => {
      if (link.dataset.previewBound === "true") return;
      link.dataset.previewBound = "true";
      link.addEventListener("mouseenter", () => setDirectionPreview(link));
      link.addEventListener("focus", () => setDirectionPreview(link));
      link.addEventListener("click", () => setDirectionPreview(link));
    });
  }

  ready();
  setupReveals();
  setupSelectedProjects();
  setupNavMenu();
  setupDirectionPreview();
  setupProjectLinkTransitions();
  window.addEventListener("song-studio-content-bound", setupDirectionPreview);
  window.addEventListener("song-studio-content-bound", setupSelectedProjects);
})();
function fitProjectHeroTitle() {
  const title = document.querySelector(".case-title-block h1");
  if (!title) return;

  const container = title.parentElement;
  if (!container) return;

  const computed = window.getComputedStyle(title);

  if (!title.dataset.fitOriginalSize) {
    title.dataset.fitOriginalSize = parseFloat(computed.fontSize);
  }

  const originalSize = Number(title.dataset.fitOriginalSize);
  const minSize = 34;

  let size = originalSize;

  title.style.whiteSpace = "nowrap";
  title.style.wordBreak = "keep-all";
  title.style.overflowWrap = "normal";
  title.style.writingMode = "horizontal-tb";
  title.style.fontSize = `${size}px`;

  const availableWidth = container.clientWidth;

  while (title.scrollWidth > availableWidth && size > minSize) {
    size -= 1;
    title.style.fontSize = `${size}px`;
  }

  if (title.scrollWidth > availableWidth && size <= minSize) {
    title.style.whiteSpace = "normal";
    title.style.wordBreak = "keep-all";
    title.style.overflowWrap = "normal";
    title.style.lineHeight = "0.95";
  }
}

window.addEventListener("load", fitProjectHeroTitle);
window.addEventListener("resize", fitProjectHeroTitle);
document.addEventListener("DOMContentLoaded", fitProjectHeroTitle);

if ("ResizeObserver" in window) {
  const titleObserver = new ResizeObserver(() => fitProjectHeroTitle());
  window.addEventListener("load", () => {
    const title = document.querySelector(".case-title-block h1");
    if (title && title.parentElement) {
      titleObserver.observe(title.parentElement);
    }
  });
}
