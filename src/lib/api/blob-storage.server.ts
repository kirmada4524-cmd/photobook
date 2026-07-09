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

// Fetch blob content directly from a known URL (avoids a redundant list lookup)
export async function getBlobUrlContent(url: string): Promise<string | null> {
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Vercel Blob read failed: ${response.status} ${response.statusText}`);
  return response.text();
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

export async function listBlobs(prefix: string, cursor?: string): Promise<{
  blobs: Array<{ pathname: string; url: string }>;
  cursor?: string;
  hasMore: boolean;
}> {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");

  const params = new URLSearchParams({ prefix, limit: "1000" });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`${BLOB_UPLOAD_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-version": "7",
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Vercel Blob list failed: ${response.status} ${response.statusText} — ${details}`);
  }

  const data = await response.json() as {
    blobs: Array<{ pathname: string; url: string }>;
    cursor?: string;
    hasMore?: boolean;
  };

  return {
    blobs: data.blobs ?? [],
    cursor: data.cursor,
    hasMore: data.hasMore ?? false,
  };
}

export async function headBlob(pathname: string): Promise<{ pathname: string; url: string } | null> {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");

  // Use list with prefix to find a specific file
  const result = await listBlobs(pathname);
  const blob = result.blobs.find((b) => b.pathname === pathname);
  return blob ?? null;
}
