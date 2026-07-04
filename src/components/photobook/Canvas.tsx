import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBookStore, undo, redo } from "@/lib/photobook/store";
import { Page } from "./Page";
import { PAGE_SIZES, type PhotoElement } from "@/lib/photobook/types";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Star, LayoutGrid } from "lucide-react";
import { AddTemplatesModal } from "./AddTemplatesModal";

export const pageLabel = (index: number, total: number) => {
  if (index === 0) return "Cover";
  if (total > 2 && index === total - 1) return "Back cover";
  return `Page ${index}`;
};

// ─── Known fixed chrome heights (px) ────────────────────────────────────────
// EditorHeader: h-[60px] = 60
// Canvas tabs bar: py-2 (8+8) + h-7 items (28) = 44
// Mobile bottom toolbar: h-14 = 56
// Total chrome consumed above+below the workspace on mobile = 60 + 44 + 56 = 160px
const MOBILE_CHROME_H = 160;
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
  zoom: number;          // desktop zoom (from store)
  currentPageId: string;
  currentIdx: number;
  totalPages: number;
}

function CanvasWorkspace({ pageW, pageH, zoom, currentPageId, currentIdx, totalPages }: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Lazy initial state: read window synchronously so first render is correct ──
  const [size, setSize] = useState(() => getAvailableSize());

  useLayoutEffect(() => {
    // Refine with actual measured container (accounts for any chrome we missed)
    const measure = () => {
      if (containerRef.current) {
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;
        setSize({
          w: containerRef.current.clientWidth  || window.innerWidth,
          h: containerRef.current.clientHeight || (window.innerHeight - MOBILE_CHROME_H),
          mobile,
        });
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // Mobile → auto-fit to available space (8px padding each side)
  // Desktop → use user-controlled zoom from store
  const PAD = 16;
  const effectiveZoom = size.mobile
    ? Math.max(0.05, Math.min(1.0,
        Math.min((size.w - PAD) / pageW, (size.h - PAD) / pageH)
      ))
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
      {/* Outer wrapper at scaled pixel dimensions.
           overflow-hidden is CRITICAL: CSS transform does not affect layout, so
           the inner 550px div still occupies 550px of layout space. Without
           overflow-hidden it bleeds off-screen to the right on mobile. */}
      <div
        className="shrink-0 overflow-hidden rounded-sm shadow-photo ring-1 ring-black/5 animate-float-in"
        style={{ width: scaledW, height: scaledH }}
      >
        {/* Inner page at natural size, CSS-scaled from top-left */}
        <div
          style={{
            transform: `scale(${effectiveZoom})`,
            transformOrigin: "top left",
            width:  pageW,
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

// ─── Main Canvas component ───────────────────────────────────────────────────
export function Canvas() {
  const pages          = useBookStore((s) => s.book.pages);
  const currentPageId  = useBookStore((s) => s.currentPageId);
  const setCurrentPage = useBookStore((s) => s.setCurrentPage);
  const addPage        = useBookStore((s) => s.addPage);
  const duplicatePage  = useBookStore((s) => s.duplicatePage);
  const deletePage     = useBookStore((s) => s.deletePage);
  const reorderPages   = useBookStore((s) => s.reorderPages);
  const zoom           = useBookStore((s) => s.zoom);
  const setZoom        = useBookStore((s) => s.setZoom);
  const selectedId     = useBookStore((s) => s.selectedElementId);
  const removeElement  = useBookStore((s) => s.removeElement);
  const copyElement    = useBookStore((s) => s.copyElement);
  const pasteElement   = useBookStore((s) => s.pasteElement);

  // Drag-and-drop state for tab reordering
  const dragIndexRef   = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddTemplates, setShowAddTemplates] = useState(false);

  const movePageLeft = () => {
    const idx = pages.findIndex((p) => p.id === currentPageId);
    if (idx <= 0) return;
    const ids = pages.map((p) => p.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorderPages(ids);
  };

  const movePageRight = () => {
    const idx = pages.findIndex((p) => p.id === currentPageId);
    if (idx < 0 || idx >= pages.length - 1) return;
    const ids = pages.map((p) => p.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorderPages(ids);
  };

  const setAsCover = () => {
    const idx = pages.findIndex((p) => p.id === currentPageId);
    if (idx <= 0) return;
    const ids = pages.map((p) => p.id);
    ids.splice(idx, 1);
    ids.unshift(currentPageId);
    reorderPages(ids);
  };

  const selectedElement = useBookStore((s) => {
    const page = s.book.pages.find((p) => p.elements.some((el) => el.id === s.selectedElementId));
    return page?.elements.find((el) => el.id === s.selectedElementId);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault(); redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault(); duplicatePage(currentPageId);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedId) { e.preventDefault(); copyElement(selectedId); }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault(); pasteElement();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          const state = useBookStore.getState();
          const page = state.book.pages.find(p => p.id === state.currentPageId);
          if (!page?.frameLocked) { e.preventDefault(); removeElement(selectedId); }
        }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (selectedElement && selectedElement.type === "photo") {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          const photo = selectedElement as PhotoElement;
          const currentX = photo.imageX ?? 0;
          const currentY = photo.imageY ?? 0;
          let nextX = currentX, nextY = currentY;
          if (e.key === "ArrowLeft")  nextX = currentX - step;
          if (e.key === "ArrowRight") nextX = currentX + step;
          if (e.key === "ArrowUp")    nextY = currentY - step;
          if (e.key === "ArrowDown")  nextY = currentY + step;
          nextX = Math.max(-400, Math.min(400, nextX));
          nextY = Math.max(-400, Math.min(400, nextY));
          useBookStore.getState().updateElement(selectedElement.id, { imageX: nextX, imageY: nextY });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPageId, selectedId, selectedElement, duplicatePage, removeElement, copyElement, pasteElement]);

  const idx        = pages.findIndex((p) => p.id === currentPageId);
  const currentIdx = idx < 0 ? 0 : idx;

  const preset = PAGE_SIZES[0];
  const pageW      = preset.width;
  const pageH      = preset.height;

  return (
    <div className="flex h-full w-full min-w-0 min-h-0 flex-col">

      {/* ── Page tabs bar ── */}
      <div className="editor-page-tabs flex shrink-0 items-center gap-2 px-3 py-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {pages.map((p, i) => (
            <button
              key={p.id}
              draggable
              onDragStart={() => { dragIndexRef.current = i; }}
              onDragOver={(e)  => { e.preventDefault(); setDragOverIndex(i); }}
              onDragLeave={()  => setDragOverIndex(null)}
              onDrop={() => {
                const from = dragIndexRef.current;
                if (from === null || from === i) { setDragOverIndex(null); return; }
                const ids = pages.map((pg) => pg.id);
                const [moved] = ids.splice(from, 1);
                ids.splice(i, 0, moved);
                reorderPages(ids);
                dragIndexRef.current = null;
                setDragOverIndex(null);
              }}
              onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null); }}
              onClick={() => setCurrentPage(p.id)}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition cursor-grab active:cursor-grabbing ${
                p.id === currentPageId ? "editor-tab-active" : "editor-tab-inactive"
              } ${dragOverIndex === i ? "ring-2 ring-accent ring-offset-1" : ""}`}
            >
              {i === 0 && <span className="mr-1 text-amber-400">★</span>}
              {pageLabel(i, pages.length)}
            </button>
          ))}
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={addPage} title="Add blank page">
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 shrink-0 text-accent hover:text-accent/80 hover:bg-accent/10"
            onClick={() => setShowAddTemplates(true)} title="Add pages from templates"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>

        {/* Page ordering controls */}
        <div className="flex shrink-0 items-center gap-0.5 border-l pl-2 ml-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={movePageLeft}
            disabled={pages.findIndex((p) => p.id === currentPageId) <= 0} title="Move page left">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={movePageRight}
            disabled={pages.findIndex((p) => p.id === currentPageId) >= pages.length - 1} title="Move page right">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-400" onClick={setAsCover}
            disabled={pages.findIndex((p) => p.id === currentPageId) === 0} title="Set as cover page">
            <Star className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicatePage(currentPageId)} title="Duplicate page">
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deletePage(currentPageId)}
            disabled={pages.length <= 1} title="Delete page">
            <Trash2 className="h-4 w-4" />
          </Button>
          {/* Zoom controls — desktop only */}
          <div className="hidden md:flex items-center gap-1">
            <div className="mx-1 h-5 w-px bg-border" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(zoom - 0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="w-10 text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(zoom + 0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Workspace (isolated sub-component) ── */}
      <CanvasWorkspace
        pageW={pageW}
        pageH={pageH}
        zoom={zoom}
        currentPageId={currentPageId}
        currentIdx={currentIdx}
        totalPages={pages.length}
      />

      <AddTemplatesModal open={showAddTemplates} onOpenChange={setShowAddTemplates} />
    </div>
  );
}
