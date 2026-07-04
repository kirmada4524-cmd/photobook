import type { CSSProperties } from "react";
import type { BackgroundTheme, FrameStyle, PageBorderStyle, ShapeMask } from "./types";

export const STICKERS = [
  "✈️",
  "📍",
  "🌍",
  "🧭",
  "🏔️",
  "🌲",
  "☁️",
  "🌅",
  "📸",
  "🧳",
  "🚂",
  "🚗",
  "⛺",
  "🐾",
  "🌴",
  "🗺️",
  "🏝️",
  "🌊",
  "🌞",
  "🌙",
  "⭐",
  "❤️",
  "🎒",
  "📖",
];

export const QUOTES = [
  "Collect memories, not things.",
  "Adventure awaits.",
  "Life is short and the world is wide.",
  "Travel leaves you speechless, then turns you into a storyteller.",
  "The journey is the destination.",
  "Take only memories, leave only footprints.",
  "Every picture tells a story.",
  "Escape the ordinary.",
  "Wander often, wonder always.",
  "Not all those who wander are lost.",
];

export const FRAMES: { id: FrameStyle; label: string }[] = [
  { id: "none", label: "None" },
  { id: "white", label: "White" },
  { id: "black", label: "Black" },
  { id: "gold", label: "Gold" },
  { id: "polaroid", label: "Polaroid" },
  { id: "vintage", label: "Vintage" },
  { id: "postcard", label: "Postcard" },
  { id: "filmstrip", label: "Film" },
  { id: "neon", label: "Neon" },
  { id: "wood", label: "Wood" },
  { id: "marble", label: "Marble" },
  { id: "double", label: "Double" },
  { id: "shadow", label: "Floating" },
  { id: "tape", label: "Taped" },
  { id: "linen", label: "Linen" },
  { id: "negative", label: "Negative" },
  { id: "stamp", label: "Stamp" },
  { id: "lace", label: "Lace" },
  { id: "ribbon", label: "Ribbon" },
  { id: "gallery", label: "Gallery" },
  { id: "travel", label: "Travel" },
  { id: "minimal", label: "Minimal" },
  { id: "comic", label: "Comic Book" },
  { id: "corners", label: "Corners" },
  { id: "dashed", label: "Dashed" },
  { id: "torn", label: "Torn Paper" },
  { id: "elegant", label: "Elegant Gold" },
  { id: "shadow-offset", label: "Shadow Offset" },
  { id: "deco", label: "Art Deco" },
];

export const PAGE_BORDERS: { id: PageBorderStyle; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fineGold", label: "Fine Gold" },
  { id: "photoCorners", label: "Photo Corners" },
  { id: "passport", label: "Passport" },
  { id: "tornPaper", label: "Torn Paper" },
  { id: "postcard", label: "Postcard" },
  { id: "botanical", label: "Botanical" },
  { id: "luxury", label: "Luxury" },
  { id: "tape", label: "Tape" },
  { id: "stitched", label: "Stitched" },
];

export const THEMES: { id: BackgroundTheme; label: string; cls: string }[] = [
  { id: "cream", label: "Cream Paper", cls: "bg-paper-cream" },
  { id: "linen", label: "Linen", cls: "bg-paper-linen" },
  { id: "vintage", label: "Vintage", cls: "bg-paper-vintage" },
  { id: "dark", label: "Dark Luxury", cls: "bg-paper-dark" },
  { id: "minimal", label: "Minimal", cls: "bg-paper-minimal" },
  { id: "sunset", label: "Sunset", cls: "bg-paper-sunset" },
  { id: "mountain", label: "Mountain", cls: "bg-paper-mountain" },
  { id: "pastel", label: "Pastel", cls: "bg-paper-pastel" },
  { id: "ocean", label: "Ocean", cls: "bg-paper-ocean" },
  { id: "forest", label: "Forest", cls: "bg-paper-forest" },
  { id: "desert", label: "Desert", cls: "bg-paper-desert" },
  { id: "noir", label: "Noir", cls: "bg-paper-noir" },
  { id: "rose", label: "Rose Gold", cls: "bg-paper-rose" },
  { id: "kraft", label: "Kraft", cls: "bg-paper-kraft" },
  { id: "blueprint", label: "Blueprint", cls: "bg-paper-blueprint" },
  { id: "terrazzo", label: "Terrazzo", cls: "bg-paper-terrazzo" },
  { id: "coverLuxe", label: "Cover Luxe", cls: "bg-paper-cover-luxe" },
  { id: "passport", label: "Passport", cls: "bg-paper-passport" },
  { id: "map", label: "Map Sketch", cls: "bg-paper-map" },
  { id: "boarding", label: "Boarding Pass", cls: "bg-paper-boarding" },
  { id: "tropical", label: "Tropical", cls: "bg-paper-tropical" },
  { id: "alpine", label: "Alpine", cls: "bg-paper-alpine" },
  { id: "city", label: "City Lights", cls: "bg-paper-city" },
  { id: "postcard", label: "Postcard", cls: "bg-paper-postcard" },
  { id: "journal", label: "Travel Journal", cls: "bg-paper-journal" },
  { id: "botanical", label: "Botanical", cls: "bg-paper-botanical" },
];

export const themeClass = (t: BackgroundTheme) =>
  THEMES.find((x) => x.id === t)?.cls ?? "bg-paper-cream";

export const SHAPES: { id: ShapeMask; label: string; clip?: string; radius?: string }[] = [
  { id: "none", label: "Rect" },
  { id: "rounded", label: "Rounded", radius: "24px" },
  { id: "squircle", label: "Squircle", radius: "30%" },
  { id: "circle", label: "Circle", radius: "50%" },
  {
    id: "heart",
    label: "Heart",
    clip: "polygon(50% 100%, 0% 38%, 8% 18%, 28% 8%, 50% 22%, 72% 8%, 92% 18%, 100% 38%)",
  },
  {
    id: "star",
    label: "Star",
    clip: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  },
  {
    id: "hexagon",
    label: "Hex",
    clip: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
  },
  {
    id: "diamond",
    label: "Diamond",
    clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  },
  {
    id: "blob",
    label: "Blob",
    clip: "polygon(30% 5%, 70% 8%, 92% 25%, 98% 55%, 85% 85%, 55% 98%, 25% 92%, 5% 70%, 2% 40%, 15% 15%)",
  },
  {
    id: "arch",
    label: "Arch",
    clip: "polygon(0% 100%, 0% 40%, 8% 20%, 30% 5%, 70% 5%, 92% 20%, 100% 40%, 100% 100%)",
  },
  {
    id: "triangle",
    label: "Triangle",
    clip: "polygon(50% 0%, 100% 100%, 0% 100%)",
  },
  { id: "oval", label: "Oval", radius: "50% / 38%" },
  {
    id: "ticket",
    label: "Ticket",
    clip: "polygon(0 0, 100% 0, 100% 36%, 92% 50%, 100% 64%, 100% 100%, 0 100%, 0 64%, 8% 50%, 0 36%)",
  },
  {
    id: "wave",
    label: "Wave",
    clip: "polygon(0 12%, 18% 5%, 36% 13%, 54% 5%, 74% 13%, 100% 6%, 100% 88%, 82% 95%, 64% 87%, 46% 95%, 26% 87%, 0 94%)",
  },
  {
    id: "shield",
    label: "Shield",
    clip: "polygon(50% 0%, 94% 16%, 86% 72%, 50% 100%, 14% 72%, 6% 16%)",
  },
];

export const shapeStyle = (s: ShapeMask | undefined, fallbackRadius: number): CSSProperties => {
  if (!s || s === "none") return { borderRadius: fallbackRadius };
  const def = SHAPES.find((x) => x.id === s);
  if (!def) return { borderRadius: fallbackRadius };
  if (def.clip) return { clipPath: def.clip, WebkitClipPath: def.clip } as CSSProperties;
  if (def.radius) return { borderRadius: def.radius };
  return { borderRadius: fallbackRadius };
};
