import { createFileRoute, Link } from "@tanstack/react-router";
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Move,
  Palette,
  Rotate3D,
  RotateCcw,
  Settings2,
  Share2,
  X,
} from "lucide-react";
import { Page } from "@/components/photobook/Page";
import { PAGE_SIZES, type LibraryImage, type Page as PhotobookPage } from "@/lib/photobook/types";
import { useBookStore } from "@/lib/photobook/store";
import { createShareablePreview } from "@/lib/photobook/share-preview";
import { getSharedPreview, type SharedPreviewPayload } from "@/lib/api/shared-previews.functions";
import { z } from "zod";
import {
  DEFAULT_PREVIEW_SETTINGS,
  loadPreviewSettings,
  PREVIEW_ATMOSPHERES,
  savePreviewSettings,
  type PreviewSettings,
} from "@/lib/photobook/preview-atmosphere";

export const Route = createFileRoute("/preview")({
  validateSearch: z.object({ share: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Preview - Yaara" },
      { name: "description", content: "Preview your custom photobook as a printed album." },
    ],
  }),
  component: PreviewPage,
});

type FlipBookApi = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    turnToPage: (page: number) => void;
  };
};

const FlipBook = HTMLFlipBook as unknown as React.ForwardRefExoticComponent<any>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function useViewportSize() {
  const [size, setSize] = useState({ width: 1280, height: 820 });
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

const NEKO_SPRITES = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  N: [
    [-1, -2],
    [-1, -3],
  ],
  NE: [
    [0, -2],
    [0, -3],
  ],
  E: [
    [-3, 0],
    [-3, -1],
  ],
  SE: [
    [-5, -1],
    [-5, -2],
  ],
  S: [
    [-6, -3],
    [-7, -2],
  ],
  SW: [
    [-5, -3],
    [-6, -1],
  ],
  W: [
    [-4, -2],
    [-4, -3],
  ],
  NW: [
    [-1, 0],
    [-1, -1],
  ],
} as const;

function PreviewCursorCat() {
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cat = catRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!cat || reducedMotion || !finePointer) return;

    let catX = 32;
    let catY = 32;
    let pointerX = 32;
    let pointerY = 32;
    let frameCount = 0;
    let idleFrames = 0;
    let lastFrame = 0;
    let animationFrame = 0;

    const setSprite = (name: keyof typeof NEKO_SPRITES, frame: number) => {
      const frames = NEKO_SPRITES[name];
      const sprite = frames[frame % frames.length];
      cat.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
    };

    const moveCat = () => {
      frameCount += 1;
      const diffX = catX - pointerX;
      const diffY = catY - pointerY;
      const distance = Math.hypot(diffX, diffY);

      if (distance < 48) {
        idleFrames += 1;
        setSprite(idleFrames < 7 ? "alert" : "idle", 0);
        return;
      }

      idleFrames = 0;
      let direction = "";
      direction += diffY / distance > 0.5 ? "N" : "";
      direction += diffY / distance < -0.5 ? "S" : "";
      direction += diffX / distance > 0.5 ? "W" : "";
      direction += diffX / distance < -0.5 ? "E" : "";
      setSprite(direction as keyof typeof NEKO_SPRITES, frameCount);

      catX -= (diffX / distance) * 10;
      catY -= (diffY / distance) * 10;
      catX = Math.min(Math.max(16, catX), window.innerWidth - 16);
      catY = Math.min(Math.max(16, catY), window.innerHeight - 16);
      cat.style.transform = `translate3d(${catX - 16}px, ${catY - 16}px, 0)`;
    };

    const animate = (timestamp: number) => {
      if (timestamp - lastFrame > 100) {
        lastFrame = timestamp;
        moveCat();
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      cat.dataset.visible = "true";
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    animationFrame = window.requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <div ref={catRef} className="preview-cursor-cat" aria-hidden="true" />;
}

function PreviewPage() {
  const { share: sharedPreviewId } = Route.useSearch();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const localBook = useBookStore((s) => s.book);
  const localLibrary = useBookStore((s) => s.library);
  const customBackgrounds = useBookStore((s) => s.customBackgroundsList ?? []);
  const customStickers = useBookStore((s) => s.customStickersList ?? []);
  const initLibrary = useBookStore((s) => s.initLibrary);
  const initCustomAssets = useBookStore((s) => s.initCustomAssets);
  const { width: viewportW, height: viewportH } = useViewportSize();
  const bookRef = useRef<FlipBookApi | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<PreviewSettings>(() => loadPreviewSettings());
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDraggingOrbit, setIsDraggingOrbit] = useState(false);
  const [isDraggingBook, setIsDraggingBook] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [sharedPayload, setSharedPayload] = useState<SharedPreviewPayload | null>(null);
  const [sharedPreviewError, setSharedPreviewError] = useState("");
  const [isLoadingSharedPreview, setIsLoadingSharedPreview] = useState(Boolean(sharedPreviewId));
  const [isSharingPreview, setIsSharingPreview] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState("");
  const orbitStartRef = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });
  const bookMoveStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const activeDragToolRef = useRef<"move" | "orbit" | null>(null);

  const patchSettings = useCallback((patch: Partial<PreviewSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      savePreviewSettings(next);
      return next;
    });
  }, []);

  const handleCustomBgUpload = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      patchSettings({
        atmosphere: "custom",
        customBackground: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const sharePreview = async () => {
    if (isSharingPreview) return;
    setIsSharingPreview(true);
    setShareError("");
    try {
      let url = window.location.href;
      if (!sharedPreviewId) {
        const shared = await createShareablePreview({
          book,
          library,
          customBackgrounds,
          customStickers,
        });
        url = shared.url;
      }

      if (navigator.share) {
        await navigator.share({
          title: book.title?.trim() || "My Yaara photobook",
          text: "Flip through this photobook preview.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2400);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Could not share preview", error);
      setShareError(error instanceof Error ? error.message : "Could not create the share link.");
    } finally {
      setIsSharingPreview(false);
    }
  };

  useEffect(() => {
    if (!sharedPreviewId) {
      initLibrary();
      initCustomAssets();
      setIsLoadingSharedPreview(false);
      return;
    }

    let active = true;
    setIsLoadingSharedPreview(true);
    getSharedPreview({ data: { id: sharedPreviewId } })
      .then((result) => {
        if (!active) return;
        if (!result.success || !result.payload) {
          setSharedPreviewError(result.error || "This preview could not be loaded.");
          return;
        }
        setSharedPayload(result.payload);
        setCurrentPage(0);
      })
      .catch((error) => {
        if (active) setSharedPreviewError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setIsLoadingSharedPreview(false);
      });
    return () => {
      active = false;
    };
  }, [initCustomAssets, initLibrary, sharedPreviewId]);

  const book = sharedPayload?.book ?? localBook;
  const pages = book.pages;
  const library = sharedPayload?.library ?? localLibrary;

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const preset = PAGE_SIZES[0];
  const { width: pageW, height: pageH } = preset;
  const isMobilePreview = viewportW < 860;

  const previewPages = useMemo(() => {
    if (pages.length % 2 === 0) return pages;
    const copy = [...pages];
    const blankPage = {
      id: "blank-placeholder-page",
      background: "minimal",
      border: "none",
      elements: [],
    } as (typeof pages)[0];
    if (copy.length <= 1) {
      copy.push(blankPage);
    } else {
      copy.splice(copy.length - 1, 0, blankPage);
    }
    return copy;
  }, [pages]);

  const totalPages = previewPages.length;
  const singlePageMode = totalPages <= 1;
  const isMobileFullscreen = false;
  const isPortraitBook = singlePageMode;
  const isFirst = currentPage <= 0;
  const isLast = currentPage >= totalPages - 1;
  const isCoverView = !singlePageMode && isFirst;
  const isBackCoverView = !singlePageMode && isLast;
  const visibleSpreadPages = isPortraitBook || isCoverView || isBackCoverView ? 1 : 2;
  const useFullscreenSpread = isFullscreen && visibleSpreadPages === 2;
  const useHorizontalControls = !isMobilePreview && viewportW / viewportH >= 1.65;
  const useVerticalControls = !isMobilePreview && !useHorizontalControls;
  const enableMoveTool = !isFullscreen && settings.enableBookMove;
  const enableOrbitTool = !isFullscreen && settings.enable3DOrbit;
  const canManipulateBook = enableMoveTool || enableOrbitTool;

  const fit = useMemo(() => {
    const fitViewportW = isMobileFullscreen ? viewportH : viewportW;
    const fitViewportH = isMobileFullscreen ? viewportW : viewportH;
    const fullscreenMarginW = Math.max(
      isMobilePreview ? 28 : 80,
      fitViewportW * (isMobilePreview ? 0.08 : 0.12),
    );
    const fullscreenMarginH = Math.max(
      isMobilePreview ? 28 : 72,
      fitViewportH * (isMobilePreview ? 0.08 : 0.12),
    );
    const controlsHeight = showToolsMenu
      ? isMobilePreview
        ? showSceneControls
          ? 210
          : 105
        : useHorizontalControls
          ? showSceneControls
            ? 88
            : 64
          : 0
      : 0;
    const controlsWidth =
      showToolsMenu && useVerticalControls ? (showSceneControls ? 250 : 205) : 0;
    const chromeW = isFullscreen
      ? fullscreenMarginW + controlsWidth
      : isMobilePreview
        ? 48
        : 160 + controlsWidth;
    const chromeH = isFullscreen
      ? fullscreenMarginH + controlsHeight
      : isMobilePreview
        ? 104 + controlsHeight
        : 96 + controlsHeight;
    const availableW = Math.max(260, fitViewportW - chromeW);
    const availableH = Math.max(240, fitViewportH - chromeH);
    return clamp(
      Math.min(availableW / (pageW * visibleSpreadPages), availableH / pageH),
      0.16,
      isFullscreen ? (isMobilePreview ? 0.78 : 0.86) : isMobilePreview ? 0.68 : 0.82,
    );
  }, [
    isFullscreen,
    isMobileFullscreen,
    isMobilePreview,
    isPortraitBook,
    pageH,
    pageW,
    showSceneControls,
    showToolsMenu,
    useHorizontalControls,
    useVerticalControls,
    visibleSpreadPages,
    viewportH,
    viewportW,
  ]);

  const renderFit = fit;
  const scaledPageW = Math.max(120, Math.floor(pageW * renderFit));
  const scaledPageH = Math.max(160, Math.floor(pageH * renderFit));
  const flipbookPageW = isMobileFullscreen ? scaledPageW * 2 : scaledPageW;
  const flipbookPageH = isMobileFullscreen ? scaledPageH * 2 : scaledPageH;

  const mobileOffsetLimitX = Math.max(18, viewportW * 0.08);
  const mobileOffsetLimitY = Math.max(16, viewportH * 0.04);
  const effectiveBookOffsetX = isFullscreen
    ? 0
    : isMobilePreview
      ? clamp(settings.bookOffsetX, -mobileOffsetLimitX, mobileOffsetLimitX)
      : settings.bookOffsetX;
  const effectiveBookOffsetY = isFullscreen
    ? 0
    : isMobilePreview
      ? clamp(settings.bookOffsetY, -mobileOffsetLimitY, mobileOffsetLimitY)
      : settings.bookOffsetY;
  const effectiveRotateX = isFullscreen
    ? 0
    : isMobilePreview
      ? clamp(settings.rotateX, 0, 16)
      : settings.rotateX;
  const effectiveRotateY = isFullscreen
    ? 0
    : isMobilePreview
      ? clamp(settings.rotateY, -12, 12)
      : settings.rotateY;
  const mobileFullscreenBookScale = isMobileFullscreen ? 2 : 1;
  const bookTransform = `${isMobileFullscreen ? "rotate(90deg) " : ""}translate(${effectiveBookOffsetX}px, ${effectiveBookOffsetY}px) scale(${mobileFullscreenBookScale}) rotateX(${effectiveRotateX}deg) rotateY(${effectiveRotateY}deg)`;

  const triggerFlip = useCallback(
    (direction: "next" | "prev") => {
      if (isFlipping) return;
      setIsFlipping(true);
      if (direction === "next") {
        if (bookRef.current) {
          bookRef.current.pageFlip().flipNext();
        } else {
          setCurrentPage((page) => Math.min(totalPages - 1, page + 1));
        }
      } else {
        if (bookRef.current) {
          bookRef.current.pageFlip().flipPrev();
        } else {
          setCurrentPage((page) => Math.max(0, page - 1));
        }
      }
      window.setTimeout(() => setIsFlipping(false), isMobilePreview ? 1400 : 1100);
    },
    [isFlipping, isMobilePreview, totalPages],
  );

  const goPrev = useCallback(() => triggerFlip("prev"), [triggerFlip]);
  const goNext = useCallback(() => triggerFlip("next"), [triggerFlip]);

  const toggleFullscreen = async () => {
    setShowSceneControls(false);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shellRef.current?.requestFullscreen();
      }
    } catch {
      setIsFullscreen((value) => !value);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  const handleStagePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, label, .preview-controller")) {
      return;
    }

    if (enableMoveTool) {
      e.preventDefault();
      activeDragToolRef.current = "move";
      setIsDraggingBook(true);
      bookMoveStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: effectiveBookOffsetX,
        oy: effectiveBookOffsetY,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (enableOrbitTool) {
      e.preventDefault();
      activeDragToolRef.current = "orbit";
      setIsDraggingOrbit(true);
      orbitStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        rotX: effectiveRotateX,
        rotY: effectiveRotateY,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handleStagePointerMove = (e: React.PointerEvent) => {
    if (isDraggingBook || activeDragToolRef.current === "move") {
      const dx = e.clientX - bookMoveStartRef.current.x;
      const dy = e.clientY - bookMoveStartRef.current.y;
      const nextX = bookMoveStartRef.current.ox + dx;
      const nextY = bookMoveStartRef.current.oy + dy;
      patchSettings({
        bookOffsetX: isMobilePreview
          ? clamp(nextX, -mobileOffsetLimitX, mobileOffsetLimitX)
          : nextX,
        bookOffsetY: isMobilePreview
          ? clamp(nextY, -mobileOffsetLimitY, mobileOffsetLimitY)
          : nextY,
      });
      return;
    }
    if (isDraggingOrbit || activeDragToolRef.current === "orbit") {
      const dx = e.clientX - orbitStartRef.current.x;
      const dy = e.clientY - orbitStartRef.current.y;
      patchSettings({
        rotateX: clamp(
          orbitStartRef.current.rotX - dy * 0.15,
          isMobilePreview ? 0 : -35,
          isMobilePreview ? 16 : 35,
        ),
        rotateY: clamp(
          orbitStartRef.current.rotY + dx * 0.2,
          isMobilePreview ? -12 : -65,
          isMobilePreview ? 12 : 65,
        ),
      });
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent) => {
    activeDragToolRef.current = null;
    setIsDraggingOrbit(false);
    setIsDraggingBook(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const atmosphereMeta = PREVIEW_ATMOSPHERES.find((a) => a.id === settings.atmosphere);
  const shellClass =
    settings.atmosphere === "custom"
      ? "atmosphere-custom"
      : (atmosphereMeta?.shellClass ?? "atmosphere-cozy");

  const stageCursor = enableMoveTool
    ? isDraggingBook
      ? "grabbing"
      : "grab"
    : enableOrbitTool
      ? isDraggingOrbit
        ? "grabbing"
        : "grab"
      : "default";

  if (!mounted || isLoadingSharedPreview) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-sm text-slate-400 animate-pulse font-medium">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (sharedPreviewError) {
    return (
      <div className={`book-preview-shell ${shellClass}`}>
        <PreviewAtmosphere customBg={settings.customBackground} />
        <div className="book-preview-empty">
          <BookOpen className="h-8 w-8" />
          <span>{sharedPreviewError}</span>
          <Link to="/">Open Yaara</Link>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className={`book-preview-shell ${shellClass}`}>
        <PreviewAtmosphere customBg={settings.customBackground} />
        <div className="book-preview-empty">
          <BookOpen className="h-8 w-8" />
          <span>No pages to preview</span>
          <Link to="/">Back to editor</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={`book-preview-shell ${shellClass} ${isFullscreen ? "is-fullscreen" : ""} ${isMobileFullscreen ? "is-mobile-landscape-book" : ""} ${useHorizontalControls ? "controls-horizontal" : ""} ${useVerticalControls ? "controls-vertical" : ""} ${showToolsMenu ? "has-open-controls" : ""} ${showToolsMenu && showSceneControls ? "has-open-scene" : ""}`}
      style={
        settings.atmosphere === "custom" && settings.customBackground
          ? ({ "--preview-custom-bg": `url(${settings.customBackground})` } as React.CSSProperties)
          : undefined
      }
    >
      <PreviewAtmosphere
        customBg={settings.customBackground}
        isCustom={settings.atmosphere === "custom"}
      />

      <div className="preview-controller">
        <button
          type="button"
          aria-expanded={showToolsMenu}
          aria-label="Preview controls"
          title="Open Preview Controls"
          onClick={() => setShowToolsMenu((value) => !value)}
          className={`preview-controller-trigger ${showToolsMenu ? "is-active" : ""}`}
        >
          {showToolsMenu ? <X className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
        </button>

        {showToolsMenu && (
          <div className="book-preview-tools-menu" role="dialog" aria-label="Preview controls">
            <div className="preview-controller-actions">
              <Link to="/editor" className="book-preview-tool-btn" title="Back to editor">
                <ArrowLeft className="h-3.5 w-3.5" />
                Editor
              </Link>
              <button
                type="button"
                aria-pressed={settings.enable3DOrbit}
                disabled={isFullscreen}
                title="Rotate the book view"
                onClick={() =>
                  patchSettings({
                    enable3DOrbit: !settings.enable3DOrbit,
                    enableBookMove: false,
                  })
                }
                className={`book-preview-tool-btn ${settings.enable3DOrbit ? "is-active" : ""}`}
              >
                <Rotate3D className="h-3.5 w-3.5" />
                3D Orbit
              </button>

              <button
                type="button"
                aria-pressed={settings.enableBookMove}
                disabled={isFullscreen}
                title="Move the book in normal preview"
                onClick={() =>
                  patchSettings({
                    enableBookMove: !settings.enableBookMove,
                    enable3DOrbit: false,
                  })
                }
                className={`book-preview-tool-btn ${settings.enableBookMove ? "is-active" : ""}`}
              >
                <Move className="h-3.5 w-3.5" />
                Move
              </button>

              {(settings.enable3DOrbit ||
                settings.bookOffsetX !== 0 ||
                settings.bookOffsetY !== 0 ||
                settings.rotateX !== 12 ||
                settings.rotateY !== 0) && (
                <button
                  type="button"
                  title="Reset preview view"
                  onClick={() =>
                    patchSettings({
                      enable3DOrbit: false,
                      enableBookMove: false,
                      rotateX: 12,
                      rotateY: 0,
                      bookOffsetX: 0,
                      bookOffsetY: 0,
                    })
                  }
                  className="book-preview-tool-btn"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}

              <button
                type="button"
                aria-expanded={showSceneControls}
                title="Change preview scene"
                onClick={() => setShowSceneControls((value) => !value)}
                className={`book-preview-tool-btn ${showSceneControls ? "is-active" : ""}`}
              >
                <Palette className="h-3.5 w-3.5" />
                Scene
              </button>

              <button
                type="button"
                title={shareError || "Create a read-only preview link"}
                onClick={sharePreview}
                disabled={isSharingPreview}
                className={`book-preview-tool-btn ${shareCopied ? "is-active" : ""}`}
              >
                {isSharingPreview ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : shareCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                {isSharingPreview ? "Preparing" : shareCopied ? "Copied" : "Share"}
              </button>

              <button
                type="button"
                title={isFullscreen ? "Exit fullscreen" : "Open fullscreen preview"}
                onClick={toggleFullscreen}
                className="book-preview-tool-btn"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
                {isFullscreen ? "Exit" : "Full"}
              </button>
            </div>
            {showSceneControls && (
              <div className="book-preview-scene-panel" role="group" aria-label="Preview scene">
                <div className="book-preview-swatch-group">
                  {PREVIEW_ATMOSPHERES.map((atm) => (
                    <button
                      key={atm.id}
                      type="button"
                      onClick={() =>
                        patchSettings({ atmosphere: atm.id, customBackground: undefined })
                      }
                      className={`book-preview-swatch ${settings.atmosphere === atm.id ? "is-active" : ""}`}
                      style={{ background: atm.swatch }}
                      title={atm.label}
                      aria-label={atm.label}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => bgInputRef.current?.click()}
                    className="book-preview-swatch book-preview-upload-swatch"
                    title="Upload custom background"
                    aria-label="Upload custom background"
                  >
                    <ImagePlus className="h-3 w-3" />
                  </button>
                  {settings.atmosphere === "custom" && settings.customBackground && (
                    <button
                      type="button"
                      onClick={() =>
                        patchSettings({ atmosphere: "cozy", customBackground: undefined })
                      }
                      className="book-preview-swatch book-preview-remove-swatch"
                      title="Remove custom background"
                      aria-label="Remove custom background"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <PreviewCursorCat />

      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleCustomBgUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <main
        className={`book-preview-stage ${canManipulateBook ? "is-interactive" : ""}`}
        onPointerDownCapture={handleStagePointerDown}
        onPointerMoveCapture={handleStagePointerMove}
        onPointerUpCapture={handleStagePointerUp}
        onPointerCancelCapture={handleStagePointerUp}
        style={{ cursor: stageCursor }}
      >
        {isFullscreen && (
          <>
            <button
              type="button"
              className="book-preview-turn-zone book-preview-turn-zone-prev"
              onClick={goPrev}
              disabled={isFirst}
              aria-label="Previous page"
            />
            <button
              type="button"
              className="book-preview-turn-zone book-preview-turn-zone-next"
              onClick={goNext}
              disabled={isLast}
              aria-label="Next page"
            />
          </>
        )}

        <button
          type="button"
          className="book-preview-nav book-preview-nav-prev"
          onClick={goPrev}
          disabled={isFirst}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>

        <div
          className={`book-preview-book ${canManipulateBook ? "is-draggable" : ""} ${isFlipping ? "is-flipping" : ""} ${isPortraitBook ? "is-single-page" : ""} ${isCoverView ? "is-cover" : ""} ${isBackCoverView ? "is-back-cover" : ""} ${
            isFullscreen && useFullscreenSpread ? "has-fullscreen-binding" : ""
          }`}
          style={
            {
              "--preview-page-width": `${scaledPageW}px`,
              "--preview-page-height": `${scaledPageH}px`,
              "--preview-spread-pages": visibleSpreadPages,
              transform: bookTransform,
            } as React.CSSProperties
          }
        >
          <div className="book-preview-page-stack" aria-hidden="true" />
          <div className="book-preview-spine" aria-hidden="true" />
          <div className="book-preview-shadow" />

          {totalPages === 1 ? (
            <div className="book-preview-static-page">
              <BookPage
                pageId={previewPages[0].id}
                pageData={previewPages[0]}
                library={library}
                pageNumber={1}
                isCover
                isBackCover={false}
                fit={fit}
                renderFit={renderFit}
                pageW={pageW}
                pageH={pageH}
              />
            </div>
          ) : (
            <FlipBook
              key={`preview-book-${flipbookPageW}x${flipbookPageH}-${isFullscreen ? "full" : "window"}`}
              ref={bookRef}
              width={flipbookPageW}
              height={flipbookPageH}
              size="fixed"
              minWidth={120}
              maxWidth={2200}
              minHeight={160}
              maxHeight={1800}
              drawShadow
              flippingTime={isMobilePreview ? 1300 : 1050}
              usePortrait={false}
              startPage={Math.min(currentPage, totalPages - 1)}
              showCover
              autoSize={false}
              maxShadowOpacity={0.6}
              mobileScrollSupport={false}
              clickEventForward={false}
              useMouseEvents
              swipeDistance={isMobilePreview ? 48 : 28}
              showPageCorners={false}
              disableFlipByClick={canManipulateBook}
              startZIndex={20}
              className="book-preview-flipbook"
              style={{}}
              onFlip={(event: { data: number }) => {
                setCurrentPage(event.data);
                setIsFlipping(false);
              }}
            >
              {previewPages.map((page, index) => (
                <BookPage
                  key={page.id}
                  pageId={page.id}
                  pageData={page}
                  library={library}
                  pageNumber={pages.findIndex((p) => p.id === page.id) + 1}
                  isCover={index === 0}
                  isBackCover={index === totalPages - 1}
                  isBlankPlaceholder={page.id === "blank-placeholder-page"}
                  fit={fit}
                  renderFit={renderFit}
                  pageW={pageW}
                  pageH={pageH}
                />
              ))}
            </FlipBook>
          )}
        </div>

        <button
          type="button"
          className="book-preview-nav book-preview-nav-next"
          onClick={goNext}
          disabled={isLast}
          aria-label="Next page"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      </main>
    </div>
  );
}

function PreviewAtmosphere({ customBg, isCustom }: { customBg?: string; isCustom?: boolean }) {
  return (
    <div className="book-preview-atmosphere" aria-hidden="true">
      {isCustom && customBg ? (
        <div className="book-preview-custom-bg" style={{ backgroundImage: `url(${customBg})` }} />
      ) : null}
      <div className="book-preview-desk" />
      <div className="book-preview-light" />
      <div className="book-preview-vignette" />
      <div className="book-preview-ambient-particles" />
    </div>
  );
}

const BookPage = forwardRef<
  HTMLDivElement,
  {
    pageId: string;
    pageData: PhotobookPage;
    library: LibraryImage[];
    pageNumber: number;
    isCover: boolean;
    isBackCover: boolean;
    fit: number;
    renderFit?: number;
    pageW: number;
    pageH: number;
    isBlankPlaceholder?: boolean;
  }
>(
  (
    {
      pageId,
      pageData,
      library,
      pageNumber,
      isCover,
      isBackCover,
      fit,
      renderFit,
      pageW,
      pageH,
      isBlankPlaceholder,
    },
    ref,
  ) => {
    const pageFit = renderFit ?? fit;
    const scaledW = Math.floor(pageW * pageFit);
    const scaledH = Math.floor(pageH * pageFit);
    const leafRef = useRef<HTMLDivElement | null>(null);
    const [contentFit, setContentFit] = useState(pageFit);

    const setLeafRef = useCallback(
      (node: HTMLDivElement | null) => {
        leafRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    useEffect(() => {
      const node = leafRef.current;
      if (!node) return;

      const updateContentFit = () => {
        const leafW = node.offsetWidth;
        const leafH = node.offsetHeight;
        if (!leafW || !leafH) return;
        const nextFit = Math.min(leafW / pageW, leafH / pageH);
        setContentFit((current) => (Math.abs(current - nextFit) > 0.002 ? nextFit : current));
      };

      updateContentFit();
      const observer = new ResizeObserver(updateContentFit);
      observer.observe(node);
      return () => observer.disconnect();
    }, [pageFit, pageH, pageW]);

    return (
      <div
        ref={setLeafRef}
        className={[
          "book-preview-leaf",
          isCover ? "book-preview-leaf-cover" : "",
          isBackCover ? "book-preview-leaf-back" : "",
          isBlankPlaceholder ? "book-preview-leaf-blank" : "",
        ].join(" ")}
        style={{ width: scaledW, height: scaledH }}
        data-density={isCover || isBackCover ? "hard" : "soft"}
      >
        <div
          className="book-preview-page-content is-readonly"
          style={{
            width: pageW,
            height: pageH,
            transform: `scale(${contentFit})`,
            transformOrigin: "top left",
          }}
        >
          {isBlankPlaceholder ? (
            <div className="h-full w-full bg-[#fbf7ed]" />
          ) : (
            <Page
              pageId={pageId}
              pageOverride={pageData}
              libraryOverride={library}
              interactive={false}
              pageNumber={pageNumber}
            />
          )}
        </div>
        {(isCover || isBackCover) && <div className="book-preview-cover-finish" />}
      </div>
    );
  },
);

BookPage.displayName = "BookPage";
