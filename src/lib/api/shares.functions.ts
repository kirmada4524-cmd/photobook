import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  deleteImageKitFile,
  hasImageKitStorage,
  missingImageKitStorageError,
  uploadImageKitFile,
} from "./imagekit.server";
import {
  encodeFilterValue,
  hasSupabaseStorage,
  supabaseTableRequest,
} from "./supabase.server";
import type { Book } from "@/lib/photobook/types";

// ─────────────────────────────────────────────────────────────────────────────
// "Magic link" sharing. A shared book is stored in the `photobook_shares`
// Supabase table; the referenced photos are uploaded to ImageKit. The sharer
// keeps a delete_token (never returned by getSharedBook) so they can revoke it.
//
// One-time table migration (run once in Supabase SQL editor):
//   create table if not exists photobook_shares (
//     id text primary key,
//     shared_by text,
//     title text,
//     data jsonb not null,
//     delete_token text not null,
//     created_at_ms bigint
//   );
// ─────────────────────────────────────────────────────────────────────────────

const nid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const makeToken = () =>
  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

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
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
};

type ShareLibraryItem = { id: string; src: string; name: string };
type ShareData = { book: Book; library: ShareLibraryItem[]; imageFileIds: string[] };
type ShareRecord = {
  id: string;
  shared_by: string;
  title: string;
  data: ShareData;
  delete_token: string;
  created_at_ms: number;
};

// ── Local dev fallback (no Supabase creds): store shares in a JSON file. ──
async function localSharesFile() {
  const fs = await import("fs");
  const path = await import("path");
  return { fs, file: path.resolve(process.cwd(), "photobook-shares.json") };
}
async function readLocalShares(): Promise<ShareRecord[]> {
  const { fs, file } = await localSharesFile();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(await fs.promises.readFile(file, "utf-8")) as ShareRecord[];
  } catch {
    return [];
  }
}
async function writeLocalShares(records: ShareRecord[]) {
  const { fs, file } = await localSharesFile();
  await fs.promises.writeFile(file, JSON.stringify(records, null, 2));
}

const ImageInput = z.object({
  id: z.string().min(1),
  name: z.string().max(300).optional(),
  base64: z.string().min(1),
});

export const createSharedBook = createServerFn({ method: "POST" })
  .validator(
    z.object({
      book: z.unknown(),
      images: z.array(ImageInput).max(400),
      sharedBy: z.string().max(80).optional(),
      title: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const id = nid("share");
      const deleteToken = makeToken();
      const sharedBy = (data.sharedBy || "").trim() || "A friend";
      const title = (data.title || "").trim() || "Untitled photobook";
      const library: ShareLibraryItem[] = [];
      const imageFileIds: string[] = [];

      if (hasSupabaseStorage()) {
        if (!hasImageKitStorage()) throw missingImageKitStorageError();
        for (const img of data.images) {
          const { mime, buffer } = parseDataUrl(img.base64);
          const uploaded = await uploadImageKitFile({
            buffer,
            filename: `${nid("share_photo")}${extFromMime(mime)}`,
            folder: "/travelogue/shares",
            mime,
          });
          library.push({ id: img.id, src: uploaded.url, name: img.name || "" });
          imageFileIds.push(uploaded.fileId);
        }
        await supabaseTableRequest("photobook_shares", {
          method: "POST",
          body: {
            id,
            shared_by: sharedBy,
            title,
            data: { book: data.book as Book, library, imageFileIds } satisfies ShareData,
            delete_token: deleteToken,
            created_at_ms: Date.now(),
          },
          prefer: "return=minimal",
        });
      } else {
        // Local dev: embed the images inline so the link works without a CDN.
        for (const img of data.images) {
          library.push({ id: img.id, src: img.base64, name: img.name || "" });
        }
        const records = await readLocalShares();
        records.push({
          id,
          shared_by: sharedBy,
          title,
          data: { book: data.book as Book, library, imageFileIds: [] },
          delete_token: deleteToken,
          created_at_ms: Date.now(),
        });
        await writeLocalShares(records);
      }

      return { success: true as const, id, deleteToken };
    } catch (error) {
      console.error("createSharedBook failed:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

export const getSharedBook = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    try {
      if (hasSupabaseStorage()) {
        const rows = await supabaseTableRequest<
          Array<{ shared_by: string; title: string; data: ShareData }>
        >("photobook_shares", {
          query: `select=shared_by,title,data&id=eq.${encodeFilterValue(data.id)}&limit=1`,
        });
        const row = rows[0];
        if (!row) return { found: false as const };
        return {
          found: true as const,
          sharedBy: row.shared_by,
          title: row.title,
          book: row.data.book,
          library: row.data.library,
        };
      }
      const record = (await readLocalShares()).find((r) => r.id === data.id);
      if (!record) return { found: false as const };
      return {
        found: true as const,
        sharedBy: record.shared_by,
        title: record.title,
        book: record.data.book,
        library: record.data.library,
      };
    } catch (error) {
      console.error("getSharedBook failed:", error);
      return { found: false as const, error: String(error) };
    }
  });

export const deleteSharedBook = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(120), deleteToken: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      if (hasSupabaseStorage()) {
        const rows = await supabaseTableRequest<
          Array<{ delete_token: string; data: ShareData }>
        >("photobook_shares", {
          query: `select=delete_token,data&id=eq.${encodeFilterValue(data.id)}&limit=1`,
        });
        const row = rows[0];
        if (!row) return { success: true as const }; // already gone
        if (row.delete_token !== data.deleteToken) {
          return { success: false as const, error: "This link can't be deleted from here." };
        }
        for (const fileId of row.data.imageFileIds || []) {
          await deleteImageKitFile(fileId).catch((e) =>
            console.warn("Could not delete shared photo from ImageKit:", e),
          );
        }
        await supabaseTableRequest("photobook_shares", {
          method: "DELETE",
          query: `id=eq.${encodeFilterValue(data.id)}`,
          prefer: "return=minimal",
        });
        return { success: true as const };
      }
      const records = await readLocalShares();
      const record = records.find((r) => r.id === data.id);
      if (record && record.delete_token !== data.deleteToken) {
        return { success: false as const, error: "This link can't be deleted from here." };
      }
      await writeLocalShares(records.filter((r) => r.id !== data.id));
      return { success: true as const };
    } catch (error) {
      console.error("deleteSharedBook failed:", error);
      return { success: false as const, error: String(error) };
    }
  });
