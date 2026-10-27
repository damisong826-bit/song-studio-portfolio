window.SONG_STUDIO_DATA = {
  version: "2026-06-29-editor-prototype",
  settings: {
    brandName: "Song Studio",
    email: "hello@songstudio.com",
    copyright: "© 2024 Song Studio. All rights reserved.",
    colors: {
      background: "#f4f5f1",
      ink: "#0d1110",
      accent: "#1774ff",
      darkPanel: "#080908"
    },
    layout: {
      containerWidth: "1220px",
      heroContainerWidth: "1220px",
      sectionSpacingSmall: 64,
      sectionSpacingMedium: 88,
      sectionSpacingLarge: 112,
      imageRadius: 28,
      buttonRadius: 999
    },
    typography: {
      fontZh: {
        name: "Noto Sans SC",
        fileName: "",
        source: "google"
      },
      fontEn: {
        name: "Inter",
        fileName: "",
        source: "google"
      },
      fontHandwriting: {
        name: "Brush Script MT",
        fileName: "",
        source: "system"
      },
      styles: {
        h1En: { label: "H1 英文首屏标题", size: 94, weight: 560, lineHeight: 1.08, letterSpacing: 0 },
        h2En: { label: "H2 英文模块标题", size: 64, weight: 520, lineHeight: 1.14, letterSpacing: 0 },
        h3En: { label: "H3 英文分组标题", size: 42, weight: 540, lineHeight: 1.18, letterSpacing: 0 },
        h4En: { label: "H4 英文卡片标题", size: 28, weight: 560, lineHeight: 1.24, letterSpacing: 0 },
        leadEn: { label: "英文导语", size: 27, weight: 400, lineHeight: 1.4, letterSpacing: 0 },
        bodyEn: { label: "英文正文", size: 17, weight: 500, lineHeight: 1.62, letterSpacing: 0 },
        metaEn: { label: "英文标签/编号", size: 15, weight: 650, lineHeight: 1.35, letterSpacing: 0 },
        buttonEn: { label: "英文按钮", size: 14, weight: 650, lineHeight: 1, letterSpacing: 0 },
        h1Zh: { label: "H1 中文详情标题", size: 72, weight: 500, lineHeight: 1.02, letterSpacing: 0 },
        h2Zh: { label: "H2 中文段落标题", size: 38, weight: 500, lineHeight: 1.16, letterSpacing: 0 },
        h3Zh: { label: "H3 中文项目标题", size: 28, weight: 560, lineHeight: 1.18, letterSpacing: 0 },
        h4Zh: { label: "H4 中文小标题", size: 20, weight: 560, lineHeight: 1.3, letterSpacing: 0 },
        bodyZh: { label: "中文正文", size: 16, weight: 500, lineHeight: 1.72, letterSpacing: 0 },
        captionZh: { label: "中文说明/注释", size: 14, weight: 500, lineHeight: 1.55, letterSpacing: 0 }
      }
    }
  },
  navigation: {
    items: [
      { id: "home", label: "Home", href: "index.html", visible: true, sortOrder: 1 },
      { id: "project", label: "Project", href: "#works", badge: "03", visible: true, sortOrder: 2 },
      { id: "contact", label: "Contact", href: "#contact", visible: true, sortOrder: 3 }
    ],
    introButton: {
      label: "Contact Me ↗",
      href: "#contact",
      image: "assets/images/live-妖精/1.jpg",
      visible: true
    }
  },
  home: {
    hero: {
      visible: true,
      label: "Brand Visual Portfolio",
      title: "Visual Design for Live Brands.",
      sideTitle: "Live Visual\nBrand Campaign\nfor Commerce Scenes",
      primaryButton: { label: "View Works ↗", href: "#works" },
      secondaryButton: { label: "Reach Out ↗", href: "#contact" },
      bottomLabels: ["+ Define", "+ Design", "+ Development"],
      backgroundImage: "assets/images/首- BJ/蓝色首屏留白版.png",
      backgroundPosition: "center"
    },
    logoShowcase: {
      visible: true,
      description: "Selected partners, platforms and visual directions",
      items: [
        { id: "gao", label: "GAO", image: "", visible: true, sortOrder: 1 },
        { id: "panda-jojo", label: "PANDA JOJO", image: "", visible: true, sortOrder: 2 },
        { id: "type-lab", label: "TYPE LAB", image: "", visible: true, sortOrder: 3 },
        { id: "live-visual", label: "LIVE VISUAL", image: "", visible: true, sortOrder: 4 },
        { id: "brand-campaign", label: "BRAND CAMPAIGN", image: "", visible: true, sortOrder: 5 },
        { id: "digital-content", label: "DIGITAL CONTENT", image: "", visible: true, sortOrder: 6 },
        { id: "song-studio", label: "SONG STUDIO", image: "", visible: true, sortOrder: 7 }
      ]
    },
    featuredCarousel: {
      visible: true,
      label: "Selected Projects",
      title: "We build visual-first digital stories for live commerce.",
      description: "精选视觉项目，覆盖品牌视觉、直播内容、活动传播与版式实验。",
      autoplay: true,
      autoplayDirection: "left-to-right",
      autoplaySpeed: 4200,
      projectIds: ["elf-sack", "gao-live", "gao-summer"]
    },
    numbers: {
      visible: true,
      label: "Practice Focus",
      title: "Selected directions shaped for fast-moving brand scenes.",
      items: [
        { value: "Brand", label: "Visual identity systems", visible: true, sortOrder: 1 },
        { value: "Live", label: "Commerce visual content", visible: true, sortOrder: 2 },
        { value: "Campaign", label: "Digital launch stories", visible: true, sortOrder: 3 },
      ]
    },
    projectDirectory: {
      visible: true,
      label: "Design Directions",
      previewTitle: "Live Visual",
      previewDescription: "Visual systems for live commerce.",
      descriptionStyle: { size: 17, weight: 600, lineHeight: 1.45, letterSpacing: 0 },
      previewImage: "assets/images/live-钟薛高/1.jpg",
      categoryIds: ["live-visual", "brand-visual", "digital-campaign"]
    },
    projectIndex: {
      visible: true,
      label: "Projects Index",
      title: "Projects by Visual Direction",
      intro: "按项目类型展示所有作品，点击分类可跳转到对应项目组，点击作品进入详情页。",
      categoryIds: ["live-visual", "brand-visual", "digital-campaign"],
      layout: "waterfall"
    },
    footerContact: {
      visible: true,
      label: "",
      title: "Thank\nyou.",
      description: "Let's connect for projects, collaborations,\nand visual storytelling.",
      email: "hello@songstudio.com",
      buttonLabel: "Back Home ↗",
      buttonHref: "index.html",
      handwritingText: "SONJ",
      handwritingFont: "Brush Script MT",
      backgroundImage: "assets/images/首- BJ/蓝色首屏留白版.png",
      qrImage: "",
      qrPlaceholder: true
    }
  },
  codeDrafts: {
    html: "",
    css: "",
    js: ""
  },
  imageCrops: {},
  categories: [
    {
      id: "live-visual",
      name: "Live Visual",
      nameZh: "直播视觉",
      anchor: "projects-live-visual",
      shortDescription: "舞台视觉 / 实时内容",
      longDescription: "Visual systems for live commerce scenes, launch moments, and fast content production.",
      coverImage: "assets/images/live-钟薛高/1.jpg",
      visible: true,
      sortOrder: 1
    },
    {
      id: "brand-visual",
      name: "Brand Visual",
      nameZh: "品牌视觉",
      anchor: "projects-brand-visual",
      shortDescription: "品牌识别 / 场景视觉",
      longDescription: "Identity-led visual stories for brand moments, product launches, and campaign systems.",
      coverImage: "assets/images/live-妖精/1.jpg",
      visible: true,
      sortOrder: 2
    },
    {
      id: "digital-campaign",
      name: "Digital Campaign",
      nameZh: "营销活动视觉",
      anchor: "projects-digital-campaign",
      shortDescription: "内容传播 / 活动视觉",
      longDescription: "Campaign visuals for seasonal stories, social content, and digital launch pages.",
      coverImage: "assets/images/电商-化妆品/0.jpg",
      visible: true,
      sortOrder: 3
    },
  ],
  projects: [
    {
      id: "gao-live",
      slug: "gao-live",
      title: "钟薛高",
      titleEn: "GAO Live",
      summary: "品牌直播视觉与现场内容设计。",
      categoryId: "live-visual",
      year: "2025",
      timeline: "2 Month",
      client: "GAO",
      services: "Live Visual",
      visible: true,
      featuredOnHome: true,
      showInIndex: true,
      carouselSortOrder: 2,
      categorySortOrder: 1,
      coverImage: "assets/images/live-钟薛高/1.jpg",
      thumbnailImage: "assets/images/live-钟薛高/1.jpg",
      objectPosition: "center",
      detailTheme: "light",
      detailIntro: "品牌直播视觉与现场内容设计。",
      detailSections: [
        { label: "Design Background", title: "把直播信息整理成高识别度视觉入口。", body: "通过统一信息层级和移动端内容模块，让直播间视觉在高频传播中保持品牌识别。" },
        { label: "Design Solution", title: "用可复用模块承载不同销售场景。", body: "主图、信息卡、活动贴纸和手机界面可以持续替换，让不同场景快速延展。" }
      ],
      detailImages: ["assets/images/live-钟薛高/1.jpg"],
      stats: [
        { value: "12+", label: "Live Assets" },
        { value: "04", label: "Visual Directions" }
      ],
      relatedProjectIds: ["elf-sack", "gao-summer"]
    },
    {
      id: "elf-sack",
      slug: "elf-sack",
      title: "妖精的口袋",
      titleEn: "Elf Sack",
      summary: "建立兼顾销售转化与品牌表达的直播视觉系统。",
      categoryId: "brand-visual",
      year: "2025",
      timeline: "2 Month",
      client: "PANDA / JOJO",
      services: "Brand Visual",
      visible: true,
      featuredOnHome: true,
      showInIndex: true,
      carouselSortOrder: 1,
      categorySortOrder: 1,
      coverImage: "assets/images/live-妖精/1.jpg",
      thumbnailImage: "assets/images/live-妖精/1.jpg",
      objectPosition: "center",
      detailTheme: "light",
      detailIntro: "为少女服饰品牌建立兼顾直播转化、活动氛围与品牌记忆点的视觉系统。",
      detailSections: [
        { label: "Design Background", title: "把“促销信息”整理成有品牌表情的视觉叙事。", body: "直播间需要快速传达利益点，也需要维持品牌本身的少女感、趣味感和场景感。这个项目把日常直播、大促节点、节日活动拆成不同视觉层级，让信息更清晰，也让画面更像一个可持续使用的品牌系统。" },
        { label: "Design Solution", title: "用统一的画面秩序承载不同活动内容。", body: "主视觉保留高识别度色彩和人物元素，通过标题、贴纸、信息卡和手机界面形成可复用的模块。后续不同上新或促销内容，只需要替换图片与信息，就能快速延展出完整的一组直播视觉。" }
      ],
      detailImages: [
        "assets/images/live-妖精/1.jpg",
        "assets/images/live-妖精/2.jpg",
        "assets/images/live-妖精/3.jpg",
        "assets/images/live-妖精/4.jpg",
        "assets/images/live-妖精/5.jpg",
        "assets/images/live-妖精/6.jpg",
        "assets/images/live-妖精/7.jpg"
      ],
      stats: [
        { value: "04", label: "Visual Directions" },
        { value: "12+", label: "Live Assets" },
        { value: "03", label: "Campaign Scenes" },
        { value: "01", label: "Brand System" }
      ],
      relatedProjectIds: ["gao-live", "type-echo"]
    },
    {
      id: "gao-summer",
      slug: "gao-summer",
      title: "钟薛高",
      titleEn: "GAO Summer",
      summary: "夏日数字营销与移动端视觉内容。",
      categoryId: "digital-campaign",
      year: "2024",
      timeline: "1 Month",
      client: "GAO",
      services: "Digital Campaign",
      visible: true,
      featuredOnHome: true,
      showInIndex: true,
      carouselSortOrder: 3,
      categorySortOrder: 1,
      coverImage: "assets/images/电商-化妆品/0.jpg",
      thumbnailImage: "assets/images/电商-化妆品/0.jpg",
      objectPosition: "center",
      detailTheme: "light",
      detailIntro: "夏日数字营销与移动端视觉内容。",
      detailSections: [],
      detailImages: ["assets/images/电商-化妆品/0.jpg"],
      stats: [],
      relatedProjectIds: ["gao-live", "elf-sack"]
    },
  ],
  assets: [
    { id: "home-hero-clean", label: "首页/尾屏背景", src: "assets/images/首- BJ/蓝色首屏留白版.png", type: "image", recommendedRatio: "16:9", objectPosition: "center", sortOrder: 1 },
    { id: "featured-brand", label: "妖精的口袋缩略图", src: "assets/images/live-妖精/1.jpg", type: "image", recommendedRatio: "16:9", objectPosition: "center", sortOrder: 2 },
    { id: "featured-live", label: "钟薛高直播视觉", src: "assets/images/live-钟薛高/1.jpg", type: "image", recommendedRatio: "16:9", objectPosition: "center", sortOrder: 3 },
    { id: "featured-summer", label: "钟薛高夏日项目", src: "assets/images/电商-化妆品/0.jpg", type: "image", recommendedRatio: "16:9", objectPosition: "center", sortOrder: 4 },
    { id: "elf-detail-hero", label: "妖精的口袋正文图", src: "assets/images/live-妖精/1.jpg", type: "image", recommendedRatio: "16:9", objectPosition: "center", sortOrder: 5 },
  ]
};
