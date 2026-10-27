(() => {
  const STORAGE_KEY = "song-studio-visual-editor-home-locked";
  const REFRESH_KEY = "song-studio-editor-refresh-signal";
  const TYPE_ECHO_COVER_CROP_RESET_KEY = "song-studio-type-echo-cover-crop-reset-v1";
  const savedRaw = localStorage.getItem(STORAGE_KEY);
  const hasSavedState = Boolean(savedRaw);
  const isAdminPreview = new URLSearchParams(window.location.search).has("adminPreview");
  const fallback = window.SONG_STUDIO_DATA || {};
  let data = fallback;
  let previewActiveTypeKey = "";
  let previewActiveTypeSelector = "";

  function resetTypeEchoCoverCropOnce(next) {
    if (localStorage.getItem(TYPE_ECHO_COVER_CROP_RESET_KEY)) return false;
    const key = "project:type-echo:coverImage";
    const removed = Boolean(next.imageCrops?.[key]);
    if (removed) delete next.imageCrops[key];
    localStorage.setItem(TYPE_ECHO_COVER_CROP_RESET_KEY, "1");
    return removed;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function mergeDefaults(base, override) {
    if (Array.isArray(base)) return Array.isArray(override) ? override : clone(base);
    if (!base || typeof base !== "object") return override === undefined ? base : override;
    const output = { ...base };
    if (!override || typeof override !== "object" || Array.isArray(override)) return output;
    Object.keys(override).forEach((key) => {
      output[key] = mergeDefaults(base[key], override[key]);
    });
    return output;
  }

  function normalizeData(value) {
    const next = mergeDefaults(fallback, value || fallback);
    if (!Array.isArray(next.projects)) next.projects = [];
    if (!Array.isArray(next.categories)) next.categories = [];
    if (!Array.isArray(next.assets)) next.assets = [];
    if (!next.imageCrops || typeof next.imageCrops !== "object" || Array.isArray(next.imageCrops)) next.imageCrops = {};
    next.projects.forEach((project) => {
      project.thumbnailImage = normalizeStoredImagePath(project.thumbnailImage || project.coverImage || project.detailThumbnailImage);
      project.coverImage = normalizeStoredImagePath(project.coverImage || project.detailThumbnailImage || project.thumbnailImage);
      const legacyHeroImage = normalizeStoredImagePath(project.heroImage);
      project.detailImages = (project.detailImages || []).map(normalizeDetailImageItem).filter(Boolean);
      if (legacyHeroImage && detailImageSrc(project.detailImages[0]) !== legacyHeroImage) {
        project.detailImages.unshift({ src: legacyHeroImage, layout: "wide", displayMode: "fixed16x9" });
      }
      delete project.heroImage;
      delete project.detailThumbnailImage;
    });
    next.categories.forEach((category) => {
      category.coverImage = normalizeStoredImagePath(category.coverImage);
    });
    if (next.home?.hero) next.home.hero.backgroundImage = normalizeStoredImagePath(next.home.hero.backgroundImage);
    if (next.home?.projectDirectory) {
      next.home.projectDirectory.previewImage = normalizeStoredImagePath(next.home.projectDirectory.previewImage);
      next.home.projectDirectory.descriptionStyle = {
        size: 17,
        weight: 560,
        lineHeight: 1.45,
        letterSpacing: 0,
        ...(next.home.projectDirectory.descriptionStyle || {})
      };
    }
    if (next.home?.footerContact) {
      next.home.footerContact.backgroundImage = normalizeStoredImagePath(next.home.footerContact.backgroundImage);
      next.home.footerContact.qrImage = normalizeStoredImagePath(next.home.footerContact.qrImage);
    }
    next.assets.forEach((asset) => {
      asset.src = normalizeStoredImagePath(asset.src);
      if (asset.cropOffsetX === undefined) asset.cropOffsetX = 0;
      if (asset.cropOffsetY === undefined) asset.cropOffsetY = 0;
      if (asset.zoom === undefined) asset.zoom = 1;
    });
    next.assets = next.assets.filter((asset) => asset.src);
    if (!next.home) next.home = {};
    if (!next.settings) next.settings = {};
    return next;
  }

  function normalizeStoredImagePath(value = "") {
    let path = String(value || "").trim().replace(/\\/g, "/");
    if (!path || /^(blob:|data:image|file:)/i.test(path)) return "";
    const assetsIndex = path.indexOf("/assets/");
    if (assetsIndex >= 0) path = path.slice(assetsIndex + 1);
    path = path.replace(/^\/+assets\//, "assets/");
    path = path.replace(/^\.\.\/assets\//, "assets/");
    path = path.replace(/^assets\/images\/images\//, "assets/images/");
    if (path.startsWith("images/")) return `assets/${path}`.replace(/^assets\/images\/images\//, "assets/images/");
    if (path.startsWith("assets/images/")) return path;
    if (path.startsWith("assets/")) return `assets/images/${path.split("/").pop()}`;
    if (/^https?:\/\//i.test(path)) {
      try {
        return `assets/images/${new URL(path).pathname.split("/").pop() || ""}`;
      } catch {
        return "";
      }
    }
    return `assets/images/${path.split("/").pop()}`;
  }

  function detailImageSrc(item = "") {
    return typeof item === "string" ? item : item?.src || "";
  }

  function isVideoSource(src = "") {
    return /\.mp4(?:[?#].*)?$/i.test(String(src));
  }

  function normalizeDetailImageItem(item = "") {
    const src = normalizeStoredImagePath(detailImageSrc(item));
    if (!src) return null;
    const layout = typeof item === "object" && item?.layout ? item.layout : "auto";
    const displayMode = typeof item === "object" && item?.displayMode ? item.displayMode : "fixed16x9";
    const detail = {
      src,
      layout: ["wide", "half", "small", "auto"].includes(layout) ? layout : "auto",
      displayMode: ["fixed16x9", "natural"].includes(displayMode) ? displayMode : "fixed16x9"
    };
    if (typeof item === "object" && item?.seamlessGroupId) detail.seamlessGroupId = String(item.seamlessGroupId);
    return detail;
  }

  try {
    data = normalizeData(savedRaw ? JSON.parse(savedRaw) : fallback);
    
    if (hasSavedState && resetTypeEchoCoverCropOnce(data)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(REFRESH_KEY, String(Date.now()));
    }
  } catch {
    data = normalizeData(fallback);
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const text = (selector, value, root = document) => {
    const node = $(selector, root);
    if (node && value !== undefined && value !== null) node.textContent = value;
  };
  const html = (selector, value, root = document) => {
    const node = $(selector, root);
    if (node && value !== undefined && value !== null) node.innerHTML = value;
  };
  const labelHtml = (selector, value, root = document) => {
    if (value === undefined || value === null) return;
    html(selector, `<i></i> ${escapeHtml(value)}`, root);
  };
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
  const imageUrl = (src = "") => {
    if (!src) return "";
    if (/^(blob:|data:image|file:|\/Users\/|\/private\/|\/var\/)/i.test(src)) return "";
    return normalizeStoredImagePath(src);
  };
  const setImage = (selector, src, alt = "", root = document) => {
    const img = $(selector, root);
    if (!img || !src) return;
    img.src = imageUrl(src);
    img.alt = alt;
  };
  const assetFor = (src = "") => {
    const normalized = imageUrl(src);
    return (data.assets || []).find((asset) => {
      const assetSrc = imageUrl(asset.src);
      return asset.src === src || asset.src === normalized || assetSrc === src || assetSrc === normalized || asset.src === String(src).replace(/^\.\.\//, "");
    });
  };
  const imageCropKey = (type, owner, field, index = "") => [type, owner, field, index].filter((item) => item !== "").join(":");
  const cropFor = (key = "", src = "") => {
    const normalized = imageUrl(src);
    const crop = data.imageCrops?.[key];
    if (!crop || crop.src !== normalized) {
      return {
        x: 0,
        y: 0,
        zoom: 1
      };
    }
    return {
      x: Number(crop.cropOffsetX || 0),
      y: Number(crop.cropOffsetY || 0),
      zoom: Number(crop.zoom || 1)
    };
  };
  const applyImageCrop = (selector, src, root = document, cropKey = "") => {
    const img = $(selector, root);
    if (!img) return;
    const crop = cropFor(cropKey, src);
    img.style.setProperty("--media-shift-x", `${crop.x}%`);
    img.style.setProperty("--media-shift-y", `${crop.y}%`);
    img.style.setProperty("--media-zoom", crop.zoom);
    img.style.objectPosition = "center";
    img.style.objectFit = "contain";
  };
  const setCroppedImage = (selector, src, alt = "", root = document, cropKey = "") => {
    setImage(selector, src, alt, root);
    applyImageCrop(selector, src, root, cropKey);
  };
  const cropStyle = (src = "", cropKey = "") => {
    const crop = cropFor(cropKey, src);
    return `--media-shift-x:${crop.x}%;--media-shift-y:${crop.y}%;--media-zoom:${crop.zoom};object-position:center;object-fit:contain;`;
  };
  const applyDirectionDescriptionStyle = () => {
    const style = data.home?.projectDirectory?.descriptionStyle || {};
    $$("[data-direction-preview-description]").forEach((node) => {
      if (style.size) node.style.fontSize = `${Number(style.size)}px`;
      if (style.weight) node.style.fontWeight = String(style.weight);
      if (style.lineHeight) node.style.lineHeight = String(style.lineHeight);
      if (style.letterSpacing !== undefined && style.letterSpacing !== "") node.style.letterSpacing = `${Number(style.letterSpacing)}px`;
    });
  };
  const visible = (item) => item?.visible !== false;
  const sorted = (items = []) => [...items].filter(visible).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const sortedProjects = (items = []) => [...items].filter(visible).sort((a, b) => {
    const categoryDiff = (a.categorySortOrder || 0) - (b.categorySortOrder || 0);
    if (categoryDiff) return categoryDiff;
    return (a.carouselSortOrder || 0) - (b.carouselSortOrder || 0);
  });
  const categoryById = (id) => (data.categories || []).find((item) => item.id === id);
  const projectById = (id) => (data.projects || []).find((item) => item.id === id || item.slug === id);

  if (isAdminPreview) {
    document.documentElement.classList.remove("motion-ready");
    document.documentElement.classList.add("is-loaded", "is-admin-preview");
    const previewStyle = document.createElement("style");
    previewStyle.textContent = `
      html { scroll-behavior: auto !important; }
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
      .edit-entry { display: none !important; }
    `;
    document.head.appendChild(previewStyle);
  }

  function multiline(value = "") {
    return escapeHtml(value).replace(/\n/g, "<br />");
  }

  function applyTypography() {
    const typography = data.settings?.typography || {};
    const fonts = typography.fontLibrary || [];
    const css = fonts
      .filter((font) => font.name && font.dataUrl)
      .map((font) => `
        @font-face {
          font-family: "${font.name.replace(/"/g, '\\"')}";
          src: url("${font.dataUrl}") format("${fontFormat(font.fileName)}");
          font-display: swap;
        }
      `).join("\n");
    let style = $("#song-studio-uploaded-fonts");
    if (!style) {
      style = document.createElement("style");
      style.id = "song-studio-uploaded-fonts";
      document.head.appendChild(style);
    }
    style.textContent = css;
    style.textContent += `\n${typeStyleOverrides(typography.styles || {})}`;
    if (typography.fontEn?.name) {
      document.documentElement.style.setProperty("--font-en", `"${typography.fontEn.name}", Inter, Arial, sans-serif`);
    }
    if (typography.fontZh?.name) {
      document.documentElement.style.setProperty("--font-zh", `"${typography.fontZh.name}", "Noto Sans SC", Inter, Arial, sans-serif`);
    }
    if (typography.fontHandwriting?.name) {
      document.documentElement.style.setProperty("--thank-hand-font", `"${typography.fontHandwriting.name}", "Brush Script MT", "Segoe Script", cursive`);
    }
  }

  function fontFormat(fileName = "") {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "woff2") return "woff2";
    if (ext === "woff") return "woff";
    if (ext === "otf") return "opentype";
    return "truetype";
  }

  const TYPE_SIZE_FLOORS = {
    display: 38,
    sectionTitle: 24,
    cardTitle: 16,
    body: 14,
    meta: 12,
    button: 12
  };

  function typeRule(selector, style, sizeRole = "body") {
    if (!style) return "";
    const declarations = [
      style.size ? `font-size:${responsiveFontSize(style.size, sizeRole)} !important` : "",
      style.weight ? `font-weight:${style.weight} !important` : "",
      style.lineHeight ? `line-height:${style.lineHeight} !important` : "",
      style.letterSpacing !== undefined ? `letter-spacing:${style.letterSpacing}px !important` : "",
      style.maxWidth ? `max-width:${style.maxWidth}px !important` : "",
      style.textTransform ? `text-transform:${style.textTransform} !important` : ""
    ].filter(Boolean).join(";");
    return declarations ? `${selector}{${declarations}}${responsiveFontMedia(selector, style.size, sizeRole)}` : "";
  }

  function responsiveFontSize(size, sizeRole = "body", scale = 1) {
    const value = Number(size);
    if (!Number.isFinite(value)) return `${size}px`;
    const floor = TYPE_SIZE_FLOORS[sizeRole] || TYPE_SIZE_FLOORS.body;
    return `${Math.max(floor, Number((value * scale).toFixed(2)))}px`;
  }

  function responsiveFontMedia(selector, size, sizeRole = "body") {
    const value = Number(size);
    if (!Number.isFinite(value)) return "";
    return `@media (max-width:1024px){${selector}{font-size:${responsiveFontSize(value, sizeRole, 0.92)} !important}}@media (max-width:767.98px){${selector}{font-size:${responsiveFontSize(value, sizeRole, 0.82)} !important}}`;
  }

  function responsiveDisplayRule(selector, style) {
  if (!style?.size) return typeRule(selector, style);

  const max = Number(style.size);
  if (!Number.isFinite(max)) return typeRule(selector, style);

  const tablet = Math.max(32, Math.round(max * 0.76));
  const small = Math.max(28, Math.round(max * 0.62));
  const mobile = Math.max(26, Math.round(max * 0.5));

  const baseDeclarations = [
    `font-size:${max}px !important`,
    style.weight ? `font-weight:${style.weight} !important` : "",
    style.lineHeight ? `line-height:${style.lineHeight} !important` : "",
    style.letterSpacing !== undefined ? `letter-spacing:${style.letterSpacing}px !important` : "",
    style.maxWidth ? `max-width:${style.maxWidth}px !important` : "",
    style.textTransform ? `text-transform:${style.textTransform} !important` : ""
  ].filter(Boolean).join(";");

  return `
${selector}{${baseDeclarations}}

@media (max-width: 1100px) {
  ${selector}{font-size:${tablet}px !important;}
}

@media (max-width: 860px) {
  ${selector}{font-size:${small}px !important;}
}

@media (max-width: 560px) {
  ${selector}{font-size:${mobile}px !important;}
}
`;
}
function caseTitleResponsiveRule(style) {
  if (!style?.size) return "";

  const max = Math.round(Number(style.size) * 0.7);
  if (!Number.isFinite(max)) return "";

  const tablet = Math.max(38, Math.round(max * 0.9));
  const small = Math.max(34, Math.round(max * 0.78));
  const mobile = Math.max(32, Math.round(max * 0.66));

  const baseDeclarations = [
    `font-size:${max}px !important`,
    style.weight ? `font-weight:${style.weight} !important` : "",
    style.lineHeight ? `line-height:${style.lineHeight} !important` : "",
    style.letterSpacing !== undefined ? `letter-spacing:${style.letterSpacing}px !important` : "",
    style.maxWidth ? `max-width:${style.maxWidth}px !important` : "",
    style.textTransform ? `text-transform:${style.textTransform} !important` : "",
    "writing-mode:horizontal-tb !important",
    "word-break:keep-all !important",
    "overflow-wrap:normal !important",
    "white-space:nowrap !important",
    "overflow:hidden !important",
    "text-overflow:ellipsis !important"
  ].filter(Boolean).join(";");

  return `
.case-title-block h1 {
  ${baseDeclarations};
}

@media (max-width: 1100px) {
  .case-title-block h1 {
    font-size:${tablet}px !important;
  }
}

@media (max-width: 860px) {
  .case-title-block h1 {
    font-size:${small}px !important;
  }
}

@media (max-width: 560px) {
  .case-title-block h1 {
    font-size:${mobile}px !important;
  }
}
`;
}
  function typeStyleOverrides(styles = {}) {
    const typeLayerSelectors = {
      display: "#hero h1,#contact .thank-title-wrap h2,#contact .thank-title-wrap h1",
      sectionTitle: "#selected h2,#directions .service-list strong,#works .work-category-head h3",
      cardTitle: ".work-thumb-card strong,.case-other-card strong",
      body: ".feature-copy > p,#numbers .numbers-head p,.work-category-head p,#contact .thank-title-wrap > p,.case-title-block > p:not(.ref-kicker),.case-copy-text h2,.case-copy-text p,.case-other-head h2,.case-other-head > p",
      meta: ".accent-label,.accent-label.t-label,p.accent-label,p.accent-label.t-label,.t-label,.case-meta-grid span,.case-meta-grid strong,.service-list strong span,.work-thumb-card em",
      button: ".ref-actions a,.thank-home,.ref-book,.case-book"
    };
    return [
      responsiveDisplayRule(typeLayerSelectors.display, styles.h1En),
       caseTitleResponsiveRule(styles.h1En),
      typeRule(typeLayerSelectors.sectionTitle, styles.h2En, "sectionTitle"),
      typeRule(typeLayerSelectors.cardTitle, styles.h3Zh, "cardTitle"),
      typeRule(typeLayerSelectors.body, styles.bodyEn, "body"),
      typeRule(typeLayerSelectors.meta, styles.metaEn, "meta"),
      typeRule(typeLayerSelectors.button, styles.buttonEn, "button"),
      previewTypeHighlight(previewActiveTypeKey, previewActiveTypeSelector)
    ].join("\n");
  }

  function previewTypeHighlight(key = "", selectorOverride = "") {
    if (!isAdminPreview) return "";
    const selectors = {
      h1En: "#hero h1,#contact .thank-title-wrap h2,#contact .thank-title-wrap h1,.case-title-block h1",
      h2En: "#selected h2,#directions .service-list strong,#works .work-category-head h3",
      h3Zh: ".work-thumb-card strong,.case-other-card strong",
      bodyEn: ".feature-copy > p,#numbers .numbers-head p,.work-category-head p,#contact .thank-title-wrap > p,.case-title-block > p:not(.ref-kicker),.case-copy-text h2,.case-copy-text p,.case-other-head h2,.case-other-head > p",
      metaEn: ".accent-label,.t-label,.case-meta-grid span,.case-meta-grid strong,.service-list strong span,.work-thumb-card span,.ref-nav nav a,.ref-brand span,.ref-book span",
      buttonEn: ".ref-actions a,.thank-home,.ref-book,.case-book"
    };
    const selector = selectorOverride || selectors[key];
    if (!selector) return "";
    return `${selector},.admin-preview-focus{outline:3px solid #ff3b4f !important;outline-offset:6px !important;background:rgba(255,59,79,.14) !important;box-shadow:0 0 0 10px rgba(255,59,79,.08) !important;}`;
  }

  function applyNavigation() {
    const settings = data.settings || {};
    $$(".ref-brand span").forEach((node) => {
      node.textContent = settings.brandName || node.textContent;
    });
    const nav = $(".ref-hero .ref-nav nav");
    const items = sorted(data.navigation?.items);
    if (nav && items.length) {
      nav.innerHTML = items.map((item, index) => {
        const badge = item.badge ? ` <b>${escapeHtml(item.badge)}</b>` : "";
        return `<a class="${index === 0 ? "active" : ""}" href="${escapeHtml(item.href || "#")}">${escapeHtml(item.label || "")}${badge}</a>`;
      }).join("");
    }
    const intro = data.navigation?.introButton || {};
    const book = $(".ref-book");
    if (book && visible(intro)) {
      book.href = intro.href || book.href;
      setImage("img", intro.image, "", book);
      text("span", intro.label, book);
    }
  }

  function applyHero() {
    const hero = data.home?.hero || {};
    if (!visible(hero)) return;
    setCroppedImage(".ref-hero-bg", hero.backgroundImage, "", document, "home.hero.backgroundImage");
    labelHtml("#hero .ref-kicker", hero.label);
    html("#hero h1", multiline(hero.title));
    html(".ref-hero-side h2", multiline(hero.sideTitle));
    const actions = $$(".ref-actions a");
    if (actions[0] && hero.primaryButton) {
      actions[0].textContent = hero.primaryButton.label || actions[0].textContent;
      actions[0].href = hero.primaryButton.href || actions[0].href;
    }
    if (actions[1] && hero.secondaryButton) {
      actions[1].textContent = hero.secondaryButton.label || actions[1].textContent;
      actions[1].href = hero.secondaryButton.href || actions[1].href;
    }
    const bottom = $(".ref-hero-bottom");
    if (bottom && hero.bottomLabels?.length) {
      bottom.innerHTML = hero.bottomLabels.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
    }
  }

  function applyLogoShowcase() {
    const showcase = data.home?.logoShowcase || {};
    if (!visible(showcase)) return;
    text("#showcase > p", showcase.description);
    const track = $(".logo-track");
    const items = sorted(showcase.items);
    if (track && items.length) {
      track.innerHTML = items.map((item) => `<span>${escapeHtml(item.label || "")}</span>`).join("");
    }
  }

  function applyFeatured() {
    const featured = data.home?.featuredCarousel || {};
    if (!visible(featured)) return;
    labelHtml("#selected .accent-label", featured.label);
    html("#selected h2", multiline(featured.title));
    html("#selected .feature-copy > p:last-child", multiline(featured.description));
    const featuredProjects = [...(data.projects || [])]
      .filter((project) => visible(project) && project.featuredOnHome)
      .sort((a, b) => (a.carouselSortOrder || 0) - (b.carouselSortOrder || 0));
    const fallbackProjects = (featured.projectIds || []).map(projectById).filter(Boolean).filter(visible);
    const projects = featuredProjects.length ? featuredProjects : fallbackProjects;
    const stage = $(".slider-stage");
    if (!stage) return;
    const progress = $(".slider-progress", stage);
    if (!progress) return;
    const insertBefore = $(".slider-card[data-slider-clone='true']", stage) || progress;
    $$(".slider-card:not([data-slider-clone='true'])", stage).forEach((card) => card.remove());
    projects.forEach((project, index) => {
      const card = document.createElement("a");
      card.className = `slider-card is-loop-copy ${index === 0 ? "is-front" : index === 1 ? "is-middle" : index === 2 ? "is-back" : ""}`.trim();
      card.dataset.projectId = project.id;
      const detailHref = `project.html?id=${encodeURIComponent(project.id)}`;
      card.dataset.detailHref = detailHref;
      card.setAttribute("href", detailHref);
      card.innerHTML = "<img alt=\"\" />";
      stage.insertBefore(card, insertBefore);
      setCroppedImage("img", project.thumbnailImage || project.coverImage, project.title || project.titleEn, card, imageCropKey("project", project.id, project.thumbnailImage ? "thumbnailImage" : "coverImage"));
    });
  }

  function applyNumbers() {
    const numbers = data.home?.numbers || {};
    if (!visible(numbers)) return;
    labelHtml("#numbers .accent-label", numbers.label);
    html("#numbers h2", multiline(numbers.title));
    const grid = $(".numbers-grid");
    const items = sorted(numbers.items).slice(0, 3);
    if (grid && items.length) {
      grid.innerHTML = items.map((item) => `<article><strong>${escapeHtml(item.value || "")}</strong><span>${escapeHtml(item.label || "")}</span></article>`).join("");
    }
  }

  function applyDirections() {
    const directory = data.home?.projectDirectory || {};
    if (!visible(directory)) return;
    labelHtml("#directions .accent-label", directory.label);
    const list = $(".service-list");
    const ids = directory.categoryIds?.length
  ? directory.categoryIds.slice(0, 3)
  : sorted(data.categories).slice(0, 3).map((item) => item.id);
    const categories = ids.map(categoryById).filter(Boolean).filter(visible);
    if (list && categories.length) {
      list.innerHTML = categories.map((cat, index) => {
        const crop = cropFor(imageCropKey("category", cat.id, "coverImage"), cat.coverImage);
        return `
        <a class="${index === 0 ? "active" : ""}" 
        href="#works-${escapeHtml(cat.id)}" 
        data-direction="${escapeHtml(cat.id)}" 
        data-preview-image="${escapeHtml(imageUrl(cat.coverImage))}" 
        data-preview-crop-x="${crop.x}" 
        data-preview-crop-y="${crop.y}" 
        data-preview-zoom="${crop.zoom}" 
        data-preview-title="${escapeHtml(cat.rightTitle || cat.name)}" 
        data-preview-description="${escapeHtml(cat.rightDescription || cat.longDescription || cat.shortDescription || "")}">
          <strong class="t-service-en">${escapeHtml(cat.name || "")} <span>${escapeHtml(cat.number || String(index + 1).padStart(2, "0"))}</span></strong>
        </a>
      `;
      }).join("");
    }
    const first = categories[0];
    if (first) {
      setCroppedImage("[data-direction-preview-image]", first.coverImage, `${first.name} preview`, document, imageCropKey("category", first.id, "coverImage"));
      text("[data-direction-preview-title]", first.rightTitle || first.name);
      text("[data-direction-preview-description]", first.rightDescription || first.longDescription || first.shortDescription || "");
      applyDirectionDescriptionStyle();
    }
  }

  function workCard(project, index, category) {
    const title = project.title || project.titleEn || "Untitled";
    const image = project.coverImage || project.thumbnailImage || "";
    const cropKey = imageCropKey("project", project.id, project.coverImage ? "coverImage" : "thumbnailImage");
    const label = `${String(index + 1).padStart(2, "0")} / ${category?.name || project.services || ""}`;
    return `
      <a class="work-thumb-card" href="project.html?id=${encodeURIComponent(project.id)}" data-project-id="${escapeHtml(project.id)}">
        <div class="work-thumb-media">
  <img src="${escapeHtml(imageUrl(image))}" alt="${escapeHtml(title)}" style="${escapeHtml(cropStyle(image, cropKey))}" data-crop-image />
</div>
        <div class="creative-meta">
          <strong class="t-project-zh">${escapeHtml(title)}</strong>
          <span class="t-meta-en">${escapeHtml(label)}</span>
        </div>
      </a>
    `;
  }

  function applyProjectIndex() {
    const indexData = data.home?.projectIndex || {};
    if (!visible(indexData)) return;
    labelHtml("#works .work-kicker", indexData.label);
    html("#works .work-category-head h3", multiline(indexData.title));
    html("#works .work-category-head p", multiline(indexData.intro));
    const list = $(".work-category-list");
    if (!list) return;
    const categories = sorted(data.categories || []).filter((cat) => cat.id !== "typography-lab");
    const sections = categories.map((cat) => {
      const projects = sortedProjects((data.projects || []).filter((project) => (
        project.categoryId === cat.id && project.showInIndex !== false
      )));
      if (!projects.length) return "";
      return `
        <section id="works-${escapeHtml(cat.id)}" class="work-category" data-work-category="${escapeHtml(cat.id)}">
          <div class="work-category-head">
            <span class="work-kicker"><i></i> ${escapeHtml(indexData.label || "All Project")}</span>
            <div>
              <h3 class="t-service-en">${escapeHtml(cat.name || "")}</h3>
              <p>${escapeHtml(cat.indexDescription || cat.longDescription || cat.shortDescription || indexData.intro || "")}</p>
            </div>
          </div>
          <div class="work-thumb-grid" aria-label="${escapeHtml(cat.name || "Project")} project thumbnails">
            ${projects.map((project, projectIndex) => workCard(project, projectIndex, cat)).join("")}
          </div>
        </section>
      `;
    }).filter(Boolean);
    if (sections.length) list.innerHTML = sections.join("");
  }

  function applyFooter() {
    const settings = data.settings || {};
    const footer = data.home?.footerContact || {};
    if (!visible(footer)) return;
    setCroppedImage(".thank-hero-bg", footer.backgroundImage, "", document, "home.footerContact.backgroundImage");
    const title = footer.title === "3Q" ? "Thank\nyou." : (footer.title || "Thank\nyou.");
    const hand = footer.handwritingText || "SONJ";
    const titleMarkup = escapeHtml(title)
      .split(/\n+/)
      .filter(Boolean)
      .map(line => `<span class="thank-title-line">${line.replace(/\.$/, "<span>.</span>")}</span>`)
      .join("");
    html(".thank-title-wrap h2", `${titleMarkup}<b class="thank-handwritten">${escapeHtml(hand)}</b>`);
    const handNode = $(".thank-handwritten");
    if (handNode && footer.handwritingFont) handNode.style.fontFamily = `"${footer.handwritingFont}", var(--thank-hand-font)`;
    html(".thank-title-wrap p", multiline(footer.description));
    const email = $(".thank-email");
    if (email) {
      email.textContent = footer.email || settings.email || email.textContent;
      email.href = `mailto:${footer.email || settings.email || ""}`;
    }
    const home = $(".thank-home");
    if (home) {
      home.textContent = footer.buttonLabel || home.textContent;
      home.href = footer.buttonHref || home.href;
    }
    text(".thank-hero-bottom p", settings.copyright);
    if (footer.qrImage) {
      const qr = $(".qr-card");
      if (qr) qr.innerHTML = `<img class="qr-real-image" src="${escapeHtml(imageUrl(footer.qrImage))}" alt="Song Studio QR" style="${escapeHtml(cropStyle(footer.qrImage, "home.footerContact.qrImage"))}" data-crop-image />`;
    }
  }

  function projectDetailSections(project) {
    const sections = project.detailSections?.length
      ? project.detailSections
      : [{ label: "Design Background", title: project.titleEn || project.title || "", body: project.detailIntro || project.summary || "" }];
    return sections.map((section, index) => `
      <section class="case-copy-block${index === 1 ? " is-solution" : ""}">
        <div class="case-copy-label">
          <p class="accent-label"><i></i> ${escapeHtml(section.label || `Section ${index + 1}`)}</p>
        </div>
        <div class="case-copy-text">
          <h2>${escapeHtml(section.title || "")}</h2>
          <p>${escapeHtml(section.body || "")}</p>
        </div>
      </section>
    `).join("");
  }

  function detailImageLayoutClass(item = {}) {
    const layout = item.layout || "auto";
    return ["wide", "half", "small", "auto"].includes(layout) ? layout : "auto";
  }

  function detailImageDisplayMode(item = {}) {
    return item.displayMode === "natural" ? "natural" : "fixed16x9";
  }

  function figureMarkup(item, alt = "", projectId = "", index = 0) {
    const detail = normalizeDetailImageItem(item);
    if (!detail) return "";
    const layout = detailImageLayoutClass(detail);
    const displayMode = detailImageDisplayMode(detail);
    const cropKey = imageCropKey("project", projectId, "detailImages", index);
    if (isVideoSource(detail.src)) {
      return `<figure class="case-detail-figure is-${escapeHtml(layout)} media-video"><video src="${escapeHtml(imageUrl(detail.src))}" autoplay muted loop playsinline preload="auto" aria-label="${escapeHtml(alt)}"></video></figure>`;
    }
    const style = displayMode === "natural" ? "" : ` style="${escapeHtml(cropStyle(detail.src, cropKey))}"`;
    return `<figure class="case-detail-figure is-${escapeHtml(layout)} image-mode-${escapeHtml(displayMode)}"><img src="${escapeHtml(imageUrl(detail.src))}" alt="${escapeHtml(alt)}"${style} data-crop-image data-lightbox-image /></figure>`;
  }

  function canRenderSeamlessDetailImage(item = {}) {
    return Boolean(item.seamlessGroupId) && !isVideoSource(detailImageSrc(item)) && detailImageDisplayMode(item) === "fixed16x9";
  }

  function detailGalleryMarkup(items = [], alt = "", projectId = "", startIndex = 1) {
    const chunks = [];
    let index = 0;
    while (index < items.length) {
      const item = items[index];
      if (!canRenderSeamlessDetailImage(item)) {
        chunks.push(figureMarkup(item, alt, projectId, startIndex + index));
        index += 1;
        continue;
      }
      const groupId = item.seamlessGroupId;
      const groupItems = [];
      while (
        index < items.length
        && items[index].seamlessGroupId === groupId
        && canRenderSeamlessDetailImage(items[index])
      ) {
        groupItems.push({ item: items[index], detailIndex: startIndex + index });
        index += 1;
      }
      if (groupItems.length < 2) {
        chunks.push(figureMarkup(groupItems[0].item, alt, projectId, groupItems[0].detailIndex));
        continue;
      }
      chunks.push(`
        <div class="case-seamless-group">
          ${groupItems.map((entry) => figureMarkup(entry.item, alt, projectId, entry.detailIndex)).join("")}
        </div>
      `);
    }
    return chunks.join("");
  }

  function applyAutoDetailLayouts(root = document) {
    $$(".case-detail-figure.is-auto img, .case-detail-figure.is-auto video", root).forEach((media) => {
      const apply = () => {
        const figure = media.closest(".case-detail-figure");
        const width = media.videoWidth || media.naturalWidth;
        const height = media.videoHeight || media.naturalHeight;
        if (!figure || !width || !height) return;
        const ratio = width / height;
        figure.classList.remove("is-auto", "is-wide", "is-half", "is-small");
        figure.classList.add(ratio >= 1.45 ? "is-wide" : ratio >= 1 ? "is-half" : "is-small");
      };
      if (media.readyState >= 1 || media.complete) apply();
      else media.addEventListener(media.tagName === "VIDEO" ? "loadedmetadata" : "load", apply, { once: true });
    });
  }

  function bindDetailContentLightbox(root = document) {
    const selector = ".case-cover img, .case-detail-gallery img, .case-pair-gallery img, .case-image-stack img, .case-after-quote-gallery img";
    $$(selector, root).forEach((img) => {
      if (img.closest(".case-thumb-card, .case-other-card")) return;
      img.setAttribute("data-lightbox-image", "");
    });
  }

  function relatedCard(project) {
    const category = categoryById(project.categoryId);
    return `
      <a class="case-other-card" href="project.html?id=${encodeURIComponent(project.id)}" data-project-id="${escapeHtml(project.id)}">
        <div class="case-other-media">
          <img src="${escapeHtml(imageUrl(project.coverImage || project.thumbnailImage))}" alt="${escapeHtml(project.title || "")}" style="${escapeHtml(cropStyle(project.coverImage || project.thumbnailImage, imageCropKey("project", project.id, project.coverImage ? "coverImage" : "thumbnailImage")))}" data-crop-image />
        </div>
        <div class="case-other-meta">
          <strong>${escapeHtml(project.title || project.titleEn || "")}</strong>
          <span>${escapeHtml(category?.name || project.services || "")}</span>
        </div>
      </a>
    `;
  }

  function applyProjectDetail() {
    const page = $(".case-page");
    if (!page) return;
    const requestedId = new URLSearchParams(window.location.search).get("id") || "";
    const project = projectById(requestedId) || (data.projects || []).find(visible);
    if (!project) return;
    const category = categoryById(project.categoryId);
    page.dataset.projectId = project.id;
    page.classList.toggle("case-page-dark", project.detailTheme === "dark");
    page.classList.toggle("is-dark-detail", project.detailTheme === "dark");
    text(".case-title-block .ref-kicker", category?.name || "Project Detail");
    text(".case-title-block h1", project.title || project.titleEn || "");
    text(".case-title-block > p:not(.ref-kicker)", project.detailIntro || project.summary || "");
    const meta = $(".case-meta-grid");
    if (meta) {
      const heroMetaText = project.heroMetaText || project.year || "";
      meta.innerHTML = [heroMetaText].map((value) => `
        <article>
          <strong>${escapeHtml(value)}</strong>
        </article>
      `).join("");
    }
    setCroppedImage(".case-thumb-card img", project.coverImage || project.thumbnailImage, project.title || project.titleEn, document, imageCropKey("project", project.id, project.coverImage ? "coverImage" : "thumbnailImage"));
    $$(".case-thumb-card > a").forEach((link) => link.remove());
    text(".case-thumb-card div span", category?.name || project.services || "");
    text(".case-thumb-card div strong", project.titleEn || project.title || "");
    const detailImages = (project.detailImages || []).map(normalizeDetailImageItem).filter(Boolean);
    const cover = $(".case-cover");
    if (cover) {
      const firstDetailImage = detailImages[0];
      cover.hidden = !firstDetailImage;
      if (firstDetailImage) {
        const displayMode = detailImageDisplayMode(firstDetailImage);
        cover.classList.toggle("image-mode-natural", displayMode === "natural");
        cover.classList.toggle("image-mode-fixed16x9", displayMode !== "natural");
        if (isVideoSource(firstDetailImage.src)) {
          cover.innerHTML = `<video src="${escapeHtml(imageUrl(firstDetailImage.src))}" autoplay muted loop playsinline preload="auto" aria-label="${escapeHtml(project.title || project.titleEn || "")}"></video>`;
          cover.classList.add("media-video");
        } else if (displayMode === "natural") {
          cover.classList.remove("media-video");
          setImage("img", firstDetailImage.src, project.title || project.titleEn, cover);
          $("img", cover)?.removeAttribute("style");
        } else {
          cover.classList.remove("media-video");
          setCroppedImage("img", firstDetailImage.src, project.title || project.titleEn, cover, imageCropKey("project", project.id, "detailImages", 0));
        }
      }
    }
    const copyBlocks = $$(".case-copy-block");
    if (copyBlocks.length) {
      copyBlocks[0].outerHTML = projectDetailSections(project);
      copyBlocks.slice(1).forEach((block) => block.remove());
    }
    const pair = $(".case-pair-gallery");
    if (pair) {
      const galleryImages = detailImages.slice(1);
      pair.classList.add("case-detail-gallery");
      pair.innerHTML = detailGalleryMarkup(galleryImages, project.title, project.id, 1);
      pair.hidden = !galleryImages.length;
    }
    const imageStack = $(".case-image-stack");
    if (imageStack) {
      imageStack.innerHTML = "";
      imageStack.hidden = true;
    }
    const after = $(".case-after-quote-gallery");
    if (after) {
      after.innerHTML = "";
      after.hidden = true;
    }
    const relatedIds = project.relatedProjectIds || [];
    const related = relatedIds.map(projectById).filter(Boolean).filter(visible);
    const fallbackRelated = (data.projects || []).filter((item) => visible(item) && item.id !== project.id).slice(0, 2);
    const relatedProjects = (related.length ? related : fallbackRelated).slice(0, 2);
    const relatedGrid = $(".case-other-grid");
    if (relatedGrid) relatedGrid.innerHTML = relatedProjects.map(relatedCard).join("");
    applyAutoDetailLayouts(page);
    bindDetailContentLightbox(page);
  }

  function applyAll() {
    applyTypography();
    applyNavigation();
    applyHero();
    applyLogoShowcase();
    applyFeatured();
    applyNumbers();
    applyDirections();
    applyProjectIndex();
    applyFooter();
    applyProjectDetail();
    focusAdminPreviewTarget();
    window.dispatchEvent(new CustomEvent("song-studio-content-bound"));
  }

  function focusAdminPreviewTarget() {
    if (!isAdminPreview) return;
    $$(".admin-preview-focus").forEach((node) => node.classList.remove("admin-preview-focus"));
    if (!previewActiveTypeSelector) return;
    window.requestAnimationFrame(() => {
      const target = $(previewActiveTypeSelector);
      if (!target) return;
      target.classList.add("admin-preview-focus");
    });
  }

  let lightboxScrollY = 0;

  function closeLightbox() {
    const lightbox = $(".image-lightbox");
    const shouldRestore = Boolean(lightbox);
    if (lightbox) lightbox.remove();
    document.body.classList.remove("is-lightbox-open");
    if (shouldRestore) window.scrollTo(0, lightboxScrollY);
  }

  function detailLightboxImages(clicked) {
    const selector = ".case-cover img, .case-detail-gallery img, .case-pair-gallery img, .case-image-stack img, .case-after-quote-gallery img";
    const images = $$(selector)
      .filter((img) => !img.closest(".case-thumb-card, .case-other-card") && img.src)
      .map((img) => ({ src: img.src, alt: img.alt || "" }));
    const clickedIndex = $$(selector).filter((img) => !img.closest(".case-thumb-card, .case-other-card") && img.src).indexOf(clicked);
    return { images, clickedIndex: Math.max(0, clickedIndex) };
  }

  function isDetailContentImage(img) {
    return Boolean(img?.closest(".case-cover, .case-detail-gallery, .case-pair-gallery, .case-image-stack, .case-after-quote-gallery"))
      && !img.closest(".slider-card, .case-thumb-card, .case-other-card");
  }

  function openLightbox(img) {
    if (!img?.src) return;
    closeLightbox();
    lightboxScrollY = window.scrollY;
    const { images, clickedIndex } = detailLightboxImages(img);
    if (!images.length) return;
    const lightbox = document.createElement("div");
    lightbox.className = "image-lightbox";
    lightbox.innerHTML = `
      <button class="image-lightbox-close" type="button" aria-label="Close">×</button>
      <div class="image-lightbox-track">
        ${images.map((item, index) => `
          <figure class="image-lightbox-item" data-lightbox-index="${index}">
            <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" />
          </figure>
        `).join("")}
      </div>
    `;
    document.body.classList.add("is-lightbox-open");
    document.body.appendChild(lightbox);
    const current = lightbox.querySelector(`[data-lightbox-index="${clickedIndex}"]`);
    if (current) current.scrollIntoView({ block: "start" });
  }

  document.addEventListener("click", (event) => {
    const lightboxImage = event.target.closest("[data-lightbox-image]");
    if (lightboxImage) {
      if (!isDetailContentImage(lightboxImage)) return;
      event.preventDefault();
      openLightbox(lightboxImage);
      return;
    }
    if (event.target.closest(".image-lightbox-close") || event.target.closest(".image-lightbox img") || event.target.classList?.contains("image-lightbox")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "SONG_STUDIO_PREVIEW_STATE") return;
    data = event.data.payload || data;
    previewActiveTypeKey = event.data.activeTypeKey || "";
    previewActiveTypeSelector = event.data.activeTypeSelector || "";
    applyAll();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      try {
        data = normalizeData(event.newValue ? JSON.parse(event.newValue) : fallback);
        applyAll();
      } catch {
        data = normalizeData(fallback);
      }
      return;
    }
    if (event.key === REFRESH_KEY && !isAdminPreview) {
      window.location.reload();
    }
  });

  if (isAdminPreview) {
    window.parent?.postMessage({ type: "SONG_STUDIO_PREVIEW_READY" }, "*");
  }

  applyAll();
})();
