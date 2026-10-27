const STORAGE_KEY = "song-studio-visual-editor-home-locked";
const REFRESH_KEY = "song-studio-editor-refresh-signal";
const AUTH_KEY = "song-studio-editor-auth";
const UI_STATE_KEY = "song-studio-editor-ui-state";
const CODE_FOLDER_NAME_KEY = "song-studio-editor-code-folder-name";
const CODE_FOLDER_DB = "song-studio-editor-code-folder-db";
const CODE_FOLDER_STORE = "handles";
const CODE_FOLDER_HANDLE_KEY = "code-folder";
const ADMIN_PASSWORD = "songstudio";
const defaultData = window.SONG_STUDIO_DATA;
const TYPE_ECHO_COVER_CROP_RESET_KEY = "song-studio-type-echo-cover-crop-reset-v1";

const clone = (value) => JSON.parse(JSON.stringify(value));
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const cssIdent = (value) => window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");

const fontWeightOptions = [
  [300, "Light"],
  [400, "Regular"],
  [500, "Medium"],
  [600, "SemiBold"],
  [700, "Bold"],
  [800, "ExtraBold"],
  [900, "Black"]
];

function nearestFontWeight(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 400;
  return fontWeightOptions.reduce((closest, option) => (
    Math.abs(option[0] - numeric) < Math.abs(closest - numeric) ? option[0] : closest
  ), fontWeightOptions[0][0]);
}

function resetTypeEchoCoverCropOnce(data) {
  if (localStorage.getItem(TYPE_ECHO_COVER_CROP_RESET_KEY)) return false;
  const key = "project:type-echo:coverImage";
  const removed = Boolean(data?.imageCrops?.[key]);
  if (removed) delete data.imageCrops[key];
  localStorage.setItem(TYPE_ECHO_COVER_CROP_RESET_KEY, "1");
  return removed;
}

let state = loadState();
let uiState = loadUiState();
let activeView = uiState.activeView === "code" ? "site" : (uiState.activeView || "site");
let activeModule = uiState.activeModule || "hero";
let activeProjectId = uiState.activeProjectId || state.projects[0]?.id || "";
let activeTypeKey = uiState.activeTypeKey || "h1En";
let activeCodeFile = uiState.activeCodeFile || "html";
let activeImagePath = "";
let hasUnsavedChanges = false;
let draftCrop = null;
let draftCropContext = "";
let draftCropUsesDefault = false;
let codeDraftsStatus = "";
let codeDraftsLoading = false;
let codeAutoReadAttempted = false;
let codeFolderHandle = null;
let codeFolderName = localStorage.getItem(CODE_FOLDER_NAME_KEY) || "";
let codeFolderLoaded = false;
let codeDirtyFiles = { html: false, css: false, js: false };
let typePreviewTimer = 0;
let imagePathIssues = [];
let assetPreviewUrls = {};
let pickedImageFolderName = "";
let activeAssetFolder = "all";
let activeDetailLibraryProjectIndex = null;
let detailLibrarySelection = new Set();
let detailImageSelections = new Map();
let mediaManifest = null;
let mediaSyncStatus = "未连接本地图片同步服务";
let mediaSyncSource = "";
let mediaManifestRenderTimer = 0;

const viewTitles = {
  site: "全站设置",
  home: "首页内容",
  projects: "项目管理",
  images: "图片管理",
  footer: "尾屏设置",
  type: "字体层级"
};

const homeModules = [
  { id: "hero", label: "首页首屏", hint: "标题、按钮、背景图", image: "home.hero.backgroundImage", selector: "[data-section='hero']" },
  { id: "logoShowcase", label: "Logo 展示条", hint: "品牌/Logo 列表", image: "", selector: "[data-section='showcase']" },
  { id: "featuredCarousel", label: "Selected Projects 标题", hint: "项目卡片来自项目管理的精选勾选", image: "projects.0.thumbnailImage", selector: "[data-section='selected']" },
  { id: "numbers", label: "Practice Focus", hint: "作品方向信息", image: "", selector: "[data-section='numbers']" },
  { id: "projectDirectory", label: "Design Directions", hint: "四个分类入口", image: "home.projectDirectory.previewImage", selector: "[data-section='directions']" },
  { id: "projectIndex", label: "All Projects 标题", hint: "项目卡片来自项目管理的项目流勾选", image: "projects.0.coverImage", selector: "[data-section='works']" }
];

const codeFiles = [
  { key: "html", label: "HTML", fileName: "index.html", path: "codeDrafts.html" },
  { key: "css", label: "CSS", fileName: "styles.css", path: "codeDrafts.css" },
  { key: "js", label: "JavaScript", fileName: "site-interactions.js", path: "codeDrafts.js" }
];

const typePreviewSections = {
  h1En: [{ label: "首页首屏", hash: "#hero" }],
  h2En: [
    { label: "精选项目", hash: "#selected" },
    { label: "作品流", hash: "#works" },
    { label: "尾屏", hash: "#contact" },
    { label: "详情标题", page: "project.html", hash: "#top" }
  ],
  h3En: [
    { label: "方向模块", hash: "#directions" },
    { label: "作品分类", hash: "#works" },
    { label: "详情段落", page: "project.html", hash: "#detail" }
  ],
  h4En: [{ label: "首页首屏", hash: "#hero" }],
  leadEn: [
    { label: "首页首屏", hash: "#hero" },
    { label: "尾屏", hash: "#contact" }
  ],
  bodyEn: [
    { label: "精选项目", hash: "#selected" },
    { label: "Logo 区", hash: "#showcase" },
    { label: "详情正文", page: "project.html", hash: "#detail" }
  ],
  metaEn: [
    { label: "首屏导航", hash: "#hero" },
    { label: "项目卡片", hash: "#works" },
    { label: "详情 Meta", page: "project.html", hash: "#top" }
  ],
  buttonEn: [
    { label: "首页按钮", hash: "#hero" },
    { label: "尾屏按钮", hash: "#contact" }
  ],
  h1Zh: [{ label: "项目区域", hash: "#works" }],
  h2Zh: [{ label: "项目区域", hash: "#works" }],
  h3Zh: [
    { label: "作品卡片", hash: "#works" },
    { label: "详情相关项目", page: "project.html", hash: "#related" }
  ],
  h4Zh: [{ label: "项目区域", hash: "#works" }],
  bodyZh: [
    { label: "精选项目", hash: "#selected" },
    { label: "作品流", hash: "#works" }
  ],
  captionZh: [
    { label: "方向模块", hash: "#directions" },
    { label: "项目卡片", hash: "#works" }
  ]
};

const typePreviewSelectors = {
  h1En: ".t-display-en",
  h2En: ".t-heading-en,.case-title-block h1",
  h3En: ".t-service-en,.case-copy-text h2,.case-other-head h2",
  h4En: ".t-subhead-en",
  leadEn: ".t-lead-en",
  bodyEn: ".t-body-en,.case-title-block > p,.case-copy-text h2,.case-copy-text p,.case-other-head h2,.case-other-head > p",
  metaEn: ".t-meta-en,.t-label,.case-meta-grid span,.case-meta-grid strong,.case-thumb-card span,.case-copy-label,.case-other-card span",
  buttonEn: ".ref-actions a,.thank-home,.ref-book,.case-thumb-card a",
  h3Zh: ".t-project-zh,.case-other-card strong",
  bodyZh: ".t-body-zh",
  captionZh: ".t-caption-zh"
};

const typeLayerGroups = [
  {
    key: "display",
    styleKey: "h1En",
    label: "超大标题",
    preview: "Design from Concept to Delivery",
    locations: [
      { label: "首页首屏大标题", page: "index.html", hash: "#hero", selector: "#hero h1" },
      { label: "尾页 Thank you", page: "index.html", hash: "#contact", selector: "#contact .thank-title-wrap h2, #contact .thank-title-wrap h1" },
      { label: "详情页项目大标题", page: "project.html", hash: "#top", selector: ".case-title-block h1" }
    ]
  },
  {
    key: "sectionTitle",
    styleKey: "h2En",
    label: "模块大标题",
    preview: "Selected Projects",
    locations: [
      { label: "首页 Selected Projects 标题", page: "index.html", hash: "#selected", selector: "#selected h2" },
      { label: "Design Areas 标题", page: "index.html", hash: "#directions", selector: "#directions .service-list strong" },
      { label: "Project Index 标题", page: "index.html", hash: "#works", selector: "#works .work-category-head h3" }
    ]
  },
  {
    key: "cardTitle",
    styleKey: "h3Zh",
    label: "项目卡片标题",
    preview: "妖精的口袋",
    locations: [
      { label: "项目列表标题", page: "index.html", hash: "#works", selector: ".work-thumb-card strong" },
      { label: "相关项目标题", page: "project.html", hash: "#related", selector: ".case-other-card strong" }
    ]
  },
  {
    key: "body",
    styleKey: "bodyEn",
    label: "正文说明",
    preview: "Visual systems for live commerce scenes and digital storytelling.",
    locations: [
      { label: "首页说明文字", page: "index.html", hash: "#selected", selector: ".feature-copy > p, #numbers .numbers-head p, .work-category-head p" },
      { label: "尾页说明文字", page: "index.html", hash: "#contact", selector: "#contact .thank-title-wrap > p" },
      { label: "详情页项目简介", page: "project.html", hash: "#top", selector: ".case-title-block > p:not(.ref-kicker)" },
      { label: "详情页章节标题", page: "project.html", hash: "#detail", selector: ".case-copy-text h2, .case-other-head h2" },
      { label: "详情页正文段落", page: "project.html", hash: "#detail", selector: ".case-copy-text p, .case-other-head > p" }
    ]
  },
  {
    key: "meta",
    styleKey: "metaEn",
    label: "标签 / Meta 信息",
    preview: "01 / Brand Visual",
    locations: [
      { label: "分类标签", page: "index.html", hash: "#hero", selector: ".accent-label, .t-label" },
      { label: "年份 / 服务类型", page: "project.html", hash: "#top", selector: ".case-meta-grid span, .case-meta-grid strong" },
      { label: "编号 / 小标题", page: "index.html", hash: "#works", selector: ".service-list strong span, .work-thumb-card span" },
      { label: "导航小字", page: "index.html", hash: "#hero", selector: ".ref-nav nav a, .ref-brand span, .ref-book span" }
    ]
  },
  {
    key: "button",
    styleKey: "buttonEn",
    label: "按钮文字",
    preview: "View Works ↗",
    locations: [
      { label: "首页按钮", page: "index.html", hash: "#hero", selector: ".ref-actions a" },
      { label: "尾页 Back Home", page: "index.html", hash: "#contact", selector: ".thank-home" },
      { label: "详情页返回 / 预览按钮", page: "project.html", hash: "#top", selector: ".case-book, .case-thumb-card a" }
    ]
  }
];

const homeGuides = {
  hero: ["首页第 1 屏", "首屏大背景、主标题、右侧说明和两个按钮。"],
  logoShowcase: ["首页第 2 段", "首屏下面的横向 Logo 展示条。"],
  featuredCarousel: ["Selected Projects 标题", "这一屏的标题和说明在这里改；下方滚动项目来自项目管理里的“加入精选轮播”。"],
  numbers: ["Numbers 小段", "精选项目下面的一小段数字信息。"],
  projectDirectory: ["Design Directions 分类目录", "黑色模块，左侧四个项目分类，右侧分类预览图。"],
  projectIndex: ["All Projects 标题", "这里只改项目流区域的标题和说明；项目卡片来自项目管理里的“加入分类项目流”。"]
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const next = normalizeState(mergeDefaults(defaultData, JSON.parse(saved) || clone(defaultData)));
    const migratedLegacyPandajojoPaths = migrateLegacyPandajojoImagePaths(next);
    if (saved && (migratedLegacyPandajojoPaths || resetTypeEchoCoverCropOnce(next))) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(REFRESH_KEY, String(Date.now()));
    }
    return next;
  } catch {
    return normalizeState(clone(defaultData));
  }
}

function migrateLegacyPandajojoImagePaths(value) {
  const legacyPrefix = "assets/images/pandajojo/";
  const currentPrefix = "assets/images/Brand-pandajojo/";
  let changed = false;

  function migrate(item) {
    if (typeof item === "string") {
      if (!item.startsWith(legacyPrefix)) return item;
      changed = true;
      return `${currentPrefix}${item.slice(legacyPrefix.length)}`;
    }
    if (Array.isArray(item)) return item.map(migrate);
    if (!item || typeof item !== "object") return item;
    Object.keys(item).forEach((key) => {
      item[key] = migrate(item[key]);
    });
    return item;
  }

  migrate(value);
  return changed;
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

function loadUiState() {
  try {
    return JSON.parse(localStorage.getItem(UI_STATE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUiState() {
  localStorage.setItem(UI_STATE_KEY, JSON.stringify({
    activeView,
    activeModule,
    activeProjectId,
    activeTypeKey,
    activeCodeFile
  }));
}

function normalizeUiState() {
  if (!viewTitles[activeView]) activeView = "site";
  if (!homeModules.some((module) => module.id === activeModule)) activeModule = "hero";
  if (!state.projects.some((project) => project.id === activeProjectId)) {
    activeProjectId = allProjectsForEditor()[0]?.id || state.projects[0]?.id || "";
  }
  if (!state.settings.typography.styles[activeTypeKey]) activeTypeKey = "h1En";
  if (!codeFiles.some((file) => file.key === activeCodeFile)) activeCodeFile = "html";
}

function openCodeFolderDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(CODE_FOLDER_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(CODE_FOLDER_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredCodeFolderHandle() {
  if (codeFolderHandle) return codeFolderHandle;
  try {
    const db = await openCodeFolderDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(CODE_FOLDER_STORE, "readonly")
        .objectStore(CODE_FOLDER_STORE)
        .get(CODE_FOLDER_HANDLE_KEY);
      request.onsuccess = () => {
        codeFolderHandle = request.result || null;
        resolve(codeFolderHandle);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function storeCodeFolderHandle(handle) {
  const db = await openCodeFolderDb();
  await new Promise((resolve, reject) => {
    const request = db.transaction(CODE_FOLDER_STORE, "readwrite")
      .objectStore(CODE_FOLDER_STORE)
      .put(handle, CODE_FOLDER_HANDLE_KEY);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

async function forgetStoredCodeFolderHandle() {
  codeFolderHandle = null;
  codeFolderName = "";
  codeFolderLoaded = false;
  codeAutoReadAttempted = false;
  localStorage.removeItem(CODE_FOLDER_NAME_KEY);
  try {
    const db = await openCodeFolderDb();
    await new Promise((resolve, reject) => {
      const request = db.transaction(CODE_FOLDER_STORE, "readwrite")
        .objectStore(CODE_FOLDER_STORE)
        .delete(CODE_FOLDER_HANDLE_KEY);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore unsupported browser storage; clearing in-memory state is enough.
  }
}

async function hasCodeFolderPermission(handle, requestAccess = false) {
  if (!handle?.queryPermission) return false;
  const options = { mode: "read" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  if (!requestAccess || !handle.requestPermission) return false;
  return (await handle.requestPermission(options)) === "granted";
}

function normalizeState(data) {
  const typography = data.settings.typography;
  if (!data.settings.typography.fontHandwriting) {
    data.settings.typography.fontHandwriting = { name: "Brush Script MT", fileName: "", source: "system" };
  }
  if (!typography.fontLibrary) typography.fontLibrary = [];
  [
    { ...typography.fontZh, group: "zh" },
    { ...typography.fontEn, group: "en" },
    { ...typography.fontHandwriting, group: "handwriting" }
  ].forEach((font) => {
    if (!font.name) return;
    if (!typography.fontLibrary.some((item) => item.name === font.name && item.group === font.group)) {
      typography.fontLibrary.push({
        id: `font-${font.group}-${font.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: font.name,
        fileName: font.fileName || "",
        source: font.source || "system",
        group: font.group,
        dataUrl: font.dataUrl || ""
      });
    }
  });
  if (!data.codeDrafts) data.codeDrafts = { html: "", css: "", js: "" };
  if (data.codeDrafts.html === undefined) data.codeDrafts.html = "";
  if (data.codeDrafts.css === undefined) data.codeDrafts.css = "";
  if (data.codeDrafts.js === undefined) data.codeDrafts.js = "";
  if (!Array.isArray(data.home.hero.bottomLabels) || data.home.hero.bottomLabels.length < 3) {
    data.home.hero.bottomLabels = ["+ Define", "+ Design", "+ Development"];
  }
  if (!data.imageCrops || typeof data.imageCrops !== "object" || Array.isArray(data.imageCrops)) data.imageCrops = {};
  data.home.projectDirectory.descriptionStyle = {
    size: 17,
    weight: 600,
    lineHeight: 1.45,
    letterSpacing: 0,
    ...(data.home.projectDirectory.descriptionStyle || {})
  };
  data.home.projectDirectory.descriptionStyle.weight = nearestFontWeight(data.home.projectDirectory.descriptionStyle.weight);
  if (!data.home.footerContact.handwritingText) data.home.footerContact.handwritingText = "SONJ";
  if (!data.home.footerContact.handwritingFont) data.home.footerContact.handwritingFont = data.settings.typography.fontHandwriting.name;
  Object.values(data.settings.typography.styles).forEach((style) => {
    if (style.size === undefined) style.size = style.sizeMax ?? style.sizeMin ?? 16;
    delete style.sizeMin;
    delete style.sizeMax;
    style.weight = nearestFontWeight(style.weight);
  });
  data.projects.forEach((project) => {
    if (!project.detailTheme) project.detailTheme = "light";
    if (!project.services && project.categoryId) project.services = categoryByIdFrom(data, project.categoryId)?.name || "";
    if (!project.detailTitle) project.detailTitle = project.title;
    if (project.heroMetaText === undefined) project.heroMetaText = "";
    if (!Array.isArray(project.detailSections)) project.detailSections = [];
    project.thumbnailImage = normalizeStoredImagePath(project.thumbnailImage || project.coverImage || project.detailThumbnailImage);
    project.coverImage = normalizeStoredImagePath(project.coverImage || project.detailThumbnailImage || project.thumbnailImage);
    const legacyHeroImage = normalizeStoredImagePath(project.heroImage);
    project.detailImages = normalizeStoredImageList(project.detailImages || []);
    if (legacyHeroImage && detailImageSrc(project.detailImages[0]) !== legacyHeroImage) {
      project.detailImages.unshift({ src: legacyHeroImage, layout: "wide", displayMode: "fixed16x9" });
    }
    delete project.heroImage;
    delete project.detailThumbnailImage;
  });
  data.categories.forEach((category, index) => {
    if (!category.number) category.number = String(index + 1).padStart(2, "0");
    if (!category.rightTitle) category.rightTitle = category.name;
    if (!category.rightDescription) category.rightDescription = category.longDescription || category.shortDescription || "";
    category.coverImage = normalizeStoredImagePath(category.coverImage);
  });
  data.home.hero.backgroundImage = normalizeStoredImagePath(data.home.hero.backgroundImage);
  data.home.projectDirectory.previewImage = normalizeStoredImagePath(data.home.projectDirectory.previewImage);
  data.home.footerContact.backgroundImage = normalizeStoredImagePath(data.home.footerContact.backgroundImage);
  data.home.footerContact.qrImage = normalizeStoredImagePath(data.home.footerContact.qrImage);
  data.assets.forEach((asset) => {
    asset.src = normalizeStoredImagePath(asset.src);
    if (asset.cropX === undefined) asset.cropX = 50;
    if (asset.cropY === undefined) asset.cropY = 50;
    if (asset.cropOffsetX === undefined) asset.cropOffsetX = 0;
    if (asset.cropOffsetY === undefined) asset.cropOffsetY = 0;
    if (asset.zoom === undefined) asset.zoom = 1;
  });
  data.assets = data.assets.filter((asset) => asset.src);
  return data;
}

function categoryByIdFrom(data, id) {
  return data.categories.find((item) => item.id === id);
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

function normalizeStoredImagePath(value = "") {
  let path = String(value).trim().replace(/\\/g, "/");
  if (!path) return "";

  // 不保存这些临时/大图数据
  if (/^(blob:|data:image|file:)/i.test(path)) return "";

  // 如果是绝对路径里包含 /assets/，截取 assets 后面的部分
  const assetsIndex = path.indexOf("/assets/");
  if (assetsIndex >= 0) {
    path = path.slice(assetsIndex + 1);
  }

  // 统一去掉开头多余写法
  path = path.replace(/^\/+assets\//, "assets/");
  path = path.replace(/^\.\.\/assets\//, "assets/");
  path = path.replace(/^\.\/assets\//, "assets/");

  if (path.startsWith("assets/images/")) return path.replace(/^assets\/images\/images\//, "assets/images/");
  if (path.startsWith("assets/")) return `assets/images/${path.slice("assets/".length)}`;

  // 如果选择的是 images 文件夹，补成 assets/images/
  if (path.startsWith("images/")) return `assets/${path}`;

  // 远程图只取文件名，放到 assets/images/
  if (/^https?:\/\//i.test(path)) {
    try {
      return `assets/images/${new URL(path).pathname.split("/").pop() || ""}`;
    } catch {
      return "";
    }
  }

  // 普通文件名默认进入 assets/images/
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

function normalizeStoredImageList(list = []) {
  return list.map(normalizeDetailImageItem).filter(Boolean);
}

function isDetailImageItemPath(path = "") {
  return /\.detailImages\.\d+$/.test(path);
}

function getImageFieldValue(path) {
  const value = getPath(path);
  return isDetailImageItemPath(path) ? detailImageSrc(value) : value;
}

function setImageFieldValue(path, src) {
  const normalized = normalizeStoredImagePath(src);
  if (!isDetailImageItemPath(path)) {
    setPath(path, normalized);
    return;
  }
  const current = normalizeDetailImageItem(getPath(path));
  setPath(path, {
    ...(current || {}),
    src: normalized,
    layout: current?.layout || "auto",
    displayMode: current?.displayMode || "fixed16x9"
  });
}

function projectImageDataUrlIssues(data = state) {
  const issues = [];
  const addIssue = (label, path, value, extra = {}) => {
    if (!isDataUrl(value)) return;
    issues.push({ path, label, ...extra });
  };
  (data.projects || []).forEach((project, projectIndex) => {
    const projectName = project.title || project.titleEn || project.id || `项目 ${projectIndex + 1}`;
    [
      ["精选项目缩略图", "thumbnailImage", project.thumbnailImage],
      ["项目缩略图", "coverImage", project.coverImage]
    ].forEach(([label, key, value]) => {
      addIssue(`项目管理 → ${projectName} → ${label}`, `projects.${projectIndex}.${key}`, value, {
        projectIndex,
        projectId: project.id,
        projectName
      });
    });
    (project.detailImages || []).forEach((item, imageIndex) => {
      const src = detailImageSrc(item);
      addIssue(`项目管理 → ${projectName} → ${detailImageUsageLabel(imageIndex)}`, `projects.${projectIndex}.detailImages.${imageIndex}`, src, {
        projectIndex,
        projectId: project.id,
        projectName
      });
    });
  });
  addIssue("首页 → 首屏背景图", "home.hero.backgroundImage", data.home?.hero?.backgroundImage);
  addIssue("尾屏 → 背景图", "home.footerContact.backgroundImage", data.home?.footerContact?.backgroundImage);
  addIssue("尾屏 → 二维码图片", "home.footerContact.qrImage", data.home?.footerContact?.qrImage);
  (data.categories || []).forEach((category, index) => {
    addIssue(`Design Areas → ${category.name || `分类 ${index + 1}`} → 预览图片`, `categories.${index}.coverImage`, category.coverImage);
  });
  return issues;
}

function collectImagePathIssues(data = state) {
  const issues = [];
  const add = (label, path, value) => {
    if (!value) return;
    const expected = normalizeStoredImagePath(value);
    if (!expected) {
      issues.push({ label, path, value, message: "不能保存 blob、data:image 或本机绝对路径", expected: "" });
      return;
    }
    if (value !== expected) {
      issues.push({ label, path, value, message: "图片路径必须统一为 assets/images/...", expected });
      return;
    }
    if (!value.startsWith("assets/images/")) {
      issues.push({ label, path, value, message: "图片路径必须统一为 assets/images/...", expected });
    }
  };
  add("首页 → 首屏背景图", "home.hero.backgroundImage", data.home?.hero?.backgroundImage);
  add("尾屏 → 背景图", "home.footerContact.backgroundImage", data.home?.footerContact?.backgroundImage);
  add("尾屏 → 二维码图片", "home.footerContact.qrImage", data.home?.footerContact?.qrImage);
  (data.categories || []).forEach((category, index) => {
    add(`Design Areas → ${category.name || `分类 ${index + 1}`} → 预览图片`, `categories.${index}.coverImage`, category.coverImage);
  });
  (data.projects || []).forEach((project, projectIndex) => {
    const projectName = project.title || project.titleEn || project.id || `项目 ${projectIndex + 1}`;
    add(`项目管理 → ${projectName} → 精选项目缩略图`, `projects.${projectIndex}.thumbnailImage`, project.thumbnailImage);
    add(`项目管理 → ${projectName} → 项目缩略图`, `projects.${projectIndex}.coverImage`, project.coverImage);
    (project.detailImages || []).forEach((item, imageIndex) => {
      const src = detailImageSrc(item);
      add(`项目管理 → ${projectName} → ${detailImageUsageLabel(imageIndex)}`, `projects.${projectIndex}.detailImages.${imageIndex}`, src);
    });
  });
  return issues;
}

function imageExists(src = "") {
  return new Promise((resolve) => {
    if (!src || isDataUrl(src) || /^https?:\/\//i.test(src)) {
      resolve(true);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imageUrl(src);
  });
}

async function collectMissingImageFiles(data = state) {
  const candidates = [];
  const add = (label, value) => {
    if (value && value.startsWith("assets/")) candidates.push({ label, value });
  };
  add("首页 → 首屏背景图", data.home?.hero?.backgroundImage);
  add("尾屏 → 背景图", data.home?.footerContact?.backgroundImage);
  add("尾屏 → 二维码图片", data.home?.footerContact?.qrImage);
  (data.categories || []).forEach((category, index) => add(`Design Areas → ${category.name || `分类 ${index + 1}`} → 预览图片`, category.coverImage));
  (data.projects || []).forEach((project, projectIndex) => {
    const projectName = project.title || project.titleEn || project.id || `项目 ${projectIndex + 1}`;
    add(`项目管理 → ${projectName} → 精选项目缩略图`, project.thumbnailImage);
    add(`项目管理 → ${projectName} → 项目缩略图`, project.coverImage);
    (project.detailImages || []).forEach((item, imageIndex) => add(`项目管理 → ${projectName} → ${detailImageUsageLabel(imageIndex)}`, detailImageSrc(item)));
  });
  if (mediaManifest) {
    const existing = manifestSourceSet();
    return candidates.filter((item) => item.value.startsWith("assets/images/") && !existing.has(normalizeStoredImagePath(item.value)));
  }
  const missing = [];
  for (const item of candidates) {
    if (!(await imageExists(item.value))) missing.push(item);
  }
  return missing;
}

function isLocalDevelopmentHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function manifestUrl() {
  return "assets/images/media-manifest.json";
}

function manifestFiles() {
  return Array.isArray(mediaManifest?.files) ? mediaManifest.files : [];
}

function manifestSourceSet() {
  return new Set(manifestFiles().map((file) => normalizeStoredImagePath(file.src)).filter(Boolean));
}

function assetFromManifestFile(file, index) {
  const src = normalizeStoredImagePath(file.src);
  const existing = state.assets.find((asset) => asset.src === src) || {};
  const version = file.version || `${file.mtimeMs || Date.now()}-${file.size || 0}`;
  assetPreviewUrls[src] = `${src}?v=${encodeURIComponent(version)}`;
  return {
    ...existing,
    id: existing.id || `asset-${src.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || index}`,
    label: file.name || src.split("/").pop() || "image",
    src,
    type: isVideoSource(src) ? "video" : "image",
    recommendedRatio: existing.recommendedRatio || "16:9",
    cropX: existing.cropX ?? 50,
    cropY: existing.cropY ?? 50,
    cropOffsetX: existing.cropOffsetX ?? 0,
    cropOffsetY: existing.cropOffsetY ?? 0,
    zoom: existing.zoom ?? 1,
    sortOrder: index + 1,
    manifestVersion: version
  };
}

function applyMediaManifest(nextManifest, source = "manifest") {
  if (!nextManifest || !Array.isArray(nextManifest.files)) return false;
  mediaManifest = nextManifest;
  mediaSyncSource = source;
  state.assets = nextManifest.files
    .map(assetFromManifestFile)
    .filter((asset) => asset.src && asset.src.startsWith("assets/images/"));
  const validFolders = new Set(assetFolderOptions());
  if (!validFolders.has(activeAssetFolder)) activeAssetFolder = "all";
  mediaSyncStatus = `已同步 ${state.assets.length} 个真实媒体文件`;
  return true;
}

async function refreshMediaManifest(options = {}) {
  if (!isLocalDevelopmentHost()) {
    mediaSyncStatus = "自动同步仅 localhost 本地开发启用";
    return false;
  }
  try {
    const response = await fetch(`${manifestUrl()}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`manifest ${response.status}`);
    const manifest = await response.json();
    const changed = applyMediaManifest(manifest, "fetch");
    if (changed && options.render !== false && activeView === "images") render();
    return changed;
  } catch {
    mediaSyncStatus = "未读取到图片索引，请用本地 Node 服务打开后台";
    return false;
  }
}

function connectMediaManifestEvents() {
  if (!isLocalDevelopmentHost() || !("EventSource" in window)) return;
  const events = new EventSource("/__media-events");
  events.addEventListener("media-manifest", (event) => {
    try {
      const manifest = JSON.parse(event.data);
      if (!applyMediaManifest(manifest, "sse")) return;
      window.clearTimeout(mediaManifestRenderTimer);
      mediaManifestRenderTimer = window.setTimeout(() => {
        if (activeImagePath || activeDetailLibraryProjectIndex !== null) updateMediaLibraryOnly({ refreshFolders: true });
        else if (activeView === "images") render();
        flash("媒体文件夹已自动同步。");
      }, 120);
    } catch {
      // Ignore malformed development events.
    }
  });
  events.onerror = () => {
    mediaSyncStatus = "图片同步服务未连接";
  };
}

function collectReferencedImageSources(value, refs = new Set()) {
  if (typeof value === "string") {
    const src = normalizeStoredImagePath(value);
    if (src) refs.add(src);
    return refs;
  }
  if (!value || typeof value !== "object") return refs;
  if (Array.isArray(value)) {
    value.forEach((item) => collectReferencedImageSources(item, refs));
    return refs;
  }
  Object.entries(value).forEach(([key, item]) => {
    if (key === "assets" || key === "fontLibrary" || key === "codeDrafts") return;
    collectReferencedImageSources(item, refs);
  });
  return refs;
}

function manifestMissingReferenceItems() {
  if (!mediaManifest) return [];
  const existing = manifestSourceSet();
  const refs = collectReferencedImageSources(state);
  return [...refs].filter((src) => src.startsWith("assets/images/") && !existing.has(src));
}

function compactStateForStorage(data) {
  const compact = clone(data);
  if (compact.codeDrafts) compact.codeDrafts = { html: "", css: "", js: "" };
  return compact;
}

function writeSavedState(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(REFRESH_KEY, String(Date.now()));
}

async function saveState(message = "已保存。") {
  try {
    normalizeState(state);
    writeSavedState(state);
    imagePathIssues = [];
    hasUnsavedChanges = false;
    flash(message);
  } catch (error) {
    try {
      const compact = normalizeState(compactStateForStorage(state));
      writeSavedState(compact);
      state = compact;
      hasUnsavedChanges = false;
      render();
      flash("已保存，并自动清理了未使用的大图缓存。");
    } catch (secondError) {
      console.error("Save failed", error, secondError);
      flash("保存失败：图片仍然过大，请尝试少量图片分批上传保存。");
    }
  }
}

function savedStateSnapshot() {
  try {
    return normalizeState(mergeDefaults(defaultData, JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(defaultData)));
  } catch {
    return normalizeState(clone(defaultData));
  }
}

function currentProjectDataSource() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return {
      kind: "default-sample",
      label: "默认样例（未发现 localStorage 已保存配置）"
    };
  }
  try {
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.projects)) {
      return {
        kind: "default-fallback",
        label: "默认样例（localStorage 配置无效，当前页面已回退）"
      };
    }
    return {
      kind: "local-storage",
      label: "localStorage 已保存配置"
    };
  } catch {
    return {
      kind: "default-fallback",
      label: "默认样例（localStorage 配置无法读取，当前页面已回退）"
    };
  }
}

function exportDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function exportProjectConfiguration() {
  const source = currentProjectDataSource();
  const projectCount = Array.isArray(state.projects) ? state.projects.length : 0;
  const confirmation = [
    `将导出当前实际使用的完整配置，共 ${projectCount} 个项目。`,
    `数据来源：${source.label}。`,
    "导出的 JSON 不包含图片文件本身，图片仍需单独备份。",
    "继续导出？"
  ].join("\n");
  if (!window.confirm(confirmation)) return;

  const payload = {
    exportMetadata: {
      format: "song-studio-portfolio-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      dataSource: source,
      projectCount,
      imageFileNotice: "本备份仅保存配置与图片路径，不包含图片文件本身。"
    },
    configuration: clone(state)
  };
  const fileName = `portfolio-backup-${exportDateStamp()}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const download = document.createElement("a");
  download.href = objectUrl;
  download.download = fileName;
  download.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  flash(`已导出 ${projectCount} 个项目配置：${fileName}。JSON 不包含图片文件，请单独备份素材。`);
}

function saveTypeStyle(key) {
  const next = savedStateSnapshot();
  next.settings.typography.styles[key] = clone(state.settings.typography.styles[key]);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  localStorage.setItem(REFRESH_KEY, String(Date.now()));
  hasUnsavedChanges = false;
  syncTypePreviewFrames($(`[data-type-key="${cssIdent(key)}"]`) || document);
  flash(`${state.settings.typography.styles[key]?.label || key} 已保存。`);
}

function markDirty(message = "有未保存更改") {
  hasUnsavedChanges = true;
  flash(message);
}

function flash(message) {
  const status = $("[data-status]");
  if (!status) return;
  status.textContent = message;
  window.clearTimeout(flash.timer);
  flash.timer = window.setTimeout(() => {
    status.textContent = hasUnsavedChanges ? "有未保存更改" : "当前无未保存更改";
  }, 1600);
}

function getPath(path) {
  return path.split(".").reduce((current, key) => current?.[key], state);
}

function setPath(path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((current, key) => current[key], state);
  target[last] = value;
}

function isImagePathField(path = "") {
  return /(Image|Images)$/i.test(path) || path.includes(".detailImages.");
}

function normalizeRelativeImagePath(value = "") {
  return normalizeStoredImagePath(value);
}

function normalizeImageInputValue(input, path) {
  if (!isImagePathField(path) || input.type === "checkbox" || input.type === "number") {
    return input.value;
  }

  const normalized = normalizeRelativeImagePath(input.value);

  if (normalized !== input.value) {
    input.value = normalized;
  }

  return normalized;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function slugify(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

function imageUrl(src = "") {
  if (!src) return "";
  if (assetPreviewUrls[src]) return assetPreviewUrls[src];

  let path = String(src).trim().replace(/\\/g, "/");

  // 不显示 base64，避免后台继续依赖大图缓存
  if (/^(blob:|data:image|file:)/i.test(path)) return "";

  return normalizeStoredImagePath(path);
}

function assetObjectPosition(asset = {}) {
  return `${asset.cropX ?? 50}% ${asset.cropY ?? 50}%`;
}

function assetCropTransform(asset = {}) {
  return {
    x: "0%",
    y: "0%",
    zoom: 1
  };
}

function cropStyleForAsset(asset = {}) {
  const transform = assetCropTransform(asset);
  return `--media-shift-x:${escapeHtml(transform.x)};--media-shift-y:${escapeHtml(transform.y)};--media-zoom:${escapeHtml(transform.zoom)};object-position:center;object-fit:contain;`;
}

function defaultCrop() {
  return { cropOffsetX: 0, cropOffsetY: 0, zoom: 1 };
}

function imageCropKeyFromPath(path = "") {
  const projectMatch = String(path).match(/^projects\.(\d+)\.(thumbnailImage|coverImage)$/);
  if (projectMatch) {
    const project = state.projects[Number(projectMatch[1])];
    return `project:${project?.id || projectMatch[1]}:${projectMatch[2]}`;
  }
  const detailMatch = String(path).match(/^projects\.(\d+)\.detailImages\.(\d+)$/);
  if (detailMatch) {
    const project = state.projects[Number(detailMatch[1])];
    return `project:${project?.id || detailMatch[1]}:detailImages:${detailMatch[2]}`;
  }
  const categoryMatch = String(path).match(/^categories\.(\d+)\.coverImage$/);
  if (categoryMatch) {
    const category = state.categories[Number(categoryMatch[1])];
    return `category:${category?.id || categoryMatch[1]}:coverImage`;
  }
  return path;
}

function cropForPath(path = "", src = getImageFieldValue(path)) {
  const key = imageCropKeyFromPath(path);
  const normalized = normalizeStoredImagePath(src);
  const crop = state.imageCrops?.[key];
  if (!crop || crop.src !== normalized) {
    return defaultCrop();
  }
  return {
    cropOffsetX: Number(crop.cropOffsetX || 0),
    cropOffsetY: Number(crop.cropOffsetY || 0),
    zoom: Number(crop.zoom || 1)
  };
}

function cropContext(path = activeImagePath, src = getImageFieldValue(path)) {
  return `${imageCropKeyFromPath(path)}|${normalizeStoredImagePath(src)}`;
}

function cropStyleForPath(path = "") {
  const crop = cropForPath(path);
  return `--media-shift-x:${escapeHtml(crop.cropOffsetX)}%;--media-shift-y:${escapeHtml(crop.cropOffsetY)}%;--media-zoom:${escapeHtml(crop.zoom)};object-position:center;object-fit:contain;`;
}

function projectThumbnailCropDiagnostic(project = activeProject()) {
  const projectIndex = state.projects.findIndex((item) => item.id === project?.id);
  const field = project?.coverImage ? "coverImage" : "thumbnailImage";
  const path = `projects.${projectIndex}.${field}`;
  const cropKey = imageCropKeyFromPath(path);
  const crop = cropForPath(path, project?.[field]);
  return [
    `项目 title: ${project?.title || project?.titleEn || ""}`,
    `项目 id: ${project?.id || ""}`,
    `coverImage: ${project?.coverImage || ""}`,
    `thumbnailImage: ${project?.thumbnailImage || ""}`,
    `当前实际使用字段: ${field}`,
    `当前 crop key: ${cropKey}`,
    `cropX: ${crop.cropOffsetX}`,
    `cropY: ${crop.cropOffsetY}`,
    `zoom: ${crop.zoom}`
  ].join("\n");
}

function setDraftCropFromCrop(crop = defaultCrop(), path = activeImagePath, src = getImageFieldValue(path)) {
  draftCrop = {
    cropOffsetX: Number(crop.cropOffsetX || 0),
    cropOffsetY: Number(crop.cropOffsetY || 0),
    zoom: Number(crop.zoom ?? 1)
  };
  draftCropContext = cropContext(path, src);
  draftCropUsesDefault = false;
}

function categoryById(id) {
  return state.categories.find((item) => item.id === id);
}

function projectById(id) {
  return state.projects.find((item) => item.id === id);
}

function activeProject() {
  return projectById(activeProjectId) || state.projects[0];
}

function sortedCategories() {
  return [...state.categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function sortedProjects(categoryId = "") {
  return [...state.projects]
    .filter((project) => !categoryId || project.categoryId === categoryId)
    .sort((a, b) => (a.categorySortOrder || 0) - (b.categorySortOrder || 0));
}

function allProjectsForEditor() {
  return [...state.projects].sort((a, b) => {
    const categoryDiff = (a.categorySortOrder || 0) - (b.categorySortOrder || 0);
    if (categoryDiff) return categoryDiff;
    return state.projects.indexOf(a) - state.projects.indexOf(b);
  });
}

function field(label, path, options = {}) {
  const value = getPath(path) ?? "";
  const type = options.type || "text";
  const attrs = `${options.step ? ` step="${options.step}"` : ""}${options.min ? ` min="${options.min}"` : ""}`;
  const fieldClass = `field${options.wide || options.textarea ? " field-wide" : ""}`;
  const control = options.textarea
    ? `<textarea data-path="${path}" rows="${options.rows || 4}">${escapeHtml(value)}</textarea>`
    : `<input data-path="${path}" type="${type}" value="${escapeHtml(value)}"${attrs} />`;
  return `<label class="${fieldClass}"><span>${label}</span>${control}</label>`;
}

function fontWeightSelect(label, path) {
  const value = nearestFontWeight(getPath(path));
  return `
    <label class="field">
      <span>${label}</span>
      <select data-path="${path}">
        ${fontWeightOptions.map(([weight, name]) => `<option value="${weight}"${weight === value ? " selected" : ""}>${weight} ${name}</option>`).join("")}
      </select>
    </label>
  `;
}

function checkbox(label, path) {
  return `<label class="pill-check"><input data-path="${path}" type="checkbox"${getPath(path) ? " checked" : ""} />${label}</label>`;
}

function fontSelect(label, group, path) {
  const value = getPath(path) || "";
  const fonts = fontOptions(group);
  return `
    <label class="field">
      <span>${label}</span>
      <select data-path="${path}" data-font-select="${group}">
        ${fonts.map((font) => `<option value="${escapeHtml(font.name)}"${font.name === value ? " selected" : ""}>${escapeHtml(font.name)}${font.source === "uploaded" ? "（已上传）" : ""}</option>`).join("")}
      </select>
    </label>
  `;
}

function fontOptions(group) {
  const defaults = {
    zh: ["Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC"],
    en: ["Inter", "Arial", "Helvetica", "Georgia"],
    handwriting: ["Brush Script MT", "Segoe Script", "Snell Roundhand"]
  };
  const builtIns = (defaults[group] || []).map((name) => ({ name, source: "system", group }));
  const uploaded = (state.settings.typography.fontLibrary || []).filter((font) => font.group === group);
  const merged = [...uploaded, ...builtIns];
  return merged.filter((font, index, list) => list.findIndex((item) => item.name === font.name) === index);
}

function fontByName(group, name) {
  return (state.settings.typography.fontLibrary || []).find((font) => font.group === group && font.name === name);
}

function bindFields(root = document) {
  $$("[data-path]", root).forEach((input) => {
    const update = () => {
      const typeRow = input.closest("[data-type-key]");

      if (typeRow) {
        setActiveTypeRow(typeRow, false);

        if (input.type === "number" && input.value.trim() === "") {
          markDirty("正在编辑，输入完整数值后预览。");
          return;
        }
}
      const normalizedImageValue = normalizeImageInputValue(input, input.dataset.path);
      if (normalizedImageValue === null) return;
      const isNumericValue = input.type === "number" || input.dataset.path.endsWith(".weight");
      const value = input.type === "checkbox" ? input.checked : isNumericValue ? Number(input.value) : normalizedImageValue;
      if (input.type === "number" && !Number.isFinite(value)) return;
      const colorGroup = input.closest(".color-field");
      if (colorGroup) {
        $$("[data-path]", colorGroup).forEach((peer) => {
          if (peer !== input) peer.value = value;
        });
      }
      setPath(input.dataset.path, value);
      syncCategoryService(input.dataset.path, value);
      syncFontSelection(input);
      markDirty();
      if (typeRow) {
        scheduleTypePreviewSync(typeRow);
      } else {
        syncTypePreviewFrames(root);
      }
    };
    const eventName = input.tagName === "SELECT" || input.type === "checkbox" ? "change" : "input";
    input.addEventListener(eventName, update);
    if (eventName !== "change") input.addEventListener("change", update);
    input.addEventListener("focus", () => {
      const typeRow = input.closest("[data-type-key]");
      if (!typeRow) return;
      setActiveTypeRow(typeRow, false);
      syncTypePreviewFrames(typeRow);
    });
  });
}

function setActiveTypeRow(row, shouldRender = false) {
  if (!row?.dataset?.typeKey) return;
  activeTypeKey = row.dataset.typeKey;
  $$("[data-type-key]").forEach((item) => item.classList.toggle("active", item === row));
  saveUiState();
  if (shouldRender) render();
}

function scheduleTypePreviewSync(root) {
  window.clearTimeout(typePreviewTimer);
  typePreviewTimer = window.setTimeout(() => syncTypePreviewFrames(root), 160);
}

function syncCategoryService(path, value) {
  const match = path.match(/^projects\.(\d+)\.categoryId$/);
  if (!match) return;
  state.projects[Number(match[1])].services = categoryById(value)?.name || "";
}

function syncFontSelection(input) {
  const group = input.dataset.fontSelect;
  if (!group) return;
  const font = fontByName(group, input.value) || { name: input.value, fileName: "", source: "system", dataUrl: "" };
  const target = group === "zh"
    ? state.settings.typography.fontZh
    : group === "handwriting"
      ? state.settings.typography.fontHandwriting
      : state.settings.typography.fontEn;
  target.name = font.name;
  target.fileName = font.fileName || "";
  target.source = font.source || "system";
  target.dataUrl = font.dataUrl || "";
  if (group === "handwriting") {
    state.home.footerContact.handwritingFont = font.name;
  }
}

function render() {
  normalizeUiState();
  const sourceIndicator = $("[data-project-data-source]");
  if (sourceIndicator) sourceIndicator.textContent = `项目数据来源：${currentProjectDataSource().label}`;
  document.body.dataset.adminView = activeView;
  $$("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === activeView);
  });
  $("[data-view-title]").textContent = viewTitles[activeView];
  const panel = $("[data-edit-panel]");
  panel.innerHTML = `
    <div class="cms-workspace cms-workspace-${activeView}">
      <div class="cms-main">${views[activeView]()}</div>
    </div>
  `;
  bindFields(panel);
  bindEditorActions(panel);
  saveUiState();
}

const views = {
  site: renderSite,
  home: renderHome,
  projects: renderProjects,
  images: renderImages,
  footer: renderFooter,
  type: renderType
};

function renderSite() {
  return `
    <section class="settings-board">
      <article class="cms-card">
        <header class="cms-card-head"><h3>品牌信息</h3><span>Brand</span></header>
        <div class="compact-grid compact-grid-3">
          ${field("网站名称", "settings.brandName")}
          ${field("联系邮箱", "settings.email")}
          ${field("版权文字", "settings.copyright", { wide: true })}
        </div>
      </article>
      <article class="cms-card">
        <header class="cms-card-head"><h3>字体设置</h3><span>Typography</span></header>
        <div class="compact-grid compact-grid-4">
          ${fontSelect("中文字体", "zh", "settings.typography.fontZh.name")}
          ${fontSelect("英文字体", "en", "settings.typography.fontEn.name")}
          ${fontUpload("上传中文字体", "zh")}
          ${fontUpload("上传英文字体", "en")}
        </div>
      </article>
      <article class="cms-card">
        <header class="cms-card-head"><h3>颜色设置</h3><span>Palette</span></header>
        <div class="compact-grid compact-grid-4">
          ${colorField("页面背景", "settings.colors.background")}
          ${colorField("文字主色", "settings.colors.ink")}
          ${colorField("蓝色强调", "settings.colors.accent")}
          ${colorField("暗色模块", "settings.colors.darkPanel")}
        </div>
      </article>
      <article class="cms-card">
        <header class="cms-card-head"><h3>视觉参数</h3><span>Layout</span></header>
        <div class="compact-grid compact-grid-4">
          ${field("图片圆角", "settings.layout.imageRadius", { type: "number" })}
        </div>
      </article>
    </section>
  `;
}

function fontUpload(label, group) {
  return `
    <label class="upload-field">
      <span>${label}</span>
      <input type="file" accept=".woff,.woff2,.ttf,.otf" data-font-upload="${group}" />
      <em>上传字体包</em>
    </label>
  `;
}

function colorField(label, path) {
  const value = getPath(path) || "#1774ff";
  return `
    <label class="field color-field">
      <span>${label}</span>
      <div>
        <input data-path="${path}" type="color" value="${escapeHtml(value)}" />
        <input data-path="${path}" type="text" value="${escapeHtml(value)}" />
      </div>
    </label>
  `;
}

function renderHome() {
  const selected = state.home[activeModule];
  const module = homeModules.find((item) => item.id === activeModule) || homeModules[0];
  return `
    <h2 class="panel-title">首页内容编辑</h2>
    <section class="editor-section module-select-section">
      <label class="field module-select-field">
        <span>编辑模块</span>
        <select data-home-module-select>
          ${homeModules.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === activeModule ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
        </select>
      </label>
      <div class="module-select-summary">
        <strong>${escapeHtml(module.label)}</strong>
        <span>${escapeHtml(module.hint)}</span>
      </div>
    </section>
    <section class="editor-section">
      <h3>${escapeHtml(module.label)}</h3>
      <div class="switch-row">${checkbox("显示这个模块", `home.${activeModule}.visible`)}</div>
      ${renderHomeModuleFields(activeModule, selected)}
    </section>
  `;
}

function moduleCard(module) {
  const src = module.image ? getPath(module.image) : "";
  return `
    <article class="module-card${activeModule === module.id ? " active" : ""}" data-module="${module.id}">
      ${src ? `<img src="${escapeHtml(imageUrl(src))}" alt="" />` : `<div class="empty">文本</div>`}
      <div>
        <strong>${module.label}</strong>
        <span>${module.hint}</span>
      </div>
    </article>
  `;
}

function renderHomeModuleFields(key) {
  const guide = sectionGuide(homeGuides[key]?.[0] || "首页模块", homeGuides[key]?.[1] || "");
  if (key === "hero") {
    return `
      ${guide}
      <div class="compact-grid">
        ${field("小标签", "home.hero.label")}
        ${field("主标题", "home.hero.title", { textarea: true, rows: 3 })}
        ${field("右侧副标题", "home.hero.sideTitle", { textarea: true })}
        ${field("主按钮文案", "home.hero.primaryButton.label")}
        ${field("主按钮链接", "home.hero.primaryButton.href")}
        ${field("副按钮文案", "home.hero.secondaryButton.label")}
        ${field("底部词 1", "home.hero.bottomLabels.0")}
        ${field("底部词 2", "home.hero.bottomLabels.1")}
        ${field("底部词 3", "home.hero.bottomLabels.2")}
      </div>
      ${imagePicker("首屏背景图", "home.hero.backgroundImage")}
    `;
  }
  if (key === "logoShowcase") {
    return `
      ${guide}
      ${field("说明文字", "home.logoShowcase.description")}
      <div class="drag-list" data-drag-list="home.logoShowcase.items" data-sort-key="sortOrder">
        ${state.home.logoShowcase.items.sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => `
          <article class="drag-item" draggable="true" data-index="${index}">
            <div class="empty">Logo</div>
            <div><input data-list-path="home.logoShowcase.items.${index}.label" value="${escapeHtml(item.label)}" /></div>
            <span class="drag-handle">拖拽</span>
          </article>
        `).join("")}
      </div>
    `;
  }
  if (key === "featuredCarousel") {
    return `
      ${guide}
      ${field("小标签", "home.featuredCarousel.label")}
      ${field("标题", "home.featuredCarousel.title")}
      ${field("说明", "home.featuredCarousel.description", { textarea: true })}
    `;
  }
  if (key === "numbers") {
    return `
      ${guide}
      ${field("小标签", "home.numbers.label")}
      ${field("标题", "home.numbers.title")}
      <div class="compact-grid">
        ${state.home.numbers.items.map((_, index) => `
          ${field(`数字 ${index + 1}`, `home.numbers.items.${index}.value`)}
          ${field(`说明 ${index + 1}`, `home.numbers.items.${index}.label`)}
        `).join("")}
      </div>
    `;
  }
  if (key === "projectDirectory") {
    return `
      ${guide}
      ${field("模块标题", "home.projectDirectory.label")}
      <div class="compact-grid compact-grid-4">
        ${field("右侧描述字号", "home.projectDirectory.descriptionStyle.size", { type: "number", min: 10, step: 1 })}
        ${fontWeightSelect("右侧描述字重", "home.projectDirectory.descriptionStyle.weight")}
        ${field("右侧描述行高", "home.projectDirectory.descriptionStyle.lineHeight", { type: "number", min: 0.8, step: 0.01 })}
        ${field("右侧描述字距", "home.projectDirectory.descriptionStyle.letterSpacing", { type: "number", step: 0.1 })}
      </div>
      <div class="project-detail-images">
        <h5>四个分类内容</h5>
        ${sortedCategories().map((cat) => {
          const index = state.categories.findIndex((item) => item.id === cat.id);
          return `
            <article class="category-edit-card">
              <div class="compact-grid compact-grid-3">
                ${field("英文标题", `categories.${index}.name`)}
                ${field("中文说明", `categories.${index}.shortDescription`)}
                ${field("编号", `categories.${index}.number`)}
              </div>
              <div class="compact-grid compact-grid-2">
                ${field("右侧标题", `categories.${index}.rightTitle`)}
                ${field("右侧描述", `categories.${index}.rightDescription`, { textarea: true })}
              </div>
              ${imagePicker(`${cat.name} 预览图片`, `categories.${index}.coverImage`)}
            </article>
          `;
        }).join("")}
      </div>
    `;
  }
  if (key === "projectIndex") {
  return `
    ${guide}
    ${field("小标签", "home.projectIndex.label")}
    ${field("标题", "home.projectIndex.title")}
    ${field("说明", "home.projectIndex.intro", { textarea: true })}

    <div class="project-detail-images">
      <h5>各分类介绍文案</h5>
      ${sortedCategories().map((cat) => {
        const index = state.categories.findIndex(
          (item) => item.id === cat.id
        );
        return `
          <article class="category-edit-card">
            <h5>${escapeHtml(cat.name || "未命名分类")}</h5>
            ${field(
              "分类介绍",
              `categories.${index}.indexDescription`,
              { textarea: true }
            )}
          </article>
        `;
      }).join("")}
    </div>
  `;
}
  return "";
}

function sectionGuide(title, body) {
  return `
    <div class="section-guide">
      <b>定位</b>
      <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div>
    </div>
  `;
}

function renderProjects() {
  const project = activeProject();
  const projectIndex = state.projects.findIndex((item) => item.id === project.id);
  const projects = allProjectsForEditor();
  const total = state.projects.length;
  const featured = state.projects.filter((item) => item.featuredOnHome).length;
  const visible = state.projects.filter((item) => item.visible).length;
  const hidden = total - visible;
  return `
    <h2 class="panel-title">项目管理</h2>
    <section class="project-dashboard">
      <div class="project-overview">
        ${projectMetric("全部项目", total)}
        ${projectMetric("首页精选", featured)}
        ${projectMetric("已显示", visible)}
        ${projectMetric("隐藏草稿", hidden)}
      </div>
      <div class="project-dashboard-actions">
        <button type="button" data-action="add-project">新增项目</button>
      </div>
    </section>
    <section class="project-manager-layout">
      <aside class="project-list-panel">
        <div class="project-list-head">
          <strong>项目列表</strong>
          <span>${total} 个</span>
        </div>
        <div class="project-category-list">
          ${projectCategoryList(projects)}
        </div>
      </aside>
      <article class="project-edit-panel" data-project-edit>
        <header class="project-edit-head">
          <div>
            <span>当前项目</span>
            <h3>${escapeHtml(project.title)}</h3>
          </div>
          <div class="project-edit-actions">
            <em>${escapeHtml(categoryById(project.categoryId)?.name || "未分类")}</em>
            <button class="ghost danger" type="button" data-delete-project="${escapeHtml(project.id)}">删除项目</button>
          </div>
        </header>
        <section class="project-edit-group">
          <h4>基础信息</h4>
          <div class="compact-grid compact-grid-5">
            ${field("中文标题", `projects.${projectIndex}.title`)}
            ${field("英文标题", `projects.${projectIndex}.titleEn`)}
            ${field("年份", `projects.${projectIndex}.year`)}
            ${categorySelect(`projects.${projectIndex}.categoryId`, project.categoryId)}
            ${detailThemeSelect(`projects.${projectIndex}.detailTheme`, project.detailTheme)}
          </div>
        </section>
        <section class="project-edit-group">
          <h4>显示状态</h4>
          <p class="hint">项目公开显示是总开关；加入精选轮播控制首页 Selected Projects 滚动区；加入分类项目流控制下面按分类排列的项目列表。</p>
          <div class="switch-row project-switches">
            ${checkbox("项目公开显示", `projects.${projectIndex}.visible`)}
            ${checkbox("加入精选轮播", `projects.${projectIndex}.featuredOnHome`)}
            ${checkbox("加入分类项目流", `projects.${projectIndex}.showInIndex`)}
          </div>
        </section>
        <section class="project-edit-group">
          <h4>项目图片 <button class="ghost" type="button" data-project-thumbnail-diagnostic>缩略图裁切诊断</button></h4>
          <div class="compact-grid project-image-grid">
            ${imagePicker("精选项目缩略图", `projects.${projectIndex}.thumbnailImage`)}
            ${imagePicker("项目缩略图", `projects.${projectIndex}.coverImage`)}
          </div>
          <div class="project-detail-images">
            <h5>详情正文配图</h5>
            ${detailImages(project, projectIndex)}
          </div>
        </section>

          ${detailTextSections(project, projectIndex)}
        </section>
      </article>
    </section>
  `;
}

function detailTextSections(project, projectIndex) {
  const sections = project.detailSections || [];
  return `
    <div class="project-detail-images detail-text-editor">
      <h5>详情页文字模块</h5>
      ${sections.map((section, index) => `
        <article class="detail-text-card" data-detail-section-index="${index}">
          <div class="compact-grid compact-grid-3">
            ${field("模块标签", `projects.${projectIndex}.detailSections.${index}.label`)}
            ${field("段落标题", `projects.${projectIndex}.detailSections.${index}.title`)}
            <div class="detail-section-actions">
              <button class="ghost" type="button" data-move-detail-section="${projectIndex}" data-index="${index}" data-dir="-1">上移</button>
              <button class="ghost" type="button" data-move-detail-section="${projectIndex}" data-index="${index}" data-dir="1">下移</button>
              <button class="ghost danger" type="button" data-remove-detail-section="${projectIndex}" data-index="${index}">删除</button>
            </div>
          </div>
          ${field("正文", `projects.${projectIndex}.detailSections.${index}.body`, { textarea: true, rows: 5 })}
        </article>
      `).join("")}
      <button type="button" class="ghost" data-add-detail-section="${projectIndex}">新增文字模块</button>
    </div>
  `;
}

function projectMetric(label, value) {
  return `
    <div class="project-metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function projectCategoryList(projects) {
  const groups = sortedCategories().map((category) => ({
    id: category.id,
    name: category.name,
    nameZh: category.nameZh,
    projects: projects.filter((project) => project.categoryId === category.id)
  }));
  const uncategorized = projects.filter((project) => !categoryById(project.categoryId));
  if (uncategorized.length) {
    groups.push({ id: "uncategorized", name: "Uncategorized", nameZh: "未分类", projects: uncategorized });
  }
  return groups.map((group) => `
    <details class="project-category-group">
      <summary class="project-category-head">
        <strong>${escapeHtml(group.nameZh || group.name)}</strong>
        <em>${group.projects.length} 个</em>
      </summary>
      <div class="project-name-list">
        ${group.projects.length ? group.projects.map((project) => projectNameItem(project)).join("") : `<p>暂无项目</p>`}
      </div>
    </details>
  `).join("");
}

function projectNameItem(project) {
  return `
    <button class="project-name-item${project.id === activeProjectId ? " active" : ""}" type="button" data-project-id="${escapeHtml(project.id)}">
      <strong>${escapeHtml(project.title || project.titleEn || "未命名项目")}</strong>
    </button>
  `;
}

function projectBadges(project) {
  const category = categoryById(project.categoryId)?.name || "未分类";
  return `
    <div class="project-card-badges">
      <span>${escapeHtml(category)}</span>
      ${project.featuredOnHome ? "<span>精选</span>" : ""}
    </div>
  `;
}

function projectListImages(project) {
  const seen = new Set();
  return [
    project.thumbnailImage,
    project.coverImage,
    ...(project.detailImages || []).map(detailImageSrc)
  ].map(normalizeStoredImagePath).filter((src) => {
    if (!src || seen.has(src)) return false;
    seen.add(src);
    return true;
  });
}

function projectCard(project) {
  const images = projectListImages(project);
  const title = project.title || project.titleEn || "";
  return `
    <article class="project-card${project.id === activeProjectId ? " active" : ""}" data-project-id="${project.id}">
      <div class="project-card-media${images.length > 1 ? " has-multiple" : ""}" data-project-media>
        <div class="project-card-media-track">
          ${images.map((src) => `<img src="${escapeHtml(imageUrl(src))}" alt="${escapeHtml(title)}" draggable="false" />`).join("")}
        </div>
        ${images.length > 1 ? `<span class="project-card-media-count">1/${images.length}</span><div class="project-card-media-dots">${images.map((_, index) => `<i${index === 0 ? " class=\"active\"" : ""}></i>`).join("")}</div>` : ""}
      </div>
      <div class="project-card-content">
        <strong>${escapeHtml(project.title)}</strong>
        <small>${escapeHtml(project.titleEn || "")}</small>
        ${projectBadges(project)}
      </div>
    </article>
  `;
}

function updateProjectCardMedia(media) {
  const slides = $$("img", media);
  if (slides.length <= 1) return;
  const index = Math.min(slides.length - 1, Math.max(0, Math.round(media.scrollLeft / Math.max(1, media.clientWidth))));
  const count = $(".project-card-media-count", media);
  if (count) count.textContent = `${index + 1}/${slides.length}`;
  $$(".project-card-media-dots i", media).forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === index);
  });
}

function markProjectMediaMoved(media) {
  const card = media.closest("[data-project-id]");
  if (!card) return;
  card.dataset.mediaMoved = "true";
  window.clearTimeout(Number(card.dataset.mediaMoveTimer || 0));
  card.dataset.mediaMoveTimer = String(window.setTimeout(() => {
    card.dataset.mediaMoved = "false";
  }, 180));
}

function bindProjectCardMedia(root = document) {
  $$("[data-project-media]", root).forEach((media) => {
    const slides = $$("img", media);
    if (slides.length <= 1) return;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;
    let lastScroll = media.scrollLeft;

    media.addEventListener("scroll", () => {
      if (Math.abs(media.scrollLeft - lastScroll) > 2) markProjectMediaMoved(media);
      lastScroll = media.scrollLeft;
      updateProjectCardMedia(media);
    }, { passive: true });
    media.addEventListener("wheel", (event) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      media.scrollLeft += delta;
      markProjectMediaMoved(media);
      updateProjectCardMedia(media);
      event.preventDefault();
    }, { passive: false });
    media.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startScroll = media.scrollLeft;
      media.classList.add("is-dragging");
    });
    media.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) < 4) return;
      moved = true;
      media.scrollLeft = startScroll - delta;
      markProjectMediaMoved(media);
      updateProjectCardMedia(media);
    });
    const stopDrag = () => {
      if (moved) markProjectMediaMoved(media);
      dragging = false;
      moved = false;
      media.classList.remove("is-dragging");
    };
    media.addEventListener("pointerup", stopDrag);
    media.addEventListener("pointercancel", stopDrag);
  });
}

function detailImageUsageLabel(index) {
  const number = String(index + 1).padStart(2, "0");
  return `详情正文配图 ${number}`;
}

function detailImageSelectionFor(projectId = "") {
  if (!detailImageSelections.has(projectId)) detailImageSelections.set(projectId, new Set());
  return detailImageSelections.get(projectId);
}

function selectedDetailImageIndexes(projectId = "") {
  return [...detailImageSelectionFor(projectId)].map(Number).sort((a, b) => a - b);
}

function detailImageCanJoinSeamless(detail) {
  return detail?.displayMode !== "natural" && !isVideoSource(detailImageSrc(detail));
}

function detailImageSelectionIsConsecutive(indexes = []) {
  return indexes.length > 1 && indexes.every((index, position) => position === 0 || index === indexes[position - 1] + 1);
}

function seamlessGroupLabel(groupId = "") {
  return groupId ? `无缝组 ${groupId.split("-").pop()}` : "";
}

function categorySelect(path, selected) {
  return `
    <label class="field">
      <span>分类 / 服务类型</span>
      <select data-path="${path}">
        ${sortedCategories().map((cat) => `<option value="${cat.id}"${selected === cat.id ? " selected" : ""}>${cat.name} / ${cat.nameZh}</option>`).join("")}
      </select>
    </label>
  `;
}

function detailThemeSelect(path, selected = "light") {
  return `
    <label class="field">
      <span>详情页背景</span>
      <select data-path="${path}">
        <option value="light"${selected === "light" ? " selected" : ""}>浅色背景</option>
        <option value="dark"${selected === "dark" ? " selected" : ""}>深色背景</option>
      </select>
    </label>
  `;
}

function detailImages(project, projectIndex) {
  const selectedIndexes = detailImageSelectionFor(project.id);
  return `
    <div class="drag-list" data-image-drag="${project.id}">
      ${(project.detailImages || []).map((item, index) => {
        const detail = normalizeDetailImageItem(item);
        if (!detail) return "";
        const src = detail.src;
        const isCoverImage = index === 0;
        const isSelected = selectedIndexes.has(index);
        return `
        <article class="image-row" draggable="true" data-index="${index}">
          <label class="detail-image-select" title="${isCoverImage ? "第 1 张封面图不参与无缝组" : "选择详情图"}">
            <input type="checkbox" data-detail-image-select="${projectIndex}" data-detail-index="${index}"${isSelected ? " checked" : ""}${isCoverImage ? " disabled" : ""} />
            <span>${isCoverImage ? "封面" : "选择"}</span>
          </label>
          ${isVideoSource(src)
            ? `<video src="${escapeHtml(imageUrl(src))}" muted loop autoplay playsinline preload="metadata"></video>`
            : `<img src="${escapeHtml(imageUrl(src))}" alt="" style="${cropStyleForPath(`projects.${projectIndex}.detailImages.${index}`)}" />`}
          <div class="image-row-info">
            <strong>${escapeHtml(detailImageUsageLabel(index))}</strong>
            <span>${escapeHtml(isDataUrl(src) ? "已上传媒体" : src)}</span>
            ${detail.seamlessGroupId ? `<em class="detail-image-group-label">${escapeHtml(seamlessGroupLabel(detail.seamlessGroupId))}</em>` : ""}
          </div>
          <select class="image-row-layout" data-detail-image-layout="${projectIndex}" data-index="${index}" aria-label="图片宽度布局">
            <option value="auto"${detail.layout === "auto" ? " selected" : ""}>auto 自动</option>
            <option value="wide"${detail.layout === "wide" ? " selected" : ""}>wide 大图</option>
            <option value="half"${detail.layout === "half" ? " selected" : ""}>half 半宽</option>
            <option value="small"${detail.layout === "small" ? " selected" : ""}>small 小图</option>
          </select>
          <select class="image-row-layout" data-detail-image-display-mode="${projectIndex}" data-index="${index}" aria-label="展示模式">
            <option value="fixed16x9"${detail.displayMode !== "natural" ? " selected" : ""}>16:9 固定</option>
            <option value="natural"${detail.displayMode === "natural" ? " selected" : ""}>原图高度</option>
          </select>
          <button class="ghost" type="button" data-remove-detail="${project.id}" data-index="${index}">删除</button>
          <button class="ghost" type="button" data-open-media="projects.${projectIndex}.detailImages.${index}" data-media-label="${escapeHtml(detailImageUsageLabel(index))}">替换</button>
        </article>
      `;
      }).join("")}
    </div>
    <div class="detail-image-actions">
      <button class="ghost" type="button" data-set-seamless-group="${project.id}">设为无缝组</button>
      <button class="ghost" type="button" data-clear-seamless-group="${project.id}">取消无缝组</button>
      <button class="ghost" type="button" data-add-detail-image-library="${projectIndex}">从图片库添加多张详情图</button>
    </div>
    ${imageUpload(`projects.${projectIndex}.detailImages`, "本地上传详情图")}
  `;
}

function setSelectedDetailImagesAsSeamlessGroup(projectId) {
  const project = projectById(projectId);
  if (!project?.detailImages) return;
  const indexes = selectedDetailImageIndexes(projectId);
  if (!indexes.length) return flash("请先选择连续的固定 16:9 正文图片。");
  if (indexes.includes(0)) return flash("第 1 张封面图不参与无缝组。");
  if (!detailImageSelectionIsConsecutive(indexes)) return flash("请选择连续排列的图片后再设为无缝组。");
  const details = indexes.map((index) => normalizeDetailImageItem(project.detailImages[index]));
  if (details.some((detail) => !detailImageCanJoinSeamless(detail))) {
    return flash("视频或自然高度长图不能加入无缝组，请使用固定 16:9 图片。");
  }
  const groupId = `sg-${Date.now().toString(36)}`;
  indexes.forEach((index) => {
    const current = normalizeDetailImageItem(project.detailImages[index]);
    if (!current) return;
    project.detailImages[index] = { ...current, seamlessGroupId: groupId };
  });
  markDirty("已设为无缝组，记得保存。");
  render();
}

function clearSelectedDetailImagesSeamlessGroup(projectId) {
  const project = projectById(projectId);
  if (!project?.detailImages) return;
  const indexes = selectedDetailImageIndexes(projectId);
  if (!indexes.length) return flash("请先选择要取消无缝组的图片。");
  indexes.forEach((index) => {
    const current = normalizeDetailImageItem(project.detailImages[index]);
    if (!current) return;
    const { seamlessGroupId, ...rest } = current;
    project.detailImages[index] = rest;
  });
  markDirty("已取消所选图片的无缝组，记得保存。");
  render();
}

function renderImages() {
  const missingRefs = manifestMissingReferenceItems();
  return `
    <h2 class="panel-title">图片管理</h2>
    <section class="editor-section">
      <div class="asset-path-tools">
        <div>
          <strong>媒体文件夹</strong>
          <span>${escapeHtml(mediaSyncStatus)}${mediaSyncSource ? `｜${escapeHtml(mediaSyncSource)}` : ""}。上传会直接写入 assets/images/${escapeHtml(activeAssetFolder === "all" || activeAssetFolder === "root" ? "" : `${activeAssetFolder}/`)}。</span>
        </div>
        <label class="code-folder-file">
          <input type="file" webkitdirectory directory multiple data-image-folder-input />
          <span>选择媒体文件夹</span>
        </label>
        ${imageUpload("assets", "单独上传到媒体库", true)}
        <button type="button" class="ghost" data-action="cleanup-assets">清理未使用大图缓存</button>
      </div>
      <div class="media-drop-zone" data-media-drop-zone>
        <strong>拖入图片、MP4 或媒体文件夹</strong>
        <span>自动上传到当前文件夹：${escapeHtml(assetFolderLabel(activeAssetFolder === "all" ? "root" : activeAssetFolder))}</span>
      </div>
      ${missingRefs.length ? `<p class="hint">有 ${missingRefs.length} 个项目引用的图片已不在文件夹中：${escapeHtml(missingRefs.slice(0, 4).join(" / "))}${missingRefs.length > 4 ? " ..." : ""}</p>` : ""}
    </section>
    ${assetFolderFilters()}
    <section class="asset-grid drag-list" data-asset-drag>
      ${filteredAssets().map((asset) => `
        <article class="asset-card" draggable="true" data-asset-id="${asset.id}">
          ${isVideoSource(asset.src)
            ? `<video src="${escapeHtml(imageUrl(asset.src))}" muted loop autoplay playsinline preload="metadata"></video>`
            : `<img src="${escapeHtml(imageUrl(asset.src))}" alt="" style="object-position:${escapeHtml(assetObjectPosition(asset))}" />`}
          <div>
            <strong>${escapeHtml(asset.label)}</strong>
            <span>${escapeHtml(asset.src)}</span>
            <button class="ghost" type="button" data-delete-asset="${asset.id}">删除</button>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderFooter() {
  return `
    <h2 class="panel-title">尾屏设置</h2>
    <section class="editor-section compact-grid">
      ${field("小标签", "home.footerContact.label")}
      ${field("3Q 主视觉文案", "home.footerContact.title")}
      ${field("说明文案", "home.footerContact.description", { textarea: true })}
      ${field("邮箱", "home.footerContact.email")}
      ${field("Back Home 按钮", "home.footerContact.buttonLabel")}
      ${field("按钮链接", "home.footerContact.buttonHref")}
      ${field("手写压字内容", "home.footerContact.handwritingText")}
      ${fontSelect("手写字体", "handwriting", "home.footerContact.handwritingFont")}
      ${fontUpload("上传手写字体包", "handwriting")}
    </section>
    <section class="editor-section compact-grid">
      ${imagePicker("尾屏背景图", "home.footerContact.backgroundImage")}
      ${imagePicker("二维码图片", "home.footerContact.qrImage")}
    </section>
  `;
}

function renderType() {
  return `
    <h2 class="panel-title">字体层级</h2>
    <section class="type-grid">
      ${typeLayerGroups.map((group) => typeRow(group)).join("")}
    </section>
  `;
}

function renderCode() {
  const isEmpty = !state.codeDrafts.html && !state.codeDrafts.css && !state.codeDrafts.js;
  const current = codeFileByKey(activeCodeFile);
  const currentCode = getPath(current.path) || "";
  const folderLabel = codeFolderName ? `当前默认文件夹：${escapeHtml(codeFolderName)}` : "当前默认文件夹：当前网站文件夹";
  const status = codeDraftsStatus || (isEmpty
    ? "代码编辑会直接读取这个后台所在网站文件夹里的文件。"
    : "左侧切换文件类型，右侧只编辑当前文件。");
  return `
    <h2 class="panel-title">代码编辑</h2>
    ${sectionGuide("代码草稿入口", status)}
    <section class="editor-section code-folder-tools">
      <div>
        <strong>${folderLabel}</strong>
        <span>默认读取 index.html / styles.css / site-interactions.js。</span>
      </div>
      <button type="button" class="ghost" data-code-folder-action="choose">选择网站文件夹</button>
      <label class="code-folder-file">
        <input type="file" webkitdirectory directory multiple data-code-folder-input />
        <span>读取文件</span>
      </label>
      <details class="code-advanced-actions">
        <summary>更多</summary>
        <div>
          <button type="button" class="ghost" data-code-folder-action="site">读取当前网站文件夹</button>
          <button type="button" class="ghost" data-code-folder-action="reload">重新读取</button>
          <button type="button" class="ghost" data-code-folder-action="forget"${codeFolderName ? "" : " disabled"}>忘记文件夹</button>
        </div>
      </details>
    </section>
    <section class="editor-section code-workspace">
      <nav class="code-file-tabs" aria-label="代码文件">
        ${codeFiles.map((file) => `
          <button type="button" class="${activeCodeFile === file.key ? "active" : ""}" data-code-file="${file.key}">
            <b>${file.label}</b>
            <small>${file.fileName}</small>
          </button>
        `).join("")}
      </nav>
      <div class="code-editor-panel">
        <div class="code-editor-meta">
          <span>${escapeHtml(current.fileName)}</span>
          <i data-code-status>${codeDirtyFiles[activeCodeFile] ? "有未保存修改" : codeFolderHandle ? "已连接本地文件夹" : "草稿模式"}</i>
        </div>
        <textarea class="source-code-editor" data-code-editor spellcheck="false" wrap="off">${escapeHtml(currentCode)}</textarea>
        <footer class="code-editor-footer">
          <span>Tab 键可缩进。选择本地文件夹后，支持写回原文件；否则保存为后台草稿。</span>
          <button type="button" data-code-save-file${codeDirtyFiles[activeCodeFile] ? "" : " disabled"}>保存当前文件</button>
        </footer>
      </div>
    </section>
  `;
}

function codeFileByKey(key) {
  return codeFiles.find((file) => file.key === key) || codeFiles[0];
}

async function ensureCodeDrafts() {
  if (codeDraftsLoading) return;
  if (codeFolderLoaded) return;
  if (codeAutoReadAttempted) return;
  codeAutoReadAttempted = true;
  codeDraftsLoading = true;
  try {
    if (codeFolderName === "当前网站文件夹") {
      await loadCodeDraftsFromSiteFolder();
      return;
    }
    const folder = await getStoredCodeFolderHandle();
    if (folder) {
      codeFolderName = codeFolderName || folder.name || "";
      if (await hasCodeFolderPermission(folder, false)) {
        await loadCodeDraftsFromFolder(folder);
        return;
      }
      codeDraftsStatus = "已记住代码文件夹，但浏览器需要重新授权。请点击“重新读取”。";
      if (state.codeDrafts.html || state.codeDrafts.css || state.codeDrafts.js) return;
    }
    if (state.codeDrafts.html || state.codeDrafts.css || state.codeDrafts.js) return;
    await loadCodeDraftsFromSiteFolder();
  } catch {
    codeFolderLoaded = true;
    state.codeDrafts.html = [
      "<!-- 当前浏览器环境无法自动读取 index.html。",
      "如果你是直接打开本地 HTML 文件，请用本地服务器打开后台后再试。",
      "你也可以点击“本地选择”，选择当前网站文件夹来读取代码。 -->"
    ].join("\n");
    state.codeDrafts.css = "/* 当前环境无法自动读取 styles.css。这里可以手动粘贴 CSS 草稿。 */";
    state.codeDrafts.js = "// 当前环境无法自动读取 site-interactions.js。这里可以手动粘贴 JS 草稿。";
    codeDraftsStatus = "当前环境无法自动读取文件，已放入说明草稿；你仍可以手动编辑并保存。";
  } finally {
    codeDraftsLoading = false;
    if (activeView === "code") render();
  }
}

async function loadCodeDraftsFromFolder(folder) {
  const [html, css, js] = await Promise.all([
    readFolderFile(folder, "index.html"),
    readFolderFile(folder, "styles.css"),
    readFolderFile(folder, "site-interactions.js")
  ]);
  state.codeDrafts.html = html;
  state.codeDrafts.css = css;
  state.codeDrafts.js = js;
  codeFolderHandle = folder;
  codeFolderName = folder.name || codeFolderName;
  codeFolderLoaded = true;
  codeAutoReadAttempted = true;
  codeDirtyFiles = { html: false, css: false, js: false };
  localStorage.setItem(CODE_FOLDER_NAME_KEY, codeFolderName);
  codeDraftsStatus = `已读取“${codeFolderName}”里的代码。`;
}

async function loadCodeDraftsFromSiteFolder() {
  const [html, css, js] = await Promise.all([
    readSourceFile("index.html"),
    readSourceFile("styles.css"),
    readSourceFile("site-interactions.js")
  ]);
  state.codeDrafts.html = html;
  state.codeDrafts.css = css;
  state.codeDrafts.js = js;
  codeFolderLoaded = true;
  codeAutoReadAttempted = true;
  codeDirtyFiles = { html: false, css: false, js: false };
  codeFolderName = "当前网站文件夹";
  localStorage.setItem(CODE_FOLDER_NAME_KEY, codeFolderName);
  codeDraftsStatus = "已读取当前网站文件夹里的代码。";
}

async function readFolderFile(folder, fileName) {
  const fileHandle = await folder.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return file.text();
}

function openCodeFolderFallbackPicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.webkitdirectory = true;
  input.setAttribute("directory", "");
  input.hidden = true;
  document.body.appendChild(input);
  input.addEventListener("change", () => {
    loadCodeDraftsFromPickedFiles([...input.files]);
    input.remove();
  }, { once: true });
  input.click();
}

async function loadCodeDraftsFromPickedFiles(files) {
  if (!files.length) return;
  const findFile = (fileName) => {
    const rootMatch = files.find((file) => {
      const path = file.webkitRelativePath || file.name;
      const parts = path.split("/");
      return parts.length === 2 && parts[1] === fileName;
    });
    return rootMatch || files.find((file) => (file.webkitRelativePath || file.name).endsWith(`/${fileName}`) || file.name === fileName);
  };
  const htmlFile = findFile("index.html");
  const cssFile = findFile("styles.css");
  const jsFile = findFile("site-interactions.js");
  if (!htmlFile || !cssFile || !jsFile) {
    codeDraftsStatus = "没有读到完整代码。请选择包含 index.html、styles.css、site-interactions.js 的文件夹。";
    render();
    return;
  }
  const folderPath = htmlFile.webkitRelativePath || "";
  codeFolderName = folderPath.split("/")[0] || "已选择的代码文件夹";
  codeFolderLoaded = true;
  codeAutoReadAttempted = true;
  codeDirtyFiles = { html: false, css: false, js: false };
  localStorage.setItem(CODE_FOLDER_NAME_KEY, codeFolderName);
  state.codeDrafts.html = await htmlFile.text();
  state.codeDrafts.css = await cssFile.text();
  state.codeDrafts.js = await jsFile.text();
  codeDraftsStatus = `已读取“${codeFolderName}”里的代码。当前浏览器不支持长期文件夹权限，刷新后代码草稿会保留；需要同步最新文件时请再次点击“选择代码文件夹”。`;
  markDirty("代码草稿已读取，记得保存。");
  render();
}

async function readSourceFile(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot read ${path}`);
  return response.text();
}

async function chooseCodeFolder() {
  if (!window.showDirectoryPicker) {
    openCodeFolderFallbackPicker();
    return;
  }
  try {
    const folder = await window.showDirectoryPicker({ mode: "readwrite" });
    if (!(await hasCodeFolderPermission(folder, true))) {
      codeDraftsStatus = "没有获得读取权限，请重新选择文件夹。";
      render();
      return;
    }
    await storeCodeFolderHandle(folder);
    codeFolderLoaded = false;
    await loadCodeDraftsFromFolder(folder);
    render();
  } catch (error) {
    if (error?.name !== "AbortError") {
      codeDraftsStatus = "选择文件夹失败，请确认浏览器允许读取本地文件夹。";
      render();
    }
  }
}

async function reloadCodeFolder() {
  if (codeFolderName === "当前网站文件夹" || !codeFolderHandle) {
    try {
      await loadCodeDraftsFromSiteFolder();
      render();
    } catch {
      codeDraftsStatus = "当前环境不能直接读取网站文件夹。请确认后台是通过本地服务器打开的，而不是浏览器预览沙盒。";
      render();
    }
    return;
  }
  if (!window.showDirectoryPicker) {
    openCodeFolderFallbackPicker();
    return;
  }
  const folder = await getStoredCodeFolderHandle();
  if (!folder) {
    codeDraftsStatus = "还没有选择代码文件夹。";
    render();
    return;
  }
  if (!(await hasCodeFolderPermission(folder, true))) {
    codeDraftsStatus = "没有获得读取权限，请重新选择文件夹。";
    render();
    return;
  }
  try {
    codeFolderLoaded = false;
    await loadCodeDraftsFromFolder(folder);
    render();
  } catch {
    codeDraftsStatus = "读取失败，请确认文件夹里有 index.html、styles.css 和 site-interactions.js。";
    render();
  }
}

async function forgetCodeFolder() {
  await forgetStoredCodeFolderHandle();
  codeDraftsStatus = "已忘记默认代码文件夹。你可以重新选择。";
  render();
}

async function saveActiveCodeFile() {
  const current = codeFileByKey(activeCodeFile);
  const value = getPath(current.path) || "";
  if (codeFolderHandle?.getFileHandle) {
    try {
      const fileHandle = await codeFolderHandle.getFileHandle(current.fileName);
      const writable = await fileHandle.createWritable();
      await writable.write(value);
      await writable.close();
      codeDirtyFiles[activeCodeFile] = false;
      saveState(`${current.fileName} 已保存到本地文件夹。`);
      render();
      return;
    } catch {
      flash("无法写回本地文件，请重新选择网站文件夹。");
      return;
    }
  }
  codeDirtyFiles[activeCodeFile] = false;
  saveState(`${current.fileName} 已保存为后台草稿。`);
  render();
}

function typeRow(group) {
  const key = group.styleKey;
  const style = state.settings.typography.styles[key] || {};
  const base = `settings.typography.styles.${key}`;
  const sections = group.locations;
  const selectorList = group.locations.map((item) => item.selector).join(",");
  return `
    <article class="type-row${activeTypeKey === key ? " active" : ""}" data-type-key="${key}" data-type-layer="${group.key}" data-type-selector-list="${escapeHtml(selectorList)}" data-type-active-selector="${escapeHtml(sections[0]?.selector || selectorList)}">
      <div class="type-row-title">
        <div>
          <b>${escapeHtml(group.label)}</b>
          <em>${escapeHtml(group.locations.length)} 个应用位置 · 共享 ${escapeHtml(style.label || key)}</em>
        </div>
        <button type="button" data-save-type="${escapeHtml(key)}">保存此项</button>
      </div>
      <label><span>大小</span><input data-path="${base}.size" type="number" value="${style.size}" /></label>
      ${fontWeightSelect("字重", `${base}.weight`)}
      <label><span>行高</span><input data-path="${base}.lineHeight" type="number" step="0.01" value="${style.lineHeight}" /></label>
      <label><span>字距</span><input data-path="${base}.letterSpacing" type="number" step="0.01" value="${style.letterSpacing}" /></label>
      <label><span>宽度</span><input data-path="${base}.maxWidth" type="number" value="${style.maxWidth || ""}" placeholder="可选" /></label>
      <label><span>大小写</span><select data-path="${base}.textTransform"><option value=""${!style.textTransform ? " selected" : ""}>默认</option><option value="uppercase"${style.textTransform === "uppercase" ? " selected" : ""}>大写</option><option value="none"${style.textTransform === "none" ? " selected" : ""}>不转换</option></select></label>
      <div class="type-real-preview">
        <div class="type-preview-tabs">
          ${sections.map((section, index) => `<button class="${index === 0 ? "active" : "ghost"}" type="button" data-type-preview-target="${escapeHtml(section.hash)}" data-type-preview-page="${escapeHtml(section.page || "index.html")}" data-type-preview-selector="${escapeHtml(section.selector)}">${escapeHtml(section.label)}</button>`).join("")}
        </div>
        <div class="type-preview-viewport" data-type-preview-viewport>
          <iframe title="${escapeHtml(style.label || key)} 真实页面预览" src="${escapeHtml(typePreviewFrameSrc(sections[0]))}" data-type-preview-frame scrolling="no"></iframe>
        </div>
      </div>
    </article>
  `;
}

function typePreviewFrameSrc(section = {}) {
  const page = section.page || "index.html";
  const hash = section.hash || "#hero";
  const join = page.includes("?") ? "&" : "?";
  return `${page}${join}adminPreview=type${hash}`;
}

function syncTypePreviewFrames(root = document) {
  $$("[data-type-preview-viewport]", root).forEach(sizeTypePreviewViewport);
  $$("[data-type-preview-frame]", root).forEach(postTypePreviewState);
}

function sizeTypePreviewViewport(viewport) {
  const width = 1440;
  const height = 820;
  const scale = Math.min(1, viewport.clientWidth / width);
  viewport.style.setProperty("--preview-width", `${width}px`);
  viewport.style.setProperty("--preview-height", `${height}px`);
  viewport.style.setProperty("--preview-scale", scale);
  viewport.style.height = `${Math.round(height * scale)}px`;
}

function postTypePreviewState(frame) {
  if (!frame?.contentWindow) return;
  const row = frame.closest("[data-type-key]");
  const activeKey = row?.dataset.typeKey || activeTypeKey;
  frame.contentWindow.postMessage({
    type: "SONG_STUDIO_PREVIEW_STATE",
    payload: clone(state),
    activeTypeKey: activeKey,
    activeTypeSelector: row?.dataset.typeActiveSelector || ""
  }, "*");
  applyTypePreviewCss(frame, activeKey);
  window.setTimeout(() => {
    applyTypePreviewCss(frame, activeKey);
  }, 50);
}

const TYPE_SIZE_FLOORS = {
  display: 38,
  sectionTitle: 24,
  cardTitle: 16,
  body: 14,
  meta: 12,
  button: 12
};

function previewTypeRule(selector, style, sizeRole = "body") {
  if (!style) return "";
  const declarations = [
    style.size ? `font-size:${previewResponsiveFontSize(style.size, sizeRole)} !important` : "",
    style.weight ? `font-weight:${style.weight} !important` : "",
    style.lineHeight ? `line-height:${style.lineHeight} !important` : "",
    style.letterSpacing !== undefined ? `letter-spacing:${style.letterSpacing}px !important` : "",
    style.maxWidth ? `max-width:${style.maxWidth}px !important` : "",
    style.textTransform ? `text-transform:${style.textTransform} !important` : ""
  ].filter(Boolean).join(";");
  return declarations ? `${selector}{${declarations}}${previewResponsiveFontMedia(selector, style.size, sizeRole)}` : "";
}

function previewResponsiveFontSize(size, sizeRole = "body", scale = 1) {
  const value = Number(size);
  if (!Number.isFinite(value)) return `${size}px`;
  const floor = TYPE_SIZE_FLOORS[sizeRole] || TYPE_SIZE_FLOORS.body;
  return `${Math.max(floor, Number((value * scale).toFixed(2)))}px`;
}

function previewResponsiveFontMedia(selector, size, sizeRole = "body") {
  const value = Number(size);
  if (!Number.isFinite(value)) return "";
  return `@media (max-width:1024px){${selector}{font-size:${previewResponsiveFontSize(value, sizeRole, 0.92)} !important}}@media (max-width:767.98px){${selector}{font-size:${previewResponsiveFontSize(value, sizeRole, 0.82)} !important}}`;
}

function previewResponsiveDisplayRule(selector, style) {
  if (!style?.size) return previewTypeRule(selector, style, "display");
  const declarations = [
    `font-size:${previewResponsiveFontSize(style.size, "display")} !important`,
    style.weight ? `font-weight:${style.weight} !important` : "",
    style.lineHeight ? `line-height:${style.lineHeight} !important` : "",
    style.letterSpacing !== undefined ? `letter-spacing:${style.letterSpacing}px !important` : "",
    style.maxWidth ? `max-width:${style.maxWidth}px !important` : "",
    style.textTransform ? `text-transform:${style.textTransform} !important` : ""
  ].filter(Boolean).join(";");
  return `${selector}{${declarations}}${previewResponsiveFontMedia(selector, style.size, "display")}`;
}

function previewTypeHighlight(key, selectorOverride = "") {
  const selector = selectorOverride || typeLayerGroups.find((group) => group.styleKey === key)?.locations.map((item) => item.selector).join(",") || typePreviewSelectors[key];
  if (!selector) return "";
  return `${selector},.admin-preview-focus{outline:3px solid #ff3b4f !important;outline-offset:6px !important;background:rgba(255,59,79,.14) !important;box-shadow:0 0 0 10px rgba(255,59,79,.08) !important;}`;
}

function previewTypeCss(activeKey = activeTypeKey, selectorOverride = "") {
  const styles = state.settings.typography.styles || {};
  return [
    previewResponsiveDisplayRule(typeLayerGroups[0].locations.map((item) => item.selector).join(","), styles.h1En),
    previewTypeRule(typeLayerGroups[1].locations.map((item) => item.selector).join(","), styles.h2En, "sectionTitle"),
    previewTypeRule(typeLayerGroups[2].locations.map((item) => item.selector).join(","), styles.h3Zh, "cardTitle"),
    previewTypeRule(typeLayerGroups[3].locations.map((item) => item.selector).join(","), styles.bodyEn, "body"),
    previewTypeRule(typeLayerGroups[4].locations.map((item) => item.selector).join(","), styles.metaEn, "meta"),
    previewTypeRule(typeLayerGroups[5].locations.map((item) => item.selector).join(","), styles.buttonEn, "button"),
    previewTypeHighlight(activeKey, selectorOverride)
  ].join("\n");
}

function applyTypePreviewCss(frame, activeKey = activeTypeKey) {
  try {
    const doc = frame?.contentDocument;
    const row = frame?.closest("[data-type-key]");
    if (!doc?.head) return;
    let style = doc.getElementById("song-studio-admin-live-type");
    if (!style) {
      style = doc.createElement("style");
      style.id = "song-studio-admin-live-type";
      doc.head.appendChild(style);
    }
    style.textContent = previewTypeCss(activeKey, row?.dataset.typeActiveSelector || "");
  } catch {
    // Some local file previews block direct iframe access; postMessage still handles live preview.
  }
}

function imagePicker(label, path) {
  const current = getImageFieldValue(path);
  const displayPath = isDataUrl(current) ? "已上传图片" : current || "未保存路径";
  const ratioConfig = getImageRatioConfig(path);
  return `
    <div class="manual-image-field">
      <button class="image-slot" type="button" data-open-media="${path}" data-media-label="${escapeHtml(label)}">
        ${current ? `<img src="${escapeHtml(imageUrl(current))}" alt="" style="${cropStyleForPath(path)}" />` : `<div class="empty">未选择</div>`}
        <div>
          <span>${label}</span>
          <em>替换</em>
          <code class="image-current-path">${escapeHtml(displayPath)}</code>
        </div>
      </button>
    </div>
  `;
}

function imageUpload(targetPath, label, toLibrary = false) {
  const ratioConfig = getImageRatioConfig(targetPath);
  const acceptsVideo = targetPath.includes("detailImages") || targetPath === "assets";
  return `
    <div class="image-upload" data-upload-target="${targetPath}" data-upload-library="${toLibrary}" data-upload-ratio="${escapeHtml(ratioConfig.ratio)}">
      <label class="upload-field"><span>${label}</span><input type="file" accept="${acceptsVideo ? "image/*,video/mp4" : "image/*"}" data-upload-file${targetPath.includes("detailImages") ? " multiple" : ""} /><em>${acceptsVideo ? "选择图片或 MP4" : "选择图片"}</em></label>
    </div>
  `;
}

function assetFor(src) {
  const normalized = normalizeStoredImagePath(src);
  return state.assets.find((asset) => asset.src === normalized || asset.src === src);
}

function resetDraftCrop() {
  draftCrop = {
    cropOffsetX: 0,
    cropOffsetY: 0,
    zoom: 1
  };
  draftCropContext = cropContext();
  draftCropUsesDefault = true;
}

function ensureAssetFor(src, options = {}) {
  const normalized = normalizeStoredImagePath(src);
  if (!normalized) return null;

  let asset = assetFor(normalized);
  if (asset) return asset;

  const ratioConfig = options.ratioConfig || getImageRatioConfig(activeImagePath || "");
  asset = {
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: options.label || normalized.split("/").pop() || "image",
    src: normalized,
    type: "image",
    recommendedRatio: options.recommendedRatio || ratioConfig?.ratio || "16:9",
    cropX: 50,
    cropY: 50,
    cropOffsetX: 0,
    cropOffsetY: 0,
    zoom: 1,
    sortOrder: state.assets.length + 1
  };
  state.assets.push(asset);
  return asset;
}

function getImageRatioConfig(path = "") {
  // 首页 Design Directions / Design Areas 右侧预览图
  // 这个必须放在 project coverImage 前面，否则 categories.x.coverImage 会被误判成项目缩略图
  if (path.startsWith("categories.") && path.includes(".coverImage")) {
    return {
      ratio: "4:3",
      width: 1200,
      height: 900,
      label: "Design Areas 预览图片"
    };
  }

  if (path.includes("thumbnailImage")) {
    return {
      ratio: "3:4",
      width: 1200,
      height: 1600,
      label: "精选项目缩略图 / Selected Projects 卡片"
    };
  }

  if (path.includes("coverImage")) {
    return {
      ratio: "16:9",
      width: 1200,
      height: 675,
      label: "项目缩略图 / Project Index / 详情页标题小图"
    };
  }

  if (path.includes("detailImages")) {
    const detail = isDetailImageItemPath(path) ? normalizeDetailImageItem(getPath(path)) : null;
    if (detail?.layout === "small") {
      return {
        ratio: "3:4",
        width: 900,
        height: 1200,
        label: "详情正文配图 / small 小图"
      };
    }
    return {
      ratio: "16:9",
      width: 1200,
      height: 675,
      label: detail?.layout === "auto" ? "详情正文配图 / auto 自动" : "详情正文配图"
    };
  }

  if (path.includes("home.hero.backgroundImage")) {
    return {
      ratio: "16:9",
      width: 1920,
      height: 1080,
      label: "首屏背景图"
    };
  }

  if (path.includes("qrImage")) {
    return {
      ratio: "1:1",
      width: 800,
      height: 800,
      label: "二维码图片"
    };
  }

  if (path.includes("backgroundImage")) {
    return {
      ratio: "16:9",
      width: 1920,
      height: 1080,
      label: "背景图"
    };
  }

  return {
    ratio: "16:9",
    width: 1200,
    height: 675,
    label: "图片"
  };
}

function ratioToCss(ratio = "16:9") {
  const [w, h] = String(ratio).split(":").map(Number);
  return w && h ? `${w} / ${h}` : "16 / 9";
}

function ratioNumber(ratio = "16:9") {
  const [w, h] = String(ratio).split(":").map(Number);
  return w && h ? w / h : 16 / 9;
}

function isSelectedProjectThumbnailPath(path = activeImagePath) {
  return /^projects\.\d+\.thumbnailImage$/.test(String(path || ""));
}

function cropStageRatio(config, path = activeImagePath) {
  return isSelectedProjectThumbnailPath(path) ? "16:9" : (config?.ratio || "16:9");
}

function cropStageSizeStyle(config, path = activeImagePath) {
  const ratio = ratioNumber(cropStageRatio(config, path));
  return `--crop-stage-width:min(100%, min(${Number((360 * ratio).toFixed(2))}px, ${Number((46 * ratio).toFixed(2))}vh));`;
}

function safeFrameStyle(config, stageRatioValue = config?.ratio) {
  const stageRatio = ratioNumber(stageRatioValue);
  const ratio = config.width / config.height;
  const height = 84;
  const width = Math.min(84, Number((height * ratio / stageRatio).toFixed(2)));
  return `--safe-width:${width}%;--safe-height:${height}%;`;
}

function isDirectionPreviewImagePath(path = activeImagePath) {
  return String(path || "").startsWith("categories.") && String(path || "").includes(".coverImage");
}

function frontCropFrameStyle(transform = {}) {
  return [
    "position:absolute",
    "left:50%",
    "top:50%",
    "width:min(260px,72%)",
    "aspect-ratio:4 / 3",
    "overflow:visible",
    "border:2px solid rgba(23,116,255,.98)",
    "box-shadow:inset 0 0 0 1px rgba(255,255,255,.55), 0 0 0 999px rgba(0,0,0,.10)",
    "border-radius:14px",
    "background:transparent",
    "transform:translate(-50%, -50%)",
    "pointer-events:none",
    "z-index:3",
    `--media-shift-x:${escapeHtml(transform.x || "0%")}`,
    `--media-shift-y:${escapeHtml(transform.y || "0%")}`,
    `--media-zoom:${escapeHtml(transform.zoom ?? 1)}`
  ].join(";");
}

function frontCropFrameImageStyle() {
  return [
    "display:block",
    "width:100%",
    "height:100%",
    "object-fit:cover",
    "object-position:center",
    "transform:translate(var(--media-shift-x,0%), var(--media-shift-y,0%)) scale(var(--media-zoom,1))",
    "transform-origin:center",
    "pointer-events:none",
    "user-select:none"
  ].join(";");
}

function frontCropFrameLabelStyle() {
  return [
    "position:absolute",
    "top:8px",
    "left:8px",
    "padding:4px 7px",
    "border-radius:999px",
    "color:#fff",
    "background:#1774ff",
    "font-size:11px",
    "font-weight:750",
    "line-height:1",
    "box-shadow:0 6px 16px rgba(23,116,255,.28)",
    "z-index:4"
  ].join(";");
}

function assetFolderKey(src = "") {
  const path = String(src || "").replace(/\\/g, "/");
  if (path.startsWith("assets/images/")) {
    const rest = path.replace(/^assets\/images\//, "");
    return rest.includes("/") ? rest.split("/")[0] : "root";
  }
  if (path.startsWith("assets/reference/")) {
    const rest = path.replace(/^assets\/reference\//, "");
    return rest.includes("/") ? rest.split("/")[0] : "reference-root";
  }
  return "legacy";
}

function assetFolderLabel(key = "") {
  if (key === "all") return "全部";
  if (key === "root") return "根目录图片";
  if (key === "reference-root") return "reference 根目录";
  if (key === "legacy") return "旧路径";
  return key;
}

function assetFolderOptions() {
  const folders = new Set(state.assets.map((asset) => assetFolderKey(asset.src)));
  const projectFolders = [...folders].filter((key) => !["root", "reference-root", "legacy"].includes(key)).sort();
  return ["all", "root", ...projectFolders, "reference-root", "legacy"].filter((key) => key === "all" || folders.has(key));
}

function filteredAssets() {
  const assets = state.assets.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  if (activeAssetFolder === "all") return assets;
  return assets.filter((asset) => assetFolderKey(asset.src) === activeAssetFolder);
}

function assetFolderFilters() {
  return `
    <div class="asset-folder-filters">
      ${assetFolderOptions().map((key) => `
        <button class="${activeAssetFolder === key ? "active" : "ghost"}" type="button" data-asset-folder="${escapeHtml(key)}">${escapeHtml(assetFolderLabel(key))}</button>
      `).join("")}
    </div>
  `;
}

function mediaChoiceGridHtml() {
  const current = activeImagePath ? getImageFieldValue(activeImagePath) : "";
  const assets = activeImagePath?.includes("detailImages") ? filteredAssets() : filteredAssets().filter((asset) => !isVideoSource(asset.src));
  return assets.map((asset) => `
    <button class="media-choice${asset.src === current ? " active" : ""}" type="button" data-media-pick="${escapeHtml(asset.src)}">
      ${isVideoSource(asset.src) ? `<video src="${escapeHtml(imageUrl(asset.src))}" muted loop autoplay playsinline preload="metadata"></video>` : `<img src="${escapeHtml(imageUrl(asset.src))}" alt="" style="${cropStyleForAsset(asset)}" />`}
      <span>${escapeHtml(asset.label)}</span>
      <span>${escapeHtml(asset.src)}</span>
    </button>
  `).join("");
}

function detailMediaChoiceGridHtml(project) {
  const existing = new Set((project?.detailImages || []).map((item) => normalizeStoredImagePath(detailImageSrc(item))).filter(Boolean));
  return filteredAssets().map((asset) => {
    const src = normalizeStoredImagePath(asset.src);
    const selected = detailLibrarySelection.has(src);
    const alreadyAdded = existing.has(src);
    return `
      <button class="media-choice${selected ? " active" : ""}${alreadyAdded ? " is-used" : ""}" type="button" data-detail-library-pick="${escapeHtml(src)}">
        ${isVideoSource(src) ? `<video src="${escapeHtml(imageUrl(src))}" muted loop autoplay playsinline preload="metadata"></video>` : `<img src="${escapeHtml(imageUrl(src))}" alt="" style="${cropStyleForAsset(asset)}" />`}
        <span>${escapeHtml(asset.label || src.split("/").pop())}${alreadyAdded ? "（已添加）" : ""}</span>
        <span>${escapeHtml(src)}</span>
      </button>
    `;
  }).join("");
}

function updateAssetFolderButtonState(activeButton = null) {
  const filters = activeButton?.closest(".asset-folder-filters") || $(".asset-folder-filters");
  if (!filters) return;
  $$("[data-asset-folder]", filters).forEach((button) => {
    const active = button.dataset.assetFolder === activeAssetFolder;
    button.classList.toggle("active", active);
    button.classList.toggle("ghost", !active);
  });
}

function updateMediaLibraryOnly({ preserveScroll = true, refreshFolders = false } = {}) {
  const libraryScroll = $("[data-media-library-scroll]");
  const library = $("[data-media-library]");
  const filters = $("[data-media-folder-filters]");
  const scrollTop = preserveScroll ? (libraryScroll?.scrollTop || 0) : 0;
  if (refreshFolders && filters) filters.innerHTML = assetFolderFilters();
  if (library) {
    const project = activeDetailLibraryProjectIndex !== null ? state.projects[activeDetailLibraryProjectIndex] : null;
    library.innerHTML = activeDetailLibraryProjectIndex !== null ? detailMediaChoiceGridHtml(project) : mediaChoiceGridHtml();
  }
  if (libraryScroll) libraryScroll.scrollTop = Math.min(scrollTop, libraryScroll.scrollHeight);
}

function openDetailImageLibraryModal(projectIndex) {
  activeDetailLibraryProjectIndex = Number(projectIndex);
  activeImagePath = "";
  draftCrop = null;
  detailLibrarySelection = new Set();
  const modal = $("[data-media-modal]");
  $("[data-media-title]").textContent = "从图片库添加详情图";
  modal.hidden = false;
  renderDetailImageLibraryModal();
}

function renderDetailImageLibraryModal() {
  if (activeDetailLibraryProjectIndex === null) return;
  const project = state.projects[activeDetailLibraryProjectIndex];
  if (!project) return;
  const body = $("[data-media-body]");
  body.innerHTML = `
    <section class="picker-panel picker-panel-wide">
      <div class="media-source-actions">
        <div class="media-source-option">
          <strong>当前图片库</strong>
          <span>可一次选择多张图片加入详情页</span>
        </div>
      </div>
      <p class="hint">先在“图片管理”中选择 assets/images 文件夹。这里点图片可多选，再点“添加已选择图片”。已经在详情页里的图片会标记为已添加。</p>
      <div data-media-folder-filters>${assetFolderFilters()}</div>
      <div class="media-source-actions" style="margin-top:12px;">
        <button class="ghost" type="button" data-action="select-visible-detail-images">全选当前筛选</button>
        <button class="ghost" type="button" data-action="clear-detail-image-selection">清空选择</button>
        <button type="button" data-action="add-selected-detail-images" data-detail-library-add>添加已选择图片（${detailLibrarySelection.size}）</button>
      </div>
      <div class="media-library-scroll" data-media-library-scroll>
        <div class="media-grid" data-media-library>${detailMediaChoiceGridHtml(project)}</div>
      </div>
    </section>
  `;
  updateDetailLibrarySelectionCount();
}

function updateDetailLibrarySelectionCount() {
  const button = $("[data-detail-library-add]");
  if (button) button.textContent = `添加已选择图片（${detailLibrarySelection.size}）`;
}

function addSelectedDetailImages() {
  if (activeDetailLibraryProjectIndex === null) return;
  const project = state.projects[activeDetailLibraryProjectIndex];
  if (!project) return;
  if (!Array.isArray(project.detailImages)) project.detailImages = [];
  const ratioConfig = getImageRatioConfig(`projects.${activeDetailLibraryProjectIndex}.detailImages`);
  const existing = new Set(project.detailImages.map((item) => normalizeStoredImagePath(detailImageSrc(item))).filter(Boolean));
  let added = 0;
  [...detailLibrarySelection].forEach((rawSrc) => {
    const src = normalizeStoredImagePath(rawSrc);
    if (!src || existing.has(src)) return;
    ensureAssetFor(src, { ratioConfig, recommendedRatio: ratioConfig.ratio });
    project.detailImages.push({ src, layout: "auto", displayMode: "fixed16x9" });
    existing.add(src);
    added += 1;
  });
  markDirty(added ? `已从图片库添加 ${added} 张详情图，记得保存。` : "没有新增图片。可以选择未添加过的图片。 ");
  closeMediaModal();
}

function openMediaModal(path, label = "更换图片") {
  activeImagePath = path;
  setDraftCropFromCrop(cropForPath(path), path);
  const modal = $("[data-media-modal]");
  $("[data-media-title]").textContent = label;
  modal.hidden = false;
  renderMediaModal();
}

function closeMediaModal() {
  const modal = $("[data-media-modal]");
  modal.hidden = true;
  activeImagePath = "";
  activeDetailLibraryProjectIndex = null;
  detailLibrarySelection = new Set();
  draftCrop = null;
  draftCropContext = "";
  draftCropUsesDefault = false;
  render();
}

function renderMediaModalKeepScroll() {
  const dialog = document.querySelector(".media-dialog");
  const scrollTop = dialog ? dialog.scrollTop : 0;

  if (activeDetailLibraryProjectIndex !== null) renderDetailImageLibraryModal();
  else renderMediaModal();

  requestAnimationFrame(() => {
    const nextDialog = document.querySelector(".media-dialog");
    if (nextDialog) {
      nextDialog.scrollTop = scrollTop;
    }
  });
}

function renderMediaModal() {
  if (!activeImagePath) return;
  const current = getImageFieldValue(activeImagePath);
  const ratioConfig = getImageRatioConfig(activeImagePath);
  const currentIsVideo = isVideoSource(current);
  const isSelectedThumbnail = isSelectedProjectThumbnailPath(activeImagePath);
  const minZoom = 0.2;
  const currentCrop = cropForPath(activeImagePath, current);
  const transform = {
    x: `${draftCrop?.cropOffsetX ?? currentCrop.cropOffsetX ?? 0}%`,
    y: `${draftCrop?.cropOffsetY ?? currentCrop.cropOffsetY ?? 0}%`,
    zoom: Math.max(minZoom, Math.min(6, Number(draftCrop?.zoom ?? currentCrop.zoom ?? 1) || 1))
  };
  const body = $("[data-media-body]");
  const isDirectionPreview = isDirectionPreviewImagePath(activeImagePath);
  const stageRatio = cropStageRatio(ratioConfig, activeImagePath);
  const stageFrameStyle = isDirectionPreview
    ? "box-shadow:inset 0 0 0 2px rgba(23,116,255,.98), 0 0 0 1px rgba(255,255,255,.58);"
    : "";
  const guideFrame = isDirectionPreview && current
    ? `<span style="${frontCropFrameLabelStyle()}">前台显示区</span>`
    : `<div class="safe-frame" style="${escapeHtml(safeFrameStyle(ratioConfig, stageRatio))}"></div>`;
  body.innerHTML = `
    <section class="crop-panel${currentIsVideo ? " is-video-media" : ""}">
      <div class="crop-stage${isSelectedThumbnail ? " is-selected-thumb-crop" : ""}" data-crop-stage style="--crop-ratio:${escapeHtml(ratioToCss(stageRatio))};${escapeHtml(cropStageSizeStyle(ratioConfig, activeImagePath))}--media-shift-x:${escapeHtml(transform.x)};--media-shift-y:${escapeHtml(transform.y)};--media-zoom:${escapeHtml(transform.zoom)};${stageFrameStyle}">
        ${current ? (currentIsVideo ? `<video src="${escapeHtml(imageUrl(current))}" muted loop autoplay playsinline preload="metadata"></video>` : `<img src="${escapeHtml(imageUrl(current))}" alt="" />`) : ""}
        ${currentIsVideo ? "" : guideFrame}
      </div>
      ${currentIsVideo ? `<p class="hint">MP4 视频将按原始宽高比展示；不支持图片裁切。</p>` : `<label class="field">
        <span>图片缩放</span>
        <input type="range" min="${minZoom}" max="6" step="0.01" value="${escapeHtml(transform.zoom)}" data-media-zoom />
      </label>
      <p class="hint">${escapeHtml(ratioConfig.label)}｜推荐比例：${escapeHtml(ratioConfig.ratio)}　建议尺寸：${ratioConfig.width}×${ratioConfig.height}</p>
      <button type="button" data-action="save-crop">保存裁切</button>`}
    </section>
    <section class="picker-panel">
      <div class="media-source-actions">
        <label class="media-source-option" data-upload-target="${activeImagePath}" data-upload-library="false" data-upload-ratio="${escapeHtml(ratioConfig.ratio)}">
          <strong>${activeImagePath.includes("detailImages") ? "本地媒体" : "本地图片"}</strong>
          <span>${activeImagePath.includes("detailImages") ? "从电脑选择图片或 MP4" : "从电脑选择图片"}</span>
          <input type="file" accept="${activeImagePath.includes("detailImages") ? "image/*,video/mp4" : "image/*"}" data-upload-file />
        </label>
        <button class="media-source-option" type="button" data-action="scroll-media-library">
          <strong>当前图片库</strong>
          <span>从 assets/images 图片库中选择</span>
        </button>
      </div>
      <p class="hint">请先在“图片管理”中选择 assets/images 文件夹，再从当前图片库中选择图片。点右上角保存后前台生效。</p>
      <div data-media-folder-filters>${assetFolderFilters()}</div>
      <div class="media-library-scroll" data-media-library-scroll>
        <div class="media-grid" data-media-library>${mediaChoiceGridHtml()}</div>
      </div>
    </section>
  `;
  bindCropDrag(body);
  initializeDefaultCropZoom($("[data-crop-stage]", body), activeImagePath, current);
}

function hasSavedCrop(path = activeImagePath, src = getImageFieldValue(path)) {
  const crop = state.imageCrops?.[imageCropKeyFromPath(path)];
  return Boolean(crop && crop.src === normalizeStoredImagePath(src));
}

function initializeDefaultCropZoom(stage, path, src) {
  if (!stage || (!draftCropUsesDefault && hasSavedCrop(path, src))) return;
  const image = $("img", stage);
  if (!image) return;

  const applyCoverZoom = () => requestAnimationFrame(() => {
    const rect = stage.getBoundingClientRect();
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!rect.width || !rect.height || !naturalWidth || !naturalHeight) return;

    const containScale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
    const coverScale = Math.max(rect.width / naturalWidth, rect.height / naturalHeight);
    const zoom = Number((coverScale / containScale).toFixed(4));
    if (zoom <= 1) return;

    draftCrop = { cropOffsetX: 0, cropOffsetY: 0, zoom };
    draftCropContext = cropContext(path, src);
    stage.style.setProperty("--media-zoom", zoom);
    const zoomInput = $("[data-media-zoom]");
    if (zoomInput) zoomInput.value = String(zoom);
  });

  if (image.complete) applyCoverZoom();
  else image.addEventListener("load", applyCoverZoom, { once: true });
}

function cropBoundsForStage(stage, zoomValue = draftCrop?.zoom ?? 1) {
  const rect = stage?.getBoundingClientRect?.();
  const selectedThumb = isSelectedProjectThumbnailPath();
  const zoom = Math.max(0.2, Number(zoomValue) || 1);
  if (!rect?.width || !rect?.height) return { x: 0, y: 0 };
  const img = $("img", stage);
  const naturalWidth = img?.naturalWidth || 16;
  const naturalHeight = img?.naturalHeight || 9;
  const fitScale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
  const imageWidth = naturalWidth * fitScale * zoom;
  const imageHeight = naturalHeight * fitScale * zoom;
  const horizontalFrameWidth = selectedThumb ? ($(".safe-frame", stage)?.getBoundingClientRect?.()?.width || rect.width) : rect.width;
  const verticalFrameHeight = selectedThumb ? ($(".safe-frame", stage)?.getBoundingClientRect?.()?.height || rect.height) : rect.height;
  const cropX = Math.max(0, ((imageWidth - horizontalFrameWidth) / 2 / rect.width) * 100);
  const cropY = Math.max(0, ((imageHeight - verticalFrameHeight) / 2 / rect.height) * 100);
  if (selectedThumb) {
    return {
      x: cropX,
      y: cropY
    };
  }
  return {
    x: cropX,
    y: cropY
  };
}

function clampCropToStage(crop = defaultCrop(), stage = $("[data-crop-stage]")) {
  const zoom = Math.max(0.2, Number(crop.zoom ?? 1) || 1);
  const bounds = cropBoundsForStage(stage, zoom);
  const clamp = (value, limit) => {
    const safeLimit = Math.max(0, Number(limit) || 0);
    return Math.max(-safeLimit, Math.min(safeLimit, Number(value || 0)));
  };
  return {
    cropOffsetX: Number(clamp(crop.cropOffsetX, bounds.x).toFixed(2)),
    cropOffsetY: Number(clamp(crop.cropOffsetY, bounds.y).toFixed(2)),
    zoom: Number(zoom.toFixed(2))
  };
}

function updateCurrentAsset(updates) {
  draftCrop = { ...(draftCrop || {}), ...updates };
  draftCrop = clampCropToStage(draftCrop);
  const x = `${draftCrop.cropOffsetX ?? 0}%`;
  const y = `${draftCrop.cropOffsetY ?? 0}%`;
  const zoom = draftCrop.zoom ?? 1;

  // 同步更新大裁切区；Design Directions 的整个裁切区就是前台真实显示框。
  $$('[data-crop-stage]').forEach((node) => {
    node.style.setProperty("--media-shift-x", x);
    node.style.setProperty("--media-shift-y", y);
    node.style.setProperty("--media-zoom", zoom);
  });

  flash("裁切预览中，点击保存裁切确认。");
}

function saveCrop() {
  const src = getImageFieldValue(activeImagePath);
  const ratioConfig = getImageRatioConfig(activeImagePath);
  const asset = ensureAssetFor(src, { ratioConfig, recommendedRatio: ratioConfig.ratio });
  const key = imageCropKeyFromPath(activeImagePath);
  const currentContext = cropContext(activeImagePath, src);
  const crop = draftCrop && draftCropContext === currentContext ? draftCrop : defaultCrop();
  if (asset) {
    if (!state.imageCrops || typeof state.imageCrops !== "object") state.imageCrops = {};
    const cropOffsetX = Number(crop.cropOffsetX || 0);
    const cropOffsetY = Number(crop.cropOffsetY || 0);
    const zoom = Number(crop.zoom || 1);
    if (cropOffsetX === 0 && cropOffsetY === 0 && zoom === 1) {
      delete state.imageCrops[key];
    } else {
      state.imageCrops[key] = {
        src: normalizeStoredImagePath(src),
        cropOffsetX,
        cropOffsetY,
        zoom
      };
    }
  }
  markDirty(asset ? "裁切已确认，记得保存。" : "图片已确认，记得保存。");
  closeMediaModal();
}

function bindEditorActions(root) {
  $$("[data-module]", root).forEach((card) => {
    card.addEventListener("click", () => {
      activeModule = card.dataset.module;
      render();
    });
  });

  $("[data-home-module-select]", root)?.addEventListener("change", (event) => {
    activeModule = event.target.value;
    render();
  });

  $$("[data-project-id]", root).forEach((card) => {
    card.addEventListener("click", (event) => {
      if (card.dataset.mediaMoved === "true") {
        card.dataset.mediaMoved = "false";
        return;
      }
      activeProjectId = card.dataset.projectId;
      render();
    });
  });
  bindProjectCardMedia(root);

  $$("[data-open-media]", root).forEach((button) => {
    button.addEventListener("click", () => {
      openMediaModal(button.dataset.openMedia, button.dataset.mediaLabel);
    });
  });

  $("[data-project-thumbnail-diagnostic]", root)?.addEventListener("click", async () => {
    const diagnostic = projectThumbnailCropDiagnostic();
    try {
      await navigator.clipboard.writeText(diagnostic);
      flash("缩略图裁切诊断已复制。");
    } catch {
      flash("请在诊断窗口中复制内容。");
    }
    window.prompt("缩略图裁切诊断", diagnostic);
  });

  $$("[data-type-key]", root).forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("input, button, iframe")) return;
      setActiveTypeRow(row, true);
    });
  });

  $$("[data-type-preview-frame]", root).forEach((frame) => {
    frame.addEventListener("load", () => postTypePreviewState(frame));
  });

  $$("[data-save-type]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-type-key]");
      if (row) setActiveTypeRow(row, false);
      saveTypeStyle(button.dataset.saveType);
    });
  });

  $$("[data-type-preview-target]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-type-key]");
      const frame = $("[data-type-preview-frame]", row);
      setActiveTypeRow(row, false);
      row.dataset.typeActiveSelector = button.dataset.typePreviewSelector || row.dataset.typeSelectorList || "";
      $$("[data-type-preview-target]", row).forEach((item) => {
        item.classList.toggle("active", item === button);
        item.classList.toggle("ghost", item !== button);
      });
      if (frame) {
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        frame.src = typePreviewFrameSrc({
          page: button.dataset.typePreviewPage || "index.html",
          hash: button.dataset.typePreviewTarget || "#hero"
        });
        window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
        window.setTimeout(() => {
          postTypePreviewState(frame);
          window.scrollTo(scrollX, scrollY);
        }, 80);
      }
    });
  });

  $$("[data-code-file]", root).forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.codeFile === activeCodeFile) return;
      activeCodeFile = button.dataset.codeFile;
      render();
    });
  });

  const codeEditor = $("[data-code-editor]", root);
  if (codeEditor) {
    codeEditor.addEventListener("input", () => {
      const current = codeFileByKey(activeCodeFile);
      setPath(current.path, codeEditor.value);
      codeDirtyFiles[activeCodeFile] = true;
      markDirty("代码草稿有未保存修改");
      const status = $("[data-code-status]", root);
      if (status) status.textContent = "有未保存修改";
      const saveButton = $("[data-code-save-file]", root);
      if (saveButton) saveButton.disabled = false;
    });
    codeEditor.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const start = codeEditor.selectionStart;
      codeEditor.setRangeText("  ", start, codeEditor.selectionEnd, "end");
      codeEditor.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  $("[data-code-save-file]", root)?.addEventListener("click", saveActiveCodeFile);

  $$("[data-detail-image-select]", root).forEach((input) => {
    input.addEventListener("change", () => {
      const project = state.projects[Number(input.dataset.detailImageSelect)];
      if (!project) return;
      const index = Number(input.dataset.detailIndex);
      const selection = detailImageSelectionFor(project.id);
      if (input.checked) selection.add(index);
      else selection.delete(index);
    });
  });

  $$("[data-set-seamless-group]", root).forEach((button) => {
    button.addEventListener("click", () => setSelectedDetailImagesAsSeamlessGroup(button.dataset.setSeamlessGroup));
  });

  $$("[data-clear-seamless-group]", root).forEach((button) => {
    button.addEventListener("click", () => clearSelectedDetailImagesSeamlessGroup(button.dataset.clearSeamlessGroup));
  });

  $$("[data-remove-detail]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const project = projectById(button.dataset.removeDetail);
      project.detailImages.splice(Number(button.dataset.index), 1);
      detailImageSelectionFor(project.id).clear();
      markDirty("详情图片已删除，记得保存。");
      render();
    });
  });

  $$("[data-detail-image-layout]", root).forEach((select) => {
    select.addEventListener("change", () => {
      const project = state.projects[Number(select.dataset.detailImageLayout)];
      const index = Number(select.dataset.index);
      if (!project?.detailImages?.[index]) return;
      const current = normalizeDetailImageItem(project.detailImages[index]);
      if (!current) return;
      project.detailImages[index] = { ...current, layout: select.value };
      markDirty("详情图片宽度布局已更新，记得保存。");
      render();
    });
  });

  $$("[data-detail-image-display-mode]", root).forEach((select) => {
    select.addEventListener("change", () => {
      const project = state.projects[Number(select.dataset.detailImageDisplayMode)];
      const index = Number(select.dataset.index);
      if (!project?.detailImages?.[index]) return;
      const current = normalizeDetailImageItem(project.detailImages[index]);
      if (!current) return;
      if (select.value === "natural" && current.seamlessGroupId) {
        select.value = current.displayMode;
        return flash("已加入无缝组的图片不能改为自然高度，请先取消无缝组。");
      }
      project.detailImages[index] = { ...current, displayMode: select.value };
      markDirty("详情图片展示模式已更新，记得保存。");
      render();
    });
  });

  $$("[data-delete-asset]", root).forEach((button) => {
    button.addEventListener("click", () => {
      state.assets = state.assets.filter((asset) => asset.id !== button.dataset.deleteAsset);
      markDirty("图片已删除，记得保存。");
      render();
    });
  });

  $$("[data-delete-project]", root).forEach((button) => {
    button.addEventListener("click", () => deleteProject(button.dataset.deleteProject));
  });

  $$('[data-add-detail-image-library]', root).forEach((button) => {
    button.addEventListener('click', () => {
      openDetailImageLibraryModal(button.dataset.addDetailImageLibrary);
    });
  });

  $$("[data-add-detail-section]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const project = state.projects[Number(button.dataset.addDetailSection)];
      if (!project) return;
      if (!Array.isArray(project.detailSections)) project.detailSections = [];
      project.detailSections.push({ label: "Design Section", title: "New Detail Section", body: "Detail body text." });
      markDirty("详情文字模块已新增，记得保存。");
      render();
    });
  });

  $$("[data-remove-detail-section]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const project = state.projects[Number(button.dataset.removeDetailSection)];
      if (!project?.detailSections) return;
      project.detailSections.splice(Number(button.dataset.index), 1);
      markDirty("详情文字模块已删除，记得保存。");
      render();
    });
  });

  $$("[data-move-detail-section]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const project = state.projects[Number(button.dataset.moveDetailSection)];
      if (!project?.detailSections) return;
      const from = Number(button.dataset.index);
      const to = from + Number(button.dataset.dir);
      move(project.detailSections, from, to);
      markDirty("详情文字模块排序已更新，记得保存。");
      render();
    });
  });

  bindListInputs(root);
  bindDrag(root);
  bindMediaDropZone(root);
  bindCropDrag(root);
  syncTypePreviewFrames(root);
}

function bindListInputs(root) {
  $$("[data-list-path]", root).forEach((input) => {
    input.addEventListener("input", () => {
      const normalized = normalizeImageInputValue(input, input.dataset.listPath);
      if (normalized === null) return;
      setPath(input.dataset.listPath, normalized);
      markDirty();
    });
    input.addEventListener("change", () => render());
  });
}

function bindDrag(root) {
  bindProjectDrag(root);
  bindImageDrag(root);
  bindAssetDrag(root);
}

function bindCropDrag(root) {
  const stage = $("[data-crop-stage]", root);
  if (!stage) return;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startOffsetX = 0;
  let startOffsetY = 0;
  const stageSize = () => {
    const rect = stage.getBoundingClientRect();
    return {
      width: rect.width || 1,
      height: rect.height || 1
    };
  };
  const update = (event) => {
    const size = stageSize();
    const deltaX = ((event.clientX - startX) / size.width) * 100;
    const deltaY = ((event.clientY - startY) / size.height) * 100;
    updateCurrentAsset({
      cropOffsetX: Number((startOffsetX + deltaX).toFixed(2)),
      cropOffsetY: Number((startOffsetY + deltaY).toFixed(2))
    });
  };
  stage.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startOffsetX = Number(draftCrop?.cropOffsetX || 0);
    startOffsetY = Number(draftCrop?.cropOffsetY || 0);
    stage.classList.add("is-dragging");
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    if (dragging) update(event);
  });
  stage.addEventListener("pointerup", () => {
    dragging = false;
    stage.classList.remove("is-dragging");
  });
  stage.addEventListener("pointercancel", () => {
    dragging = false;
    stage.classList.remove("is-dragging");
  });
}

function bindProjectDrag(root) {
  const list = $("[data-project-drag]", root);
  if (!list) return;
  let draggedId = "";
  $$("[data-project-id]", list).forEach((item) => {
    item.addEventListener("dragstart", () => {
      draggedId = item.dataset.projectId;
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => item.classList.remove("dragging"));
    item.addEventListener("dragover", (event) => event.preventDefault());
    item.addEventListener("drop", () => {
      reorderProjects(draggedId, item.dataset.projectId, list.dataset.projectDrag);
      markDirty("项目排序已更新，记得保存。");
      render();
    });
  });
}

function reorderProjects(fromId, toId, categoryId) {
  if (!fromId || fromId === toId) return;
  const items = sortedProjects(categoryId);
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0) return;
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  items.forEach((item, index) => {
    item.categorySortOrder = index + 1;
  });
}

function bindImageDrag(root) {
  const list = $("[data-image-drag]", root);
  if (!list) return;
  let fromIndex = -1;
  $$("[data-index]", list).forEach((item) => {
    item.addEventListener("dragstart", () => {
      fromIndex = Number(item.dataset.index);
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => item.classList.remove("dragging"));
    item.addEventListener("dragover", (event) => event.preventDefault());
    item.addEventListener("drop", () => {
      const project = projectById(list.dataset.imageDrag);
      move(project.detailImages, fromIndex, Number(item.dataset.index));
      detailImageSelectionFor(project.id).clear();
      markDirty("详情图片排序已更新，记得保存。");
      render();
    });
  });
}

function bindAssetDrag(root) {
  const list = $("[data-asset-drag]", root);
  if (!list) return;
  let fromId = "";
  $$("[data-asset-id]", list).forEach((item) => {
    item.addEventListener("dragstart", () => {
      fromId = item.dataset.assetId;
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => item.classList.remove("dragging"));
    item.addEventListener("dragover", (event) => event.preventDefault());
    item.addEventListener("drop", () => {
      reorderAssets(fromId, item.dataset.assetId);
      markDirty("图片排序已更新，记得保存。");
      render();
    });
  });
}

function reorderAssets(fromId, toId) {
  if (!fromId || fromId === toId) return;
  const items = state.assets.sort((a, b) => a.sortOrder - b.sortOrder);
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  items.forEach((item, index) => {
    item.sortOrder = index + 1;
  });
}

function move(array, from, to) {
  if (from < 0 || to < 0 || from === to) return;
  const [item] = array.splice(from, 1);
  array.splice(to, 0, item);
}
function isMediaFile(file) {
  return /\.(png|jpe?g|webp|gif|svg|mp4)$/i.test(file.name || "");
}

function uploadFolderForCurrentView() {
  return ["all", "root", "reference-root", "legacy"].includes(activeAssetFolder) ? "" : activeAssetFolder;
}

async function uploadFileToMediaServer(file, folder, overwrite = false) {
  const data = new FormData();
  data.append("file", file, file.name);
  data.append("folder", folder);
  if (overwrite) data.append("overwrite", "1");
  const response = await fetch("/__media-upload", { method: "POST", body: data, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409 && result.conflict) return { conflict: true, ...result };
  if (!response.ok || !result.file?.src) throw new Error(result.error || "UPLOAD_FAILED");
  return result.file;
}

async function uploadFilesToMediaServer(files = [], folder = uploadFolderForCurrentView()) {
  const imageFiles = files.filter(isMediaFile);
  if (!imageFiles.length) throw new Error("NO_MEDIA_FILES");
  const uploaded = [];
  for (const file of imageFiles) {
    let result = await uploadFileToMediaServer(file, folder);
    if (result.conflict) {
      if (!window.confirm(`“${result.name}”已在当前文件夹中，是否覆盖？`)) continue;
      result = await uploadFileToMediaServer(file, folder, true);
    }
    uploaded.push(normalizeStoredImagePath(result.src));
  }
  await refreshMediaManifest({ render: false });
  return uploaded.filter(Boolean);
}

function uploadErrorMessage(error) {
  const code = error?.message || "";
  if (code === "UPLOAD_TOO_LARGE") return "文件超过 200MB 上传上限，请压缩后再试。";
  if (code === "INVALID_MEDIA_UPLOAD" || code === "NO_MEDIA_FILES") return "仅支持图片和 MP4 视频文件。";
  if (code === "LOCALHOST_ONLY") return "请通过本地预览服务打开后台后再上传。";
  if (code === "UPLOAD_FAILED") return "上传未完成，请确认本地预览服务已重启后再试。";
  return `上传失败：${code || "未知错误"}`;
}

async function addPickedImageFolderToLibrary(files = []) {
  const imageFiles = files.filter(isMediaFile);
  if (!imageFiles.length) return flash("这个文件夹里没有识别到图片。");
  pickedImageFolderName = imageFiles[0]?.webkitRelativePath?.split("/")?.[0] || "已选择的图片文件夹";
  flash("正在上传图片文件夹...");
  try {
    const uploaded = await uploadFilesToMediaServer(imageFiles);
    flash(`“${pickedImageFolderName}”已同步 ${uploaded.length} 张真实图片。`);
    render();
  } catch (error) {
    flash(error.message === "NO_IMAGE_FILES" ? "这个文件夹里没有识别到图片。" : "上传失败，请确认通过本地 Node 服务打开后台。");
  }
}

async function uploadImage(box) {
  if (!box) return;
  const files = [...($("[data-upload-file]", box).files || [])];
  if (!files.length) {
    flash("请先选择图片或 MP4 视频。");
    return;
  }
  const target = box.dataset.uploadTarget;
  flash("正在上传媒体文件...");
  let paths = [];
  try {
    paths = await uploadFilesToMediaServer(files);
  } catch (error) {
    flash(uploadErrorMessage(error));
    console.error("媒体上传失败：", error);
    return;
  }
  if (!paths.length) return flash("没有上传新图片。");
  if (target === "assets") {
    // state.assets was rebuilt from the server manifest above.
  } else {
    const ratioConfig = getImageRatioConfig(target);
    paths.forEach((src, index) => {
      ensureAssetFor(src, {
        label: files[index]?.name || src.split("/").pop(),
        ratioConfig,
        recommendedRatio: box.dataset.uploadRatio || ratioConfig.ratio
      });
    });
    const value = getPath(target);
    if (Array.isArray(value)) paths.forEach((src) => value.push({ src, layout: "auto", displayMode: "fixed16x9" }));
    else setImageFieldValue(target, paths[0] || "");
  }
  if (activeImagePath === target) resetDraftCrop();

markDirty(paths.length > 1 ? "图片已上传并写入详情字段，记得保存。" : "图片已上传，已重置裁切，记得保存。");

// 如果正在弹窗里选图，只刷新弹窗，不重渲染整个后台
if (activeImagePath === target) {
  renderMediaModalKeepScroll();
} else {
  render();
}
}

async function filesFromDropEvent(event) {
  const items = [...(event.dataTransfer?.items || [])];
  const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return [...(event.dataTransfer?.files || [])].filter(isMediaFile);
  const files = [];
  const readEntry = (entry) => new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => { if (isMediaFile(file)) files.push(file); resolve(); }, resolve);
      return;
    }
    if (!entry.isDirectory) return resolve();
    const reader = entry.createReader();
    const readBatch = () => reader.readEntries(async (batch) => {
      if (!batch.length) return resolve();
      await Promise.all(batch.map(readEntry));
      readBatch();
    }, resolve);
    readBatch();
  });
  await Promise.all(entries.map(readEntry));
  return files;
}

function bindMediaDropZone(root) {
  const zone = $("[data-media-drop-zone]", root);
  if (!zone) return;
  const setActive = (active) => zone.classList.toggle("is-dragover", active);
  ["dragenter", "dragover"].forEach((type) => zone.addEventListener(type, (event) => {
    event.preventDefault();
    setActive(true);
  }));
  ["dragleave", "dragend"].forEach((type) => zone.addEventListener(type, () => setActive(false)));
  zone.addEventListener("drop", async (event) => {
    event.preventDefault();
    setActive(false);
    const files = await filesFromDropEvent(event);
    if (!files.length) return flash("没有识别到可上传的图片。");
    flash("正在上传拖入的图片...");
    try {
      const uploaded = await uploadFilesToMediaServer(files);
      flash(`已同步 ${uploaded.length} 张真实图片。`);
      render();
    } catch {
      flash("上传失败，请确认通过本地 Node 服务打开后台。");
    }
  });
}

function fileToDataUrl(file, maxSide = 2000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (file.type === "image/svg+xml" || file.type === "video/mp4") {
        resolve(reader.result);
        return;
      }
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const supportsAlpha = file.type === "image/png" || file.type === "image/webp";
        resolve(canvas.toDataURL(supportsAlpha ? "image/webp" : "image/jpeg", supportsAlpha ? 0.82 : 0.76));
      };
      image.onerror = () => reject(new Error("无法读取图片"));
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fontNameFromFile(fileName = "") {
  return fileName.replace(/\.(woff2?|ttf|otf)$/i, "").replace(/[_-]+/g, " ").trim() || fileName;
}

async function uploadFont(input) {
  const file = input.files?.[0];
  if (!file) return;
  const group = input.dataset.fontUpload;
  const dataUrl = await fileToDataUrl(file);
  const name = fontNameFromFile(file.name);
  const font = {
    id: `font-${group}-${Date.now()}`,
    name,
    fileName: file.name,
    source: "uploaded",
    group,
    dataUrl
  };
  state.settings.typography.fontLibrary = [
    ...(state.settings.typography.fontLibrary || []).filter((item) => !(item.group === group && item.name === name)),
    font
  ];
  const target = group === "zh"
    ? state.settings.typography.fontZh
    : group === "handwriting"
      ? state.settings.typography.fontHandwriting
      : state.settings.typography.fontEn;
  target.name = name;
  target.fileName = file.name;
  target.source = "uploaded";
  target.dataUrl = dataUrl;
  if (group === "handwriting") {
    state.home.footerContact.handwritingFont = name;
  }
  input.value = "";
  markDirty("字体已上传并选中，记得保存。");
  render();
}

function addProject() {
  const cat = activeProject()?.categoryId || state.categories[0].id;
  const project = {
    id: `project-${Date.now()}`,
    slug: `project-${Date.now()}`,
    title: "新项目",
    titleEn: "New Project",
    summary: "项目简介",
    categoryId: cat,
    year: "2026",
    timeline: "",
    client: "",
    services: categoryById(cat)?.name || "",
    visible: true,
    featuredOnHome: false,
    showInIndex: true,
    carouselSortOrder: state.projects.length + 1,
    categorySortOrder: sortedProjects(cat).length + 1,
    thumbnailImage: state.assets[0]?.src || "",
    coverImage: state.assets[0]?.src || "",
    detailTheme: "light",
    heroMetaText: "",
    detailIntro: "",
    detailSections: [],
    detailImages: [],
    stats: [],
    relatedProjectIds: []
  };
  state.projects.push(project);
  activeProjectId = project.id;
  markDirty("已新增项目，记得保存。");
  render();
}

function deleteProject(projectId) {
  const project = projectById(projectId);
  if (!project) return;
  if (!window.confirm(`确定删除项目“${project.title || project.titleEn || project.id}”吗？`)) return;
  const oldIndex = state.projects.findIndex((item) => item.id === projectId);
  state.projects = state.projects.filter((item) => item.id !== projectId);
  if (state.home?.featuredCarousel?.projectIds) {
    state.home.featuredCarousel.projectIds = state.home.featuredCarousel.projectIds.filter((id) => id !== projectId);
  }
  state.projects.forEach((item) => {
    if (Array.isArray(item.relatedProjectIds)) {
      item.relatedProjectIds = item.relatedProjectIds.filter((id) => id !== projectId);
    }
  });
  activeProjectId = state.projects[Math.min(oldIndex, state.projects.length - 1)]?.id || "";
  markDirty("项目已删除，记得保存。");
  render();
}

function cleanupUnusedDataAssets() {
  if (mediaManifest) {
    refreshMediaManifest();
    flash("图片图库由本地文件夹同步，无需清理缓存。");
    return;
  }
  const before = state.assets.length;
  const compact = compactStateForStorage(state);
  state.assets = compact.assets;
  const removed = before - state.assets.length;
  markDirty(removed ? `已清理 ${removed} 个未使用大图缓存，记得保存。` : "没有可清理的未使用大图缓存。");
  render();
}

function bindGlobal() {
  $$("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.view;
      render();
      if (activeView === "images") refreshMediaManifest();
    });
  });
  document.addEventListener("click", (event) => {
    const codeFolderButton = event.target.closest("[data-code-folder-action]");
    const codeFolderAction = codeFolderButton?.dataset.codeFolderAction;
    if (codeFolderAction) {
      if (codeFolderButton.disabled) return;
      if (codeFolderAction === "site") {
        loadCodeDraftsFromSiteFolder()
          .then(() => render())
          .catch(() => {
            codeDraftsStatus = "当前环境不能直接读取网站文件夹。请确认后台和前台文件在同一个本地服务器目录下。";
            render();
          });
      }
      if (codeFolderAction === "choose") chooseCodeFolder();
      if (codeFolderAction === "reload") reloadCodeFolder();
      if (codeFolderAction === "forget") forgetCodeFolder();
      return;
    }
    if (event.target.closest("[data-close-media]")) {
      closeMediaModal();
      return;
    }
    const assetFolderButton = event.target.closest("[data-asset-folder]");
    if (assetFolderButton) {
      activeAssetFolder = assetFolderButton.dataset.assetFolder;
      if (activeImagePath || activeDetailLibraryProjectIndex !== null) {
        updateAssetFolderButtonState(assetFolderButton);
        updateMediaLibraryOnly();
      }
      else render();
      return;
    }

    const detailLibraryPick = event.target.closest("[data-detail-library-pick]");
    if (detailLibraryPick && activeDetailLibraryProjectIndex !== null) {
      event.preventDefault();
      const src = normalizeStoredImagePath(detailLibraryPick.dataset.detailLibraryPick);
      if (!src) return;
      if (detailLibrarySelection.has(src)) {
        detailLibrarySelection.delete(src);
        detailLibraryPick.classList.remove("active");
      } else {
        detailLibrarySelection.add(src);
        detailLibraryPick.classList.add("active");
      }
      updateDetailLibrarySelectionCount();
      return;
    }

const picked = event.target.closest("[data-media-pick]");
if (picked && activeImagePath) {
  event.preventDefault();
  picked.blur();

  const pickedPath = normalizeStoredImagePath(picked.dataset.mediaPick);
  setImageFieldValue(activeImagePath, pickedPath);
  const ratioConfig = getImageRatioConfig(activeImagePath);
  ensureAssetFor(pickedPath, { ratioConfig, recommendedRatio: ratioConfig.ratio });
  resetDraftCrop();
  markDirty("图片已选择，裁切已重置，记得保存。");

  renderMediaModalKeepScroll();
  return;
}
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "save") saveState();
    if (action === "export-project-config") exportProjectConfiguration();
    if (action === "save-crop") saveCrop();
    if (action === "scroll-media-library") {
        }
    if (action === "select-visible-detail-images" && activeDetailLibraryProjectIndex !== null) {
      filteredAssets().forEach((asset) => {
        const src = normalizeStoredImagePath(asset.src);
        if (src) detailLibrarySelection.add(src);
      });
      renderMediaModalKeepScroll();
      return;
    }
    if (action === "clear-detail-image-selection" && activeDetailLibraryProjectIndex !== null) {
      detailLibrarySelection.clear();
      renderMediaModalKeepScroll();
      return;
    }
    if (action === "add-selected-detail-images") {
      addSelectedDetailImages();
      return;
    }
    if (action === "add-project") addProject();
    if (action === "cleanup-assets") cleanupUnusedDataAssets();
  });
  document.addEventListener("change", (event) => {
  const codeFolderInput = event.target.closest("[data-code-folder-input]");
  if (codeFolderInput) {
    loadCodeDraftsFromPickedFiles([...codeFolderInput.files]);
    codeFolderInput.value = "";
    return;
  }

  const imageFolderInput = event.target.closest("[data-image-folder-input]");
  if (imageFolderInput) {
    addPickedImageFolderToLibrary([...imageFolderInput.files]);
    imageFolderInput.value = "";
    return;
  }

  const upload = event.target.closest("[data-upload-file]");
  if (upload) {
    uploadImage(upload.closest("[data-upload-target]"));
    return;
  }

  const input = event.target.closest("[data-font-upload]");
  if (input) {
    uploadFont(input);
    return;
  }
});
  document.addEventListener("input", (event) => {
    const zoom = event.target.closest("[data-media-zoom]");
    if (zoom && activeImagePath) updateCurrentAsset({ zoom: Number(zoom.value) });
  });
  window.addEventListener("message", (event) => {
    if (event.data?.type !== "SONG_STUDIO_PREVIEW_READY") return;
    syncTypePreviewFrames(document);
  });
}

function bindAuth() {
  const gate = $("[data-login-gate]");
  const form = $("[data-login-form]");
  if (!gate || !form) return;
  const input = $("[data-login-password]", form);
  const error = $("[data-login-error]", form);
  const unlock = () => {
    gate.hidden = true;
    document.body.classList.remove("is-locked");
  };
  document.body.classList.add("is-locked");
  if (sessionStorage.getItem(AUTH_KEY) === "ok") {
    unlock();
    return;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "ok");
      unlock();
      return;
    }
    if (error) error.textContent = "密码不正确，请重新输入。";
    input.select();
  });
}

bindAuth();
bindGlobal();
connectMediaManifestEvents();
window.addEventListener("resize", () => syncTypePreviewFrames(document));
render();
refreshMediaManifest();
