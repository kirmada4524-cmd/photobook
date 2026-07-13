import { createFileRoute, Link } from "@tanstack/react-router";
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Maximize2,
  Menu,
  Minimize2,
  Move,
  Palette,
  Rotate3D,
  RotateCcw,
  User,
  X,
} from "lucide-react";
import { PreviewGuideAvatar } from "@/components/photobook/PreviewGuideAvatar";
import { Page } from "@/components/photobook/Page";
import { PAGE_SIZES } from "@/lib/photobook/types";
import { useBookStore } from "@/lib/photobook/store";
import {
  DEFAULT_PREVIEW_SETTINGS,
  loadPreviewSettings,
  PREVIEW_ATMOSPHERES,
  savePreviewSettings,
  type PreviewSettings,
} from "@/lib/photobook/preview-atmosphere";

export const Route = createFileRoute("/preview")({
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

function PreviewPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const pages = useBookStore((s) => s.book.pages);
  const title = useBookStore((s) => s.book.title);
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
  const orbitStartRef = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });
  const bookMoveStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const activeDragToolRef = useRef<"move" | "orbit" | null>(null);

  const displayTitle = (title || "").trim() || "Untitled photobook";

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

  useEffect(() => {
    initLibrary();
    initCustomAssets();
  }, [initCustomAssets, initLibrary]);

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
  const useFullscreenSpread = isFullscreen && !singlePageMode;
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
    const chromeW = isFullscreen
      ? isMobileFullscreen
        ? fullscreenMarginW
        : fullscreenMarginW
      : isMobilePreview
        ? 36
        : 120;
    const chromeH = isFullscreen
      ? isMobileFullscreen
        ? fullscreenMarginH
        : fullscreenMarginH
      : isMobilePreview
        ? 200
        : 220;
    const availableW = Math.max(260, fitViewportW - chromeW);
    const availableH = Math.max(240, fitViewportH - chromeH);
    const spreadPages = isPortraitBook ? 1 : 2;
    return clamp(
      Math.min(availableW / (pageW * spreadPages), availableH / pageH),
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
    viewportH,
    viewportW,
  ]);

  const renderFit = fit;
  const scaledPageW = Math.max(120, Math.floor(pageW * renderFit));
  const scaledPageH = Math.max(160, Math.floor(pageH * renderFit));
  const flipbookPageW = isMobileFullscreen ? scaledPageW * 2 : scaledPageW;
  const flipbookPageH = isMobileFullscreen ? scaledPageH * 2 : scaledPageH;

  const activePage = previewPages[currentPage];
  const isBlankPage = activePage?.id === "blank-placeholder-page";
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

  const pageLabel =
    currentPage === 0
      ? "Cover"
      : currentPage >= totalPages - 1
        ? "Back cover"
        : isBlankPage
          ? "Blank page"
          : `Page ${pages.findIndex((p) => p.id === activePage?.id) + 1}`;

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
  const goToPage = (page: number) => {
    setIsFlipping(true);
    bookRef.current?.pageFlip().turnToPage(page);
    window.setTimeout(() => setIsFlipping(false), isMobilePreview ? 1400 : 1100);
  };

  const toggleFullscreen = async () => {
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
    if (
      (e.target as HTMLElement).closest(
        "button, a, input, label, .preview-guide-avatar, .book-preview-header-container, .book-preview-dots",
      )
    ) {
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

  const isFirst = currentPage <= 0;
  const isLast = currentPage >= totalPages - 1;
  const stageCursor = enableMoveTool
    ? isDraggingBook
      ? "grabbing"
      : "grab"
    : enableOrbitTool
      ? isDraggingOrbit
        ? "grabbing"
        : "grab"
      : "default";

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-sm text-slate-400 animate-pulse font-medium">Loading preview...</p>
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
      className={`book-preview-shell ${shellClass} ${isFullscreen ? "is-fullscreen" : ""} ${isMobileFullscreen ? "is-mobile-landscape-book" : ""}`}
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

      <header className="book-preview-header-container">
        <div className="book-preview-topbar">
          <Link to="/editor" className="book-preview-back">
            <ArrowLeft className="h-4 w-4" />
            <span>Editor</span>
          </Link>

          <div className="book-preview-title">
            <BookOpen className="h-4 w-4" />
            <span>{displayTitle}</span>
          </div>

          <div className="book-preview-count font-semibold opacity-80">
            {pageLabel} / {totalPages}
          </div>
        </div>
      </header>

      <div className="book-preview-actionbar">
        <button
          type="button"
          aria-expanded={showToolsMenu}
          title="Open preview controls"
          onClick={() => setShowToolsMenu((value) => !value)}
          className={`book-preview-tool-btn book-preview-menu-trigger ${showToolsMenu ? "is-active" : ""}`}
        >
          <Menu className="h-4 w-4" />
          Controls
        </button>

        {showToolsMenu && (
          <div className="book-preview-tools-menu">
            <button
              type="button"
              aria-pressed={settings.enable3DOrbit}
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
              Move Book
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
            {showSceneControls && !isFullscreen && (
              <div className="book-preview-scene-panel" role="group" aria-label="Preview scene">
                <div className="book-preview-scene-header">
                  <span>Scene</span>
                  <button
                    type="button"
                    aria-pressed={settings.showGuide}
                    title="Toggle preview guide"
                    onClick={() => patchSettings({ showGuide: !settings.showGuide })}
                    className={`book-preview-guide-toggle ${settings.showGuide ? "is-active" : ""}`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Guide
                  </button>
                </div>
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

      {isFullscreen && (
        <button
          type="button"
          className="book-preview-fullscreen-exit"
          onClick={toggleFullscreen}
          aria-label="Exit fullscreen"
        >
          <Minimize2 className="h-5 w-5" />
        </button>
      )}

      {settings.showGuide && (
        <PreviewGuideAvatar
          currentPage={currentPage}
          totalPages={totalPages}
          isFlipping={isFlipping}
          onPrev={goPrev}
          onNext={goNext}
          onDismiss={() => patchSettings({ showGuide: false })}
        />
      )}

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
          className={`book-preview-book ${canManipulateBook ? "is-draggable" : ""} ${isPortraitBook ? "is-single-page" : ""} ${singlePageMode && isFirst ? "is-cover" : ""} ${singlePageMode && isLast ? "is-back-cover" : ""} ${
            isFullscreen && useFullscreenSpread && !singlePageMode
              ? "has-fullscreen-binding"
              : ""
          }`}
          style={
            {
              "--preview-page-width": `${scaledPageW}px`,
              "--preview-page-height": `${scaledPageH}px`,
              "--preview-spread-pages": isPortraitBook ? 1 : 2,
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
              startPage={0}
              showCover={false}
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

      <nav className="book-preview-dots" aria-label="Preview pages">
        {previewPages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            className={index === currentPage ? "is-active" : ""}
            onClick={() => goToPage(index)}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </nav>
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
    { pageId, pageNumber, isCover, isBackCover, fit, renderFit, pageW, pageH, isBlankPlaceholder },
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
            <Page pageId={pageId} interactive={false} pageNumber={pageNumber} />
          )}
        </div>
        {(isCover || isBackCover) && <div className="book-preview-cover-finish" />}
      </div>
    );
  },
);

BookPage.displayName = "BookPage";
