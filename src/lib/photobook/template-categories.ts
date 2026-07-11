export const TEMPLATE_CATEGORIES = [
  "Friendship Mag",
  "Journal Mag",
  "Textual Mag",
  "Couple Mag",
  "Anniversary Mag",
  "General Mag",
  "Birthday Mag",
  "Elegant Mag",
  "Fiction",
  "Pinteresty",
  "LOML Mag",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

const exactCategoryAliases: Record<string, TemplateCategory> = {
  friendship: "Friendship Mag",
  friends: "Friendship Mag",
  "friendship mag": "Friendship Mag",
  journal: "Journal Mag",
  "journal mag": "Journal Mag",
  text: "Textual Mag",
  textual: "Textual Mag",
  "textual mag": "Textual Mag",
  couple: "Couple Mag",
  couples: "Couple Mag",
  "couple mag": "Couple Mag",
  anniversary: "Anniversary Mag",
  "anniversary mag": "Anniversary Mag",
  birthday: "Birthday Mag",
  "birthday mag": "Birthday Mag",
  elegant: "Elegant Mag",
  "elegant mag": "Elegant Mag",
  fiction: "Fiction",
  pinterest: "Pinteresty",
  pinteresty: "Pinteresty",
  loml: "LOML Mag",
  "loml mag": "LOML Mag",
  common: "General Mag",
  general: "General Mag",
  "general mag": "General Mag",
  "cover page": "General Mag",
  "back cover": "General Mag",
};

export function normalizeTemplateCategory(value?: string | null): TemplateCategory {
  const key = value?.trim().toLowerCase() ?? "";
  if (!key) return "General Mag";
  if (exactCategoryAliases[key]) return exactCategoryAliases[key];
  if (key.includes("friend")) return "Friendship Mag";
  if (key.includes("journal")) return "Journal Mag";
  if (key.includes("text")) return "Textual Mag";
  if (key.includes("anniversary")) return "Anniversary Mag";
  if (key.includes("birthday")) return "Birthday Mag";
  if (key.includes("elegant")) return "Elegant Mag";
  if (key.includes("fiction")) return "Fiction";
  if (key.includes("pinterest")) return "Pinteresty";
  if (key.includes("loml")) return "LOML Mag";
  if (key.includes("couple") || key.includes("love")) return "Couple Mag";
  return "General Mag";
}
