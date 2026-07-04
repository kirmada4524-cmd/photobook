import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TEMPLATES_BLOB_PATH = "admin-templates.json";

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
  return JSON.parse(content);
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
    return JSON.parse(content);
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
        await writeBlobJson(data);
        return { success: true };
      } catch (error) {
        console.error("Error writing admin templates to Blob:", error);
        return { success: false, error: String(error) };
      }
    }

    try {
      const { fs, templatesFile } = await localTemplatesFile();
      await fs.promises.writeFile(templatesFile, JSON.stringify(data, null, 2));
      return { success: true };
    } catch (error) {
      console.error("Error writing admin-templates.json:", error);
      return { success: false, error: String(error) };
    }
  });
