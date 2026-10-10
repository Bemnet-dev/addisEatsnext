#!/usr/bin/env node
/**
 * Regenerates the JPEG photos used by the social preview cards.
 *
 *   npm run og:images
 *
 * Why this exists: the preview cards (opengraph-image.js) are rendered by
 * Satori, which cannot decode WebP — feeding it a .webp makes the route throw
 * "is not iterable" and return 500, so the link preview loses its image. This
 * script converts the WebP dish photos into JPEGs under public/og/, which the
 * cards embed as data URIs.
 *
 * Run it whenever a dish photo changes or a dish is added. `sharp` is only a
 * build-time tool here (it ships with Next.js); nothing at runtime needs it.
 */
import { access, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PUBLIC = path.join(process.cwd(), "public");
const OUT_DIR = path.join(PUBLIC, "og");
const OUT_DISHES = path.join(OUT_DIR, "dishes");
const SIZE = { width: 645, height: 945 };
const QUALITY = 78;

/** src/*.js is ESM while the package is CommonJS — load it through a data URL. */
async function importSource(relativePath) {
  const source = await readFile(path.join(process.cwd(), relativePath), "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
  return import(url);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Prefer the larger "detail" render of a dish photo, fall back to the base file. */
async function sourceFor(image) {
  const detail = image.replace("/dishes/", "/dishes/display/detail/");
  if (await exists(path.join(PUBLIC, detail))) return path.join(PUBLIC, detail);
  if (await exists(path.join(PUBLIC, image))) return path.join(PUBLIC, image);
  return null;
}

async function convert(input, output) {
  await sharp(input)
    .resize(SIZE.width, SIZE.height, { fit: "cover", position: "attention" })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(output);
  return stat(output);
}

const { getDishes } = await importSource("src/lib/dishes.js");
const { toSlug } = await importSource("src/app/menu/slug.js");

await mkdir(OUT_DISHES, { recursive: true });

const siteSource = await sourceFor("/dishes/bayenetu.webp");
if (siteSource) {
  const stat = await convert(siteSource, path.join(OUT_DIR, "site.jpg"));
  console.log(`site.jpg         ${(stat.size / 1024).toFixed(0)} kB  <- ${path.relative(PUBLIC, siteSource)}`);
}

let skipped = 0;
for (const dish of await getDishes()) {
  const source = await sourceFor(dish.image);
  if (!source) {
    skipped += 1;
    console.warn(`SKIP ${dish.name} (no photo on disk for ${dish.image})`);
    continue;
  }
  const output = path.join(OUT_DISHES, `${toSlug(dish.name)}.jpg`);
  const stat = await convert(source, output);
  console.log(`${toSlug(dish.name)}.jpg`.padEnd(31) + `${(stat.size / 1024).toFixed(0)} kB  <- ${path.relative(PUBLIC, source)}`);
}

if (skipped > 0) {
  console.error(`\n${skipped} dish(es) had no photo — their cards fall back to text-only.`);
}
