const SITE_ORIGIN = "https://eduvideo.light4ai.com"
const HOME_URL = `${SITE_ORIGIN}/`
const HOME_TITLE =
  "Eduvideo AI 讲题视频生成器｜题目、图片与知识内容一键生成教学视频"
const HOME_DESCRIPTION =
  "Eduvideo AI 面向教师、教培机构与知识创作者，支持题目解析、图片上传、双语讲解和 AI 教学视频生成，适用于高考冲刺、同步课堂、错题讲评与知识短视频制作。"
const HOME_KEYWORDS =
  "AI讲题视频,AI教学视频生成器,题目转视频,图片转教学视频,知识讲解视频,高考冲刺视频,双语讲题,AIGC教学"

export const CHAT_PANEL_SEO = {
  title: HOME_TITLE,
  meta: [
    { key: "description", attr: "name" as const, value: HOME_DESCRIPTION },
    { key: "keywords", attr: "name" as const, value: HOME_KEYWORDS },
    {
      key: "robots",
      attr: "name" as const,
      value:
        "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    },
    { key: "og:title", attr: "property" as const, value: HOME_TITLE },
    {
      key: "og:description",
      attr: "property" as const,
      value: HOME_DESCRIPTION,
    },
    { key: "og:type", attr: "property" as const, value: "website" },
    { key: "og:url", attr: "property" as const, value: HOME_URL },
    { key: "og:site_name", attr: "property" as const, value: "Eduvideo AI" },
    {
      key: "twitter:card",
      attr: "name" as const,
      value: "summary_large_image",
    },
    { key: "twitter:title", attr: "name" as const, value: HOME_TITLE },
    {
      key: "twitter:description",
      attr: "name" as const,
      value: HOME_DESCRIPTION,
    },
  ],
  structuredData: [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Eduvideo AI",
      url: SITE_ORIGIN,
      logo: `${SITE_ORIGIN}/favicon.svg`,
      description: "面向教育行业的 AI 讲题视频与知识讲解视频生成平台。",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Eduvideo AI",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: HOME_URL,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
      },
      description: HOME_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Eduvideo AI 讲题视频生成器",
      category: "AI Teaching Video Generator",
      brand: {
        "@type": "Brand",
        name: "Eduvideo AI",
      },
      description: "支持题目、图片和知识点内容生成教学讲解视频的 AI 产品。",
      url: HOME_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Eduvideo AI 支持哪些输入方式？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "支持直接输入题目或知识点文本，并支持上传或粘贴图片作为讲解素材。",
          },
        },
        {
          "@type": "Question",
          name: "Eduvideo AI 适合哪些教学场景？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "适合高考冲刺、同步课堂、作业讲评、错题复盘、知识科普和教育内容短视频制作。",
          },
        },
        {
          "@type": "Question",
          name: "Eduvideo AI 是否支持双语讲解？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "首页支持中文和英文两种语言选项，可用于双语知识讲解与国际课程场景。",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "AI 讲题视频生成正在成为教育内容生产的新入口",
      description:
        "Eduvideo AI 通过题目、图片和知识内容输入，帮助教育团队更快生成可传播的知识讲解视频。",
      author: {
        "@type": "Organization",
        name: "Eduvideo AI",
      },
      publisher: {
        "@type": "Organization",
        name: "Eduvideo AI",
        logo: {
          "@type": "ImageObject",
          url: `${SITE_ORIGIN}/favicon.svg`,
        },
      },
      mainEntityOfPage: HOME_URL,
    },
  ] as const,
  canonicalUrl: HOME_URL,
}
