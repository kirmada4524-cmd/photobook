import type { Book, LibraryImage, PhotoElement, StickerElement } from "./types";
import { createSharedPreview, uploadSharedPreviewAsset } from "@/lib/api/shared-previews.functions";

type ShareAssetKind = "photo" | "background" | "sticker" | "mask";

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

async function optimizedDataUrl(src: string, preservePixels: boolean) {
  const blob = await fetch(src).then((response) => {
    if (!response.ok) throw new Error(`Could not read ${src}`);
    return response.blob();
  });
  if (preservePixels || blob.type === "image/svg+xml" || blob.type === "image/gif") {
    return blobToDataUrl(blob);
  }

  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDimension = 1800;
      const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare the shared image."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.88));
      canvas.width = 1;
      canvas.height = 1;
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode an image used by this book."));
    };
    image.src = objectUrl;
  });
}

const isPortableSource = (src: string) =>
  src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/");

export async function createShareablePreview({
  book,
  library,
  customBackgrounds,
  customStickers,
}: {
  book: Book;
  library: LibraryImage[];
  customBackgrounds: Array<{ id: string; src: string; name: string }>;
  customStickers: Array<{ id: string; src: string; name: string }>;
}) {
  const shareId = crypto.randomUUID().replaceAll("-", "").slice(0, 22);
  const nextBook = structuredClone(book);
  const usedImageIds = new Set(
    nextBook.pages.flatMap((page) =>
      page.elements
        .filter(
          (element): element is PhotoElement =>
            element.type === "photo" && Boolean(element.imageId),
        )
        .map((element) => element.imageId),
    ),
  );
  const sourceCache = new Map<string, string>();

  const uploadSource = async (
    source: string,
    name: string,
    kind: ShareAssetKind,
    preservePixels = false,
  ) => {
    if (!source || isPortableSource(source)) return source;
    const cached = sourceCache.get(source);
    if (cached) return cached;
    const dataUrl = await optimizedDataUrl(source, preservePixels);
    const result = await uploadSharedPreviewAsset({
      data: { shareId, name, kind, dataUrl },
    });
    if (!result.success || !result.url) {
      throw new Error(result.error || `Could not upload ${name}.`);
    }
    sourceCache.set(source, result.url);
    return result.url;
  };

  const nextLibrary: LibraryImage[] = [];
  for (const image of library.filter((item) => usedImageIds.has(item.id))) {
    nextLibrary.push({
      ...image,
      src: await uploadSource(image.src, image.name || "Shared photo", "photo"),
    });
  }

  for (const page of nextBook.pages) {
    if (page.background.startsWith("bg_")) {
      const background = customBackgrounds.find((item) => item.id === page.background);
      if (background) page.background = background.src;
    }
    if (
      page.background &&
      !isPortableSource(page.background) &&
      /^(data:|blob:)/.test(page.background)
    ) {
      page.background = await uploadSource(page.background, "Page background", "background");
    }
    if (page.eraserOverlay && !isPortableSource(page.eraserOverlay)) {
      page.eraserOverlay = await uploadSource(page.eraserOverlay, "Page overlay", "mask", true);
    }

    for (const element of page.elements) {
      if (element.type === "sticker") {
        const sticker = element as StickerElement;
        if (!sticker.src && sticker.stickerId) {
          sticker.src = customStickers.find((item) => item.id === sticker.stickerId)?.src;
        }
        if (sticker.src && !isPortableSource(sticker.src)) {
          sticker.src = await uploadSource(sticker.src, "Book sticker", "sticker", true);
        }
      }
      if (element.type === "photo") {
        if (element.magicMask && !isPortableSource(element.magicMask)) {
          element.magicMask = await uploadSource(element.magicMask, "Photo mask", "mask", true);
        }
        if (element.backgroundRemovalMask && !isPortableSource(element.backgroundRemovalMask)) {
          element.backgroundRemovalMask = await uploadSource(
            element.backgroundRemovalMask,
            "Background removal mask",
            "mask",
            true,
          );
        }
        if (element.eraseMask && !isPortableSource(element.eraseMask)) {
          element.eraseMask = await uploadSource(
            element.eraseMask,
            "Photo erase mask",
            "mask",
            true,
          );
        }
      }
    }
  }

  const result = await createSharedPreview({
    data: { id: shareId, book: nextBook, library: nextLibrary },
  });
  if (!result.success) throw new Error(result.error || "Could not create the preview link.");
  return {
    id: shareId,
    url: `${window.location.origin}/preview?share=${encodeURIComponent(shareId)}`,
    expiresAt: result.expiresAt,
  };
}
