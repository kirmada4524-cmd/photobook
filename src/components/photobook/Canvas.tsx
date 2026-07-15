import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBookStore, undo, redo } from "@/lib/photobook/store";
import { Page } from "./Page";
import { PAGE_SIZES, type PhotoElement } from "@/lib/photobook/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  LayoutGrid,
  Plus,
  Trash2,
  WandSparkles,
  Scissors,
  Wand2,
} from "lucide-react";
import { AddTemplatesModal } from "./AddTemplatesModal";
import { MobilePagesStrip } from "./LibrarySidebar";
import { useAuthStore } from "@/lib/auth";

export const pageLabel = (index: number, total: number) => {
  if (index === 0) return "Cover";
  if (total > 2 && index === total - 1) return "Back cover";
  return `Page ${index}`;
};

// ─── Known fixed chrome heights (px) ────────────────────────────────────────
// EditorHeader: h-[60px] = 60
// Canvas top bar: ~48px
// Next/Prev bar on mobile: 40px
// Mobile bottom toolbar: h-14 = 56
// Total chrome consumed above+below the workspace on mobile = 60 + 48 + 40 + 56 = 204px
const MOBILE_CHROME_H = 204;
const MOBILE_BREAKPOINT = 768;

/** Compute workspace available dimensions from window right now (synchronous). */
function getAvailableSize() {
  if (typeof window === "undefined") return { w: 0, h: 0, mobile: false };
  const mobile = window.innerWidth < MOBILE_BREAKPOINT;
  return {
    w: window.innerWidth,
    h: mobile ? window.innerHeight - MOBILE_CHROME_H : window.innerHeight,
    mobile,
  };
}

// ─── Workspace sub-component ────────────────────────────────────────────────
interface WorkspaceProps {
  pageW: number;
  pageH: number;
  zoom: number;
  currentPageId: string;
  currentIdx: number;
  totalPages: number;
}

function CanvasWorkspace({
  pageW,
  pageH,
  zoom,
  currentPageId,
  currentIdx,
  totalPages,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState(() => getAvailableSize());

  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;
        setSize({
          w: containerRef.current.clientWidth || window.innerWidth,
          h: containerRef.current.clientHeight || window.innerHeight - MOBILE_CHROME_H,
          mobile,
        });
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Mobile → auto-fit to available space (8px padding each side)
  // Desktop → use user-controlled zoom from store
  const PAD = 16;
  const effectiveZoom = size.mobile
    ? Math.max(0.05, Math.min(1.0, Math.min((size.w - PAD) / pageW, (size.h - PAD) / pageH)))
    : zoom;

  const scaledW = pageW * effectiveZoom;
  const scaledH = pageH * effectiveZoom;

  return (
    <div
      ref={containerRef}
      className={
        "editor-canvas-workspace min-h-0 flex-1 " +
        "flex items-center justify-center overflow-hidden p-2 " +
        "md:overflow-auto md:p-10"
      }
    >
      <div
        className="editor-page-stage shrink-0 overflow-hidden rounded-sm shadow-photo ring-1 ring-black/5 animate-float-in"
        style={{ width: scaledW, height: scaledH }}
      >
        <div
          style={{
            transform: `scale(${effectiveZoom})`,
            transformOrigin: "top left",
            width: pageW,
            height: pageH,
          }}
        >
          <Page
            pageId={currentPageId}
            pageNumber={pageLabel(currentIdx, totalPages)}
            canvasScale={effectiveZoom}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Prev / Next navigation bar ──────────────────────────────────────────────
interface PageNavProps {
  currentIdx: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  label: string;
  mobile?: boolean;
}

function PageNav({ currentIdx, total, onPrev, onNext, label, mobile }: PageNavProps) {
  if (mobile) {
    // Compact pill-style bar for mobile — sits just above the canvas
    return (
      <div className="md:hidden flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-background/95 backdrop-blur">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs font-medium disabled:opacity-30"
          onClick={onPrev}
          disabled={currentIdx === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>

        <span className="text-xs font-semibold text-muted-foreground">
          {label} &nbsp;·&nbsp; {currentIdx + 1} / {total}
        </span>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs font-medium disabled:opacity-30"
          onClick={onNext}
          disabled={currentIdx >= total - 1}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Desktop inline prev/next in the top bar
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 disabled:opacity-30"
        title="Previous page"
        onClick={onPrev}
        disabled={currentIdx === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 disabled:opacity-30"
        title="Next page"
        onClick={onNext}
        disabled={currentIdx >= total - 1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </>
  );
}

// ─── Main Canvas component ───────────────────────────────────────────────────
export function Canvas() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const pages = useBookStore((s) => s.book.pages);
  const currentPageId = useBookStore((s) => s.currentPageId);
  const zoom = useBookStore((s) => s.zoom);
  const selectedId = useBookStore((s) => s.selectedElementId);
  const removeElement = useBookStore((s) => s.removeElement);
  const addPage = useBookStore((s) => s.addPage);
  const duplicatePage = useBookStore((s) => s.duplicatePage);
  const deletePage = useBookStore((s) => s.deletePage);
  const setCurrentPage = useBookStore((s) => s.setCurrentPage);
  const isMagicLayoutMode = useBookStore((s) => s.isMagicLayoutMode);
  const setIsMagicLayoutMode = useBookStore((s) => s.setIsMagicLayoutMode);
  const magicLayoutTolerance = useBookStore((s) => s.magicLayoutTolerance);
  const magicLayoutFeather = useBookStore((s) => s.magicLayoutFeather);
  const magicLayoutExpand = useBookStore((s) => s.magicLayoutExpand);
  const setMagicLayoutTolerance = useBookStore((s) => s.setMagicLayoutTolerance);
  const setMagicLayoutFeather = useBookStore((s) => s.setMagicLayoutFeather);
  const setMagicLayoutExpand = useBookStore((s) => s.setMagicLayoutExpand);
  const [showAddTemplates, setShowAddTemplates] = useState(false);

  useEffect(() => {
    const openTemplates = () => setShowAddTemplates(true);
    window.addEventListener("photobook:open-templates", openTemplates);
    return () => window.removeEventListener("photobook:open-templates", openTemplates);
  }, []);

  useEffect(() => {
    if (!isAdmin && isMagicLayoutMode) setIsMagicLayoutMode(false);
  }, [isAdmin, isMagicLayoutMode, setIsMagicLayoutMode]);

  useEffect(() => {
    if (pages.length === 0) {
      addPage();
      return;
    }
    if (!pages.some((p) => p.id === currentPageId)) {
      setCurrentPage(pages[0].id);
    }
  }, [addPage, currentPageId, pages, setCurrentPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") {
        const state = useBookStore.getState();
        const pages = state.book.pages;
        const currentIdx = pages.findIndex((p) => p.id === state.currentPageId);
        if (currentIdx > 0) {
          e.preventDefault();
          state.setCurrentPage(pages[currentIdx - 1].id);
        }
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") {
        const state = useBookStore.getState();
        const pages = state.book.pages;
        const currentIdx = pages.findIndex((p) => p.id === state.currentPageId);
        if (currentIdx < pages.length - 1) {
          e.preventDefault();
          state.setCurrentPage(pages[currentIdx + 1].id);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          const state = useBookStore.getState();
          const page = state.book.pages.find((p) => p.id === state.currentPageId);
          const selected = page?.elements.find((el) => el.id === selectedId);
          const isLocked =
            (selected?.type === "photo" && selected.locked) ||
            (selected?.type === "sticker" && selected.locked);
          if (!isLocked) {
            e.preventDefault();
            removeElement(selectedId);
          }
        }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (selectedId) {
          const state = useBookStore.getState();
          const page = state.book.pages.find((p) => p.id === state.currentPageId);
          const selected = page?.elements.find((el) => el.id === selectedId);
          if (selected?.type === "photo") {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 2;
            const photo = selected as PhotoElement;
            const currentX = photo.imageX ?? 0;
            const currentY = photo.imageY ?? 0;
            const patch: Partial<PhotoElement> = {};
            if (e.key === "ArrowLeft") patch.imageX = currentX - step;
            if (e.key === "ArrowRight") patch.imageX = currentX + step;
            if (e.key === "ArrowUp") patch.imageY = currentY - step;
            if (e.key === "ArrowDown") patch.imageY = currentY + step;
            state.updateElement(photo.id, patch);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeElement]);

  const idx = pages.findIndex((p) => p.id === currentPageId);
  const currentIdx = idx < 0 ? 0 : idx;
  const activePage = pages[currentIdx];
  const selectedPhoto = activePage?.elements.find(
    (element): element is PhotoElement => element.id === selectedId && element.type === "photo",
  );

  const preset = PAGE_SIZES[0];
  const pageW = preset.width;
  const pageH = preset.height;

  const goToPrev = () => {
    if (currentIdx > 0) setCurrentPage(pages[currentIdx - 1].id);
  };

  const goToNext = () => {
    if (currentIdx < pages.length - 1) setCurrentPage(pages[currentIdx + 1].id);
  };

  const currentLabel = pageLabel(currentIdx, pages.length);

  return (
    <div className="editor-canvas-root flex h-full w-full min-w-0 min-h-0 flex-col">
      {/* ── Top toolbar ── */}
      <div className="editor-canvas-toolbar sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur md:px-4">
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Page label pill */}
          <div className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {currentLabel} / {pages.length}
          </div>

          {/* Desktop Prev / Next */}
          <div className="hidden md:flex items-center">
            <PageNav
              currentIdx={currentIdx}
              total={pages.length}
              onPrev={goToPrev}
              onNext={goToNext}
              label={currentLabel}
            />
          </div>

          {/* Page actions — hidden on mobile to save horizontal space */}
          <Button
            size="sm"
            variant="outline"
            className="hidden md:flex gap-2 shadow-sm"
            onClick={addPage}
          >
            <Plus className="h-4 w-4" />
            Add Page
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hidden md:grid h-8 w-8"
            title="Duplicate current page"
            disabled={!activePage}
            onClick={() => activePage && duplicatePage(activePage.id)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hidden md:grid h-8 w-8 text-sky-600 hover:bg-sky-50 hover:text-sky-700"
            title="Delete current page"
            disabled={!activePage || pages.length <= 1}
            onClick={() => activePage && deletePage(activePage.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 md:gap-2">
          {isAdmin && (
            <Button
              size="sm"
              variant={isMagicLayoutMode ? "default" : "outline"}
              className={`gap-1.5 shadow-sm px-2 md:px-3 ${
                isMagicLayoutMode ? "bg-sky-500 text-white hover:bg-sky-600" : ""
              }`}
              disabled={!activePage}
              onClick={() => setIsMagicLayoutMode(!isMagicLayoutMode)}
            >
              <WandSparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Magic Layout</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 px-2 shadow-sm md:px-3"
            disabled={!selectedPhoto?.imageId}
            title="Crop selected image"
            onClick={() => {
              if (!selectedPhoto) return;
              window.dispatchEvent(
                new CustomEvent("photobook:open-crop-tools", {
                  detail: { elementId: selectedPhoto.id },
                }),
              );
            }}
          >
            <Scissors className="h-4 w-4" />
            <span className="hidden lg:inline">Crop</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 px-2 shadow-sm md:px-3"
            disabled={!selectedPhoto?.imageId}
            title="Remove selected image background"
            onClick={() => {
              if (!selectedPhoto) return;
              window.dispatchEvent(
                new CustomEvent("photobook:remove-photo-background", {
                  detail: { elementId: selectedPhoto.id },
                }),
              );
            }}
          >
            <Wand2 className="h-4 w-4" />
            <span className="hidden lg:inline">Remove BG</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 shadow-sm hidden md:flex px-2 md:px-3"
            onClick={() => setShowAddTemplates(true)}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden lg:inline">Multiple Templates</span>
          </Button>
        </div>

        {isAdmin && isMagicLayoutMode && (
          <div className="flex basis-full flex-wrap items-center gap-3 rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-2 text-xs text-sky-900 shadow-sm">
            <div className="flex min-w-[220px] items-center gap-2 font-semibold">
              <WandSparkles className="h-4 w-4 text-sky-600" />
              Click inside the blank photo frame area.
            </div>
            <label className="flex min-w-[170px] items-center gap-2">
              <span className="w-20 font-medium">Tolerance {magicLayoutTolerance}</span>
              <Slider
                className="w-24"
                value={[magicLayoutTolerance]}
                min={5}
                max={60}
                step={1}
                onValueChange={([value]) => setMagicLayoutTolerance(value)}
              />
            </label>
            <label className="flex min-w-[140px] items-center gap-2">
              <span className="w-16 font-medium">Feather {magicLayoutFeather}</span>
              <Slider
                className="w-20"
                value={[magicLayoutFeather]}
                min={0}
                max={2}
                step={1}
                onValueChange={([value]) => setMagicLayoutFeather(value)}
              />
            </label>
            <label className="flex min-w-[150px] items-center gap-2">
              <span className="w-16 font-medium">
                {magicLayoutExpand === 0
                  ? "Edge 0"
                  : magicLayoutExpand > 0
                    ? `Expand ${magicLayoutExpand}`
                    : `Shrink ${Math.abs(magicLayoutExpand)}`}
              </span>
              <Slider
                className="w-20"
                value={[magicLayoutExpand]}
                min={-3}
                max={3}
                step={1}
                onValueChange={([value]) => setMagicLayoutExpand(value)}
              />
            </label>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-8 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
              onClick={() => setIsMagicLayoutMode(false)}
            >
              Done
            </Button>
          </div>
        )}
      </div>

      {/* ── Mobile Prev / Next navigation strip ── */}
      <PageNav
        currentIdx={currentIdx}
        total={pages.length}
        onPrev={goToPrev}
        onNext={goToNext}
        label={currentLabel}
        mobile
      />

      {/* ── Mobile collapsible page strip ── */}
      <MobilePagesStrip />

      {/* ── Workspace ── */}
      <CanvasWorkspace
        pageW={pageW}
        pageH={pageH}
        zoom={zoom}
        currentPageId={activePage?.id ?? currentPageId}
        currentIdx={currentIdx}
        totalPages={pages.length}
      />

      <AddTemplatesModal open={showAddTemplates} onOpenChange={setShowAddTemplates} />
    </div>
  );
}
