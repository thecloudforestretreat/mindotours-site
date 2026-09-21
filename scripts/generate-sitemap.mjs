import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const excludedDirectories = new Set([".git", "admin", "node_modules", "scripts", "testing", "testing2"]);

async function findIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || excludedDirectories.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findIndexFiles(fullPath));
    if (entry.isFile() && entry.name === "index.html") files.push(fullPath);
  }

  return files;
}

function attr(html, relation, attribute = "href") {
  const pattern = new RegExp(`<link\\s+[^>]*rel=["']${relation}["'][^>]*${attribute}=["']([^"']+)["'][^>]*>`, "i");
  const reversePattern = new RegExp(`<link\\s+[^>]*${attribute}=["']([^"']+)["'][^>]*rel=["']${relation}["'][^>]*>`, "i");
  return html.match(pattern)?.[1] ?? html.match(reversePattern)?.[1] ?? null;
}

function alternate(html, language) {
  const tags = html.match(/<link\s+[^>]*rel=["']alternate["'][^>]*>/gi) ?? [];
  for (const tag of tags) {
    const hreflang = tag.match(/hreflang=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (hreflang === language) return href ?? null;
  }
  return null;
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function priority(url) {
  const pathname = new URL(url).pathname;
  if (pathname === "/" || pathname === "/es/") return "1.0";
  if (["/tours/", "/es/tours/", "/activities/", "/es/actividades/", "/book-tour/", "/es/reservar-tour/", "/contact/", "/es/contacto/"].includes(pathname)) return "0.9";
  return "0.8";
}

const pages = [];
for (const file of await findIndexFiles(root)) {
  const html = await readFile(file, "utf8");
  const canonical = attr(html, "canonical");
  if (!canonical || !canonical.startsWith("https://mindotours.com/")) {
    throw new Error(`Missing or invalid canonical in ${relative(root, file).split(sep).join("/")}`);
  }
  pages.push({
    canonical,
    en: alternate(html, "en"),
    es: alternate(html, "es"),
    xDefault: alternate(html, "x-default"),
  });
}

pages.sort((a, b) => new URL(a.canonical).pathname.localeCompare(new URL(b.canonical).pathname, "en"));

const blocks = pages.map((page) => {
  const alternates = [
    ["en", page.en],
    ["es", page.es],
    ["x-default", page.xDefault],
  ].filter(([, href]) => href);

  return [
    "  <url>",
    `    <loc>${escapeXml(page.canonical)}</loc>`,
    "    <lastmod>2026-09-20</lastmod>",
    "    <changefreq>monthly</changefreq>",
    `    <priority>${priority(page.canonical)}</priority>`,
    ...alternates.map(([language, href]) => `    <xhtml:link rel="alternate" hreflang="${language}" href="${escapeXml(href)}"/>`),
    "  </url>",
  ].join("\n");
});

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  "",
  blocks.join("\n\n"),
  "",
  "</urlset>",
  "",
].join("\n");

await writeFile(join(root, "sitemap.xml"), sitemap);
console.log(`Wrote ${pages.length} URLs to sitemap.xml`);
