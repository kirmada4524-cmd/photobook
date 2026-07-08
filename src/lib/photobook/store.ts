import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  appendAdminTemplates,
  deleteAdminTemplateById,
  getAdminTemplates,
  saveAdminTemplates,
  updateAdminTemplateById,
  uploadTemplateAsset,
} from "@/lib/api/templates.functions";
import {
  addAdminBackgrounds,
  addAdminStickers,
  createAdminStickerFolder,
  deleteAdminBackground,
  deleteAdminSticker,
  deleteAdminStickerFolder,
  getAdminAssets,
  updateAdminStickerFolder,
} from "@/lib/api/admin-assets.functions";
import { temporal } from "zundo";
import { FIXED_PAGE_SIZE_ID, PAGE_SIZES } from "./types";
import type {
  AdminAssetLibrary,
  Book,
  GlobalBackgroundAsset,
  GlobalStickerFolder,
  LibraryImage,
  MagicFrameSelection,
  Page,
  PageElement,
  PhotoElement,
  BackgroundTheme,
  PageBorderStyle,
  SavedPageTemplate,
  EmbeddedAsset,
} from "./types";
import { applyTemplate, type TemplateId } from "./templates";
import {
  saveImageToDB,
  deleteImageFromDB,
  updateImageFavoriteInDB,
  updateImageExcludeInDB,
  loadImagesFromDB,
  clearAllImagesFromDB,
  saveCustomSticker,
  deleteCustomSticker,
  loadCustomStickers,
  clearCustomStickersFromDB,
  saveCustomBg,
  deleteCustomBg,
  loadCustomBgs,
  clearCustomBgsFromDB,
} from "./db";

const nid = (p = "id") => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const OLD_DESIGN_ASSETS_CLEARED_KEY = "travelogue-old-design-assets-cleared-v2";
const MAX_GLOBAL_TEMPLATE_ASSET_DATA_URL_LENGTH = 800_000;

const isDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:");

const shouldUploadTemplateAsset = (value: string) =>
  isDataUrl(value) || value.startsWith("blob:");

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const compressTemplateAssetForUpload = async (
  dataUrl: string,
  kind: "background" | "sticker" | "overlay" | "thumbnail",
) => {
  if (dataUrl.length <= MAX_GLOBAL_TEMPLATE_ASSET_DATA_URL_LENGTH) return dataUrl;
  if (typeof window === "undefined" || dataUrl.startsWith("data:image/svg+xml")) return dataUrl;

  const blob = await fetch(dataUrl).then((response) => response.blob());
  const img = new window.Image();
  const objectUrl = URL.createObjectURL(blob);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = objectUrl;
    });

    const maxDim = kind === "sticker" ? 1200 : kind === "thumbnail" ? 1200 : 2200;
    const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * ratio));
    const height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0, width, height);
    if (kind === "sticker") {
      let quality = 0.92;
      let compressed = canvas.toDataURL("image/webp", quality);
      while (compressed.length > MAX_GLOBAL_TEMPLATE_ASSET_DATA_URL_LENGTH && quality > 0.55) {
        quality -= 0.07;
        compressed = canvas.toDataURL("image/webp", quality);
      }
      return compressed;
    }

    let quality = 0.9;
    let compressed = canvas.toDataURL("image/jpeg", quality);

    while (compressed.length > MAX_GLOBAL_TEMPLATE_ASSET_DATA_URL_LENGTH && quality > 0.55) {
      quality -= 0.07;
      compressed = canvas.toDataURL("image/jpeg", quality);
    }

    canvas.width = 1;
    canvas.height = 1;
    return compressed;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const uploadGlobalTemplateAsset = async (
  kind: "background" | "sticker" | "overlay" | "thumbnail",
  name: string,
  dataUrl: string,
) => {
  const uploadable = await compressTemplateAssetForUpload(dataUrl, kind);
  const result = await uploadTemplateAsset({ data: { kind, name, dataUrl: uploadable } });
  return result.url;
};

const safeLocalStorage = {
  getItem: (name: string) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(name, value);
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        console.warn("Photobook autosave skipped because browser storage is full.");
        return;
      }
      console.warn("Photobook autosave skipped.", error);
    }
  },
  removeItem: (name: string) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    } catch {
      // Ignore storage cleanup failures.
    }
  },
};

const blankPage = (theme: BackgroundTheme = "cream"): Page => ({
  id: nid("pg"),
  background: theme,
  border: "none",
  elements: [],
});

const withFixedPageSize = (book: Book): Book => ({
  ...book,
  pageSizeId: FIXED_PAGE_SIZE_ID,
});

export type AutofillResult = {
  framesFilled: number;
  pagesTouched: number;
  framesUnlocked: number;
  skippedReason?: "no-empty-frames" | "no-available-images" | "no-photo-frames";
};

export type SavedProjectMetadata = {
  id: string;
  label: string;
  updatedAt: number;
  pageSizeId: string;
  cover?: string;
};

type State = {
  book: Book;
  library: LibraryImage[];
  currentPageId: string;
  selectedElementId: string | null;
  zoom: number;
  showLibrarySidebar: boolean;
  showDesignSidebar: boolean;
  copiedElement: PageElement | null;
  librarySidebarWidth: number;
  designSidebarWidth: number;
  customTemplates: SavedPageTemplate[];
  customStickersList: { id: string; src: string; name: string }[];
  customBackgroundsList: { id: string; src: string; name: string }[];
  savedProjects: SavedProjectMetadata[];
  projectFilePath: string | null;
  isEraserMode: boolean;
  eraserBrushSize: number;
  isMagicLayoutMode: boolean;
  magicLayoutTolerance: number;
  magicLayoutFeather: number;
  magicLayoutExpand: number;
  editingBackgroundPageId: string | null;
  adminTemplates: SavedPageTemplate[];
  adminStickerFolders: GlobalStickerFolder[];
  adminBackgrounds: GlobalBackgroundAsset[];
  adminAssetsLoaded: boolean;
  recentProjects: { id: string; title: string; savedAt: number; sizeId?: string }[];
};

type Actions = {
  setTitle: (t: string) => void;
  setTheme: (t: BackgroundTheme) => void;
  addImages: (imgs: LibraryImage[]) => void;
  addImagesFromFiles: (files: File[]) => Promise<string[]>;
  initLibrary: () => Promise<void>;
  toggleExclude: (id: string) => void;
  setPageSize: (sizeId: string) => void;
  shufflePageImages: (pageId: string) => void;
  autofillLeastUsedImages: (pageId: string) => AutofillResult;
  autofillAllEmptyFrames: () => AutofillResult;
  clearEmptyPhotoFrames: (pageId?: string) => number;
  toggleLibrarySidebar: () => void;
  toggleDesignSidebar: () => void;
  removeImage: (id: string) => void;
  toggleFavorite: (id: string) => void;
  reorderLibrary: (ids: string[]) => void;

  addPage: () => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  setCurrentPage: (id: string) => void;
  setPageBackground: (id: string, bg: string) => void;
  setPageBorder: (id: string, border: PageBorderStyle) => void;
  updatePageBackgroundMode: (id: string, mode: "cover" | "contain" | "stretch") => void;
  updatePageBackgroundPosition: (pageId: string, x: number, y: number) => void;
  updatePageBackgroundScale: (pageId: string, scale: number) => void;
  setEditingBackgroundPageId: (pageId: string | null) => void;
  reorderPages: (ids: string[]) => void;

  addElement: (el: PageElement) => void;
  updateElement: (id: string, patch: Partial<PageElement>) => void;
  removeElement: (id: string) => void;
  replacePhotoImage: (elementId: string, imageId: string) => void;
  clearPhotoImage: (elementId: string) => void;
  bringToFront: (id: string) => void;
  moveElementLayer: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  selectElement: (id: string | null) => void;

  applyLayout: (templateId: TemplateId) => void;
  addPhotoToCurrentPage: (imageId: string, x?: number, y?: number) => void;
  addStickerToCurrentPage: (emojiOrSrc: string) => void;
  addQuoteToCurrentPage: (text: string) => void;
  addTextToCurrentPage: (text?: string) => void;

  setZoom: (z: number) => void;
  resetBook: () => void;
  copyElement: (id: string) => void;
  pasteElement: () => void;
  setLibrarySidebarWidth: (w: number) => void;
  setDesignSidebarWidth: (w: number) => void;

  savePageAsTemplate: (pageId: string, label: string, thumbnail?: string, opts?: {
    sizeId?: string;
    category?: string;
    frameLocked?: boolean;
    backgroundLocked?: boolean;
    isAdminTemplate?: boolean;
  }) => Promise<void>;
  deleteCustomTemplate: (templateId: string) => void;
  importCustomTemplate: (template: SavedPageTemplate) => void;
  applyPageTemplate: (template: SavedPageTemplate) => Promise<void>;

  addCustomSticker: (file: File) => Promise<void>;
  deleteCustomSticker: (id: string) => Promise<void>;
  addCustomBackground: (file: File) => Promise<void>;
  deleteCustomBackground: (id: string) => Promise<void>;
  initCustomAssets: () => Promise<void>;
  setProjectFilePath: (path: string | null) => void;
  setIsEraserMode: (b: boolean) => void;
  setEraserBrushSize: (size: number) => void;
  setIsMagicLayoutMode: (b: boolean) => void;
  setMagicLayoutTolerance: (value: number) => void;
  setMagicLayoutFeather: (value: number) => void;
  setMagicLayoutExpand: (value: number) => void;
  addMagicPhotoFrame: (pageId: string, selection: MagicFrameSelection) => string | null;
  replacePhotoImageAfterErase: (elementId: string, imageId: string) => void;
  setPageOverlay: (pageId: string, overlay: string | null) => void;


  addAdminTemplate: (template: SavedPageTemplate) => void;
  addAdminTemplates: (templates: SavedPageTemplate[]) => void;
  deleteAdminTemplate: (templateId: string) => Promise<void>;
  deleteAdminTemplates: (templateIds: string[]) => Promise<void>;
  reorderAdminTemplates: (ids: string[]) => void;
  updateAdminTemplate: (templateId: string, patch: Partial<SavedPageTemplate>) => void;
  initAdminTemplates: () => Promise<void>;
  initAdminAssets: () => Promise<void>;
  createAdminStickerFolder: (name: string) => Promise<void>;
  updateAdminStickerFolder: (folderId: string, name: string) => Promise<void>;
  deleteAdminStickerFolder: (folderId: string) => Promise<void>;
  addAdminStickersToFolder: (
    folderId: string,
    files: { name: string; dataUrl: string }[],
  ) => Promise<void>;
  deleteAdminSticker: (folderId: string, stickerId: string) => Promise<void>;
  addAdminBackgrounds: (files: { name: string; dataUrl: string }[]) => Promise<void>;
  deleteAdminBackground: (backgroundId: string) => Promise<void>;
  
  addRecentProject: (id: string, title: string, sizeId?: string) => void;
  clearRecentProjects: () => void;
};

const initialPage: Page = {
  id: "pg_initial",
  background: "cream",
  border: "none",
  elements: [],
};

function getLeastUsedImages(library: LibraryImage[], pages: Page[]) {
  const usedCounts = new Map<string, number>();
  pages.forEach((page) => {
    page.elements.forEach((el) => {
      if (el.type === "photo" && el.imageId) {
        usedCounts.set(el.imageId, (usedCounts.get(el.imageId) ?? 0) + 1);
      }
    });
  });

  return library
    .filter((img) => !img.excluded)
    .map((img) => ({
      img,
      count: usedCounts.get(img.id) ?? 0,
      rand: Math.random(),
    }))
    .sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;
      return a.rand - b.rand;
    })
    .map(({ img }) => img);
}

const adminAssetState = (library: AdminAssetLibrary) => ({
  adminStickerFolders: [...library.stickerFolders].sort(
    (a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt),
  ),
  adminBackgrounds: [...library.backgrounds].sort((a, b) => a.createdAt - b.createdAt),
});

function fillEmptyFrames(
  state: State,
  pageId?: string,
): { stats: AutofillResult; nextBook?: Book } {
  const candidatePages = pageId
    ? state.book.pages.filter((page) => page.id === pageId)
    : state.book.pages;
  const hasPhotoFrames = candidatePages.some((page) =>
    page.elements.some((el) => el.type === "photo"),
  );
  if (!hasPhotoFrames) {
    return {
      stats: {
        framesFilled: 0,
        pagesTouched: 0,
        framesUnlocked: 0,
        skippedReason: "no-photo-frames",
      },
    };
  }

  const availableImages = getLeastUsedImages(state.library, state.book.pages);
  if (availableImages.length === 0) {
    return {
      stats: {
        framesFilled: 0,
        pagesTouched: 0,
        framesUnlocked: 0,
        skippedReason: "no-available-images",
      },
    };
  }

  let pickIndex = 0;
  let framesFilled = 0;
  let framesUnlocked = 0;
  const touchedPageIds = new Set<string>();

  const pages = state.book.pages.map((page) => {
    if (pageId && page.id !== pageId) return page;

    let changed = false;
    const elements = page.elements.map((el) => {
      if (el.type !== "photo") return el;
      const hasImage = el.imageId && state.library.some((img) => img.id === el.imageId);
      if (hasImage) return el;

      const picked = availableImages[pickIndex % availableImages.length];
      pickIndex++;
      framesFilled++;
      touchedPageIds.add(page.id);
      changed = true;

      if (el.locked) framesUnlocked++;
      return { ...el, imageId: picked.id, locked: false } as PhotoElement;
    });

    return changed ? { ...page, elements } : page;
  });

  if (framesFilled === 0) {
    return {
      stats: {
        framesFilled: 0,
        pagesTouched: 0,
        framesUnlocked: 0,
        skippedReason: "no-empty-frames",
      },
    };
  }

  return {
    stats: {
      framesFilled,
      pagesTouched: touchedPageIds.size,
      framesUnlocked,
    },
    nextBook: { ...state.book, pages },
  };
}

function fillPageFrames(state: State, pageId: string): { stats: AutofillResult; nextBook?: Book } {
  const page = state.book.pages.find((p) => p.id === pageId);
  if (!page || !page.elements.some((el) => el.type === "photo")) {
    return {
      stats: {
        framesFilled: 0,
        pagesTouched: 0,
        framesUnlocked: 0,
        skippedReason: "no-photo-frames",
      },
    };
  }

  const availableImages = getLeastUsedImages(state.library, state.book.pages);
  if (availableImages.length === 0) {
    return {
      stats: {
        framesFilled: 0,
        pagesTouched: 0,
        framesUnlocked: 0,
        skippedReason: "no-available-images",
      },
    };
  }

  let pickIndex = 0;
  let framesFilled = 0;
  let framesUnlocked = 0;

  const pages = state.book.pages.map((p) => {
    if (p.id !== pageId) return p;

    let changed = false;
    const elements = p.elements.map((el) => {
      if (el.type !== "photo") return el;

      const hasImage = el.imageId && state.library.some((img) => img.id === el.imageId);
      const shouldFill = !el.locked || !hasImage;
      if (!shouldFill) return el;

      const picked = availableImages[pickIndex % availableImages.length];
      pickIndex++;
      framesFilled++;
      changed = true;

      if (el.locked && !hasImage) framesUnlocked++;
      return { ...el, imageId: picked.id, locked: hasImage ? el.locked : false } as PhotoElement;
    });

    return changed ? { ...p, elements } : p;
  });

  if (framesFilled === 0) {
    return {
      stats: {
        framesFilled: 0,
        pagesTouched: 0,
        framesUnlocked: 0,
        skippedReason: "no-empty-frames",
      },
    };
  }

  return {
    stats: {
      framesFilled,
      pagesTouched: 1,
      framesUnlocked,
    },
    nextBook: { ...state.book, pages },
  };
}

export const useBookStore = create<State & Actions>()(
  persist(
    temporal(
      (set, get) => ({
        book: { title: "", theme: "cream", pages: [initialPage], pageSizeId: FIXED_PAGE_SIZE_ID },
        library: [],
        currentPageId: initialPage.id,
        selectedElementId: null,
        zoom: 1.0,
        customTemplates: [],
        customStickersList: [],
        customBackgroundsList: [],
        projectFilePath: null,
        isEraserMode: false,
        eraserBrushSize: 30,
        isMagicLayoutMode: false,
        magicLayoutTolerance: 25,
        magicLayoutFeather: 1,
        magicLayoutExpand: 0,
        editingBackgroundPageId: null,
          adminTemplates: [],
          adminStickerFolders: [],
          adminBackgrounds: [],
          adminAssetsLoaded: false,
          recentProjects: [],
        savedProjects: [],

        setTitle: (t) => set((s) => ({ book: { ...s.book, title: t } })),
        setTheme: (t) =>
          set((s) => ({
            book: {
              ...s.book,
              theme: t,
              pages: s.book.pages.map((p) => ({ ...p, background: t })),
            },
          })),

        addImages: (imgs) =>
          set((s) => ({
            library: [...s.library, ...imgs],
          })),
        removeImage: (id) => {
          const img = get().library.find((i) => i.id === id);
          if (img && img.src.startsWith("blob:")) {
            URL.revokeObjectURL(img.src);
          }
          deleteImageFromDB(id);
          set((s) => ({
            library: s.library.filter((i) => i.id !== id),
            book: {
              ...s.book,
              pages: s.book.pages.map((p) => ({
                ...p,
                elements: p.elements.map((el) =>
                  el.type === "photo" && el.imageId === id ? { ...el, imageId: "" } : el,
                ),
              })),
            },
          }));
        },
        toggleFavorite: (id) => {
          const img = get().library.find((i) => i.id === id);
          if (img) {
            const nextFav = !img.favorite;
            updateImageFavoriteInDB(id, nextFav);
            set((s) => ({
              library: s.library.map((i) => (i.id === id ? { ...i, favorite: nextFav } : i)),
            }));
          }
        },
        reorderLibrary: (ids) =>
          set((s) => ({
            library: ids.map((id) => s.library.find((i) => i.id === id)!).filter(Boolean),
          })),

        addPage: () =>
          set((s) => {
            const p = blankPage(s.book.theme);
            return { book: { ...s.book, pages: [...s.book.pages, p] }, currentPageId: p.id };
          }),
        duplicatePage: (id) =>
          set((s) => {
            const idx = s.book.pages.findIndex((p) => p.id === id);
            if (idx < 0) return s;
            const orig = s.book.pages[idx];
            const copy: Page = {
              ...orig,
              id: nid("pg"),
              elements: orig.elements.map((e) => ({ ...e, id: nid("el") })),
            };
            const pages = [...s.book.pages];
            pages.splice(idx + 1, 0, copy);
            return { book: { ...s.book, pages }, currentPageId: copy.id };
          }),
        deletePage: (id) =>
          set((s) => {
            if (s.book.pages.length <= 1) return s;
            const pages = s.book.pages.filter((p) => p.id !== id);
            return {
              book: { ...s.book, pages },
              currentPageId: s.currentPageId === id ? pages[0].id : s.currentPageId,
            };
          }),
        setCurrentPage: (id) => set({ currentPageId: id, selectedElementId: null }),
        setPageBackground: (id, bg) =>
          set((s) => {
            const page = s.book.pages.find((p) => p.id === id);
            if (page?.backgroundLocked) return s;
            return {
              book: {
                ...s.book,
                pages: s.book.pages.map((p) =>
                  p.id === id
                    ? {
                        ...p,
                        background: bg,
                        backgroundScale: 1,
                        backgroundX: 0,
                        backgroundY: 0,
                      }
                    : p,
                ),
              },
            };
          }),
        setPageBorder: (id, border) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) => (p.id === id ? { ...p, border } : p)),
            },
          })),
        updatePageBackgroundMode: (id, mode) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) => (p.id === id ? { ...p, backgroundMode: mode } : p)),
            },
          })),
        updatePageBackgroundPosition: (pageId, x, y) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.id === pageId ? { ...p, backgroundX: x, backgroundY: y } : p,
              ),
            },
          })),
        updatePageBackgroundScale: (pageId, scale) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.id === pageId ? { ...p, backgroundScale: Math.max(1, scale) } : p,
              ),
            },
          })),
        setEditingBackgroundPageId: (pageId) => set({ editingBackgroundPageId: pageId }),
        reorderPages: (ids) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: ids.map((id) => s.book.pages.find((p) => p.id === id)!).filter(Boolean),
            },
          })),

        addElement: (el) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.id === s.currentPageId ? { ...p, elements: [...p.elements, el] } : p,
              ),
            },
            selectedElementId: el.id,
          })),
        updateElement: (id, patch) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.elements.some((e) => e.id === id)
                  ? {
                      ...p,
                      elements: p.elements.map((e) =>
                        e.id === id ? ({ ...e, ...patch } as PageElement) : e,
                      ),
                    }
                  : p,
              ),
            },
          })),
        removeElement: (id) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.elements.some((e) => e.id === id)
                  ? { ...p, elements: p.elements.filter((e) => e.id !== id) }
                  : p,
              ),
            },
            selectedElementId: null,
          })),
        replacePhotoImage: (elementId, imageId) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.elements.some((e) => e.id === elementId)
                  ? {
                      ...p,
                      elements: p.elements.map((e) =>
                        e.id === elementId && e.type === "photo"
                          ? { ...e, imageId, eraseMask: undefined }
                          : e,
                      ),
                    }
                  : p,
              ),
            },
            selectedElementId: elementId,
          })),
        clearPhotoImage: (elementId) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.elements.some((e) => e.id === elementId)
                  ? {
                      ...p,
                      elements: p.elements.map((e) =>
                        e.id === elementId && e.type === "photo"
                          ? { ...e, imageId: "", eraseMask: undefined }
                          : e,
                      ),
                    }
                  : p,
              ),
            },
            selectedElementId: elementId,
          })),
        bringToFront: (id) =>
          set((s) => {
            const page = s.book.pages.find((p) => p.elements.some((e) => e.id === id));
            if (!page) return s;
            const maxZ = Math.max(0, ...page.elements.map((e) => e.z));
            return {
              book: {
                ...s.book,
                pages: s.book.pages.map((p) =>
                  p.id === page.id
                    ? {
                        ...p,
                        elements: p.elements.map((e) => (e.id === id ? { ...e, z: maxZ + 1 } : e)),
                      }
                    : p,
                ),
              },
            };
          }),
        moveElementLayer: (id, direction) =>
          set((s) => {
            const page = s.book.pages.find((p) => p.elements.some((e) => e.id === id));
            if (!page) return s;
            const sorted = [...page.elements].sort((a, b) => a.z - b.z);
            const index = sorted.findIndex((e) => e.id === id);
            if (index < 0) return s;
            if (direction === "front") sorted.push(...sorted.splice(index, 1));
            if (direction === "back") sorted.unshift(...sorted.splice(index, 1));
            if (direction === "forward" && index < sorted.length - 1) {
              [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
            }
            if (direction === "backward" && index > 0) {
              [sorted[index - 1], sorted[index]] = [sorted[index], sorted[index - 1]];
            }
            const zById = new Map(sorted.map((e, i) => [e.id, i + 1]));
            return {
              book: {
                ...s.book,
                pages: s.book.pages.map((p) =>
                  p.id === page.id
                    ? {
                        ...p,
                        elements: p.elements.map((e) => ({ ...e, z: zById.get(e.id) ?? e.z })),
                      }
                    : p,
                ),
              },
            };
          }),
        selectElement: (id) => set({ selectedElementId: id }),

        applyLayout: (templateId) =>
          set((s) => {
            const page = s.book.pages.find((p) => p.id === s.currentPageId);
            if (!page) return s;
            const existing = page.elements.filter((e) => e.type === "photo") as PhotoElement[];
            const ids = existing.length > 0 ? existing.map((e) => e.imageId) : [];

            const preset = PAGE_SIZES[0];
            const templatePhotos = applyTemplate(templateId, ids, preset.width, preset.height);
            const newPhotos = (Array.isArray(templatePhotos) ? templatePhotos : []).filter(
              (el): el is PhotoElement =>
                el?.type === "photo" &&
                Number.isFinite(el.x) &&
                Number.isFinite(el.y) &&
                Number.isFinite(el.w) &&
                Number.isFinite(el.h) &&
                el.w > 0 &&
                el.h > 0,
            );
            if (newPhotos.length === 0) return s;

            const nonPhotos = page.elements.filter((e) => e.type !== "photo");
            return {
              book: {
                ...s.book,
                pages: s.book.pages.map((p) =>
                  p.id === s.currentPageId ? { ...p, elements: [...newPhotos, ...nonPhotos] } : p,
                ),
              },
              selectedElementId: null,
            };
          }),

        addPhotoToCurrentPage: (imageId, x = 100, y = 100) => {
          const state = get();
          const page = state.book.pages.find((p) => p.id === state.currentPageId);
          if (!page) return;

          // 1. If a photo element is currently selected, replace its image
          if (state.selectedElementId) {
            const selectedEl = page.elements.find((e) => e.id === state.selectedElementId);
            if (selectedEl && selectedEl.type === "photo") {
              state.updateElement(selectedEl.id, { imageId });
              return;
            }
          }

          // 2. Otherwise, if there is an empty photo frame, fill the first one
          const emptyFrame = page.elements.find((e) => e.type === "photo" && !("imageId" in e) || !(e as PhotoElement).imageId);
          if (emptyFrame) {
            state.updateElement(emptyFrame.id, { imageId });
            return;
          }

          // 3. Otherwise, add as a new floating photo element
          const el: PhotoElement = {
            id: nid("el"),
            type: "photo",
            imageId,
            x,
            y,
            w: 360,
            h: 360,
            rotation: 0,
            z: 10,
            frame: "none",
            radius: 16,
          };
          state.addElement(el);
        },
        addStickerToCurrentPage: (emojiOrSrc) => {
          const isCustom = emojiOrSrc.startsWith("stk_");
          const isEmoji =
            !isCustom &&
            emojiOrSrc.length <= 4 &&
            !emojiOrSrc.startsWith("data:") &&
            !emojiOrSrc.startsWith("http") &&
            !emojiOrSrc.startsWith("/");
          get().addElement({
            id: nid("el"),
            type: "sticker",
            ...(isCustom
              ? { stickerId: emojiOrSrc }
              : isEmoji
                ? { emoji: emojiOrSrc }
                : { src: emojiOrSrc }),
            x: 480,
            y: 320,
            w: 120,
            h: 120,
            rotation: 0,
            z: 50,
          });
        },
        addQuoteToCurrentPage: (text) => {
          get().addElement({
            id: nid("el"),
            type: "quote",
            text,
            fontSize: 32,
            x: 200,
            y: 300,
            w: 700,
            h: 180,
            rotation: 0,
            z: 50,
          });
        },
        addTextToCurrentPage: (text = "Your Text Here") => {
          get().addElement({
            id: nid("el"),
            type: "text",
            text,
            fontSize: 28,
            x: 300,
            y: 200,
            w: 400,
            h: 100,
            rotation: 0,
            z: 50,
            color: "oklch(0.22 0.012 50)",
            fontFamily: "var(--font-sans)",
            align: "center",
          });
        },

        setZoom: (z) => set({ zoom: Math.max(0.05, Math.min(1.5, z)) }),
        showLibrarySidebar: true,
        showDesignSidebar: true,
        copiedElement: null,
        librarySidebarWidth: 288,
        designSidebarWidth: 320,
        toggleLibrarySidebar: () => set((s) => ({ showLibrarySidebar: !s.showLibrarySidebar })),
        toggleDesignSidebar: () => set((s) => ({ showDesignSidebar: !s.showDesignSidebar })),
        setLibrarySidebarWidth: (w) =>
          set({ librarySidebarWidth: Math.max(200, Math.min(500, w)) }),
        setDesignSidebarWidth: (w) => set({ designSidebarWidth: Math.max(200, Math.min(500, w)) }),
        copyElement: (id) => {
          const page = get().book.pages.find((p) => p.elements.some((e) => e.id === id));
          const el = page?.elements.find((e) => e.id === id);
          if (el) {
            set({ copiedElement: el });
          }
        },
        pasteElement: () => {
          const el = get().copiedElement;
          if (!el) return;
          const pasted: PageElement = {
            ...el,
            id: nid("el"),
            x: el.x + 30,
            y: el.y + 30,
            z: Math.max(0, ...get().book.pages.flatMap((p) => p.elements.map((e) => e.z))) + 1,
          };
          get().addElement(pasted);
        },
        toggleExclude: (id) => {
          const img = get().library.find((i) => i.id === id);
          if (img) {
            const nextExclude = !img.excluded;
            updateImageExcludeInDB(id, nextExclude);
            set((s) => ({
              library: s.library.map((i) => (i.id === id ? { ...i, excluded: nextExclude } : i)),
            }));
          }
        },
        setPageSize: () =>
          set((s) => ({
            book: withFixedPageSize(s.book),
          })),
        shufflePageImages: (pageId) =>
          set((s) => {
            const page = s.book.pages.find((p) => p.id === pageId);
            if (!page) return s;
            const photos = page.elements.filter((e) => e.type === "photo") as PhotoElement[];
            const unlockedPhotos = photos.filter((p) => !p.locked);
            if (unlockedPhotos.length <= 1) return s;

            const imageIds = unlockedPhotos.map((p) => p.imageId);
            const shuffled = [...imageIds].sort(() => Math.random() - 0.5);

            return {
              book: {
                ...s.book,
                pages: s.book.pages.map((p) =>
                  p.id === pageId
                    ? {
                        ...p,
                        elements: p.elements.map((el) => {
                          if (el.type === "photo" && !el.locked) {
                            const idx = unlockedPhotos.findIndex((ph) => ph.id === el.id);
                            return { ...el, imageId: shuffled[idx] } as PhotoElement;
                          }
                          return el;
                        }),
                      }
                    : p,
                ),
              },
            };
          }),
        autofillLeastUsedImages: (pageId) => {
          const result = fillPageFrames(get(), pageId);
          if (result.nextBook) set({ book: result.nextBook });
          return result.stats;
        },
        autofillAllEmptyFrames: () => {
          const result = fillEmptyFrames(get());
          if (result.nextBook) set({ book: result.nextBook });
          return result.stats;
        },
        clearEmptyPhotoFrames: (pageId) => {
          let removed = 0;
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) => {
                if (pageId && p.id !== pageId) return p;
                const elements = p.elements.filter((el) => {
                  const hasImage =
                    el.type === "photo" &&
                    (el as PhotoElement).imageId &&
                    s.library.some((img) => img.id === (el as PhotoElement).imageId);
                  const keep = !(el.type === "photo" && !hasImage);
                  if (!keep) removed++;
                  return keep;
                });
                return elements.length === p.elements.length ? p : { ...p, elements };
              }),
            },
          }));
          return removed;
        },
        addImagesFromFiles: async (files) => {
          const addedIds: string[] = [];
          const newImgs = await Promise.all(
            files.map(async (file) => {
              const id = nid("img");
              addedIds.push(id);
              await saveImageToDB(id, file, file.name);
              const src = URL.createObjectURL(file);
              return {
                id,
                src,
                name: file.name,
                favorite: false,
                excluded: false,
                createdAt: Date.now(),
              };
            }),
          );
          set((s) => ({
            library: [...s.library, ...newImgs],
          }));
          return addedIds;
        },
        initLibrary: async () => {
          try {
            const dbImages = await loadImagesFromDB();
            const library = dbImages.map((img) => ({
              id: img.id,
              src: URL.createObjectURL(img.file),
              name: img.name,
              favorite: img.favorite,
              excluded: img.excluded || false,
              createdAt: img.createdAt,
            }));
            set({ library });
          } catch (error) {
            console.error("Failed to load images from IndexedDB", error);
          }
        },
        resetBook: () => {
          const p = blankPage("cream");
          get().library.forEach((img) => {
            if (img.src.startsWith("blob:")) {
              URL.revokeObjectURL(img.src);
            }
          });
          clearAllImagesFromDB();
          set({
            book: {
              title: "",
              theme: "cream",
              pages: [p],
              pageSizeId: FIXED_PAGE_SIZE_ID,
            },
            library: [],
            customTemplates: [],
            currentPageId: p.id,
            selectedElementId: null,
            projectFilePath: null,
          });
        },
        savePageAsTemplate: async (pageId, label, thumbnail, opts) => {
          const s = get();
          const page = s.book.pages.find((p) => p.id === pageId);
          if (!page) return;

          // Collect embedded asset data for custom stickers and backgrounds used on this page
          const embeddedAssets: EmbeddedAsset[] = [];

          // Embed custom background if the page uses one (either custom list or URL)
          const bgId = page.background;
          let bgSrc = "";
          let bgName = "background";
          const customBg = s.customBackgroundsList.find((b) => b.id === bgId);
          if (customBg) {
            bgSrc = customBg.src;
            bgName = customBg.name;
          } else if (bgId && (bgId.startsWith("data:") || bgId.startsWith("blob:") || bgId.startsWith("http") || bgId.startsWith("/"))) {
            bgSrc = bgId;
          }

          if (bgSrc && shouldUploadTemplateAsset(bgSrc)) {
            try {
              const resp = await fetch(bgSrc);
              const blob = await resp.blob();
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              embeddedAssets.push({ id: bgId, name: bgName, base64, type: "background" });
            } catch {
              /* ignore */
            }
          }

          // Embed only temporary/local stickers used on this page. Public Blob URLs are kept as-is.
          for (const el of page.elements) {
            if (el.type === "sticker") {
              const sid = ((el as any).stickerId as string) || el.id;
              const customStk = s.customStickersList.find((sk) => sk.id === sid);
              const src = ((el as any).src as string) || customStk?.src || "";
              if (src && shouldUploadTemplateAsset(src)) {
                if (!embeddedAssets.some((a) => a.id === sid)) {
                  try {
                    const resp = await fetch(src);
                    const blob = await resp.blob();
                    const base64 = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                    const name = customStk ? customStk.name : ((el as any).name || "sticker");
                    embeddedAssets.push({ id: sid, name, base64, type: "sticker" });
                  } catch {
                    /* ignore */
                  }
                }
              }
            }
          }

          const newTemplate: SavedPageTemplate = {
            id: nid("tmpl"),
            label: label.trim() || `Custom Template ${s.customTemplates.length + 1}`,
            background: page.background,
            backgroundMode: page.backgroundMode,
            border: page.border,
            eraserOverlay: page.eraserOverlay,
            elements: page.elements.map((el) => {
              const templateElement = { ...el, id: nid("el") } as PageElement;
              if (templateElement.type === "sticker" && !templateElement.stickerId && !templateElement.src) {
                templateElement.stickerId = el.id;
              }
              return templateElement;
            }),
            embeddedAssets: embeddedAssets.length > 0 ? embeddedAssets : undefined,
            thumbnail,
            backgroundScale: page.backgroundScale,
            backgroundX: page.backgroundX,
            backgroundY: page.backgroundY,
            sizeId: FIXED_PAGE_SIZE_ID,
            category: opts?.category,
            frameLocked: opts?.frameLocked,
            backgroundLocked: opts?.backgroundLocked,
            isAdminTemplate: opts?.isAdminTemplate,
            sortOrder: opts?.isAdminTemplate ? Date.now() : undefined,
          };

          if (opts?.isAdminTemplate) {
            const adminTemplate: SavedPageTemplate = { ...newTemplate };

            for (const asset of embeddedAssets) {
              if (asset.type === "background" && asset.id === adminTemplate.background) {
                adminTemplate.background = await uploadGlobalTemplateAsset("background", asset.name, asset.base64);
              }

              if (asset.type === "sticker") {
                const uploadedUrl = await uploadGlobalTemplateAsset("sticker", asset.name, asset.base64);
                adminTemplate.elements = adminTemplate.elements.map((element) => {
                  if (element.type !== "sticker") return element;
                  const stickerId = (element as any).stickerId || element.id;
                  return stickerId === asset.id ? { ...element, src: uploadedUrl, stickerId: undefined } : element;
                });
              }
            }

            if (isDataUrl(adminTemplate.thumbnail)) {
              adminTemplate.thumbnail = await uploadGlobalTemplateAsset(
                "thumbnail",
                `${adminTemplate.label || "template"}-thumbnail`,
                adminTemplate.thumbnail,
              );
            }

            if (isDataUrl(adminTemplate.eraserOverlay)) {
              adminTemplate.eraserOverlay = await uploadGlobalTemplateAsset(
                "overlay",
                "overlay",
                adminTemplate.eraserOverlay,
              );
            }

            adminTemplate.embeddedAssets = undefined;

            const adminTemplates = [...get().adminTemplates, adminTemplate];
            set({ adminTemplates });
            const result = await appendAdminTemplates({ data: [adminTemplate] });
            if (!result.success) {
              set((prev) => ({
                adminTemplates: prev.adminTemplates.filter((template) => template.id !== adminTemplate.id),
              }));
              throw new Error(result.error || "Failed to save global template");
            }
            return;
          }

          set((prev) => ({ customTemplates: [...prev.customTemplates, newTemplate] }));
        },
        deleteCustomTemplate: (templateId) =>
          set((s) => ({
            customTemplates: s.customTemplates.filter((t) => t.id !== templateId),
          })),
        importCustomTemplate: (template) =>
          set((s) => {
            const exists = s.customTemplates.some((t) => t.id === template.id);
            const templateWithUniqueId = exists
              ? { ...template, id: nid("tmpl"), label: `${template.label} (Imported)` }
              : template;
            return {
              customTemplates: [...s.customTemplates, templateWithUniqueId],
            };
          }),
        applyPageTemplate: async (template) => {
          // First, restore any embedded assets so they render correctly
          const state = get();
          const updatedStickersList = [...state.customStickersList];
          const updatedBgsList = [...state.customBackgroundsList];

          if (template.embeddedAssets) {
            for (const asset of template.embeddedAssets) {
              if (asset.type === "sticker" && !updatedStickersList.some((s) => s.id === asset.id)) {
                try {
                  const resp = await fetch(asset.base64);
                  const blob = await resp.blob();
                  await saveCustomSticker(asset.id, blob, asset.name);
                  updatedStickersList.push({
                    id: asset.id,
                    src: URL.createObjectURL(blob),
                    name: asset.name,
                  });
                } catch {
                  /* ignore */
                }
              }
              if (asset.type === "background" && !updatedBgsList.some((b) => b.id === asset.id)) {
                try {
                  const resp = await fetch(asset.base64);
                  const blob = await resp.blob();
                  await saveCustomBg(asset.id, blob, asset.name);
                  updatedBgsList.push({
                    id: asset.id,
                    src: URL.createObjectURL(blob),
                    name: asset.name,
                  });
                } catch {
                  /* ignore */
                }
              }
            }
          }

          // Update custom lists before applying layout (so images resolve)
          if (
            updatedStickersList.length !== state.customStickersList.length ||
            updatedBgsList.length !== state.customBackgroundsList.length
          ) {
            set({ customStickersList: updatedStickersList, customBackgroundsList: updatedBgsList });
          }

          set((s) => {
            const page = s.book.pages.find((p) => p.id === s.currentPageId);
            if (!page) return s;

            // Collect existing image IDs from the current page's photo elements
            const existingImages = page.elements
              .filter((e) => e.type === "photo" && (e as PhotoElement).imageId)
              .map((e) => (e as PhotoElement).imageId);

            let imgIdx = 0;
            const newElements = template.elements.map((el) => {
              const newEl = { ...el, id: nid("el") } as PageElement;
              if (newEl.type === "photo") {
                if (imgIdx < existingImages.length) {
                  newEl.imageId = existingImages[imgIdx];
                  imgIdx++;
                } else {
                  newEl.imageId = "";
                }
              } else if (newEl.type === "sticker") {
                newEl.locked = newEl.locked ?? template.frameLocked ?? true;
              }
              return newEl;
            });

            return {
              book: {
                ...s.book,
                pages: s.book.pages.map((p) =>
                  p.id === s.currentPageId
                    ? {
                        ...p,
                        background: template.background,
                        backgroundMode: template.backgroundMode,
                        border: template.border ?? "none",
                        eraserOverlay: template.eraserOverlay,
                        elements: newElements,
                        backgroundScale: template.backgroundScale ?? 1,
                        backgroundX: template.backgroundX ?? 0,
                        backgroundY: template.backgroundY ?? 0,
                        frameLocked: template.frameLocked ?? true,
                        backgroundLocked: template.backgroundLocked ?? true,
                      }
                    : p,
                ),
              },
              selectedElementId: null,
            };
          });
        },
        addCustomSticker: async (file) => {
          const id = nid("stk");
          await saveCustomSticker(id, file, file.name);
          const src = URL.createObjectURL(file);
          set((s) => ({
            customStickersList: [...s.customStickersList, { id, src, name: file.name }],
          }));
        },
        deleteCustomSticker: async (id) => {
          const item = get().customStickersList.find((i) => i.id === id);
          if (item && item.src.startsWith("blob:")) {
            URL.revokeObjectURL(item.src);
          }
          await deleteCustomSticker(id);
          set((s) => ({
            customStickersList: s.customStickersList.filter((i) => i.id !== id),
          }));
        },
        addCustomBackground: async (file) => {
          const id = nid("bg");
          await saveCustomBg(id, file, file.name);
          const src = URL.createObjectURL(file);
          set((s) => ({
            customBackgroundsList: [...s.customBackgroundsList, { id, src, name: file.name }],
          }));
        },
        deleteCustomBackground: async (id) => {
          const item = get().customBackgroundsList.find((i) => i.id === id);
          if (item && item.src.startsWith("blob:")) {
            URL.revokeObjectURL(item.src);
          }
          await deleteCustomBg(id);
          set((s) => ({
            customBackgroundsList: s.customBackgroundsList.filter((i) => i.id !== id),
          }));
        },
        initCustomAssets: async () => {
          try {
            const stickers = await loadCustomStickers();
            const backgrounds = await loadCustomBgs();
            set({
              customStickersList: stickers.map((s) => ({
                id: s.id,
                src: URL.createObjectURL(s.file),
                name: s.name,
              })),
              customBackgroundsList: backgrounds.map((b) => ({
                id: b.id,
                src: URL.createObjectURL(b.file),
                name: b.name,
              })),
            });
          } catch (error) {
            console.error("Failed to load custom assets from IndexedDB", error);
          }
        },
        setProjectFilePath: (path) => set({ projectFilePath: path }),
        setIsEraserMode: (b) => set({ isEraserMode: b }),
        setEraserBrushSize: (size) => set({ eraserBrushSize: size }),
        setIsMagicLayoutMode: (b) =>
          set({ isMagicLayoutMode: b, isEraserMode: b ? false : get().isEraserMode }),
        setMagicLayoutTolerance: (value) =>
          set({ magicLayoutTolerance: Math.max(5, Math.min(60, Math.round(value))) }),
        setMagicLayoutFeather: (value) =>
          set({ magicLayoutFeather: Math.max(0, Math.min(2, Math.round(value))) }),
        setMagicLayoutExpand: (value) =>
          set({ magicLayoutExpand: Math.max(-3, Math.min(3, Math.round(value))) }),
        addMagicPhotoFrame: (pageId, selection) => {
          const id = nid("el");
          set((s) => {
            const page = s.book.pages.find((p) => p.id === pageId);
            if (!page) return s;
            const maxZ = Math.max(0, ...page.elements.map((el) => el.z));
            const el: PhotoElement = {
              id,
              type: "photo",
              imageId: "",
              x: Math.max(0, Math.round(selection.x)),
              y: Math.max(0, Math.round(selection.y)),
              w: Math.max(1, Math.round(selection.w)),
              h: Math.max(1, Math.round(selection.h)),
              rotation: 0,
              z: maxZ > 20 ? 20 : maxZ + 1,
              frame: "none",
              radius: 0,
              magicMask: selection.maskSrc,
              magicFrame: true,
            };
            return {
              book: {
                ...s.book,
                pages: s.book.pages.map((p) =>
                  p.id === pageId ? { ...p, elements: [...p.elements, el] } : p,
                ),
              },
              currentPageId: pageId,
              selectedElementId: id,
            };
          });
          return id;
        },
        replacePhotoImageAfterErase: (elementId, imageId) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.elements.some((e) => e.id === elementId)
                  ? {
                      ...p,
                      elements: p.elements.map((e) =>
                        e.id === elementId && e.type === "photo"
                          ? {
                              ...e,
                              imageId,
                              imageScale: 1,
                              imageX: 0,
                              imageY: 0,
                              eraseMask: undefined,
                            }
                          : e,
                      ),
                    }
                  : p,
              ),
            },
            selectedElementId: elementId,
          })),
        setPageOverlay: (pageId, overlay) =>
          set((s) => ({
            book: {
              ...s.book,
              pages: s.book.pages.map((p) =>
                p.id === pageId ? { ...p, eraserOverlay: overlay || undefined } : p,
              ),
            },
          })),
        addAdminTemplate: (template) => {
          set((s) => {
            const newAdminTmpl = {
              ...template,
              sizeId: FIXED_PAGE_SIZE_ID,
              isAdminTemplate: true,
              sortOrder: Date.now(),
            };
            const adminTemplates = [...s.adminTemplates, newAdminTmpl];
            appendAdminTemplates({ data: [newAdminTmpl] }).catch(err => console.error("API error", err));
            return { adminTemplates };
          });
        },
        addAdminTemplates: (templates) => {
          if (templates.length === 0) return;
          set((s) => {
            const now = Date.now();
            const newAdminTemplates = templates.map((template, index) => ({
              ...template,
              sizeId: FIXED_PAGE_SIZE_ID,
              isAdminTemplate: true,
              sortOrder: now + index,
            }));
            const adminTemplates = [...s.adminTemplates, ...newAdminTemplates];
            saveAdminTemplates({ data: adminTemplates }).catch((err) => console.error("API error", err));
            return { adminTemplates };
          });
        },
        deleteAdminTemplate: async (templateId) => {
          const previous = get().adminTemplates;
          const adminTemplates = previous.filter((t) => t.id !== templateId);
          set({ adminTemplates });
          const result = await deleteAdminTemplateById({ data: { id: templateId } });
          if (!result.success) {
            set({ adminTemplates: previous });
            throw new Error(result.error || "Failed to delete template");
          }
        },
        deleteAdminTemplates: async (templateIds) => {
          const ids = new Set(templateIds);
          if (ids.size === 0) return;
          const previous = get().adminTemplates;
          const adminTemplates = previous.filter((template) => !ids.has(template.id));
          set({ adminTemplates });
          const result = await saveAdminTemplates({ data: adminTemplates });
          if (!result.success) {
            set({ adminTemplates: previous });
            throw new Error(result.error || "Failed to delete selected templates");
          }
        },
        reorderAdminTemplates: (ids) => {
          set((s) => {
            const adminTemplates = ids.map((id) => s.adminTemplates.find((t) => t.id === id)!).filter(Boolean);
            saveAdminTemplates({ data: adminTemplates }).catch(err => console.error("API error", err));
            return { adminTemplates };
          });
        },
        updateAdminTemplate: (templateId, patch) => {
          set((s) => {
            const adminTemplates = s.adminTemplates.map((t) =>
              t.id === templateId ? { ...t, ...patch, sizeId: FIXED_PAGE_SIZE_ID } : t,
            );
            updateAdminTemplateById({ data: { id: templateId, patch: { ...patch, sizeId: FIXED_PAGE_SIZE_ID } } }).catch(err => console.error("API error", err));
            return { adminTemplates };
          });
        },
        initAdminTemplates: async () => {
          try {
            const templates = await getAdminTemplates();
            set({ adminTemplates: templates });
          } catch (error) {
            console.error("Failed to fetch admin templates", error);
          }
        },
        initAdminAssets: async () => {
          try {
            const library = await getAdminAssets();
            set({ ...adminAssetState(library), adminAssetsLoaded: true });
          } catch (error) {
            console.error("Failed to fetch admin assets", error);
            set({ adminAssetsLoaded: true });
          }
        },
        createAdminStickerFolder: async (name) => {
          const library = await createAdminStickerFolder({ data: { name } });
          set({ ...adminAssetState(library), adminAssetsLoaded: true });
        },
        updateAdminStickerFolder: async (folderId, name) => {
          const library = await updateAdminStickerFolder({ data: { folderId, name } });
          set({ ...adminAssetState(library), adminAssetsLoaded: true });
        },
        deleteAdminStickerFolder: async (folderId) => {
          const library = await deleteAdminStickerFolder({ data: { folderId } });
          set({ ...adminAssetState(library), adminAssetsLoaded: true });
        },
        addAdminStickersToFolder: async (folderId, files) => {
          const library = await addAdminStickers({ data: { folderId, files } });
          set({ ...adminAssetState(library), adminAssetsLoaded: true });
        },
        deleteAdminSticker: async (folderId, stickerId) => {
          const library = await deleteAdminSticker({ data: { folderId, stickerId } });
          set({ ...adminAssetState(library), adminAssetsLoaded: true });
        },
        addAdminBackgrounds: async (files) => {
          const library = await addAdminBackgrounds({ data: { files } });
          set({ ...adminAssetState(library), adminAssetsLoaded: true });
        },
        deleteAdminBackground: async (backgroundId) => {
          const library = await deleteAdminBackground({ data: { backgroundId } });
          set({ ...adminAssetState(library), adminAssetsLoaded: true });
        },
        addRecentProject: (id, title, sizeId) =>
          set((s) => {
            const filtered = s.recentProjects.filter((p) => p.id !== id);
            return {
              recentProjects: [
                { id, title, savedAt: Date.now(), sizeId: FIXED_PAGE_SIZE_ID },
                ...filtered,
              ].slice(0, 10),
            };
          }),
        clearRecentProjects: () => set({ recentProjects: [] }),
      }),
      {
        limit: 50,
        partialize: (state) => ({
          book: state.book,
          currentPageId: state.currentPageId,
        }),
      },
    ),
    {
      name: "lovable-photobook-v1",
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({
        book: s.book,
        currentPageId: s.currentPageId,
        librarySidebarWidth: s.librarySidebarWidth,
        designSidebarWidth: s.designSidebarWidth,
        showLibrarySidebar: s.showLibrarySidebar,
        showDesignSidebar: s.showDesignSidebar,
        customTemplates: s.customTemplates,
        projectFilePath: s.projectFilePath,
        recentProjects: s.recentProjects,
        savedProjects: s.savedProjects,
      }),
    },
  ),
);

const enforceFixedBookSize = () => {
  const { book } = useBookStore.getState();
  if (book.pageSizeId !== FIXED_PAGE_SIZE_ID) {
    useBookStore.setState({ book: withFixedPageSize(book) });
  }
};

const clearOldDesignAssetsOnce = async () => {
  if (safeLocalStorage.getItem(OLD_DESIGN_ASSETS_CLEARED_KEY) === "1") return;
  try {
    await Promise.all([clearCustomStickersFromDB(), clearCustomBgsFromDB()]);
    useBookStore.setState({ customStickersList: [], customBackgroundsList: [] });
    safeLocalStorage.setItem(OLD_DESIGN_ASSETS_CLEARED_KEY, "1");
  } catch (error) {
    console.error("Failed to clear old design assets", error);
  }
};

// Auto-initialize the library from IndexedDB if in browser context
if (typeof window !== "undefined") {
  enforceFixedBookSize();
  window.setTimeout(enforceFixedBookSize, 0);
  void (async () => {
    useBookStore.getState().initLibrary();
    await clearOldDesignAssetsOnce();
    await useBookStore.getState().initCustomAssets();
    useBookStore.getState().initAdminTemplates();
    useBookStore.getState().initAdminAssets();
  })();
}

export const undo = () => useBookStore.temporal.getState().undo();
export const redo = () => useBookStore.temporal.getState().redo();
