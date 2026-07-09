// Vercel Blob storage - pure fetch implementation.
// Does NOT import @vercel/blob SDK to avoid the CJS/ESM crash:
//   @vercel/blob -> @vercel/oidc -> @vercel/cli-config -> xdg-app-paths
//   which uses require() and crashes in Nitro's ESM bundle on Vercel.

const readWriteToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";

export const hasBlobReadWriteToken = () => Boolean(readWriteToken());

// The Vercel Blob upload endpoint - note this is blob.vercel-storage.com, NOT vercel.com/api/blob
const BLOB_UPLOAD_URL = "https://blob.vercel-storage.com";

export async function putBlob(
  pathname: string,
  body: Buffer | string,
  options: {
    contentType: string;
    cacheControlMaxAge: number;
  },
) {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");

  const url = `${BLOB_UPLOAD_URL}/${encodeURIComponent(pathname).replace(/%2F/g, "/")}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": options.contentType,
      "x-api-version": "7",
      "x-allow-overwrite": "1",
      "cache-control": `public, max-age=${options.cacheControlMaxAge}`,
    },
    body,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Vercel Blob upload failed: ${response.status} ${response.statusText} — ${details}`);
  }

  const result = await response.json() as { url: string; pathname: string };
  return result;
}

export async function getBlobText(pathname: string): Promise<string | null> {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");

  // Use the Vercel Blob list API to find the file URL
  const listUrl = `${BLOB_UPLOAD_URL}?prefix=${encodeURIComponent(pathname)}&limit=1`;

  const listResp = await fetch(listUrl, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-version": "7",
    },
  });

  if (!listResp.ok) {
    const details = await listResp.text().catch(() => "");
    throw new Error(`Vercel Blob list failed: ${listResp.status} ${listResp.statusText} — ${details}`);
  }

  const data = await listResp.json() as { blobs: Array<{ pathname: string; url: string }> };
  const blob = data.blobs.find((b) => b.pathname === pathname);
  if (!blob) return null;

  const fileResp = await fetch(`${blob.url}?v=${Date.now()}`, {
    cache: "no-store",
  });

  if (fileResp.status === 404) return null;
  if (!fileResp.ok) {
    throw new Error(`Vercel Blob read failed: ${fileResp.status} ${fileResp.statusText}`);
  }

  return fileResp.text();
}

export async function deleteBlob(urlOrPathname: string) {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");

  const response = await fetch(`${BLOB_UPLOAD_URL}/delete`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-api-version": "7",
    },
    body: JSON.stringify({ urls: [urlOrPathname] }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Vercel Blob delete failed: ${response.status} ${response.statusText} — ${details}`);
  }
}
