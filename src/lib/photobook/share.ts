import { loadImagesFromDB } from "./db";
import type { Book } from "./types";

const SHARER_NAME_KEY = "yaara_sharer_name";
const MY_SHARES_KEY = "yaara_my_shares";

export type MyShare = {
  id: string;
  deleteToken: string;
  title: string;
  url: string;
  createdAt: number;
};

const isBrowser = () => typeof window !== "undefined";

export function getSharerName(): string {
  if (!isBrowser()) return "";
  try {
    return localStorage.getItem(SHARER_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSharerName(name: string) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SHARER_NAME_KEY, name.trim());
  } catch {
    /* ignore */
  }
}

export function getMyShares(): MyShare[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MY_SHARES_KEY);
    const parsed = raw ? (JSON.parse(raw) as MyShare[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMyShares(shares: MyShare[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MY_SHARES_KEY, JSON.stringify(shares.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function addMyShare(share: MyShare) {
  writeMyShares([share, ...getMyShares().filter((s) => s.id !== share.id)]);
}

export function removeMyShare(id: string) {
  writeMyShares(getMyShares().filter((s) => s.id !== id));
}

/** Unique image ids actually referenced by the book's photo frames. */
function usedImageIds(book: Book): Set<string> {
  const ids = new Set<string>();
  for (const page of book.pages) {
    for (const el of page.elements) {
      if (el.type === "photo" && el.imageId) ids.add(el.imageId);
    }
  }
  return ids;
}

/** Downscale + JPEG-encode a blob to keep the shared payload reasonable. */
function compressBlobToBase64(blob: Blob, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
      canvas.width = 1;
      canvas.height = 1;
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    };
    img.src = url;
  });
}

/** Gather the photos the book uses, as base64, ready to upload for a share. */
export async function collectBookImages(
  book: Book,
): Promise<Array<{ id: string; name: string; base64: string }>> {
  const wanted = usedImageIds(book);
  if (wanted.size === 0) return [];
  const dbImages = await loadImagesFromDB();
  const out: Array<{ id: string; name: string; base64: string }> = [];
  for (const image of dbImages) {
    if (!wanted.has(image.id)) continue;
    try {
      out.push({
        id: image.id,
        name: image.name || "",
        base64: await compressBlobToBase64(image.file),
      });
    } catch (error) {
      console.error("Failed to encode image for sharing:", image.id, error);
    }
  }
  return out;
}
