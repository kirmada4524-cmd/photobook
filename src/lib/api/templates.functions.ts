import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TEMPLATES_BLOB_PATH = "admin-templates.json";
const MAX_EMBEDDED_DATA_URL_LENGTH = 300_000;
const MAX_ASSET_ID_LENGTH = 200;

const isDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:");

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

      const thumbnail =
        isDataUrl(template.thumbnail) && template.thumbnail.length <= MAX_EMBEDDED_DATA_URL_LENGTH
          ? template.thumbnail
          : undefined;

      const eraserOverlay =
        isDataUrl(template.eraserOverlay) && template.eraserOverlay.length <= MAX_EMBEDDED_DATA_URL_LENGTH
          ? template.eraserOverlay
          : undefined;

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
  Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );

async function readBlobJson() {
  const { get } = await import("@vercel/blob");
  const result = await get(TEMPLATES_BLOB_PATH, { access: "public" });
  if (!result?.stream || result.statusCode !== 200) return [];
  const content = await new Response(result.stream).text();
  return sanitizeAdminTemplates(JSON.parse(content));
}

async function writeBlobJson(value: unknown) {
  const { put } = await import("@vercel/blob");
  await put(TEMPLATES_BLOB_PATH, JSON.stringify(value, null, 2), {
    access: "public",
    allowOverwrite: true,
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
      await fs.promises.writeFile(templatesFile, JSON.stringify(sanitizeAdminTemplates(data), null, 2));
      return { success: true };
    } catch (error) {
      console.error("Error writing admin-templates.json:", error);
      return { success: false, error: String(error) };
    }
  });
