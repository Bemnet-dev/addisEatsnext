import { readFile } from "node:fs/promises";
import path from "node:path";

/** Extension -> MIME type. Satori cannot decode WebP, so the cards must use
 *  JPEG or PNG sources (see photoDataUri). */
const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/**
 * Turns a file in /public into a data URI that Satori can render, or null.
 *
 * Used by the social preview cards so the shared link carries a real photo of
 * the dish instead of text on a gradient. A null return is not an error: both
 * opengraph-image routes fall back to their text-only layout, so a missing or
 * unreadable asset can never make the preview endpoint fail.
 *
 * Reads from disk rather than fetching over HTTP: opengraph-image routes run in
 * the Node.js runtime, so there is no network round trip and no dependency on
 * the deployment being reachable from itself.
 */
export async function photoDataUri(publicPath) {
  try {
    if (typeof publicPath !== "string" || !publicPath) return null;

    const relative = publicPath.replace(/^\/+/, "");
    if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

    const mime = MIME_TYPES[path.extname(relative).toLowerCase()];
    if (!mime) return null;

    const bytes = await readFile(path.join(process.cwd(), "public", relative));
    return `data:${mime};base64,${toBase64(new Uint8Array(bytes))}`;
  } catch {
    return null;
  }
}

/** Runtime-agnostic base64 (works in Node and Edge, no Buffer required). */
function toBase64(bytes) {
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return btoa(binary);
}
