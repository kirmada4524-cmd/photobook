const imageKitPrivateKey = () => process.env.IMAGEKIT_PRIVATE_KEY?.trim() || "";
const imageKitUrlEndpoint = () =>
  process.env.IMAGEKIT_URL_ENDPOINT?.trim().replace(/\/$/, "") || "";

export const hasImageKitStorage = () =>
  Boolean(imageKitPrivateKey() && imageKitUrlEndpoint());

export const missingImageKitStorageError = () =>
  new Error(
    "Missing ImageKit credentials. Add IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT to the Vercel environment variables.",
  );

const authorizationHeader = () => {
  const privateKey = imageKitPrivateKey();
  if (!privateKey) throw missingImageKitStorageError();
  return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
};

export type ImageKitUploadResult = {
  fileId: string;
  filePath: string;
  name: string;
  url: string;
};

export async function uploadImageKitFile({
  buffer,
  filename,
  folder,
  mime,
}: {
  buffer: Buffer;
  filename: string;
  folder: string;
  mime: string;
}): Promise<ImageKitUploadResult> {
  if (!hasImageKitStorage()) throw missingImageKitStorageError();

  const form = new FormData();
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  form.append("file", new Blob([bytes], { type: mime }), filename);
  form.append("fileName", filename);
  form.append("folder", folder.startsWith("/") ? folder : `/${folder}`);
  form.append("useUniqueFileName", "false");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { authorization: authorizationHeader() },
    body: form,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `ImageKit upload failed: ${response.status} ${response.statusText} - ${details}`,
    );
  }

  const result = (await response.json()) as Partial<ImageKitUploadResult>;
  if (!result.fileId || !result.filePath) {
    throw new Error("ImageKit upload succeeded without a fileId or filePath.");
  }

  return {
    fileId: result.fileId,
    filePath: result.filePath,
    name: result.name || filename,
    url: result.url || `${imageKitUrlEndpoint()}${result.filePath}`,
  };
}

export async function deleteImageKitFile(fileId?: string) {
  if (!fileId || !hasImageKitStorage()) return;

  const response = await fetch(
    `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { authorization: authorizationHeader() },
    },
  );

  if (!response.ok && response.status !== 404) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `ImageKit delete failed: ${response.status} ${response.statusText} - ${details}`,
    );
  }
}
