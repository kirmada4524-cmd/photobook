import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Book, LibraryImage } from "@/lib/photobook/types";
import {
  hasImageKitStorage,
  missingImageKitStorageError,
  uploadImageKitFile,
} from "./imagekit.server";
import {
  encodeFilterValue,
  hasSupabaseStorage,
  isMissingSupabaseSchemaError,
  missingSupabaseStorageError,
  supabaseTableRequest,
} from "./supabase.server";

const SHARE_LIFETIME_DAYS = 30;
const MAX_SHARE_JSON_BYTES = 3_000_000;
const shareIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/);

const libraryImageSchema = z.object({
  id: z.string().min(1).max(200),
  src: z.string().min(1).max(2_500),
  name: z.string().max(300),
  favorite: z.boolean().optional(),
  excluded: z.boolean().optional(),
  createdAt: z.number(),
});

export type SharedPreviewPayload = {
  book: Book;
  library: LibraryImage[];
  createdAt: number;
  expiresAt: string;
};

type SharedPreviewRow = {
  id: string;
  data: SharedPreviewPayload;
  expires_at: string;
};

const isVercelRuntime = () => Boolean(process.env.VERCEL);

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Only base64 image data URLs are supported.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > 12_000_000) throw new Error("Shared image is larger than 12 MB.");
  return { mime: match[1], buffer };
};

const extensionForMime = (mime: string) => {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/svg+xml") return ".svg";
  return ".jpg";
};

const localShareFile = async () => {
  const fs = await import("fs");
  const path = await import("path");
  return { fs, path, filename: path.resolve(process.cwd(), "shared-previews.json") };
};

async function readLocalShares(): Promise<SharedPreviewRow[]> {
  const { fs, filename } = await localShareFile();
  if (!fs.existsSync(filename)) return [];
  return JSON.parse(await fs.promises.readFile(filename, "utf8")) as SharedPreviewRow[];
}

async function writeLocalShares(rows: SharedPreviewRow[]) {
  if (isVercelRuntime()) throw missingSupabaseStorageError();
  const { fs, filename } = await localShareFile();
  await fs.promises.writeFile(filename, JSON.stringify(rows, null, 2));
}

async function writeLocalAsset(shareId: string, filename: string, buffer: Buffer) {
  if (isVercelRuntime()) throw missingSupabaseStorageError();
  const { fs, path } = await localShareFile();
  const directory = path.resolve(process.cwd(), "public", "shared-preview-assets", shareId);
  await fs.promises.mkdir(directory, { recursive: true });
  await fs.promises.writeFile(path.join(directory, filename), buffer);
  return `/shared-preview-assets/${shareId}/${filename}`;
}

export const uploadSharedPreviewAsset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      shareId: shareIdSchema,
      name: z.string().min(1).max(300),
      kind: z.enum(["photo", "background", "sticker", "mask"]),
      dataUrl: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { mime, buffer } = parseDataUrl(data.dataUrl);
      const filename = `${data.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extensionForMime(mime)}`;

      if (hasSupabaseStorage()) {
        if (!hasImageKitStorage()) throw missingImageKitStorageError();
        const uploaded = await uploadImageKitFile({
          buffer,
          filename,
          folder: `/travelogue/shared-previews/${data.shareId}`,
          mime,
        });
        await supabaseTableRequest("photobook_media", {
          method: "POST",
          body: {
            file_id: uploaded.fileId,
            src: uploaded.url,
            kind: `shared-${data.kind}`,
            name: data.name,
            created_at_ms: Date.now(),
          },
          prefer: "resolution=merge-duplicates,return=minimal",
        });
        return { success: true, url: uploaded.url };
      }

      return {
        success: true,
        url: await writeLocalAsset(data.shareId, filename, buffer),
      };
    } catch (error) {
      console.error("Could not upload shared preview asset:", error);
      return {
        success: false,
        url: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

export const createSharedPreview = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: shareIdSchema,
      book: z.unknown(),
      library: z.array(libraryImageSchema).max(150),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const expiresAt = new Date(
        Date.now() + SHARE_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      const payload: SharedPreviewPayload = {
        book: data.book as Book,
        library: data.library as LibraryImage[],
        createdAt: Date.now(),
        expiresAt,
      };
      if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_SHARE_JSON_BYTES) {
        throw new Error(
          "The shared book data is too large. Remove unused embedded assets and try again.",
        );
      }

      const row: SharedPreviewRow = { id: data.id, data: payload, expires_at: expiresAt };
      if (hasSupabaseStorage()) {
        try {
          await supabaseTableRequest("shared_previews", {
            method: "POST",
            body: row,
            prefer: "resolution=merge-duplicates,return=minimal",
          });
        } catch (error) {
          if (!isVercelRuntime() && isMissingSupabaseSchemaError(error)) {
            const rows = await readLocalShares();
            await writeLocalShares([...rows.filter((item) => item.id !== data.id), row]);
          } else if (isMissingSupabaseSchemaError(error)) {
            throw new Error(
              "Preview sharing needs the latest Supabase migration before it can be used.",
            );
          } else {
            throw error;
          }
        }
      } else {
        const rows = await readLocalShares();
        await writeLocalShares([...rows.filter((item) => item.id !== data.id), row]);
      }
      return { success: true, id: data.id, expiresAt };
    } catch (error) {
      console.error("Could not create shared preview:", error);
      return {
        success: false,
        id: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

export const getSharedPreview = createServerFn({ method: "GET" })
  .validator(z.object({ id: shareIdSchema }))
  .handler(async ({ data }) => {
    try {
      let rows: SharedPreviewRow[];
      if (hasSupabaseStorage()) {
        try {
          rows = await supabaseTableRequest<SharedPreviewRow[]>("shared_previews", {
            query: `select=id,data,expires_at&id=eq.${encodeFilterValue(data.id)}&limit=1`,
          });
        } catch (error) {
          if (!isVercelRuntime() && isMissingSupabaseSchemaError(error)) {
            rows = (await readLocalShares()).filter((item) => item.id === data.id);
          } else {
            throw error;
          }
        }
      } else {
        rows = (await readLocalShares()).filter((item) => item.id === data.id);
      }
      const row = rows[0];
      if (!row || Date.parse(row.expires_at) <= Date.now()) {
        return {
          success: false,
          payload: null,
          error: "This preview link is missing or has expired.",
        };
      }
      return { success: true, payload: row.data };
    } catch (error) {
      console.error("Could not load shared preview:", error);
      return {
        success: false,
        payload: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
