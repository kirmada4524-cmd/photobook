import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBlobText, hasBlobReadWriteToken, putBlob } from "./blob-storage.server";

const TEMPLATES_BLOB_PATH = "admin-templates.json";
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
      return await readBlobJson();
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
        await writeBlobJson(sanitizeAdminTemplates(data));
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
        const current = await readBlobJson();
        await writeBlobJson([...current, ...incoming]);
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

export const deleteAdminTemplateById = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const current = hasBlobStorage()
        ? await readBlobJson()
        : (() => {
            throw new Error("Local delete requires async file access.");
          })();
      const next = current.filter((template: any) => template.id !== data.id);
      if (hasBlobStorage()) {
        await writeBlobJson(next);
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
        await writeBlobJson(applyPatch(await readBlobJson()));
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

export const uploadTemplateAsset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1),
      dataUrl: z.string().min(1),
      kind: z.enum(["background", "sticker", "overlay", "thumbnail"]).default("background"),
    }),
  )
  .handler(async ({ data }) => {
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

    throw missingBlobStorageError();
  });
