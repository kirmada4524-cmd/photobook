import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  AdminAssetLibrary,
  GlobalBackgroundAsset,
  GlobalStickerAsset,
  GlobalStickerFolder,
} from "@/lib/photobook/types";

const ADMIN_ASSETS_BLOB_PATH = "admin-assets/library.json";

const emptyLibrary = (): AdminAssetLibrary => ({
  stickerFolders: [],
  backgrounds: [],
});

const nid = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeLibrary = (raw: unknown): AdminAssetLibrary => {
  const data = raw as Partial<AdminAssetLibrary> | null;
  return {
    stickerFolders: Array.isArray(data?.stickerFolders)
      ? data.stickerFolders.map((folder) => ({
          ...folder,
          stickers: Array.isArray(folder.stickers) ? folder.stickers : [],
        }))
      : [],
    backgrounds: Array.isArray(data?.backgrounds) ? data.backgrounds : [],
  };
};

const hasBlobStorage = () =>
  Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );

const isVercelRuntime = () => Boolean(process.env.VERCEL);

const missingBlobStorageError = () =>
  new Error(
    "Missing Vercel Blob write credentials. Add BLOB_READ_WRITE_TOKEN to the Vercel project environment variables.",
  );

const blobAuthOptions = () =>
  process.env.BLOB_READ_WRITE_TOKEN
    ? { token: process.env.BLOB_READ_WRITE_TOKEN }
    : {};

async function readBlobText(pathname: string) {
  const { get } = await import("@vercel/blob");
  const result = await get(pathname, { access: "public", ...blobAuthOptions() });
  if (!result?.stream || result.statusCode !== 200) return null;
  return new Response(result.stream).text();
}

async function writeBlobJson(pathname: string, value: unknown) {
  const { put } = await import("@vercel/blob");
  await put(pathname, JSON.stringify(value, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
    ...blobAuthOptions(),
  });
}

async function localAssetPaths() {
  const fs = await import("fs");
  const path = await import("path");
  const adminAssetsDir = path.resolve(process.cwd(), "public", "admin-assets");

  return {
    fs,
    path,
    adminAssetsFile: path.resolve(process.cwd(), "admin-assets.json"),
    adminAssetsDir,
    stickersDir: path.join(adminAssetsDir, "stickers"),
    backgroundsDir: path.join(adminAssetsDir, "backgrounds"),
  };
}

async function readLibrary(): Promise<AdminAssetLibrary> {
  if (hasBlobStorage()) {
    try {
      const content = await readBlobText(ADMIN_ASSETS_BLOB_PATH);
      return content ? normalizeLibrary(JSON.parse(content)) : emptyLibrary();
    } catch (error) {
      console.error("Error reading admin assets from Blob:", error);
      return emptyLibrary();
    }
  }

  try {
    const { fs, adminAssetsFile } = await localAssetPaths();
    if (!fs.existsSync(adminAssetsFile)) return emptyLibrary();
    const content = await fs.promises.readFile(adminAssetsFile, "utf-8");
    return normalizeLibrary(JSON.parse(content));
  } catch (error) {
    console.error("Error reading admin-assets.json:", error);
    return emptyLibrary();
  }
}

async function writeLibrary(library: AdminAssetLibrary) {
  if (hasBlobStorage()) {
    await writeBlobJson(ADMIN_ASSETS_BLOB_PATH, library);
    return;
  }

  if (isVercelRuntime()) {
    throw missingBlobStorageError();
  }

  const { fs, adminAssetsFile } = await localAssetPaths();
  await fs.promises.writeFile(adminAssetsFile, JSON.stringify(library, null, 2));
}

const extFromMime = (mime: string) => {
  if (mime === "image/png") return ".png";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/svg+xml") return ".svg";
  return ".jpg";
};

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Only base64 image data URLs are supported.");
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
};

async function saveImageDataUrl(
  kind: "stickers" | "backgrounds",
  id: string,
  dataUrl: string,
) {
  const { mime, buffer } = parseDataUrl(dataUrl);
  const filename = `${id}${extFromMime(mime)}`;

  if (hasBlobStorage()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`admin-assets/${kind}/${filename}`, buffer, {
      access: "public",
      allowOverwrite: true,
      contentType: mime,
      cacheControlMaxAge: 31536000,
      ...blobAuthOptions(),
    });
    return blob.url;
  }

  if (isVercelRuntime()) {
    throw missingBlobStorageError();
  }

  const { fs, path, stickersDir, backgroundsDir } = await localAssetPaths();
  const dir = kind === "stickers" ? stickersDir : backgroundsDir;
  await fs.promises.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.promises.writeFile(filePath, buffer);
  return `/admin-assets/${kind}/${filename}`;
}

async function deletePublicAsset(src: string) {
  if (hasBlobStorage()) {
    const isBlobUrl = /^https?:\/\/.+\.blob\.vercel-storage\.com\//.test(src);
    const isBlobPath = src.startsWith("admin-assets/");
    if (isBlobUrl || isBlobPath) {
      const { del } = await import("@vercel/blob");
      await del(src, blobAuthOptions()).catch(() => undefined);
      return;
    }
  }

  if (!src.startsWith("/admin-assets/")) return;
  const { fs, path, adminAssetsDir } = await localAssetPaths();
  const publicRoot = adminAssetsDir;
  const relative = src.replace(/^\/+/, "").split(/[?#]/)[0];
  const filePath = path.resolve(process.cwd(), "public", relative);
  if (!filePath.startsWith(publicRoot)) return;
  await fs.promises.unlink(filePath).catch(() => undefined);
}

const fileInputSchema = z.object({
  name: z.string().min(1),
  dataUrl: z.string().min(1),
});

export const getAdminAssets = createServerFn({ method: "GET" }).handler(async () => {
  return readLibrary();
});

export const createAdminStickerFolder = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1) }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const folder: GlobalStickerFolder = {
      id: nid("sticker_folder"),
      name: data.name.trim(),
      stickers: [],
      createdAt: Date.now(),
      sortOrder: Date.now(),
    };
    const next = {
      ...library,
      stickerFolders: [...library.stickerFolders, folder],
    };
    await writeLibrary(next);
    return next;
  });

export const updateAdminStickerFolder = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string(), name: z.string().min(1) }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const next = {
      ...library,
      stickerFolders: library.stickerFolders.map((folder) =>
        folder.id === data.folderId ? { ...folder, name: data.name.trim() } : folder,
      ),
    };
    await writeLibrary(next);
    return next;
  });

export const deleteAdminStickerFolder = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string() }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const folder = library.stickerFolders.find((item) => item.id === data.folderId);
    if (folder) {
      await Promise.all(folder.stickers.map((sticker) => deletePublicAsset(sticker.src)));
    }
    const next = {
      ...library,
      stickerFolders: library.stickerFolders.filter((item) => item.id !== data.folderId),
    };
    await writeLibrary(next);
    return next;
  });

export const addAdminStickers = createServerFn({ method: "POST" })
  .validator(
    z.object({
      folderId: z.string(),
      files: z.array(fileInputSchema).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const nextFolders = await Promise.all(
      library.stickerFolders.map(async (folder) => {
        if (folder.id !== data.folderId) return folder;
        const stickers: GlobalStickerAsset[] = [];
        for (const file of data.files) {
          const id = nid("global_sticker");
          const src = await saveImageDataUrl("stickers", id, file.dataUrl);
          stickers.push({
            id,
            name: file.name,
            src,
            folderId: folder.id,
            createdAt: Date.now(),
          });
        }
        return { ...folder, stickers: [...folder.stickers, ...stickers] };
      }),
    );
    const next = { ...library, stickerFolders: nextFolders };
    await writeLibrary(next);
    return next;
  });

export const deleteAdminSticker = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string(), stickerId: z.string() }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const nextFolders = await Promise.all(
      library.stickerFolders.map(async (folder) => {
        if (folder.id !== data.folderId) return folder;
        const sticker = folder.stickers.find((item) => item.id === data.stickerId);
        if (sticker) await deletePublicAsset(sticker.src);
        return {
          ...folder,
          stickers: folder.stickers.filter((item) => item.id !== data.stickerId),
        };
      }),
    );
    const next = { ...library, stickerFolders: nextFolders };
    await writeLibrary(next);
    return next;
  });

export const addAdminBackgrounds = createServerFn({ method: "POST" })
  .validator(z.object({ files: z.array(fileInputSchema).min(1) }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const backgrounds: GlobalBackgroundAsset[] = [];
    for (const file of data.files) {
      const id = nid("global_bg");
      const src = await saveImageDataUrl("backgrounds", id, file.dataUrl);
      backgrounds.push({
        id,
        name: file.name,
        src,
        createdAt: Date.now(),
      });
    }
    const next = { ...library, backgrounds: [...library.backgrounds, ...backgrounds] };
    await writeLibrary(next);
    return next;
  });

export const deleteAdminBackground = createServerFn({ method: "POST" })
  .validator(z.object({ backgroundId: z.string() }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const background = library.backgrounds.find((item) => item.id === data.backgroundId);
    if (background) await deletePublicAsset(background.src);
    const next = {
      ...library,
      backgrounds: library.backgrounds.filter((item) => item.id !== data.backgroundId),
    };
    await writeLibrary(next);
    return next;
  });
