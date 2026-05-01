import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const read = (filePath) => readFileSync(resolve(root, filePath), "utf8");

const parseAttributes = (tag) => {
  const attributes = {};

  for (const match of tag.matchAll(/([^\s"'=<>/]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attributes[match[1].toLowerCase()] = match[3] ?? match[4] ?? "";
  }

  return attributes;
};

const collectTagAttributes = (content, tagName) => {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  return [...content.matchAll(pattern)].map((match) => parseAttributes(match[0]));
};

const collectScriptTags = (content) => {
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  return [...content.matchAll(pattern)].map((match) => ({
    attributes: parseAttributes(match[0]),
    body: match[2].trim()
  }));
};

const collectClassCounts = (content) => {
  const counts = new Map();
  const pattern = /class\s*=\s*("([^"]*)"|'([^']*)')/gi;

  for (const match of content.matchAll(pattern)) {
    const classValue = match[2] ?? match[3] ?? "";

    for (const className of classValue.split(/\s+/).filter(Boolean)) {
      counts.set(className, (counts.get(className) ?? 0) + 1);
    }
  }

  return counts;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const expectClassCount = (classCounts, className, expectedCount, context) => {
  const actualCount = classCounts.get(className) ?? 0;
  assert(
    actualCount === expectedCount,
    `${context} must include exactly ${expectedCount} element(s) with class "${className}". Found ${actualCount}.`
  );
};

const expectUniqueTag = (tags, predicate, context, description) => {
  const matches = tags.filter((tag) => predicate(tag));
  assert(matches.length === 1, `${context} must include exactly one ${description}. Found ${matches.length}.`);
  return matches[0];
};

const expectMetaContent = (metaTags, name, expectedContent, context) => {
  const tag = expectUniqueTag(
    metaTags,
    (meta) => meta.name === name,
    context,
    `meta[name="${name}"]`
  );

  assert(
    tag.content === expectedContent,
    `${context} meta[name="${name}"] must be "${expectedContent}" but was "${tag.content ?? ""}".`
  );
};

const expectPropertyTag = (metaTags, property, context) =>
  expectUniqueTag(metaTags, (meta) => meta.property === property, context, `meta[property="${property}"]`);

const expectNamedMeta = (metaTags, name, context) =>
  expectUniqueTag(metaTags, (meta) => meta.name === name, context, `meta[name="${name}"]`);

const expectUniqueLink = (linkTags, rel, context, description = `link[rel="${rel}"]`) =>
  expectUniqueTag(linkTags, (link) => link.rel === rel, context, description);

const expectUniqueStylesheet = (linkTags, href, context) => {
  const tag = expectUniqueTag(
    linkTags,
    (link) => link.rel === "stylesheet" && (link.href === href || link.href?.startsWith(`${href}?`)),
    context,
    `stylesheet "${href}"`
  );

  return tag;
};

const expectSingleThemeController = (scriptTags, page, context) => {
  const tag = expectUniqueTag(
    scriptTags,
    (script) => script.attributes.src === "/assets/js/theme-controller.js",
    context,
    'theme controller script'
  );

  assert(
    tag.attributes["data-theme-key"] === page.themeKey,
    `${context} theme controller must use data-theme-key="${page.themeKey}" but found "${tag.attributes["data-theme-key"] ?? ""}".`
  );
};

const expectJsonLdType = (scriptTags, typeName, context) => {
  const jsonLdScripts = scriptTags.filter((script) => script.attributes.type === "application/ld+json");
  const matches = jsonLdScripts.filter((script) => script.body.includes(`"@type": "${typeName}"`));
  assert(
    matches.length === 1,
    `${context} must include exactly one JSON-LD block with "@type": "${typeName}". Found ${matches.length}.`
  );
};

const expectSharedHeaderShell = (content, classCounts, context) => {
  expectClassCount(classCounts, "site-header", 1, context);
  expectClassCount(classCounts, "header-inner", 1, context);
  expectClassCount(classCounts, "aankda-brand", 1, context);
  expectClassCount(classCounts, "aankda-brand__mark", 1, context);
  expectClassCount(classCounts, "aankda-brand__name", 1, context);
  expectClassCount(classCounts, "header-actions", 1, context);
  expectClassCount(classCounts, "theme-toggle", 1, context);
  const headerNavCount = classCounts["header-nav"] ?? 0;
  assert(
    headerNavCount <= 1,
    `${context} must include at most 1 element(s) with class "header-nav". Found ${headerNavCount}.`
  );

  assert(
    /<img class="aankda-brand__mark" src="\/assets\/aankda-mark\.svg"/.test(content),
    `${context} must use the shared /assets/aankda-mark.svg brand asset in the header.`
  );
  assert(
    /<span class="aankda-brand__name">AANKDA<\/span>/.test(content),
    `${context} must use the shared AANKDA header wordmark.`
  );
};

const expectNoPageRouteInSitemap = (sitemapEntries, fragment, context) => {
  const match = sitemapEntries.find((entry) => entry.includes(fragment));
  assert(!match, `${context} must not include ${fragment}.`);
};

const pages = [
  {
    path: "index.html",
    kind: "landing",
    robots: "index,follow,max-image-preview:large",
    canonical: "https://aankda.ai/",
    themeKey: "aankda-theme",
    requireOg: true,
    requireTwitter: true,
    requireSoftwareLd: false
  },
  {
    path: "auraestate/index.html",
    kind: "landing",
    robots: "index,follow,max-image-preview:large",
    canonical: "https://aankda.ai/auraestate/",
    themeKey: "auraestate-theme",
    requireOg: true,
    requireTwitter: true,
    requireSoftwareLd: true
  },
  {
    path: "urest/index.html",
    kind: "landing",
    robots: "index,follow,max-image-preview:large",
    canonical: "https://aankda.ai/urest/",
    themeKey: "urest-theme",
    requireOg: true,
    requireTwitter: true,
    requireSoftwareLd: true
  },
  {
    path: "auraestate/privacy.html",
    kind: "privacy",
    robots: "noindex,follow",
    canonical: "https://aankda.ai/auraestate/privacy.html",
    themeKey: "auraestate-theme",
    requireOg: false,
    requireTwitter: false,
    requireWebPageLd: true
  },
  {
    path: "urest/privacy.html",
    kind: "privacy",
    robots: "noindex,follow",
    canonical: "https://aankda.ai/urest/privacy.html",
    themeKey: "urest-theme",
    requireOg: false,
    requireTwitter: false,
    requireWebPageLd: true
  },
  {
    path: "urest/verification.html",
    kind: "verification",
    robots: "noindex,nofollow",
    canonical: "https://aankda.ai/urest/verification.html",
    themeKey: "urest-theme",
    requireOg: false,
    requireTwitter: false
  }
];

for (const page of pages) {
  const content = read(page.path);
  const context = page.path;
  const metaTags = collectTagAttributes(content, "meta");
  const linkTags = collectTagAttributes(content, "link");
  const scriptTags = collectScriptTags(content);
  const classCounts = collectClassCounts(content);

  expectMetaContent(metaTags, "robots", page.robots, context);
  expectUniqueTag(metaTags, (meta) => meta.name === "theme-color", context, 'meta[name="theme-color"]');
  expectUniqueTag(metaTags, (meta) => meta.name === "color-scheme", context, 'meta[name="color-scheme"]');
  const canonicalTag = expectUniqueLink(linkTags, "canonical", context);
  assert(
    canonicalTag.href === page.canonical,
    `${context} canonical link must be "${page.canonical}" but was "${canonicalTag.href ?? ""}".`
  );
  expectUniqueTag(linkTags, (link) => link.rel === "icon", context, 'link[rel="icon"]');
  expectSingleThemeController(scriptTags, page, context);
  expectUniqueStylesheet(linkTags, "/assets/css/public-core.css", context);
  expectSharedHeaderShell(content, classCounts, context);

  if (page.requireOg) {
    expectPropertyTag(metaTags, "og:title", context);
    expectPropertyTag(metaTags, "og:description", context);
    expectPropertyTag(metaTags, "og:url", context);
    expectPropertyTag(metaTags, "og:image", context);
  }

  if (page.requireTwitter) {
    expectNamedMeta(metaTags, "twitter:card", context);
    expectNamedMeta(metaTags, "twitter:title", context);
    expectNamedMeta(metaTags, "twitter:description", context);
    expectNamedMeta(metaTags, "twitter:image", context);
  } else {
    assert(
      !metaTags.some((meta) => meta.property?.startsWith("og:")),
      `${context} should not include Open Graph metadata.`
    );
    assert(
      !metaTags.some((meta) => meta.name?.startsWith("twitter:")),
      `${context} should not include Twitter metadata.`
    );
  }

  if (page.requireSoftwareLd) {
    expectJsonLdType(scriptTags, "SoftwareApplication", context);
  }

  if (page.requireWebPageLd) {
    expectJsonLdType(scriptTags, "WebPage", context);
  }

  if (page.kind === "privacy") {
    const externalScripts = scriptTags.filter((script) => script.attributes.src);
    assert(
      externalScripts.length === 1,
      `${context} should only load the shared theme-controller script externally. Found ${externalScripts.length}.`
    );
  }
}

const templates = [
  {
    path: "templates/product-landing.html",
    kind: "landing",
    robots: "index,follow,max-image-preview:large",
    canonical: "https://aankda.ai/product-slug/",
    themeKey: "product-slug-theme",
    requireOg: true,
    requireTwitter: true,
    requireSoftwareLd: true
  },
  {
    path: "templates/product-privacy.html",
    kind: "privacy",
    robots: "noindex,follow",
    canonical: "https://aankda.ai/product-slug/privacy.html",
    themeKey: "product-slug-theme",
    requireOg: false,
    requireTwitter: false,
    requireWebPageLd: true
  },
  {
    path: "templates/product-verification.html",
    kind: "verification",
    robots: "noindex,nofollow",
    canonical: "https://aankda.ai/product-slug/verification.html",
    themeKey: "product-slug-theme",
    requireOg: false,
    requireTwitter: false
  }
];

for (const template of templates) {
  const content = read(template.path);
  const context = template.path;
  const metaTags = collectTagAttributes(content, "meta");
  const linkTags = collectTagAttributes(content, "link");
  const scriptTags = collectScriptTags(content);
  const classCounts = collectClassCounts(content);

  expectMetaContent(metaTags, "robots", template.robots, context);
  const canonicalTag = expectUniqueLink(linkTags, "canonical", context);
  assert(
    canonicalTag.href === template.canonical,
    `${context} canonical link must be "${template.canonical}" but was "${canonicalTag.href ?? ""}".`
  );
  expectUniqueTag(metaTags, (meta) => meta.name === "theme-color", context, 'meta[name="theme-color"]');
  expectUniqueTag(metaTags, (meta) => meta.name === "color-scheme", context, 'meta[name="color-scheme"]');
  expectUniqueTag(linkTags, (link) => link.rel === "icon", context, 'link[rel="icon"]');
  expectSingleThemeController(scriptTags, template, context);
  expectUniqueStylesheet(linkTags, "/assets/css/public-core.css", context);
  expectSharedHeaderShell(content, classCounts, context);

  if (template.requireOg) {
    expectPropertyTag(metaTags, "og:title", context);
    expectPropertyTag(metaTags, "og:description", context);
    expectPropertyTag(metaTags, "og:url", context);
    expectPropertyTag(metaTags, "og:image", context);
  }

  if (template.requireTwitter) {
    expectNamedMeta(metaTags, "twitter:card", context);
    expectNamedMeta(metaTags, "twitter:title", context);
    expectNamedMeta(metaTags, "twitter:description", context);
    expectNamedMeta(metaTags, "twitter:image", context);
  } else {
    assert(
      !metaTags.some((meta) => meta.property?.startsWith("og:")),
      `${context} should not include Open Graph metadata.`
    );
    assert(
      !metaTags.some((meta) => meta.name?.startsWith("twitter:")),
      `${context} should not include Twitter metadata.`
    );
  }

  if (template.requireSoftwareLd) {
    expectJsonLdType(scriptTags, "SoftwareApplication", context);
  }

  if (template.requireWebPageLd) {
    expectJsonLdType(scriptTags, "WebPage", context);
  }
}

const sitemap = read("sitemap.xml");
const sitemapEntries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(sitemapEntries.includes("https://aankda.ai/"), 'sitemap.xml must include the root route.');
assert(sitemapEntries.includes("https://aankda.ai/auraestate/"), 'sitemap.xml must include /auraestate/.');
assert(sitemapEntries.includes("https://aankda.ai/urest/"), 'sitemap.xml must include /urest/.');
expectNoPageRouteInSitemap(sitemapEntries, "/privacy.html", "sitemap.xml");
expectNoPageRouteInSitemap(sitemapEntries, "/verification.html", "sitemap.xml");

console.log("Public contract validation passed.");
