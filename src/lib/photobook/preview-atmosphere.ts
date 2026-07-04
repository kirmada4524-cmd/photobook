export type PreviewAtmosphereId =
  | "cozy"
  | "studio"
  | "nordic"
  | "sunset"
  | "library"
  | "gallery"
  | "midnight"
  | "custom";

export type PreviewAtmosphere = {
  id: PreviewAtmosphereId;
  label: string;
  swatch: string;
  description: string;
  /** CSS class on shell for desk/light/vignette overrides */
  shellClass: string;
  /** Optional inline background for custom uploaded image */
  customBg?: string;
};

export const PREVIEW_ATMOSPHERES: PreviewAtmosphere[] = [
  {
    id: "cozy",
    label: "Cozy Walnut",
    swatch: "#35200f",
    description: "Warm desk lamp, classic travel journal feel",
    shellClass: "atmosphere-cozy",
  },
  {
    id: "studio",
    label: "Slate Studio",
    swatch: "#1a1e22",
    description: "Clean pro studio with cool rim light",
    shellClass: "atmosphere-studio",
  },
  {
    id: "nordic",
    label: "Nordic Birch",
    swatch: "#dfd0bb",
    description: "Bright Scandinavian wood desk",
    shellClass: "atmosphere-nordic",
  },
  {
    id: "sunset",
    label: "Sunset Hour",
    swatch: "#bf7356",
    description: "Golden hour warmth on terracotta",
    shellClass: "atmosphere-sunset",
  },
  {
    id: "library",
    label: "Grand Library",
    swatch: "#2a1810",
    description: "Rich mahogany shelves & amber glow",
    shellClass: "atmosphere-library",
  },
  {
    id: "gallery",
    label: "White Gallery",
    swatch: "#e8e4dc",
    description: "Museum-grade neutral presentation",
    shellClass: "atmosphere-gallery",
  },
  {
    id: "midnight",
    label: "Midnight Lounge",
    swatch: "#0a1628",
    description: "Deep blue ambient with soft spot",
    shellClass: "atmosphere-midnight",
  },
];

export const PREVIEW_SETTINGS_KEY = "wanderbook-preview-settings-v2";

export type PreviewSettings = {
  atmosphere: PreviewAtmosphereId;
  customBackground?: string;
  enable3DOrbit: boolean;
  enableBookMove: boolean;
  rotateX: number;
  rotateY: number;
  bookOffsetX: number;
  bookOffsetY: number;
  showGuide: boolean;
};

export const DEFAULT_PREVIEW_SETTINGS: PreviewSettings = {
  atmosphere: "cozy",
  enable3DOrbit: false,
  enableBookMove: false,
  rotateX: 12,
  rotateY: 0,
  bookOffsetX: 0,
  bookOffsetY: 0,
  showGuide: true,
};

export function loadPreviewSettings(): PreviewSettings {
  if (typeof window === "undefined") return DEFAULT_PREVIEW_SETTINGS;
  try {
    const raw = localStorage.getItem(PREVIEW_SETTINGS_KEY);
    if (!raw) return DEFAULT_PREVIEW_SETTINGS;
    return { ...DEFAULT_PREVIEW_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREVIEW_SETTINGS;
  }
}

export function savePreviewSettings(settings: PreviewSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREVIEW_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
}
