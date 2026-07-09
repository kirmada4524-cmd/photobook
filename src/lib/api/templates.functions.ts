import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deleteBlob, getBlobText, hasBlobReadWriteToken, putBlob } from "./blob-storage.server";

const TEMPLATES_BLOB_PATH = "admin-templates.json";
const TEMPLATE_ITEM_BLOB_PREFIX = "admin-templates/items";
const TEMPLATE_ITEM_BLOB_SUFFIX = ".json";
const TEMPLATE_ASSET_BLOB_PREFIX = "admin-template-assets";
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

const nid = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

function sanitizeAdminTemplates(raw: unknown) {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((template) => template && typeof template === "object")
    .map((template: any) => {
      const elements = Array.isArray(template.elements)
        ? template.elements
            .filter((element: any) => element && typeof element === "object" && typeof element.type === "string")
            .map((element: any) => {
              const next = { ...element };
              if (next.type === "photo") next.imageId = "";
              if (
                next.type === "sticker" &&
                isDataUrl(next.src) &&
                next.src.length > MAX_EMBEDDED_DATA_URL_LENGTH
              ) {
                delete next.src;
              }
              if (typeof next.stickerId === "string" && next.stickerId.length > MAX_ASSET_ID_LENGTH) {
                delete next.stickerId;
              }
              return next;
            })
        : [];

      const embeddedAssets = Array.isArray(template.embeddedAssets)
        ? template.embeddedAssets.filter((asset: any) => {
            if (!asset || typeof asset !== "object") return false;
            if (asset.type === "photo") return false;
            if (typeof asset.id !== "string" || asset.id.length > MAX_ASSET_ID_LENGTH) return false;
            if (!isDataUrl(asset.base64)) return false;
            return asset.base64.length <= MAX_EMBEDDED_DATA_URL_LENGTH;
          })
        : [];

      const thumbnail = safeImageReference(template.thumbnail);
      const eraserOverlay = safeImageReference(template.eraserOverlay);

      return {
        ...template,
        background:
          typeof template.background === "string" &&
          template.background &&
          (!isDataUrl(template.background) || template.background.length <= MAX_EMBEDDED_DATA_URL_LENGTH)
            ? template.background
            : "cream",
        elements,
        embeddedAssets: embeddedAssets.length > 0 ? embeddedAssets : undefined,
        thumbnail,
        eraserOverlay,
        backgroundScale: typeof template.backgroundScale === "number" ? template.backgroundScale : 1,
        backgroundX: typeof template.backgroundX === "number" ? template.backgroundX : 0,
        backgroundY: typeof template.backgroundY === "number" ? template.backgroundY : 0,
      };
    });
}

const hasBlobStorage = () =>
  hasBlobReadWriteToken();

const isVercelRuntime = () => Boolean(process.env.VERCEL);

const missingBlobStorageError = () =>
  new Error(
    "Missing Vercel Blob write credentials. Add BLOB_READ_WRITE_TOKEN to the Vercel project environment variables.",
  );

async function readBlobJson() {
  const content = await getBlobText(TEMPLATES_BLOB_PATH);
  if (!content) return [];
  return sanitizeAdminTemplates(JSON.parse(content));
}

async function writeBlobJson(value: unknown) {
  await putBlob(TEMPLATES_BLOB_PATH, JSON.stringify(value, null, 2), {
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

const templateItemPath = (id: string) =>
  `${TEMPLATE_ITEM_BLOB_PREFIX}/${encodeURIComponent(id)}${TEMPLATE_ITEM_BLOB_SUFFIX}`;

const templateItemIdFromPathname = (pathname: string) => {
  if (!pathname.startsWith(`${TEMPLATE_ITEM_BLOB_PREFIX}/`) || !pathname.endsWith(TEMPLATE_ITEM_BLOB_SUFFIX)) {
    return "";
  }
  const encoded = pathname.slice(TEMPLATE_ITEM_BLOB_PREFIX.length + 1, -TEMPLATE_ITEM_BLOB_SUFFIX.length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

async function listTemplateItemBlobs() {
  const blobs = [];
  let cursor: string | undefined;

  do {
    const result = await list({
      prefix: `${TEMPLATE_ITEM_BLOB_PREFIX}/`,
      limit: 1000,
      cursor,
    });
    blobs.push(...result.blobs);
    cursor = result.cursor;
  } while (cursor);

  return blobs;
}

async function readTemplateItemBlob(id: string) {
  const content = await getBlobText(templateItemPath(id));
  if (!content) return null;
  return sanitizeAdminTemplates([JSON.parse(content)])[0] ?? null;
}

async function verifyTemplateItemBlob(id: string) {
  try {
    const metadata = await head(templateItemPath(id));
    return metadata.pathname === templateItemPath(id);
  } catch {
    return false;
  }
}

async function readTemplateItemBlobs() {
  const blobs = await listTemplateItemBlobs();
  const templates = await Promise.all(
    blobs.map(async (blob) => {
      try {
        const content = await getBlobText(blob.pathname);
        if (!content) return null;
        return sanitizeAdminTemplates([JSON.parse(content)])[0] ?? null;
      } catch (error) {
        console.error(`Error reading admin template item ${blob.pathname}:`, error);
        return null;
      }
    }),
  );

  return templates.filter((template): template is NonNullable<typeof template> => Boolean(template));
}

function mergeAdminTemplates(legacyTemplates: any[], itemTemplates: any[]) {
  const merged = new Map<string, any>();
  const itemOnlyTemplates: any[] = [];

  for (const template of legacyTemplates) {
    if (typeof template?.id !== "string") continue;
    merged.set(template.id, template);
  }

  for (const template of itemTemplates) {
    if (typeof template?.id !== "string") continue;
    if (merged.has(template.id)) {
      merged.set(template.id, template);
    } else {
      itemOnlyTemplates.push(template);
    }
  }

  itemOnlyTemplates
    .sort((a, b) => {
      const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.label || a.id).localeCompare(String(b.label || b.id));
    })
    .forEach((template) => merged.set(template.id, template));

  return Array.from(merged.values());
}

async function readBlobTemplates() {
  const [legacyTemplates, itemTemplates] = await Promise.all([
    readBlobJson().catch((error) => {
      console.error("Error reading admin-templates.json from Blob:", error);
      return [];
    }),
    readTemplateItemBlobs().catch((error) => {
      console.error("Error reading admin template items from Blob:", error);
      return [];
    }),
  ]);

  return mergeAdminTemplates(legacyTemplates, itemTemplates);
}

async function writeTemplateItemBlob(template: any) {
  const stored = sanitizeAdminTemplates([
    {
      ...template,
      sortOrder: typeof template.sortOrder === "number" ? template.sortOrder : Date.now(),
    },
  ])[0];
  if (!stored || typeof stored.id !== "string") {
    throw new Error("Template was empty or invalid after cleanup.");
  }

  await putBlob(templateItemPath(stored.id), JSON.stringify(stored, null, 2), {
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  return stored;
}

async function deleteTemplateItemBlob(id: string) {
  await deleteBlob(templateItemPath(id)).catch(() => undefined);
}

async function deleteMissingTemplateItemBlobs(keptIds: Set<string>) {
  const blobs = await listTemplateItemBlobs();
  await Promise.all(
    blobs.map(async (blob) => {
      const id = templateItemIdFromPathname(blob.pathname);
      if (id && keptIds.has(id)) return;
      await deleteBlob(blob.pathname).catch(() => undefined);
    }),
  );
}

async function localTemplatesFile() {
  const fs = await import("fs");
  const path = await import("path");
  return {
    fs,
    templatesFile: path.resolve(process.cwd(), "admin-templates.json"),
  };
}

export const getAdminTemplates = createServerFn({ method: "GET" }).handler(async () => {
  if (hasBlobStorage()) {
    try {
      return await readBlobTemplates();
    } catch (error) {
      console.error("Error reading admin templates from Blob:", error);
      return [];
    }
  }

  try {
    const { fs, templatesFile } = await localTemplatesFile();
    if (!fs.existsSync(templatesFile)) {
      return [];
    }
    const content = await fs.promises.readFile(templatesFile, "utf-8");
    const parsed = JSON.parse(content);
    const templates = sanitizeAdminTemplates(parsed);
    if (JSON.stringify(parsed).length !== JSON.stringify(templates).length) {
      await fs.promises.writeFile(templatesFile, JSON.stringify(templates, null, 2));
    }
    return templates;
  } catch (error) {
    console.error("Error reading admin-templates.json:", error);
    return [];
  }
});

export const saveAdminTemplates = createServerFn({ method: "POST" })
  .validator((data: any) => data) // We accept any structure since we trust the client's SavedPageTemplate[]
  .handler(async ({ data }) => {
    if (hasBlobStorage()) {
      try {
        const templates = sanitizeAdminTemplates(data);
        await writeBlobJson(templates);
        await deleteMissingTemplateItemBlobs(new Set(templates.map((template: any) => template.id)));
        return { success: true };
      } catch (error) {
        console.error("Error writing admin templates to Blob:", error);
        return { success: false, error: String(error) };
      }
    }

    try {
      const { fs, templatesFile } = await localTemplatesFile();
      if (isVercelRuntime()) {
        throw missingBlobStorageError();
      }
      await fs.promises.writeFile(templatesFile, JSON.stringify(sanitizeAdminTemplates(data), null, 2));
      return { success: true };
    } catch (error) {
      console.error("Error writing admin-templates.json:", error);
      return { success: false, error: String(error) };
    }
  });

export const appendAdminTemplates = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const incoming = sanitizeAdminTemplates(Array.isArray(data) ? data : []);
    if (incoming.length === 0) return { success: true, count: 0 };

    if (hasBlobStorage()) {
      try {
        await Promise.all(incoming.map((template) => writeTemplateItemBlob(template)));
        return { success: true, count: incoming.length };
      } catch (error) {
        console.error("Error appending admin templates to Blob:", error);
        return { success: false, error: String(error), count: 0 };
      }
    }

    try {
      const { fs, templatesFile } = await localTemplatesFile();
      if (isVercelRuntime()) {
        throw missingBlobStorageError();
      }
      const current = fs.existsSync(templatesFile)
        ? sanitizeAdminTemplates(JSON.parse(await fs.promises.readFile(templatesFile, "utf-8")))
        : [];
      await fs.promises.writeFile(templatesFile, JSON.stringify([...current, ...incoming], null, 2));
      return { success: true, count: incoming.length };
    } catch (error) {
      console.error("Error appending admin-templates.json:", error);
      return { success: false, error: String(error), count: 0 };
    }
  });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const appendAdminTemplateChecked = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const incoming = sanitizeAdminTemplates([data?.template ?? data])[0];
      if (!incoming || typeof incoming.id !== "string") {
        return {
          success: false,
          error: "Template was empty or invalid after cleanup.",
          count: 0,
          verified: false,
        };
      }

      const appendAndVerify = async (
        readCurrent: () => Promise<any[]>,
        writeNext: (templates: any[]) => Promise<void>,
      ) => {
        const current = await readCurrent();
        const next = [...current.filter((template: any) => template.id !== incoming.id), incoming];
        await writeNext(next);

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const verifiedTemplates = await readCurrent();
          const verified = verifiedTemplates.some((template: any) => template.id === incoming.id);
          if (verified) {
            return {
              success: true,
              count: 1,
              verified: true,
              attempts: attempt,
              total: verifiedTemplates.length,
            };
          }
          await delay(500 * attempt);
        }

        return {
          success: false,
          error: `Template "${incoming.label || incoming.id}" was written but not found during verification.`,
          count: 0,
          verified: false,
        };
      };

      if (hasBlobStorage()) {
        const stored = await writeTemplateItemBlob(incoming);
        return {
          success: true,
          count: 1,
          verified: true,
          attempts: 1,
          total: 1,
        };
      }

      const { fs, templatesFile } = await localTemplatesFile();
      if (isVercelRuntime()) {
        throw missingBlobStorageError();
      }
      return await appendAndVerify(
        async () =>
          fs.existsSync(templatesFile)
            ? sanitizeAdminTemplates(JSON.parse(await fs.promises.readFile(templatesFile, "utf-8")))
            : [],
        async (templates) => {
          await fs.promises.writeFile(templatesFile, JSON.stringify(sanitizeAdminTemplates(templates), null, 2));
        },
      );
    } catch (error: any) {
      console.error("Error in appendAdminTemplateChecked:", error);
      return {
        success: false,
        error: error.message || String(error),
        count: 0,
        verified: false,
      };
    }
  });

export const deleteAdminTemplateById = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const current = hasBlobStorage()
        ? await readBlobTemplates()
        : (() => {
            throw new Error("Local delete requires async file access.");
          })();
      const next = current.filter((template: any) => template.id !== data.id);
      if (hasBlobStorage()) {
        await writeBlobJson(next);
        await deleteTemplateItemBlob(data.id);
        return { success: true, count: current.length - next.length };
      }
      return { success: false, error: "Missing Blob storage.", count: 0 };
    } catch (error) {
      if (!hasBlobStorage()) {
        try {
          const { fs, templatesFile } = await localTemplatesFile();
          if (isVercelRuntime()) {
            throw missingBlobStorageError();
          }
          const current = fs.existsSync(templatesFile)
            ? sanitizeAdminTemplates(JSON.parse(await fs.promises.readFile(templatesFile, "utf-8")))
            : [];
          const next = current.filter((template: any) => template.id !== data.id);
          await fs.promises.writeFile(templatesFile, JSON.stringify(next, null, 2));
          return { success: true, count: current.length - next.length };
        } catch (localError) {
          console.error("Error deleting admin template locally:", localError);
          return { success: false, error: String(localError), count: 0 };
        }
      }
      console.error("Error deleting admin template from Blob:", error);
      return { success: false, error: String(error), count: 0 };
    }
  });

export const updateAdminTemplateById = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      patch: z.any(),
    }),
  )
  .handler(async ({ data }) => {
    const applyPatch = (templates: any[]) =>
      sanitizeAdminTemplates(
        templates.map((template: any) =>
          template.id === data.id ? { ...template, ...data.patch } : template,
        ),
      );

    if (hasBlobStorage()) {
      try {
        const next = applyPatch(await readBlobTemplates());
        await writeBlobJson(next);
        const updated = next.find((template: any) => template.id === data.id);
        if (updated) await writeTemplateItemBlob(updated);
        return { success: true };
      } catch (error) {
        console.error("Error updating admin template in Blob:", error);
        return { success: false, error: String(error) };
      }
    }

    try {
      const { fs, templatesFile } = await localTemplatesFile();
      if (isVercelRuntime()) {
        throw missingBlobStorageError();
      }
      const current = fs.existsSync(templatesFile)
        ? sanitizeAdminTemplates(JSON.parse(await fs.promises.readFile(templatesFile, "utf-8")))
        : [];
      await fs.promises.writeFile(templatesFile, JSON.stringify(applyPatch(current), null, 2));
      return { success: true };
    } catch (error) {
      console.error("Error updating admin template locally:", error);
      return { success: false, error: String(error) };
    }
  });

async function writeLocalTemplateAsset(kind: string, filename: string, buffer: Buffer): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");
  const cwd = process.cwd();

  const candidates = [
    path.resolve(cwd, "public", "template-assets", kind),
    path.resolve(cwd, ".output", "public", "template-assets", kind),
    path.resolve(cwd, "dist", "public", "template-assets", kind),
  ];

  const dirs = candidates.filter((dir, idx, self) => self.indexOf(dir) === idx);

  let lastError = null;
  let success = false;

  for (const dir of dirs) {
    try {
      await fs.promises.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      await fs.promises.writeFile(filePath, buffer);
      success = true;
    } catch (err) {
      lastError = err;
      console.warn(`Could not write local template asset to ${dir}:`, err);
    }
  }

  if (!success && lastError) {
    throw lastError;
  }

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
      if (!hasBlobStorage() && isVercelRuntime()) {
        throw missingBlobStorageError();
      }

      const { mime, buffer } = parseDataUrl(data.dataUrl);
      const filename = `${nid(`template_${data.kind}`)}${extFromMime(mime)}`;
      const pathname = `${TEMPLATE_ASSET_BLOB_PREFIX}/${data.kind}/${filename}`;

      if (hasBlobStorage()) {
        const blob = await putBlob(pathname, buffer, {
          contentType: mime,
          cacheControlMaxAge: 31536000,
        });
        return { url: blob.url as string };
      }

      if (isVercelRuntime()) {
        throw missingBlobStorageError();
      }

      const url = await writeLocalTemplateAsset(data.kind, filename, buffer);
      return { url };
    } catch (error: any) {
      console.error("Error in uploadTemplateAsset:", error);
      return { url: "", error: error.message || String(error) };
    }
  });
