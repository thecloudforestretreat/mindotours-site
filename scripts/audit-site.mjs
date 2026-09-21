import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const excluded = new Set([".git", "admin", "node_modules", "scripts", "testing", "testing2"]);

async function walk(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || excluded.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await walk(fullPath));
    else if (entry.name === "index.html") results.push(fullPath);
  }
  return results;
}

function tags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

function attribute(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] ?? null;
}

function pagePath(canonical) {
  return new URL(canonical).pathname;
}

async function localTargetExists(url) {
  const pathname = new URL(url, "https://mindotours.com").pathname;
  if (pathname === "/") return true;
  const target = join(root, pathname);
  try {
    const info = await stat(target);
    if (info.isDirectory()) await stat(join(target, "index.html"));
    return true;
  } catch {
    return false;
  }
}

const errors = [];
const pages = new Map();

for (const file of await walk(root)) {
  const name = relative(root, file).split(sep).join("/");
  const html = await readFile(file, "utf8");
  const canonicalTags = tags(html, "link").filter((tag) => attribute(tag, "rel") === "canonical");
  const canonical = attribute(canonicalTags[0] ?? "", "href");
  if (canonicalTags.length !== 1 || !canonical?.startsWith("https://mindotours.com/")) errors.push(`${name}: invalid canonical`);
  if ((html.match(/<h1\b/gi) ?? []).length !== 1) errors.push(`${name}: expected exactly one H1`);
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${name}: missing title`);
  if (!/<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+/i.test(html) && !/<meta\s+[^>]*content=["'][^"']+[^>]*name=["']description["']/i.test(html)) errors.push(`${name}: missing description`);
  if (!html.includes("/assets/js/head.js")) errors.push(`${name}: missing global head loader`);

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch (error) { errors.push(`${name}: invalid JSON-LD (${error.message})`); }
  }

  const alternates = {};
  for (const tag of tags(html, "link").filter((item) => attribute(item, "rel") === "alternate")) {
    const language = attribute(tag, "hreflang");
    const href = attribute(tag, "href");
    if (language && href) alternates[language] = href;
  }
  if (canonical) pages.set(pagePath(canonical), { name, html, canonical, alternates });
}

for (const page of pages.values()) {
  for (const [language, href] of Object.entries(page.alternates)) {
    if (!(await localTargetExists(href))) errors.push(`${page.name}: ${language} alternate missing locally: ${pagePath(href)}`);
  }
  for (const match of page.html.matchAll(/(?:href|src)=["'](\/[^"]*)["']/gi)) {
    const raw = match[1];
    if (raw.startsWith("//")) continue;
    const pathname = raw.split(/[?#]/)[0];
    if (!pathname || pathname === "/") continue;
    if (!(await localTargetExists(pathname))) errors.push(`${page.name}: broken local reference ${pathname}`);
  }
}

if (errors.length) {
  console.error(`Audit found ${errors.length} issue(s):`);
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Audit passed for ${pages.size} public HTML pages.`);
}
