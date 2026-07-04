import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAssetsList = createServerFn({ method: "GET" })
  .validator(z.object({ folder: z.enum(["bg image", "Stickers"]) }))
  .handler(async () => {
    return [];
  });

export const getAssetDataUrl = createServerFn({ method: "GET" })
  .validator(
    z.object({
      folder: z.enum(["bg image", "Stickers"]),
      filename: z.string(),
    }),
  )
  .handler(async () => {
    throw new Error("Legacy design asset folders are disabled. Use admin global assets instead.");
  });
