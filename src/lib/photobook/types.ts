export type LibraryImage = {
  id: string;
  src: string; // data URL
  name: string;
  favorite?: boolean;
  createdAt: number;
  excluded?: boolean;
};

export type FrameStyle =
  | "none"
  | "white"
  | "black"
  | "gold"
  | "polaroid"
  | "vintage"
  | "postcard"
  | "filmstrip"
  | "neon"
  | "wood"
  | "marble"
  | "double"
  | "shadow"
  | "tape"
  | "linen"
  | "negative"
  | "stamp"
  | "lace"
  | "ribbon"
  | "gallery"
  | "travel"
  | "minimal"
  | "comic"
  | "corners"
  | "dashed"
  | "torn"
  | "elegant"
  | "shadow-offset"
  | "deco";

export type ShapeMask =
  | "none"
  | "circle"
  | "rounded"
  | "squircle"
  | "heart"
  | "star"
  | "hexagon"
  | "diamond"
  | "blob"
  | "arch"
  | "triangle"
  | "oval"
  | "ticket"
  | "wave"
  | "shield";

export type PageBorderStyle =
  | "none"
  | "fineGold"
  | "photoCorners"
  | "passport"
  | "tornPaper"
  | "postcard"
  | "botanical"
  | "luxury"
  | "tape"
  | "stitched";

export type ElementBase = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
};

export type PhotoElement = ElementBase & {
  type: "photo";
  imageId: string;
  freePhoto?: boolean;
  frame: FrameStyle;
  shape?: ShapeMask;
  radius: number;
  caption?: string;
  locked?: boolean;
  imageScale?: number;
  imageX?: number;
  imageY?: number;
  imageRotation?: number;
  imageBrightness?: number;
  imageContrast?: number;
  imageSaturation?: number;
  imageGrayscale?: number;
  imageSepia?: number;
  imageBlur?: number;
  imageFilterPreset?: "original" | "vivid" | "warm" | "cool" | "mono" | "film" | "custom";
  opacity?: number;
  frameColor?: string;
  eraseMask?: string;
  magicMask?: string;
  magicFrame?: boolean;
};

export type MagicFrameSelection = {
  x: number;
  y: number;
  w: number;
  h: number;
  maskSrc: string;
};

export type StickerElement = ElementBase & {
  type: "sticker";
  emoji?: string;
  src?: string;
  stickerId?: string;
  locked?: boolean;
};

export type QuoteElement = ElementBase & {
  type: "quote";
  text: string;
  fontSize: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textCurve?: "none" | "arcUp" | "arcDown" | "wave";
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
};

export type TextElement = ElementBase & {
  type: "text";
  text: string;
  fontSize: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textCurve?: "none" | "arcUp" | "arcDown" | "wave";
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
};

export type DrawingElement = ElementBase & {
  type: "drawing";
  path: string;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  brush?: "pen" | "marker" | "highlighter" | "neon" | "pressure";
};

export type PageElement =
  | PhotoElement
  | StickerElement
  | QuoteElement
  | TextElement
  | DrawingElement;

export type BackgroundTheme =
  | "cream"
  | "linen"
  | "vintage"
  | "dark"
  | "minimal"
  | "sunset"
  | "mountain"
  | "pastel"
  | "ocean"
  | "forest"
  | "desert"
  | "noir"
  | "rose"
  | "kraft"
  | "blueprint"
  | "terrazzo"
  | "coverLuxe"
  | "passport"
  | "map"
  | "boarding"
  | "tropical"
  | "alpine"
  | "city"
  | "postcard"
  | "journal"
  | "botanical";

export type Page = {
  id: string;
  background: string;
  border?: PageBorderStyle;
  backgroundMode?: "cover" | "contain" | "stretch";
  eraserOverlay?: string;
  elements: PageElement[];
  backgroundScale?: number;
  backgroundX?: number;
  backgroundY?: number;
  frameLocked?: boolean;
  backgroundLocked?: boolean;
  sourceTemplateId?: string;
  adminTemplateProtected?: boolean;
};

export type EmbeddedAsset = {
  id: string;
  name: string;
  base64: string;
  type: "sticker" | "background" | "photo";
};

export type SavedPageTemplate = {
  id: string;
  label: string;
  background: string;
  border?: PageBorderStyle;
  backgroundMode?: "cover" | "contain" | "stretch";
  eraserOverlay?: string;
  elements: PageElement[];
  embeddedAssets?: EmbeddedAsset[];
  thumbnail?: string;
  backgroundScale?: number;
  backgroundX?: number;
  backgroundY?: number;
  sizeId?: string;
  category?: string;
  frameLocked?: boolean;
  backgroundLocked?: boolean;
  isAdminTemplate?: boolean;
  sortOrder?: number;
};

export type GlobalStickerAsset = {
  id: string;
  name: string;
  src: string;
  fileId?: string;
  folderId: string;
  createdAt: number;
};

export type GlobalStickerFolder = {
  id: string;
  name: string;
  stickers: GlobalStickerAsset[];
  createdAt: number;
  sortOrder?: number;
};

export type GlobalBackgroundAsset = {
  id: string;
  name: string;
  src: string;
  fileId?: string;
  createdAt: number;
};

export type AdminAssetLibrary = {
  stickerFolders: GlobalStickerFolder[];
  backgrounds: GlobalBackgroundAsset[];
};

export type Book = {
  title: string;
  theme: BackgroundTheme;
  pages: Page[];
  pageSizeId?: string;
};

export const PAGE_W = 1100;
export const PAGE_H = 780;

export type PageSizePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
};

export const FIXED_PAGE_SIZE_ID = "square_mini";

export const PAGE_SIZES: PageSizePreset[] = [
  {
    id: FIXED_PAGE_SIZE_ID,
    label: 'Mini Square (5.5" x 5.5")',
    width: 550,
    height: 550,
    aspectRatio: "1:1",
  },
];

export const FIXED_PAGE_SIZE = PAGE_SIZES[0];

export const normalizePageSizeId = () => FIXED_PAGE_SIZE_ID;
