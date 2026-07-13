import jsPDF from "jspdf";
import {
  PAGE_SIZES,
  type PhotoElement,
  type StickerElement,
  type QuoteElement,
  type TextElement,
  type DrawingElement,
  type ShapeMask,
  type FrameStyle,
} from "./types";
import { useBookStore } from "./store";

// ─── Helpers ────────────────────────────────────────────────────────────────

const loadImg = (src: string, timeoutMs = 15000): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error("load error"));
    };
    img.src = src;
  });

const isImgSrc = (s: string) =>
  s.startsWith("data:") ||
  s.startsWith("blob:") ||
  s.startsWith("/") ||
  s.startsWith("http:") ||
  s.startsWith("https:") ||
  /\.(png|jpe?g|gif|webp|svg)$/i.test(s);

// Theme → solid hex colour (matches CSS background classes)
const THEME_COLORS: Record<string, string> = {
  cream: "#faf6ec",
  linen: "#f3ede0",
  vintage: "#e8dcc0",
  dark: "#1f1a16",
  minimal: "#ffffff",
  sunset: "#ff9a8b",
  mountain: "#c0cbb6",
  pastel: "#f7e6e0",
  ocean: "#88b8d4",
  forest: "#7a9168",
  desert: "#f5d9a8",
  noir: "#0e0e10",
  rose: "#e8a48a",
  kraft: "#c79c6c",
  blueprint: "#1d3a64",
  terrazzo: "#f3ece1",
  coverLuxe: "#211a14",
  passport: "#17374a",
  map: "#f6ecd7",
  boarding: "#fbf5e7",
  tropical: "#f6eccd",
  alpine: "#eef3ee",
  city: "#171719",
  postcard: "#fbf0db",
  journal: "#ead9b8",
  botanical: "#f5eddc",
};

/**
 * Apply a clipping path on the canvas context for a given shape.
 * All shapes clip the region (x, y, w, h).
 */
const applyShapeClip = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeMask | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  fallbackRadius: number,
) => {
  ctx.beginPath();

  const pct = (px: string, dim: number) => {
    // Convert e.g. "50%" → dim*0.5, "24px" → 24
    if (px.endsWith("%")) return (parseFloat(px) / 100) * dim;
    return parseFloat(px);
  };

  // polygon() clip definitions from catalogs.ts
  const POLY_CLIPS: Partial<Record<ShapeMask, string>> = {
    heart: "polygon(50% 100%, 0% 38%, 8% 18%, 28% 8%, 50% 22%, 72% 8%, 92% 18%, 100% 38%)",
    star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
    hexagon: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
    diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    blob: "polygon(30% 5%, 70% 8%, 92% 25%, 98% 55%, 85% 85%, 55% 98%, 25% 92%, 5% 70%, 2% 40%, 15% 15%)",
    arch: "polygon(0% 100%, 0% 40%, 8% 20%, 30% 5%, 70% 5%, 92% 20%, 100% 40%, 100% 100%)",
    triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
    ticket:
      "polygon(0 0, 100% 0, 100% 36%, 92% 50%, 100% 64%, 100% 100%, 0 100%, 0 64%, 8% 50%, 0 36%)",
    wave: "polygon(0 12%, 18% 5%, 36% 13%, 54% 5%, 74% 13%, 100% 6%, 100% 88%, 82% 95%, 64% 87%, 46% 95%, 26% 87%, 0 94%)",
    shield: "polygon(50% 0%, 94% 16%, 86% 72%, 50% 100%, 14% 72%, 6% 16%)",
  };

  if (!shape || shape === "none") {
    // Rounded rectangle with fallback radius
    const r = Math.max(0, Math.min(fallbackRadius, w / 2, h / 2));
    ctx.roundRect(x, y, w, h, r);
  } else if (shape === "circle") {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (shape === "rounded") {
    ctx.roundRect(x, y, w, h, 24);
  } else if (shape === "squircle") {
    ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.3);
  } else if (shape === "oval") {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h * 0.38, 0, 0, Math.PI * 2);
  } else if (POLY_CLIPS[shape]) {
    // Parse polygon() points
    const raw = POLY_CLIPS[shape]!.replace("polygon(", "").replace(")", "");
    const points = raw.split(",").map((p) => {
      const [px, py] = p.trim().split(/\s+/);
      return { px: pct(px, w) + x, py: pct(py, h) + y };
    });
    ctx.moveTo(points[0].px, points[0].py);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].px, points[i].py);
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
};

/**
 * Draw an image with object-fit: cover semantics.
 * Respects imageX (horizontal pan offset, px), imageY (vertical pan offset, px),
 * and imageScale (extra zoom factor applied from center).
 *
 * The math mirrors what the CSS does:
 *   - object-fit: cover  → scale image so smallest dimension fills the container
 *   - transform: scale(imageScale) → zoom the already-covered image
 *   - object-position: calc(50% + imageX px) → pan horizontally
 *   - object-position: ... calc(50% + imageY px) → pan vertically
 */
const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  imageX = 0,
  imageY = 0,
  imageScale = 1,
) => {
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  if (natW === 0 || natH === 0) return;

  // 1. Cover scale: scale so image fully covers the destination
  const coverScale = Math.max(destW / natW, destH / natH);
  // 2. Apply extra zoom from imageScale
  const totalScale = coverScale * imageScale;
  const scaledW = natW * totalScale;
  const scaledH = natH * totalScale;

  // 3. Center the scaled image in the destination box, then apply offset
  //    imageX / imageY are destination-space pixel offsets from center
  const drawX = destX + (destW - scaledW) / 2 + imageX;
  const drawY = destY + (destH - scaledH) / 2 + imageY;

  ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
};

const drawImageContain = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  imageX = 0,
  imageY = 0,
  imageScale = 1,
) => {
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  if (natW === 0 || natH === 0) return;
  const scale = Math.min(destW / natW, destH / natH) * imageScale;
  const w = natW * scale;
  const h = natH * scale;
  const x = destX + (destW - w) / 2 + imageX;
  const y = destY + (destH - h) / 2 + imageY;
  ctx.drawImage(img, x, y, w, h);
};

const drawImageCoverWithMasks = async (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  photo: PhotoElement,
  scale: number,
) => {
  const masks = [photo.magicMask, photo.eraseMask].filter((src): src is string => Boolean(src));
  if (masks.length === 0) {
    const drawPhoto = photo.freePhoto ? drawImageContain : drawImageCover;
    drawPhoto(
      ctx,
      img,
      photo.x,
      photo.y,
      photo.w,
      photo.h,
      photo.imageX ?? 0,
      photo.imageY ?? 0,
      photo.imageScale ?? 1,
    );
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(photo.w * scale));
  canvas.height = Math.max(1, Math.round(photo.h * scale));
  const maskedCtx = canvas.getContext("2d");
  if (!maskedCtx) return;

  const drawPhoto = photo.freePhoto ? drawImageContain : drawImageCover;
  drawPhoto(
    maskedCtx,
    img,
    0,
    0,
    canvas.width,
    canvas.height,
    (photo.imageX ?? 0) * scale,
    (photo.imageY ?? 0) * scale,
    photo.imageScale ?? 1,
  );

  for (const maskSrc of masks) {
    try {
      const maskImg = await loadImg(maskSrc);
      maskedCtx.globalCompositeOperation = "destination-in";
      maskedCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
      maskedCtx.globalCompositeOperation = "source-over";
    } catch {
      // If a mask fails to load, keep the already composited photo rather than dropping it.
    }
  }

  ctx.drawImage(canvas, photo.x, photo.y, photo.w, photo.h);
};

/**
 * Draw frame decoration around a photo element.
 * Only solid-color frames are approximated in canvas; complex CSS frames (polaroid, tape…)
 * are drawn as a clean white/color border so the PDF looks intentional.
 */
const drawFrame = (
  ctx: CanvasRenderingContext2D,
  frame: FrameStyle,
  x: number,
  y: number,
  w: number,
  h: number,
  frameColor?: string,
) => {
  if (!frame || frame === "none") return;

  ctx.save();

  const FRAME_STYLES: Partial<
    Record<FrameStyle, { color: string; width: number; padding?: number }>
  > = {
    white: { color: frameColor || "#ffffff", width: 10 },
    black: { color: frameColor || "#1a1a1a", width: 10 },
    gold: { color: frameColor || "#c9a84c", width: 10 },
    vintage: { color: frameColor || "#d4b896", width: 8 },
    gallery: { color: frameColor || "#e8e0d0", width: 12 },
    double: { color: frameColor || "#333333", width: 6 },
    linen: { color: frameColor || "#f3ede0", width: 10 },
    marble: { color: frameColor || "#e8e4e0", width: 10 },
    wood: { color: frameColor || "#8b5e3c", width: 10 },
    neon: { color: frameColor || "#00ffcc", width: 6 },
    negative: { color: frameColor || "#1a1a1a", width: 12 },
    stamp: { color: frameColor || "#e8dcc0", width: 14 },
    shadow: { color: "rgba(0,0,0,0.0)", width: 0 },
    minimal: { color: frameColor || "#e2e8f0", width: 4 },
    comic: { color: frameColor || "#000000", width: 8 },
    dashed: { color: frameColor || "#999999", width: 6 },
    elegant: { color: frameColor || "#d4af37", width: 10 },
    "shadow-offset": { color: frameColor || "rgba(0,0,0,0.15)", width: 0 },
    deco: { color: frameColor || "#d4af37", width: 8 },
    torn: { color: frameColor || "#ffffff", width: 12 },
  };

  const style = FRAME_STYLES[frame];

  if (frame === "polaroid") {
    // White border: sides + top thinner, bottom thicker
    const borderH = Math.max(8, w * 0.055);
    const borderV = Math.max(8, w * 0.055);
    const bottomExtra = Math.max(16, w * 0.12);
    ctx.fillStyle = frameColor || "#ffffff";
    // Top
    ctx.fillRect(x - borderH, y - borderV, w + borderH * 2, borderV);
    // Bottom (thicker)
    ctx.fillRect(x - borderH, y + h, w + borderH * 2, bottomExtra);
    // Left
    ctx.fillRect(x - borderH, y, borderH, h);
    // Right
    ctx.fillRect(x + w, y, borderH, h);
  } else if (frame === "tape") {
    // Draw translucent tape strips at corners
    ctx.fillStyle = frameColor || "rgba(255, 245, 200, 0.65)";
    const tw = w * 0.18;
    const th = h * 0.07;
    // Top-left
    ctx.save();
    ctx.translate(x + tw / 2, y - th / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.fillRect(-tw / 2, -th / 2, tw, th);
    ctx.restore();
    // Top-right
    ctx.save();
    ctx.translate(x + w - tw / 2, y - th / 2);
    ctx.rotate(Math.PI / 6);
    ctx.fillRect(-tw / 2, -th / 2, tw, th);
    ctx.restore();
    // Bottom-left
    ctx.save();
    ctx.translate(x + tw / 2, y + h + th / 2);
    ctx.rotate(Math.PI / 6);
    ctx.fillRect(-tw / 2, -th / 2, tw, th);
    ctx.restore();
    // Bottom-right
    ctx.save();
    ctx.translate(x + w - tw / 2, y + h + th / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.fillRect(-tw / 2, -th / 2, tw, th);
    ctx.restore();
  } else if (frame === "postcard") {
    ctx.strokeStyle = frameColor || "#c8a060";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    ctx.setLineDash([]);
    ctx.strokeStyle = frameColor || "#c8a060";
    ctx.lineWidth = 8;
    ctx.strokeRect(x, y, w, h);
  } else if (frame === "filmstrip") {
    const sprocketW = Math.max(8, w * 0.04);
    const sprocketH = Math.max(5, h * 0.03);
    const sprocketGap = sprocketH * 2.2;
    ctx.fillStyle = "#111111";
    // Left strip
    ctx.fillRect(x - sprocketW * 2, y, sprocketW * 2, h);
    // Right strip
    ctx.fillRect(x + w, y, sprocketW * 2, h);
    // Sprocket holes
    ctx.fillStyle = frameColor || "#faf6ec";
    let sy = y + sprocketGap / 2;
    while (sy + sprocketH < y + h) {
      ctx.fillRect(x - sprocketW * 1.5, sy, sprocketW, sprocketH);
      ctx.fillRect(x + w + sprocketW * 0.5, sy, sprocketW, sprocketH);
      sy += sprocketGap;
    }
  } else if (frame === "ribbon") {
    // Decorative ribbon / corner triangles
    const cs = Math.max(16, w * 0.07);
    ctx.fillStyle = frameColor || "#c9a84c";
    // Four corner triangles
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + cs, y);
    ctx.lineTo(x, y + cs);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w - cs, y);
    ctx.lineTo(x + w, y + cs);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + cs, y + h);
    ctx.lineTo(x, y + h - cs);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w, y + h);
    ctx.lineTo(x + w - cs, y + h);
    ctx.lineTo(x + w, y + h - cs);
    ctx.closePath();
    ctx.fill();
  } else if (frame === "lace") {
    // Dashed ornate border
    ctx.strokeStyle = frameColor || "#c8b89a";
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 3, 10, 3]);
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.setLineDash([]);
    ctx.strokeStyle = frameColor || "#c8b89a";
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, w, h);
  } else if (frame === "comic") {
    const pad = 8;
    // Draw shadow
    ctx.fillStyle = frameColor || "#000000";
    ctx.fillRect(x - pad + 6, y - pad + 6, w + pad * 2, h + pad * 2);

    // Draw backing card
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);

    // Draw border
    ctx.strokeStyle = frameColor || "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - pad + 1.5, y - pad + 1.5, w + pad * 2 - 3, h + pad * 2 - 3);
  } else if (frame === "corners") {
    const cSize = 14;
    ctx.strokeStyle = frameColor || "#222222";
    ctx.lineWidth = 3;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x - 4 + cSize, y - 4);
    ctx.lineTo(x - 4, y - 4);
    ctx.lineTo(x - 4, y - 4 + cSize);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w + 4 - cSize, y - 4);
    ctx.lineTo(x + w + 4, y - 4);
    ctx.lineTo(x + w + 4, y - 4 + cSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x - 4 + cSize, y + h + 4);
    ctx.lineTo(x - 4, y + h + 4);
    ctx.lineTo(x - 4, y + h + 4 - cSize);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w + 4 - cSize, y + h + 4);
    ctx.lineTo(x + w + 4, y + h + 4);
    ctx.lineTo(x + w + 4, y + h + 4 - cSize);
    ctx.stroke();
  } else if (frame === "dashed") {
    ctx.strokeStyle = frameColor || "#999999";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
    ctx.setLineDash([]);
  } else if (frame === "elegant") {
    const pad = 10;
    // White backing
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);

    // Outer border
    ctx.strokeStyle = frameColor || "#d4af37";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);

    // Inner border
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  } else if (frame === "shadow-offset") {
    // Draw offset shadow
    ctx.fillStyle = frameColor || "rgba(0,0,0,0.15)";
    ctx.fillRect(x + 8, y + 8, w, h);
    // Draw light outline
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  } else if (frame === "deco") {
    const pad = 8;
    // Black backing
    ctx.fillStyle = "#111111";
    ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);

    // Double border
    ctx.strokeStyle = frameColor || "#d4af37";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - pad + 1.5, y - pad + 1.5, w + pad * 2 - 3, h + pad * 2 - 3);
    ctx.lineWidth = 1;
    ctx.strokeRect(x - pad + 4, y - pad + 4, w + pad * 2 - 8, h + pad * 2 - 8);
  } else if (frame === "torn") {
    const pad = 12;
    ctx.fillStyle = frameColor || "#ffffff";

    ctx.beginPath();
    // top edge
    ctx.moveTo(x - pad, y - pad);
    for (let offset = 10; offset < w + pad * 2; offset += 15) {
      ctx.lineTo(x - pad + offset, y - pad + (offset % 2 === 0 ? 1 : -1));
    }
    ctx.lineTo(x + w + pad, y - pad);
    // right edge
    for (let offset = 10; offset < h + pad * 2; offset += 15) {
      ctx.lineTo(x + w + pad + (offset % 2 === 0 ? -1 : 1), y - pad + offset);
    }
    ctx.lineTo(x + w + pad, y + h + pad);
    // bottom edge
    for (let offset = w + pad * 2 - 10; offset > 0; offset -= 15) {
      ctx.lineTo(x - pad + offset, y + h + pad + (offset % 2 === 0 ? 1 : -1));
    }
    ctx.lineTo(x - pad, y + h + pad);
    // left edge
    for (let offset = h + pad * 2 - 10; offset > 0; offset -= 15) {
      ctx.lineTo(x - pad + (offset % 2 === 0 ? -1 : 1), y - pad + offset);
    }
    ctx.closePath();

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.restore();
  } else if (style) {
    // Simple border
    if (style.width > 0) {
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.strokeRect(x + style.width / 2, y + style.width / 2, w - style.width, h - style.width);
    }
    // Shadow for "shadow" / floating frame
    if (frame === "shadow") {
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = "transparent";
    }
  }

  ctx.restore();
};

// ─── Text helper ────────────────────────────────────────────────────────────

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] => {
  const paragraphs = text.split("\n");
  const result: string[] = [];
  for (const para of paragraphs) {
    if (para.length === 0) {
      result.push("");
      continue;
    }
    const words = para.match(/\S+\s*/g) ?? [" "];
    let line = "";
    for (const word of words) {
      const test = `${line}${word}`;
      if (ctx.measureText(test).width > maxW && line) {
        result.push(line.replace(/\s+$/g, ""));
        line = word;
      } else {
        line = test;
      }
    }
    result.push(line.replace(/\s+$/g, ""));
  }
  return result;
};

// ─── Main export function ────────────────────────────────────────────────────

export async function exportBookPdf(title: string) {
  const state = useBookStore.getState();
  const pages = state.book.pages;
  if (pages.length === 0) throw new Error("No pages to export");

  const preset = PAGE_SIZES[0];
  const { width: W, height: H } = preset;
  const orientation = W >= H ? "landscape" : "portrait";

  // 2× pixel density — quality without crashing
  const SCALE = 2;

  // ── Pre-load all images once ──────────────────────────────────────────────
  const libMap = new Map<string, HTMLImageElement>();
  for (const img of state.library) {
    try {
      libMap.set(img.id, await loadImg(img.src));
    } catch {
      /* skip broken images */
    }
  }

  const stkMap = new Map<string, HTMLImageElement>();
  for (const stk of state.customStickersList ?? []) {
    try {
      stkMap.set(stk.id, await loadImg(stk.src));
    } catch {
      /* skip */
    }
  }

  const bgMap = new Map<string, HTMLImageElement>();
  for (const bg of state.customBackgroundsList ?? []) {
    try {
      bgMap.set(bg.id, await loadImg(bg.src));
    } catch {
      /* skip */
    }
  }

  const pdf = new jsPDF({ orientation, unit: "px", format: [W, H] });

  // ── Render each page ─────────────────────────────────────────────────────
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(SCALE, SCALE);

    // ── Background ─────────────────────────────────────────────────────────
    const bg = page.background ?? "cream";

    const drawBg = (img: HTMLImageElement) => {
      if (page.backgroundMode === "contain") {
        drawImageContain(ctx, img, 0, 0, W, H);
      } else if (page.backgroundMode === "stretch") {
        ctx.drawImage(img, 0, 0, W, H);
      } else {
        drawImageCover(
          ctx,
          img,
          0,
          0,
          W,
          H,
          page.backgroundX ?? 0,
          page.backgroundY ?? 0,
          page.backgroundScale ?? 1,
        );
      }
    };

    if (bg.startsWith("bg_")) {
      // Custom uploaded background
      const bgImg = bgMap.get(bg);
      if (bgImg) {
        drawBg(bgImg);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
      }
    } else if (isImgSrc(bg)) {
      // Inline data: or http: background
      try {
        let bgImg = bgMap.get(bg);
        if (!bgImg) bgImg = await loadImg(bg);
        drawBg(bgImg);
      } catch {
        ctx.fillStyle = "#f5f5f0";
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      // Named theme or hex colour
      ctx.fillStyle = THEME_COLORS[bg] ?? bg ?? "#ffffff";
      ctx.fillRect(0, 0, W, H);
    }

    // ── Elements (sorted by z-index) ───────────────────────────────────────
    const sorted = [...page.elements].sort((a, b) => a.z - b.z);

    for (const el of sorted) {
      ctx.save();

      // Apply element rotation around its center
      if (el.rotation) {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      // ── Photo element ────────────────────────────────────────────────────
      if (el.type === "photo") {
        const photo = el as PhotoElement;
        const libImg = libMap.get(photo.imageId);

        if (libImg) {
          ctx.globalAlpha = photo.opacity ?? 1;

          // Determine clip radius
          const clipRadius =
            photo.freePhoto
              ? 0
              : photo.frame !== "none"
              ? 4
              : photo.shape && photo.shape !== "none"
                ? 0
                : (photo.radius ?? 16);

          // Clip the photo to its shape
          ctx.save();
          applyShapeClip(ctx, photo.shape, photo.x, photo.y, photo.w, photo.h, clipRadius);

          await drawImageCoverWithMasks(ctx, libImg, photo, SCALE);
          ctx.restore();

          // Draw frame decoration (outside the clip)
          if (!photo.freePhoto) {
            drawFrame(ctx, photo.frame, photo.x, photo.y, photo.w, photo.h, photo.frameColor);
          }

          ctx.globalAlpha = 1;

          // Caption
          if (photo.caption) {
            ctx.font = `italic 14px "Playfair Display", serif`;
            ctx.fillStyle = "rgba(50,40,30,0.8)";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(photo.caption, photo.x + photo.w / 2, photo.y + photo.h + 4);
          }
        } else if (!photo.magicFrame) {
          // Empty frame placeholder
          ctx.fillStyle = "#e5e7eb";
          ctx.fillRect(el.x, el.y, el.w, el.h);
          ctx.fillStyle = "#9ca3af";
          ctx.font = `13px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Drop a photo here", el.x + el.w / 2, el.y + el.h / 2);
        }
      }

      // ── Sticker element ──────────────────────────────────────────────────
      else if (el.type === "sticker") {
        const stk = el as StickerElement;
        let stickerDrawn = false;

        if (stk.src) {
          try {
            let si = stkMap.get(stk.src);
            if (!si) {
              si = await loadImg(stk.src);
              stkMap.set(stk.src, si);
            }
            ctx.drawImage(si, el.x, el.y, el.w, el.h);
            stickerDrawn = true;
          } catch {
            /* skip */
          }
        }

        if (!stickerDrawn && stk.stickerId) {
          const stkImg = stkMap.get(stk.stickerId);
          if (stkImg) {
            ctx.drawImage(stkImg, el.x, el.y, el.w, el.h);
            stickerDrawn = true;
          }
        }

        if (!stickerDrawn && stk.emoji) {
          ctx.font = `${el.h * 0.7}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(stk.emoji, el.x + el.w / 2, el.y + el.h / 2);
        }
      }

      // ── Quote or Text element ─────────────────────────────────────────────
      else if (el.type === "drawing") {
        const drawing = el as DrawingElement;
        try {
          ctx.globalAlpha = drawing.opacity ?? 1;
          ctx.strokeStyle = drawing.stroke;
          ctx.lineWidth = drawing.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          if (drawing.brush === "neon") {
            ctx.shadowColor = drawing.stroke;
            ctx.shadowBlur = Math.max(6, drawing.strokeWidth);
          }
          ctx.stroke(new Path2D(drawing.path));
        } catch {
          /* skip invalid drawing path */
        }
      }

      else if (el.type === "quote" || el.type === "text") {
        const txt = el as QuoteElement | TextElement;
        const isQ = el.type === "quote";

        const rawFamily = txt.fontFamily ?? (isQ ? '"Playfair Display", serif' : "sans-serif");
        const fontFamily = rawFamily.replace("var(--font-sans)", "sans-serif");
        const fontStyle = txt.fontStyle ?? (isQ ? "italic" : "normal");
        const fontWeight = txt.fontWeight ?? "400";

        ctx.font = `${fontStyle} ${fontWeight} ${txt.fontSize}px ${fontFamily}`;
        ctx.fillStyle = txt.color ?? "#333333";
        ctx.textAlign = (txt.align as CanvasTextAlign) ?? "center";
        ctx.textBaseline = "middle";

        const displayText = txt.text;
        const lines = wrapText(ctx, displayText, el.w - 32);
        const lineH = txt.fontSize * 1.4;
        const totalH = lines.length * lineH;
        let ty = el.y + el.h / 2 - totalH / 2 + lineH / 2;

        const tx =
          txt.align === "left"
            ? el.x + 16
            : txt.align === "right"
              ? el.x + el.w - 16
              : el.x + el.w / 2;

        for (const line of lines) {
          ctx.fillText(line, tx, ty);
          ty += lineH;
        }
      }

      ctx.restore();
    } // end elements loop

    // ── Eraser overlay ─────────────────────────────────────────────────────
    if (page.eraserOverlay) {
      try {
        const ov = await loadImg(page.eraserOverlay);
        ctx.drawImage(ov, 0, 0, W, H);
      } catch {
        /* skip */
      }
    }

    // ── Add to PDF ─────────────────────────────────────────────────────────
    const imgData = canvas.toDataURL("image/jpeg", 0.93);
    if (pi > 0) pdf.addPage([W, H], orientation);
    pdf.addImage(imgData, "JPEG", 0, 0, W, H, undefined, "FAST");

    // Free GPU memory immediately before next page
    canvas.width = 1;
    canvas.height = 1;
  }

  pdf.save(`${title.replace(/[^\w\s-]/g, "").trim() || "photobook"}.pdf`);
}
