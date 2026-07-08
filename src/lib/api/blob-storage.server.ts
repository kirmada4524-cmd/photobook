const BLOB_API_URL = "https://vercel.com/api/blob";

const readWriteToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";

const parseStoreIdFromToken = (token: string) => {
  const [, , , storeId = ""] = token.split("_");
  return storeId.startsWith("store_") ? storeId.slice("store_".length) : storeId;
};

export const hasBlobReadWriteToken = () => Boolean(readWriteToken());

const blobHeaders = (storeId: string, extra?: HeadersInit) => ({
  "authorization": `Bearer ${readWriteToken()}`,
  "x-api-version": "11",
  "x-vercel-blob-store-id": storeId,
  ...extra,
});

async function blobApi(pathname: string, init: RequestInit) {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");
  const storeId = parseStoreIdFromToken(token);
  const response = await fetch(`${BLOB_API_URL}${pathname}`, {
    ...init,
    headers: blobHeaders(storeId, init.headers),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Vercel Blob request failed: ${response.status} ${response.statusText} ${details}`);
  }

  return response.json();
}

export async function putBlob(
  pathname: string,
  body: BodyInit,
  options: {
    contentType: string;
    cacheControlMaxAge: number;
  },
) {
  const params = new URLSearchParams({ pathname });
  return blobApi(`/?${params.toString()}`, {
    method: "PUT",
    body,
    headers: {
      "x-vercel-blob-access": "public",
      "x-allow-overwrite": "1",
      "x-content-type": options.contentType,
      "x-cache-control-max-age": String(options.cacheControlMaxAge),
    },
  });
}

export async function getBlobText(pathname: string) {
  const token = readWriteToken();
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN.");
  const storeId = parseStoreIdFromToken(token);
  const url = `https://${storeId}.public.blob.vercel-storage.com/${pathname}?v=${Date.now()}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Vercel Blob read failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export async function deleteBlob(urlOrPathname: string) {
  await blobApi("/delete", {
    method: "POST",
    body: JSON.stringify({ urls: [urlOrPathname] }),
    headers: {
      "content-type": "application/json",
    },
  });
}
