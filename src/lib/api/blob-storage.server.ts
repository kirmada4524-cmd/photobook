import { put, del, list } from "@vercel/blob";

const readWriteToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";

export const hasBlobReadWriteToken = () => Boolean(readWriteToken());

const parseStoreIdFromToken = (token: string) => {
  const parts = token.split("_");
  const storeId = parts[3] || "";
  return storeId.startsWith("store_") ? storeId.slice("store_".length) : storeId;
};

export async function putBlob(
  pathname: string,
  body: Buffer | string | Blob,
  options: {
    contentType: string;
    cacheControlMaxAge: number;
  },
) {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");

  const blob = await put(pathname, body, {
    access: "public",
    contentType: options.contentType,
    addRandomSuffix: false,
    token,
  });

  return blob;
}

export async function getBlobText(pathname: string): Promise<string | null> {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");

  // Reconstruct the direct Vercel Blob URL for instant access
  const storeId = parseStoreIdFromToken(token);
  const url = `https://${storeId}.public.blob.vercel-storage.com/${pathname}?v=${Date.now()}`;

  let response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  // Fallback: if direct URL fails or storeId extraction is incorrect, use list() to find the URL
  if (!response.ok && response.status !== 404) {
    try {
      const result = await list({
        prefix: pathname,
        limit: 1,
        token,
      });
      const blob = result.blobs.find((b) => b.pathname === pathname);
      if (blob) {
        response = await fetch(`${blob.url}?v=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.warn("Vercel Blob list fallback failed:", err);
    }
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Vercel Blob read failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export async function deleteBlob(urlOrPathname: string) {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");

  await del(urlOrPathname, { token });
}
