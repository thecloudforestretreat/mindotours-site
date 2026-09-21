import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const excluded = new Set([".git", "admin", "node_modules", "scripts", "testing", "testing2"]);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || excluded.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.name === "index.html") files.push(fullPath);
  }
  return files;
}

function attribute(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] ?? "";
}

function metadata(html) {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const canonical = links.find((tag) => attribute(tag, "rel") === "canonical");
  const alternates = links.filter((tag) => attribute(tag, "rel") === "alternate");
  return {
    canonical: attribute(canonical ?? "", "href"),
    en: attribute(alternates.find((tag) => attribute(tag, "hreflang") === "en") ?? "", "href"),
    es: attribute(alternates.find((tag) => attribute(tag, "hreflang") === "es") ?? "", "href"),
  };
}

function outline(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
  const withoutEmbeddedCode = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "");

  return (withoutEmbeddedCode.match(/<\/?[a-z][^>]*>/gi) ?? []).map((tag) => {
    const closing = /^<\//.test(tag);
    const name = tag.match(/^<\/?\s*([a-z0-9-]+)/i)?.[1].toLowerCase() ?? "";
    if (closing) return `/${name}`;
    const classes = attribute(tag, "class").split(/\s+/).filter(Boolean).sort().join(".");
    return classes ? `${name}.${classes}` : name;
  });
}

function firstDifference(left, right) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return { index, en: left[index] ?? "<end>", es: right[index] ?? "<end>" };
  }
  return null;
}

const pages = new Map();
for (const file of await walk(root)) {
  const html = await readFile(file, "utf8");
  const meta = metadata(html);
  if (meta.canonical) pages.set(new URL(meta.canonical).pathname, { file, html, meta });
}

const issues = [];
let pairCount = 0;
for (const page of pages.values()) {
  const pathname = new URL(page.meta.canonical).pathname;
  if (pathname.startsWith("/es/") || !page.meta.es) continue;
  const spanishPath = new URL(page.meta.es).pathname;
  const spanish = pages.get(spanishPath);
  if (!spanish) continue;
  pairCount += 1;
  const difference = firstDifference(outline(page.html), outline(spanish.html));
  if (difference) issues.push(`${pathname} ↔ ${spanishPath}: element ${difference.index + 1} is ${difference.en} vs ${difference.es}`);
}

if (issues.length) {
  console.error(`Bilingual parity audit found ${issues.length} mismatched pair(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Bilingual parity audit passed for ${pairCount} reciprocal page pairs.`);
}
