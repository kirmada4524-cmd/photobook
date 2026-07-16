import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  encodeFilterValue,
  hasSupabaseStorage,
  supabaseRpcRequest,
  supabaseTableRequest,
} from "./supabase.server";

export type TemplateLikeSummary = {
  counts: Record<string, number>;
  likedTemplateIds: string[];
};

type TemplateLikeRow = { template_id: string };
type TemplateCountRow = { id: string; like_count: number | string | null };
type ToggleLikeRow = { liked: boolean; like_count: number | string };
type LocalLikes = Record<string, string[]>;

const likeInput = z.object({
  templateId: z.string().min(1).max(200),
  voterKey: z.string().min(8).max(100),
});

async function localLikesFile() {
  const fs = await import("fs");
  const path = await import("path");
  return {
    fs,
    filename: path.resolve(process.cwd(), "template-likes.json"),
  };
}

async function readLocalLikes(): Promise<LocalLikes> {
  const { fs, filename } = await localLikesFile();
  if (!fs.existsSync(filename)) return {};
  const parsed = JSON.parse(await fs.promises.readFile(filename, "utf-8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([templateId, voters]) => [
      templateId,
      Array.isArray(voters)
        ? voters.filter((value): value is string => typeof value === "string")
        : [],
    ]),
  );
}

async function writeLocalLikes(likes: LocalLikes) {
  const { fs, filename } = await localLikesFile();
  await fs.promises.writeFile(filename, JSON.stringify(likes, null, 2));
}

export const getTemplateLikeSummary = createServerFn({ method: "GET" })
  .validator(z.object({ voterKey: z.string().min(8).max(100) }))
  .handler(async ({ data }): Promise<TemplateLikeSummary> => {
    try {
      if (!hasSupabaseStorage()) {
        const likes = await readLocalLikes();
        return {
          counts: Object.fromEntries(
            Object.entries(likes).map(([templateId, voters]) => [templateId, voters.length]),
          ),
          likedTemplateIds: Object.entries(likes)
            .filter(([, voters]) => voters.includes(data.voterKey))
            .map(([templateId]) => templateId),
        };
      }

      const [countRows, likedRows] = await Promise.all([
        supabaseTableRequest<TemplateCountRow[]>("photobook_templates", {
          query: "select=id,like_count",
        }),
        supabaseTableRequest<TemplateLikeRow[]>("photobook_template_likes", {
          query: `select=template_id&voter_key=eq.${encodeFilterValue(data.voterKey)}`,
        }),
      ]);

      return {
        counts: Object.fromEntries(
          countRows.map((row) => [row.id, Math.max(0, Number(row.like_count) || 0)]),
        ),
        likedTemplateIds: likedRows.map((row) => row.template_id),
      };
    } catch (error) {
      console.error("Could not load template likes:", error);
      return { counts: {}, likedTemplateIds: [] };
    }
  });

export const toggleTemplateLike = createServerFn({ method: "POST" })
  .validator(likeInput)
  .handler(async ({ data }) => {
    if (!hasSupabaseStorage()) {
      const likes = await readLocalLikes();
      const voters = new Set(likes[data.templateId] ?? []);
      const liked = !voters.has(data.voterKey);
      if (liked) voters.add(data.voterKey);
      else voters.delete(data.voterKey);

      likes[data.templateId] = [...voters];
      await writeLocalLikes(likes);
      return { liked, likeCount: voters.size };
    }

    const rows = await supabaseRpcRequest<ToggleLikeRow[]>("toggle_photobook_template_like", {
      p_template_id: data.templateId,
      p_voter_key: data.voterKey,
    });
    const result = rows[0];
    if (!result) throw new Error("Supabase did not return the updated like state.");

    return {
      liked: Boolean(result.liked),
      likeCount: Math.max(0, Number(result.like_count) || 0),
    };
  });
