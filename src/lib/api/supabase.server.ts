const supabaseUrl = () => process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || "";
const supabaseServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

export const hasSupabaseStorage = () => Boolean(supabaseUrl() && supabaseServiceKey());

export const missingSupabaseStorageError = () =>
  new Error(
    "Missing Supabase credentials. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Vercel environment variables.",
  );

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: string;
  body?: unknown;
  prefer?: string;
};

export async function supabaseTableRequest<T>(
  table: string,
  { method = "GET", query = "", body, prefer }: RequestOptions = {},
): Promise<T> {
  const url = supabaseUrl();
  const key = supabaseServiceKey();
  if (!url || !key) throw missingSupabaseStorageError();

  const response = await fetch(
    `${url}/rest/v1/${encodeURIComponent(table)}${query ? `?${query}` : ""}`,
    {
      method,
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        ...(prefer ? { prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Supabase ${method} ${table} failed: ${response.status} ${response.statusText} - ${details}`,
    );
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const encodeFilterValue = (value: string) => encodeURIComponent(value);
