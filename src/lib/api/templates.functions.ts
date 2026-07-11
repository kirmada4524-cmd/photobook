import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SavedPageTemplate } from "@/lib/photobook/types";
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

const MAX_EMBEDDED_DATA_URL_LENGTH = 300_000;
const MAX_ASSET_ID_LENGTH = 200;

const isDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:");

const isImageUrl = (value: unknown): value is string =>
  typeof value === "string" &&
  (value.startsWith("http:") ||
    value.startsWith("https:") ||
    value.startsWith("/") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(value));

const safeImageReference = (value: unknown) => {
  if (isDataUrl(value)) {
    return value.length <= MAX_EMBEDDED_DATA_URL_LENGTH ? value : undefined;
  }
  return isImageUrl(value) ? value : undefined;
};

const nid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

function sanitizeAdminTemplates(raw: unknown): SavedPageTemplate[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((candidate): candidate is Record<string, unknown> =>
      Boolean(candidate && typeof candidate === "object"),
    )
    .map((template) => {
      const elements = Array.isArray(template.elements)
        ? template.elements
            .filter(
              (element): element is Record<string, unknown> =>
                Boolean(
                  element &&
                    typeof element === "object" &&
                    typeof (element as Record<string, unknown>).type === "string",
                ),
            )
            .map((element) => {
              const next = { ...element };
              if (next.type === "photo") next.imageId = "";
              if (
                next.type === "sticker" &&
                isDataUrl(next.src) &&
                next.src.length > MAX_EMBEDDED_DATA_URL_LENGTH
              ) {
                delete next.src;
              }
              if (
                typeof next.stickerId === "string" &&
                next.stickerId.length > MAX_ASSET_ID_LENGTH
              ) {
                delete next.stickerId;
              }
              return next;
            })
        : [];

      const embeddedAssets = Array.isArray(template.embeddedAssets)
        ? template.embeddedAssets.filter((asset) => {
            if (!asset || typeof asset !== "object") return false;
            const value = asset as Record<string, unknown>;
            if (value.type === "photo") return false;
            if (typeof value.id !== "string" || value.id.length > MAX_ASSET_ID_LENGTH) {
              return false;
            }
            return (
              isDataUrl(value.base64) && value.base64.length <= MAX_EMBEDDED_DATA_URL_LENGTH
            );
          })
        : [];

      return {
        ...(template as unknown as SavedPageTemplate),
        id: typeof template.id === "string" ? template.id : nid("template"),
        label: typeof template.label === "string" ? template.label : "Untitled template",
        background:
          typeof template.background === "string" &&
          template.background &&
          (!isDataUrl(template.background) ||
            template.background.length <= MAX_EMBEDDED_DATA_URL_LENGTH)
            ? template.background
            : "cream",
        elements: elements as SavedPageTemplate["elements"],
        embeddedAssets:
          embeddedAssets.length > 0
            ? (embeddedAssets as SavedPageTemplate["embeddedAssets"])
            : undefined,
        thumbnail: safeImageReference(template.thumbnail),
        eraserOverlay: safeImageReference(template.eraserOverlay),
        backgroundScale:
          typeof template.backgroundScale === "number" ? template.backgroundScale : 1,
        backgroundX: typeof template.backgroundX === "number" ? template.backgroundX : 0,
        backgroundY: typeof template.backgroundY === "number" ? template.backgroundY : 0,
      };
    });
}

const isVercelRuntime = () => Boolean(process.env.VERCEL);
const hasCloudStorage = () => hasSupabaseStorage();

const missingCloudStorageError = () =>
  hasSupabaseStorage() ? missingImageKitStorageError() : missingSupabaseStorageError();

type TemplateRow = {
  id: string;
  label: string;
  category: string;
  sort_order: number;
  data: SavedPageTemplate;
};

type MediaRow = {
  file_id: string;
  src: string;
};

const templateRow = (template: SavedPageTemplate, index = 0): TemplateRow => ({
  id: template.id,
  label: template.label,
  category: template.category || "General Mag",
  sort_order: template.sortOrder ?? index,
  data: { ...template, sortOrder: template.sortOrder ?? index },
});

async function readCloudTemplates() {
  const rows = await supabaseTableRequest<Array<{ data: unknown }>>("photobook_templates", {
    query: "select=data&order=sort_order.asc,updated_at.asc",
  });
  return sanitizeAdminTemplates(rows.map((row) => row.data));
}

async function upsertCloudTemplates(templates: SavedPageTemplate[]) {
  if (templates.length === 0) return;
  await supabaseTableRequest("photobook_templates", {
    method: "POST",
    body: templates.map(templateRow),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

async function deleteCloudTemplateRows(ids: string[]) {
  await Promise.all(
    ids.map((id) =>
      supabaseTableRequest("photobook_templates", {
        method: "DELETE",
        query: `id=eq.${encodeFilterValue(id)}`,
        prefer: "return=minimal",
      }),
    ),
  );
}

const templateMediaUrls = (template: SavedPageTemplate) => {
  const urls = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && /^https?:\/\//.test(value)) urls.add(value);
  };
  add(template.background);
  add(template.thumbnail);
  add(template.eraserOverlay);
  template.elements.forEach((element) => {
    if (element.type === "sticker") add(element.src);
  });
  return urls;
};

async function deleteRegisteredMedia(urls: Iterable<string>) {
  for (const url of urls) {
    const rows = await supabaseTableRequest<MediaRow[]>("photobook_media", {
      query: `select=file_id,src&src=eq.${encodeFilterValue(url)}&limit=1`,
    });
    const media = rows[0];
    if (!media) continue;
    await deleteImageKitFile(media.file_id).catch((error) =>
      console.warn(`Could not delete ImageKit media ${media.file_id}:`, error),
    );
    await supabaseTableRequest("photobook_media", {
      method: "DELETE",
      query: `file_id=eq.${encodeFilterValue(media.file_id)}`,
      prefer: "return=minimal",
    });
  }
}

async function replaceCloudTemplates(templates: SavedPageTemplate[]) {
  const current = await readCloudTemplates();
  await upsertCloudTemplates(templates);

  const keptIds = new Set(templates.map((template) => template.id));
  const removed = current.filter((template) => !keptIds.has(template.id));
  await deleteCloudTemplateRows(removed.map((template) => template.id));

  const referenced = new Set(templates.flatMap((template) => [...templateMediaUrls(template)]));
  const orphaned = new Set(
    removed.flatMap((template) =>
      [...templateMediaUrls(template)].filter((url) => !referenced.has(url)),
    ),
  );
  await deleteRegisteredMedia(orphaned);
}

async function localTemplatesFile() {
  const fs = await import("fs");
  const path = await import("path");
  return {
    fs,
    templatesFile: path.resolve(process.cwd(), "admin-templates.json"),
  };
}

async function readLocalTemplates() {
  const { fs, templatesFile } = await localTemplatesFile();
  if (!fs.existsSync(templatesFile)) return [];
  return sanitizeAdminTemplates(JSON.parse(await fs.promises.readFile(templatesFile, "utf-8")));
}

async function writeLocalTemplates(templates: SavedPageTemplate[]) {
  if (isVercelRuntime()) throw missingCloudStorageError();
  const { fs, templatesFile } = await localTemplatesFile();
  await fs.promises.writeFile(templatesFile, JSON.stringify(templates, null, 2));
}

async function readTemplates() {
  return hasCloudStorage() ? readCloudTemplates() : readLocalTemplates();
}

async function writeTemplates(templates: SavedPageTemplate[]) {
  if (hasCloudStorage()) return replaceCloudTemplates(templates);
  return writeLocalTemplates(templates);
}

export const getAdminTemplates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await readTemplates();
  } catch (error) {
    console.error("Error reading admin templates:", error);
    return [];
  }
});

export const saveAdminTemplates = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async ({ data }) => {
    try {
      await writeTemplates(sanitizeAdminTemplates(data));
      return { success: true };
    } catch (error) {
      console.error("Error saving admin templates:", error);
      return { success: false, error: String(error) };
    }
  });

export const appendAdminTemplates = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async ({ data }) => {
    const incoming = sanitizeAdminTemplates(Array.isArray(data) ? data : []);
    if (incoming.length === 0) return { success: true, count: 0 };
    try {
      if (hasCloudStorage()) {
        await upsertCloudTemplates(incoming);
      } else {
        const current = await readLocalTemplates();
        const incomingIds = new Set(incoming.map((template) => template.id));
        await writeLocalTemplates([
          ...current.filter((template) => !incomingIds.has(template.id)),
          ...incoming,
        ]);
      }
      return { success: true, count: incoming.length };
    } catch (error) {
      console.error("Error appending admin templates:", error);
      return { success: false, error: String(error), count: 0 };
    }
  });

export const appendAdminTemplateChecked = createServerFn({ method: "POST" })
  .validator(z.object({ template: z.unknown() }).passthrough())
  .handler(async ({ data }) => {
    try {
      const incoming = sanitizeAdminTemplates([data.template])[0];
      if (!incoming) {
        return {
          success: false,
          error: "Template was empty or invalid after cleanup.",
          count: 0,
          verified: false,
        };
      }

      if (hasCloudStorage()) {
        await upsertCloudTemplates([incoming]);
        const rows = await supabaseTableRequest<Array<{ id: string }>>("photobook_templates", {
          query: `select=id&id=eq.${encodeFilterValue(incoming.id)}&limit=1`,
        });
        return {
          success: rows.length === 1,
          count: rows.length,
          verified: rows.length === 1,
          attempts: 1,
          total: (await readCloudTemplates()).length,
        };
      }

      const current = await readLocalTemplates();
      const next = [...current.filter((template) => template.id !== incoming.id), incoming];
      await writeLocalTemplates(next);
      return {
        success: true,
        count: 1,
        verified: true,
        attempts: 1,
        total: next.length,
      };
    } catch (error) {
      console.error("Error saving checked admin template:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        count: 0,
        verified: false,
      };
    }
  });

export const deleteAdminTemplateById = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const current = await readTemplates();
      const removed = current.find((template) => template.id === data.id);
      const next = current.filter((template) => template.id !== data.id);

      if (hasCloudStorage()) {
        await deleteCloudTemplateRows([data.id]);
        if (removed) {
          const referenced = new Set(
            next.flatMap((template) => [...templateMediaUrls(template)]),
          );
          await deleteRegisteredMedia(
            [...templateMediaUrls(removed)].filter((url) => !referenced.has(url)),
          );
        }
      } else {
        await writeLocalTemplates(next);
      }

      return { success: true, count: current.length - next.length };
    } catch (error) {
      console.error("Error deleting admin template:", error);
      return { success: false, error: String(error), count: 0 };
    }
  });

export const updateAdminTemplateById = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), patch: z.unknown() }))
  .handler(async ({ data }) => {
    try {
      const current = await readTemplates();
      const previous = current.find((template) => template.id === data.id);
      if (!previous) return { success: false, error: "Template not found." };

      const patch =
        data.patch && typeof data.patch === "object"
          ? (data.patch as Partial<SavedPageTemplate>)
          : {};
      const updated = sanitizeAdminTemplates([{ ...previous, ...patch }])[0];
      if (!updated) return { success: false, error: "Template update was invalid." };

      if (hasCloudStorage()) {
        await upsertCloudTemplates([updated]);
        const nextUrls = templateMediaUrls(updated);
        await deleteRegisteredMedia(
          [...templateMediaUrls(previous)].filter((url) => !nextUrls.has(url)),
        );
      } else {
        await writeLocalTemplates(
          current.map((template) => (template.id === data.id ? updated : template)),
        );
      }
      return { success: true };
    } catch (error) {
      console.error("Error updating admin template:", error);
      return { success: false, error: String(error) };
    }
  });

async function writeLocalTemplateAsset(
  kind: string,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");
  const cwd = process.cwd();
  const directories = [
    path.resolve(cwd, "public", "template-assets", kind),
    path.resolve(cwd, ".output", "public", "template-assets", kind),
    path.resolve(cwd, "dist", "public", "template-assets", kind),
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
  return `/template-assets/${kind}/${filename}`;
}

export const uploadTemplateAsset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1),
      dataUrl: z.string().min(1),
      kind: z.enum(["background", "sticker", "overlay", "thumbnail"]).default("background"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { mime, buffer } = parseDataUrl(data.dataUrl);
      const filename = `${nid(`template_${data.kind}`)}${extFromMime(mime)}`;

      if (hasCloudStorage()) {
        if (!hasImageKitStorage()) throw missingImageKitStorageError();
        const uploaded = await uploadImageKitFile({
          buffer,
          filename,
          folder: `/travelogue/templates/${data.kind}`,
          mime,
        });
        await supabaseTableRequest("photobook_media", {
          method: "POST",
          body: {
            file_id: uploaded.fileId,
            src: uploaded.url,
            kind: data.kind,
            name: data.name,
            created_at_ms: Date.now(),
          },
          prefer: "resolution=merge-duplicates,return=minimal",
        });
        return { url: uploaded.url, fileId: uploaded.fileId };
      }

      if (isVercelRuntime()) throw missingCloudStorageError();
      return { url: await writeLocalTemplateAsset(data.kind, filename, buffer) };
    } catch (error) {
      console.error("Error uploading template asset:", error);
      return {
        url: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
