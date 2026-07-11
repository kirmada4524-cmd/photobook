import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  AdminAssetLibrary,
  GlobalBackgroundAsset,
  GlobalStickerAsset,
  GlobalStickerFolder,
} from "@/lib/photobook/types";
import {
  deleteImageKitFile,
  hasImageKitStorage,
  missingImageKitStorageError,
  uploadImageKitFile,
} from "./imagekit.server";
import {
  encodeFilterValue,
  hasSupabaseStorage,
  missingSupabaseStorageError,
  supabaseTableRequest,
} from "./supabase.server";

const emptyLibrary = (): AdminAssetLibrary => ({
  stickerFolders: [],
  backgrounds: [],
});

const nid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

const isVercelRuntime = () => Boolean(process.env.VERCEL);
const hasCloudStorage = () => hasSupabaseStorage();

const missingCloudStorageError = () =>
  hasSupabaseStorage() ? missingImageKitStorageError() : missingSupabaseStorageError();

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

type StickerFolderRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at_ms: number;
};

type StickerRow = {
  id: string;
  folder_id: string;
  name: string;
  src: string;
  imagekit_file_id?: string | null;
  created_at_ms: number;
};

type BackgroundRow = {
  id: string;
  name: string;
  src: string;
  imagekit_file_id?: string | null;
  created_at_ms: number;
};

async function readCloudLibrary(): Promise<AdminAssetLibrary> {
  const [folderRows, stickerRows, backgroundRows] = await Promise.all([
    supabaseTableRequest<StickerFolderRow[]>("admin_sticker_folders", {
      query: "select=*&order=sort_order.asc,created_at_ms.asc",
    }),
    supabaseTableRequest<StickerRow[]>("admin_stickers", {
      query: "select=*&order=created_at_ms.asc",
    }),
    supabaseTableRequest<BackgroundRow[]>("admin_backgrounds", {
      query: "select=*&order=created_at_ms.asc",
    }),
  ]);

  const stickersByFolder = new Map<string, GlobalStickerAsset[]>();
  stickerRows.forEach((row) => {
    const sticker: GlobalStickerAsset = {
      id: row.id,
      folderId: row.folder_id,
      name: row.name,
      src: row.src,
      fileId: row.imagekit_file_id || undefined,
      createdAt: row.created_at_ms,
    };
    stickersByFolder.set(row.folder_id, [
      ...(stickersByFolder.get(row.folder_id) ?? []),
      sticker,
    ]);
  });

  return {
    stickerFolders: folderRows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      createdAt: row.created_at_ms,
      stickers: stickersByFolder.get(row.id) ?? [],
    })),
    backgrounds: backgroundRows.map((row) => ({
      id: row.id,
      name: row.name,
      src: row.src,
      fileId: row.imagekit_file_id || undefined,
      createdAt: row.created_at_ms,
    })),
  };
}

async function localAssetPaths() {
  const fs = await import("fs");
  const path = await import("path");
  return {
    fs,
    path,
    adminAssetsFile: path.resolve(process.cwd(), "admin-assets.json"),
  };
}

async function readLocalLibrary(): Promise<AdminAssetLibrary> {
  try {
    const { fs, adminAssetsFile } = await localAssetPaths();
    if (!fs.existsSync(adminAssetsFile)) return emptyLibrary();
    return normalizeLibrary(JSON.parse(await fs.promises.readFile(adminAssetsFile, "utf-8")));
  } catch (error) {
    console.error("Error reading local admin assets:", error);
    return emptyLibrary();
  }
}

async function writeLocalLibrary(library: AdminAssetLibrary) {
  if (isVercelRuntime()) throw missingCloudStorageError();
  const { fs, adminAssetsFile } = await localAssetPaths();
  await fs.promises.writeFile(adminAssetsFile, JSON.stringify(library, null, 2));
}

async function readLibrary() {
  return hasCloudStorage() ? readCloudLibrary() : readLocalLibrary();
}

async function writeLocalAdminAsset(
  kind: "stickers" | "backgrounds",
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");
  const cwd = process.cwd();
  const directories = [
    path.resolve(cwd, "public", "admin-assets", kind),
    path.resolve(cwd, ".output", "public", "admin-assets", kind),
    path.resolve(cwd, "dist", "public", "admin-assets", kind),
  ];

  let wroteFile = false;
  let lastError: unknown;
  for (const directory of [...new Set(directories)]) {
    try {
      await fs.promises.mkdir(directory, { recursive: true });
      await fs.promises.writeFile(path.join(directory, filename), buffer);
      wroteFile = true;
    } catch (error) {
      lastError = error;
    }
  }
  if (!wroteFile && lastError) throw lastError;
  return `/admin-assets/${kind}/${filename}`;
}

async function uploadCloudAsset(
  kind: "stickers" | "backgrounds",
  id: string,
  dataUrl: string,
) {
  if (!hasImageKitStorage()) throw missingImageKitStorageError();
  const { mime, buffer } = parseDataUrl(dataUrl);
  const filename = `${id}${extFromMime(mime)}`;
  return uploadImageKitFile({
    buffer,
    filename,
    folder: `/travelogue/admin-assets/${kind}`,
    mime,
  });
}

async function uploadLocalAsset(
  kind: "stickers" | "backgrounds",
  id: string,
  dataUrl: string,
) {
  const { mime, buffer } = parseDataUrl(dataUrl);
  return writeLocalAdminAsset(kind, `${id}${extFromMime(mime)}`, buffer);
}

async function deleteLocalAsset(src: string) {
  if (!src.startsWith("/admin-assets/")) return;
  const fs = await import("fs");
  const path = await import("path");
  const relative = src.replace(/^\/+/, "").split(/[?#]/)[0];
  const cwd = process.cwd();
  await Promise.all(
    [
      path.resolve(cwd, "public", relative),
      path.resolve(cwd, ".output", "public", relative),
      path.resolve(cwd, "dist", "public", relative),
    ].map((filePath) => fs.promises.unlink(filePath).catch(() => undefined)),
  );
}

const fileInputSchema = z.object({
  name: z.string().min(1),
  dataUrl: z.string().min(1),
});

export const getAdminAssets = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await readLibrary();
  } catch (error) {
    console.error("Error reading admin assets:", error);
    return emptyLibrary();
  }
});

export const createAdminStickerFolder = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1) }))
  .handler(async ({ data }) => {
    const folder: GlobalStickerFolder = {
      id: nid("sticker_folder"),
      name: data.name.trim(),
      stickers: [],
      createdAt: Date.now(),
      sortOrder: Date.now(),
    };

    if (hasCloudStorage()) {
      await supabaseTableRequest("admin_sticker_folders", {
        method: "POST",
        body: {
          id: folder.id,
          name: folder.name,
          sort_order: folder.sortOrder,
          created_at_ms: folder.createdAt,
        },
        prefer: "return=minimal",
      });
      return readCloudLibrary();
    }

    const library = await readLocalLibrary();
    const next = { ...library, stickerFolders: [...library.stickerFolders, folder] };
    await writeLocalLibrary(next);
    return next;
  });

export const updateAdminStickerFolder = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string(), name: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (hasCloudStorage()) {
      await supabaseTableRequest("admin_sticker_folders", {
        method: "PATCH",
        query: `id=eq.${encodeFilterValue(data.folderId)}`,
        body: { name: data.name.trim() },
        prefer: "return=minimal",
      });
      return readCloudLibrary();
    }

    const library = await readLocalLibrary();
    const next = {
      ...library,
      stickerFolders: library.stickerFolders.map((folder) =>
        folder.id === data.folderId ? { ...folder, name: data.name.trim() } : folder,
      ),
    };
    await writeLocalLibrary(next);
    return next;
  });

export const deleteAdminStickerFolder = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string() }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const folder = library.stickerFolders.find((item) => item.id === data.folderId);

    if (hasCloudStorage()) {
      await Promise.all(
        (folder?.stickers ?? []).map((sticker) =>
          deleteImageKitFile(sticker.fileId).catch((error) =>
            console.warn(`Could not delete sticker ${sticker.id}:`, error),
          ),
        ),
      );
      await supabaseTableRequest("admin_sticker_folders", {
        method: "DELETE",
        query: `id=eq.${encodeFilterValue(data.folderId)}`,
        prefer: "return=minimal",
      });
      return readCloudLibrary();
    }

    await Promise.all((folder?.stickers ?? []).map((sticker) => deleteLocalAsset(sticker.src)));
    const next = {
      ...library,
      stickerFolders: library.stickerFolders.filter((item) => item.id !== data.folderId),
    };
    await writeLocalLibrary(next);
    return next;
  });

export const addAdminStickers = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string(), files: z.array(fileInputSchema).min(1) }))
  .handler(async ({ data }) => {
    if (hasCloudStorage()) {
      const uploaded: Array<GlobalStickerAsset & { fileId: string }> = [];
      try {
        for (const file of data.files) {
          const id = nid("global_sticker");
          const media = await uploadCloudAsset("stickers", id, file.dataUrl);
          uploaded.push({
            id,
            folderId: data.folderId,
            name: file.name,
            src: media.url,
            fileId: media.fileId,
            createdAt: Date.now(),
          });
        }
        await supabaseTableRequest("admin_stickers", {
          method: "POST",
          body: uploaded.map((sticker) => ({
            id: sticker.id,
            folder_id: sticker.folderId,
            name: sticker.name,
            src: sticker.src,
            imagekit_file_id: sticker.fileId,
            created_at_ms: sticker.createdAt,
          })),
          prefer: "return=minimal",
        });
      } catch (error) {
        await Promise.all(uploaded.map((sticker) => deleteImageKitFile(sticker.fileId)));
        throw error;
      }
      return readCloudLibrary();
    }

    const library = await readLocalLibrary();
    const nextFolders = await Promise.all(
      library.stickerFolders.map(async (folder) => {
        if (folder.id !== data.folderId) return folder;
        const stickers: GlobalStickerAsset[] = [];
        for (const file of data.files) {
          const id = nid("global_sticker");
          stickers.push({
            id,
            folderId: folder.id,
            name: file.name,
            src: await uploadLocalAsset("stickers", id, file.dataUrl),
            createdAt: Date.now(),
          });
        }
        return { ...folder, stickers: [...folder.stickers, ...stickers] };
      }),
    );
    const next = { ...library, stickerFolders: nextFolders };
    await writeLocalLibrary(next);
    return next;
  });

export const deleteAdminSticker = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string(), stickerId: z.string() }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const sticker = library.stickerFolders
      .find((folder) => folder.id === data.folderId)
      ?.stickers.find((item) => item.id === data.stickerId);

    if (hasCloudStorage()) {
      await deleteImageKitFile(sticker?.fileId).catch((error) =>
        console.warn(`Could not delete sticker ${data.stickerId}:`, error),
      );
      await supabaseTableRequest("admin_stickers", {
        method: "DELETE",
        query: `id=eq.${encodeFilterValue(data.stickerId)}`,
        prefer: "return=minimal",
      });
      return readCloudLibrary();
    }

    if (sticker) await deleteLocalAsset(sticker.src);
    const next = {
      ...library,
      stickerFolders: library.stickerFolders.map((folder) =>
        folder.id === data.folderId
          ? {
              ...folder,
              stickers: folder.stickers.filter((item) => item.id !== data.stickerId),
            }
          : folder,
      ),
    };
    await writeLocalLibrary(next);
    return next;
  });

export const addAdminBackgrounds = createServerFn({ method: "POST" })
  .validator(z.object({ files: z.array(fileInputSchema).min(1) }))
  .handler(async ({ data }) => {
    if (hasCloudStorage()) {
      const uploaded: Array<GlobalBackgroundAsset & { fileId: string }> = [];
      try {
        for (const file of data.files) {
          const id = nid("global_bg");
          const media = await uploadCloudAsset("backgrounds", id, file.dataUrl);
          uploaded.push({
            id,
            name: file.name,
            src: media.url,
            fileId: media.fileId,
            createdAt: Date.now(),
          });
        }
        await supabaseTableRequest("admin_backgrounds", {
          method: "POST",
          body: uploaded.map((background) => ({
            id: background.id,
            name: background.name,
            src: background.src,
            imagekit_file_id: background.fileId,
            created_at_ms: background.createdAt,
          })),
          prefer: "return=minimal",
        });
      } catch (error) {
        await Promise.all(uploaded.map((background) => deleteImageKitFile(background.fileId)));
        throw error;
      }
      return readCloudLibrary();
    }

    const library = await readLocalLibrary();
    const backgrounds: GlobalBackgroundAsset[] = [];
    for (const file of data.files) {
      const id = nid("global_bg");
      backgrounds.push({
        id,
        name: file.name,
        src: await uploadLocalAsset("backgrounds", id, file.dataUrl),
        createdAt: Date.now(),
      });
    }
    const next = { ...library, backgrounds: [...library.backgrounds, ...backgrounds] };
    await writeLocalLibrary(next);
    return next;
  });

export const deleteAdminBackground = createServerFn({ method: "POST" })
  .validator(z.object({ backgroundId: z.string() }))
  .handler(async ({ data }) => {
    const library = await readLibrary();
    const background = library.backgrounds.find((item) => item.id === data.backgroundId);

    if (hasCloudStorage()) {
      await deleteImageKitFile(background?.fileId).catch((error) =>
        console.warn(`Could not delete background ${data.backgroundId}:`, error),
      );
      await supabaseTableRequest("admin_backgrounds", {
        method: "DELETE",
        query: `id=eq.${encodeFilterValue(data.backgroundId)}`,
        prefer: "return=minimal",
      });
      return readCloudLibrary();
    }

    if (background) await deleteLocalAsset(background.src);
    const next = {
      ...library,
      backgrounds: library.backgrounds.filter((item) => item.id !== data.backgroundId),
    };
    await writeLocalLibrary(next);
    return next;
  });
