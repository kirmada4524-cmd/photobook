export type MagicLayoutSelection = {
  x: number;
  y: number;
  w: number;
  h: number;
  maskSrc: string;
  overlaySrc: string;
  area: number;
  seedColor: [number, number, number, number];
};

type MagicLayoutInput = {
  resolvedBg: string;
  pageW: number;
  pageH: number;
  clickX: number;
  clickY: number;
  backgroundMode?: "cover" | "contain" | "stretch";
  backgroundScale?: number;
  backgroundX?: number;
  backgroundY?: number;
  tolerance: number;
  expand: number;
  feather: number;
};

const THEME_COLORS: Record<string, string> = {
  cream: "#faf6ec",
  linen: "#f3ede0",
  vintage: "#e8dcc0",
  dark: "#1f1a16",
  minimal: "#ffffff",
};

const isImageUrl = (src?: string) =>
  !!src &&
  (src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("/") ||
    src.startsWith("http:") ||
    src.startsWith("https:") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(src));

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this template image."));
    img.src = src;
  });

const drawBackground = async (ctx: CanvasRenderingContext2D, opts: MagicLayoutInput) => {
  const { resolvedBg, pageW, pageH } = opts;
  ctx.clearRect(0, 0, pageW, pageH);

  if (!isImageUrl(resolvedBg)) {
    ctx.fillStyle = THEME_COLORS[resolvedBg] || resolvedBg || "#ffffff";
    ctx.fillRect(0, 0, pageW, pageH);
    return;
  }

  const img = await loadImage(resolvedBg);
  const mode = opts.backgroundMode || "cover";

  if (mode === "stretch") {
    ctx.drawImage(img, 0, 0, pageW, pageH);
    return;
  }

  const baseScale =
    mode === "contain"
      ? Math.min(pageW / img.naturalWidth, pageH / img.naturalHeight)
      : Math.max(pageW / img.naturalWidth, pageH / img.naturalHeight);
  const scale = baseScale * (mode === "cover" ? (opts.backgroundScale ?? 1) : 1);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (pageW - w) / 2 + (mode === "cover" ? (opts.backgroundX ?? 0) : 0);
  const y = (pageH - h) / 2 + (mode === "cover" ? (opts.backgroundY ?? 0) : 0);
  ctx.drawImage(img, x, y, w, h);
};

const colorMatches = (
  data: Uint8ClampedArray,
  idx: number,
  seed: [number, number, number, number],
  tolerance: number,
) => {
  const i = idx * 4;
  const alphaTolerance = Math.max(30, tolerance * 2);
  return (
    Math.abs(data[i] - seed[0]) <= tolerance &&
    Math.abs(data[i + 1] - seed[1]) <= tolerance &&
    Math.abs(data[i + 2] - seed[2]) <= tolerance &&
    Math.abs(data[i + 3] - seed[3]) <= alphaTolerance
  );
};

const floodFill = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  tolerance: number,
) => {
  const total = width * height;
  const start = seedY * width + seedX;
  const seed: [number, number, number, number] = [
    data[start * 4],
    data[start * 4 + 1],
    data[start * 4 + 2],
    data[start * 4 + 3],
  ];
  const visited = new Uint8Array(total);
  const mask = new Uint8Array(total);
  const stack = [start];
  let minX = seedX;
  let maxX = seedX;
  let minY = seedY;
  let maxY = seedY;
  let area = 0;

  while (stack.length) {
    const idx = stack.pop()!;
    if (idx < 0 || idx >= total || visited[idx]) continue;
    visited[idx] = 1;
    if (!colorMatches(data, idx, seed, tolerance)) continue;

    mask[idx] = 1;
    area += 1;
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    if (x > 0) stack.push(idx - 1);
    if (x < width - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - width);
    if (y < height - 1) stack.push(idx + width);
  }

  return { mask, seed, area, minX, minY, maxX, maxY };
};

const applyMorph = (mask: Uint8Array, width: number, height: number, amount: number) => {
  let current = mask;
  const steps = Math.min(3, Math.abs(Math.round(amount)));
  const expand = amount > 0;

  for (let step = 0; step < steps; step += 1) {
    const next = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        let selectedCount = 0;
        let neighborCount = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            neighborCount += 1;
            if (current[ny * width + nx]) selectedCount += 1;
          }
        }
        next[idx] = expand
          ? selectedCount > 0
            ? 1
            : 0
          : current[idx] && selectedCount === neighborCount
            ? 1
            : 0;
      }
    }
    current = next;
  }

  return current;
};

const boundsForMask = (mask: Uint8Array, width: number, height: number) => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let area = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, area };
};

const buildMaskImages = (
  mask: Uint8Array,
  pageW: number,
  pageH: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  feather: number,
) => {
  const margin = Math.max(2, Math.ceil(feather) + 2);
  const x = Math.max(0, bounds.minX - margin);
  const y = Math.max(0, bounds.minY - margin);
  const maxX = Math.min(pageW - 1, bounds.maxX + margin);
  const maxY = Math.min(pageH - 1, bounds.maxY + margin);
  const w = Math.max(1, maxX - x + 1);
  const h = Math.max(1, maxY - y + 1);
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) throw new Error("Could not create a mask for this frame.");

  const imageData = maskCtx.createImageData(w, h);
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      const srcX = x + xx;
      const srcY = y + yy;
      if (!mask[srcY * pageW + srcX]) continue;
      const i = (yy * w + xx) * 4;
      imageData.data[i] = 255;
      imageData.data[i + 1] = 255;
      imageData.data[i + 2] = 255;
      imageData.data[i + 3] = 255;
    }
  }
  maskCtx.putImageData(imageData, 0, 0);

  if (feather > 0) {
    const hardMask = document.createElement("canvas");
    hardMask.width = w;
    hardMask.height = h;
    hardMask.getContext("2d")?.putImageData(imageData, 0, 0);

    const blurred = document.createElement("canvas");
    blurred.width = w;
    blurred.height = h;
    const blurredCtx = blurred.getContext("2d");
    if (blurredCtx) {
      blurredCtx.filter = `blur(${Math.min(2, feather)}px)`;
      blurredCtx.drawImage(hardMask, 0, 0);
      maskCtx.clearRect(0, 0, w, h);
      maskCtx.drawImage(blurred, 0, 0);
      maskCtx.globalCompositeOperation = "destination-in";
      maskCtx.drawImage(hardMask, 0, 0);
      maskCtx.globalCompositeOperation = "source-over";
    }
  }

  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = w;
  overlayCanvas.height = h;
  const overlayCtx = overlayCanvas.getContext("2d");
  if (!overlayCtx) throw new Error("Could not create a preview for this frame.");
  overlayCtx.drawImage(maskCanvas, 0, 0);
  overlayCtx.globalCompositeOperation = "source-in";
  overlayCtx.fillStyle = "rgba(14, 165, 233, 0.36)";
  overlayCtx.fillRect(0, 0, w, h);

  return {
    x,
    y,
    w,
    h,
    maskSrc: maskCanvas.toDataURL("image/png"),
    overlaySrc: overlayCanvas.toDataURL("image/png"),
  };
};

export async function createMagicLayoutSelection(
  opts: MagicLayoutInput,
): Promise<MagicLayoutSelection> {
  const pageW = Math.round(opts.pageW);
  const pageH = Math.round(opts.pageH);
  const clickX = Math.max(0, Math.min(pageW - 1, Math.round(opts.clickX)));
  const clickY = Math.max(0, Math.min(pageH - 1, Math.round(opts.clickY)));
  const canvas = document.createElement("canvas");
  canvas.width = pageW;
  canvas.height = pageH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not inspect this template.");

  await drawBackground(ctx, opts);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, pageW, pageH);
  } catch {
    throw new Error(
      "This background image cannot be inspected. Upload it as a local image/template and try again.",
    );
  }

  const tolerance = Math.max(5, Math.min(60, Math.round(opts.tolerance)));
  const initial = floodFill(imageData.data, pageW, pageH, clickX, clickY, tolerance);
  if (initial.area < 16) {
    throw new Error("That area is too small. Click inside the blank part of a frame.");
  }

  const morphed = applyMorph(initial.mask, pageW, pageH, opts.expand);
  const bounds = boundsForMask(morphed, pageW, pageH);
  if (bounds.area < 16 || bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) {
    throw new Error("The selected area disappeared. Lower shrink or increase tolerance.");
  }

  const images = buildMaskImages(morphed, pageW, pageH, bounds, opts.feather);
  return {
    ...images,
    area: bounds.area,
    seedColor: initial.seed,
  };
}
