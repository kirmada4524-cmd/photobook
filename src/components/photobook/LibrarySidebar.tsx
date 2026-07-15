import { useEffect, useRef, useState } from "react";
import { useBookStore } from "@/lib/photobook/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Heart,
  Trash2,
  Search,
  ImagePlus,
  Check,
  LayoutGrid,
  Plus,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Page } from "./Page";
import { PAGE_SIZES } from "@/lib/photobook/types";

const pageLabel = (index: number, total: number) => {
  if (index === 0) return "Cover";
  if (total > 2 && index === total - 1) return "Back cover";
  return `Page ${Math.max(1, index)}`;
};

export function LibrarySidebar() {
  const library = useBookStore((s) => s.library);
  const pages = useBookStore((s) => s.book.pages);
  const currentPageId = useBookStore((s) => s.currentPageId);
  const setCurrentPage = useBookStore((s) => s.setCurrentPage);
  const addPage = useBookStore((s) => s.addPage);
  const duplicatePage = useBookStore((s) => s.duplicatePage);
  const deletePage = useBookStore((s) => s.deletePage);
  const addImagesFromFiles = useBookStore((s) => s.addImagesFromFiles);
  const removeImage = useBookStore((s) => s.removeImage);
  const toggleFavorite = useBookStore((s) => s.toggleFavorite);
  const toggleExclude = useBookStore((s) => s.toggleExclude);
  const addPhotoToCurrentPage = useBookStore((s) => s.addPhotoToCurrentPage);
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState(false);
  const [activeSection, setActiveSection] = useState<"pages" | "photos">("photos");
  const [pageDragState, setPageDragState] = useState<{ id: string | null; dropped: boolean }>({
    id: null,
    dropped: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openSection = (event: Event) => {
      const section = (event as CustomEvent<{ section?: "pages" | "photos" }>).detail?.section;
      if (section === "pages" || section === "photos") setActiveSection(section);
    };
    window.addEventListener("photobook:library-section", openSection);
    return () => window.removeEventListener("photobook:library-section", openSection);
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    try {
      await addImagesFromFiles(arr);
      toast.success(`Added ${arr.length} photo${arr.length > 1 ? "s" : ""}`);
    } catch (error) {
      console.error("Failed to add images", error);
      toast.error("Failed to add images");
    }
  };

  const filtered = library.filter((i) =>
    q ? i.name.toLowerCase().includes(q.toLowerCase()) : true,
  );
  const favorites = filtered.filter((i) => i.favorite);
  const rest = filtered.filter((i) => !i.favorite);

  const width = useBookStore((s) => s.librarySidebarWidth ?? 288);
  const setWidth = useBookStore((s) => s.setLibrarySidebarWidth);
  const isResizing = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    setWidth(e.clientX);
  };

  const stopResize = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  };

  return (
    <aside
      style={typeof window !== "undefined" && window.innerWidth < 768 ? undefined : { width }}
      className="editor-sidebar relative flex h-full shrink-0 flex-col md:border-r w-full md:w-auto bg-background"
    >
      <div className="editor-sidebar-header hidden md:flex items-center justify-between p-4">
        <div>
          <h2 className="font-display text-base font-semibold">Photo Library</h2>
          <p className="text-[11px] text-muted-foreground">{library.length} images uploaded</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={useBookStore((s) => s.toggleLibrarySidebar)}
          title="Hide sidebar"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 p-3">
        <div className="hidden md:grid grid-cols-2 gap-2 rounded-xl border bg-card p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveSection("pages")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeSection === "pages"
                ? "bg-accent text-accent-foreground"
                : "bg-muted/50 hover:bg-muted"
            }`}
          >
            Pages
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("photos")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeSection === "photos"
                ? "bg-accent text-accent-foreground"
                : "bg-muted/50 hover:bg-muted"
            }`}
          >
            Photos
          </button>
        </div>

        {activeSection === "pages" ? (
          <div className="hidden md:flex max-h-[calc(100vh-185px)] min-h-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pages
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {pages.length} pages in this book
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2" onClick={addPage}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-scroll pr-3 space-y-5">
              {/* ── Cover ── */}
              {pages.length > 0 &&
                (() => {
                  const coverPage = pages[0];
                  const active = coverPage.id === currentPageId;
                  return (
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Cover
                      </p>
                      <PageThumb
                        page={coverPage}
                        index={0}
                        total={pages.length}
                        active={active}
                        setCurrentPage={setCurrentPage}
                        duplicatePage={duplicatePage}
                        deletePage={deletePage}
                        pages={pages}
                        pageDragState={pageDragState}
                        setPageDragState={setPageDragState}
                        fullWidth
                        sidebarWidth={width}
                      />
                    </div>
                  );
                })()}

              {/* ── Inner pages (pairs) ── */}
              {pages.length > 2 &&
                (() => {
                  const innerPages = pages.slice(1, pages.length - 1);
                  // Group into pairs
                  const pairs: (typeof pages)[] = [];
                  for (let i = 0; i < innerPages.length; i += 2) {
                    pairs.push(innerPages.slice(i, i + 2));
                  }
                  return (
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Pages
                      </p>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                        {pairs.map((pair, pairIdx) =>
                          pair.map((page) => {
                            const realIdx = pages.findIndex((p) => p.id === page.id);
                            return (
                              <PageThumb
                                key={page.id}
                                page={page}
                                index={realIdx}
                                total={pages.length}
                                active={page.id === currentPageId}
                                setCurrentPage={setCurrentPage}
                                duplicatePage={duplicatePage}
                                deletePage={deletePage}
                                pages={pages}
                                pageDragState={pageDragState}
                                setPageDragState={setPageDragState}
                                sidebarWidth={width}
                              />
                            );
                          }),
                        )}
                      </div>
                    </div>
                  );
                })()}

              {/* Single inner page when exactly 3 pages total */}
              {pages.length === 3 &&
                (() => {
                  const page = pages[1];
                  const active = page.id === currentPageId;
                  return (
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Pages
                      </p>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                        <PageThumb
                          page={page}
                          index={1}
                          total={pages.length}
                          active={active}
                          setCurrentPage={setCurrentPage}
                          duplicatePage={duplicatePage}
                          deletePage={deletePage}
                          pages={pages}
                          pageDragState={pageDragState}
                          setPageDragState={setPageDragState}
                          sidebarWidth={width}
                        />
                      </div>
                    </div>
                  );
                })()}

              {/* ── Back cover ── */}
              {pages.length > 1 &&
                (() => {
                  const backPage = pages[pages.length - 1];
                  const active = backPage.id === currentPageId;
                  return (
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Back cover
                      </p>
                      <PageThumb
                        page={backPage}
                        index={pages.length - 1}
                        total={pages.length}
                        active={active}
                        setCurrentPage={setCurrentPage}
                        duplicatePage={duplicatePage}
                        deletePage={deletePage}
                        pages={pages}
                        pageDragState={pageDragState}
                        setPageDragState={setPageDragState}
                        fullWidth
                        sidebarWidth={width}
                      />
                    </div>
                  );
                })()}
            </div>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={`editor-upload-zone flex cursor-pointer flex-row md:flex-col items-center justify-center gap-2 md:gap-1.5 rounded-lg md:rounded-xl p-2 md:p-5 text-center text-sm ${
                drag ? "is-dragging" : ""
              }`}
            >
              <div className="grid h-8 w-8 md:h-10 md:w-10 place-items-center rounded-full bg-accent/10 text-accent shrink-0">
                <Upload className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="font-semibold text-foreground text-xs md:text-sm">Upload photos</div>
              <div className="hidden md:block text-[11px] text-muted-foreground">
                JPG, PNG, WebP · drag or click
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                className="pl-8"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        {activeSection === "photos" && (
          <>
            {library.length === 0 && (
              <div className="grid place-items-center py-10 text-center text-xs text-muted-foreground">
                <ImagePlus className="mb-2 h-8 w-8 opacity-50" />
                Upload photos to get started.
              </div>
            )}

            {favorites.length > 0 && (
              <>
                <div className="mb-2 mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Favorites
                </div>
                <Grid
                  items={favorites}
                  onAdd={addPhotoToCurrentPage}
                  onFav={toggleFavorite}
                  onDel={removeImage}
                  onExclude={toggleExclude}
                />
              </>
            )}
            {rest.length > 0 && (
              <>
                {favorites.length > 0 && (
                  <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    All photos
                  </div>
                )}
                <Grid
                  items={rest}
                  onAdd={addPhotoToCurrentPage}
                  onFav={toggleFavorite}
                  onDel={removeImage}
                  onExclude={toggleExclude}
                />
              </>
            )}
          </>
        )}
      </div>

      <div
        onMouseDown={startResize}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 active:bg-accent transition z-50"
      />
    </aside>
  );
}

// ─── Mobile collapsible page strip ───────────────────────────────────────────
export function MobilePagesStrip() {
  const pages = useBookStore((s) => s.book.pages);
  const currentPageId = useBookStore((s) => s.currentPageId);
  const setCurrentPage = useBookStore((s) => s.setCurrentPage);
  const deletePage = useBookStore((s) => s.deletePage);
  const addPage = useBookStore((s) => s.addPage);
  const [open, setOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const preset = PAGE_SIZES[0];
  const THUMB_W = 72;
  const THUMB_H = Math.round(THUMB_W * (preset.height / preset.width)); // keeps 1:1 ratio
  const scale = THUMB_W / preset.width;

  return (
    <div className="md:hidden border-t bg-card">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition"
      >
        <span>Pages ({pages.length})</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-3 pb-3">
          {/* Scrollable thumbnail row */}
          <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-1 snap-x touch-pan-x">
            {pages.map((page, index) => {
              const active = page.id === currentPageId;
              return (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => setDragId(page.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!dragId || dragId === page.id) return;
                    const ids = pages.map((p) => p.id);
                    const from = ids.indexOf(dragId);
                    const to = ids.indexOf(page.id);
                    if (from < 0 || to < 0) return;
                    ids.splice(from, 1);
                    ids.splice(to, 0, dragId);
                    useBookStore.getState().reorderPages(ids);
                    setDragId(null);
                  }}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => setCurrentPage(page.id)}
                  className={`shrink-0 snap-start cursor-pointer rounded-lg border overflow-hidden transition ${
                    active
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-border/70 hover:border-accent/40"
                  } ${dragId === page.id ? "opacity-50" : ""}`}
                  style={{ width: THUMB_W }}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative overflow-hidden bg-muted"
                    style={{ width: THUMB_W, height: THUMB_H }}
                  >
                    <div
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        width: preset.width,
                        height: preset.height,
                        pointerEvents: "none",
                      }}
                    >
                      <Page pageId={page.id} interactive={false} />
                    </div>
                  </div>
                  {/* Controls for Rearranging & Deleting */}
                  <div className="flex items-center justify-between border-t bg-muted/40 px-1 py-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        const ids = pages.map((p) => p.id);
                        const from = index;
                        const to = index - 1;
                        ids.splice(from, 1);
                        ids.splice(to, 0, page.id);
                        useBookStore.getState().reorderPages(ids);
                      }}
                      className="rounded p-0.5 hover:bg-muted text-foreground disabled:opacity-30 animate-scale-in"
                      title="Move left"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={pages.length <= 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(page.id);
                      }}
                      className="rounded p-0.5 text-sky-600 hover:bg-sky-50 disabled:opacity-30 animate-scale-in"
                      title="Delete page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === pages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        const ids = pages.map((p) => p.id);
                        const from = index;
                        const to = index + 1;
                        ids.splice(from, 1);
                        ids.splice(to, 0, page.id);
                        useBookStore.getState().reorderPages(ids);
                      }}
                      className="rounded p-0.5 hover:bg-muted text-foreground disabled:opacity-30 animate-scale-in"
                      title="Move right"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Label */}
                  <div className="px-1 py-0.5 text-[9px] font-semibold text-center truncate">
                    {pageLabel(index, pages.length)}
                  </div>
                </div>
              );
            })}

            {/* Add page button */}
            <button
              type="button"
              onClick={addPage}
              className="shrink-0 snap-start flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 text-muted-foreground hover:border-accent hover:text-accent transition"
              style={{ width: THUMB_W, height: THUMB_H + 26 }}
            >
              <Plus className="h-4 w-4" />
              <span className="text-[9px] font-semibold">Add</span>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
            Tap to select · Drag to reorder
          </p>
        </div>
      )}
    </div>
  );
}

function PageThumb({
  page,
  index,
  total,
  active,
  setCurrentPage,
  duplicatePage,
  deletePage,
  pages,
  pageDragState,
  setPageDragState,
  fullWidth,
  sidebarWidth,
}: {
  page: { id: string };
  index: number;
  total: number;
  active: boolean;
  setCurrentPage: (id: string) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  pages: { id: string }[];
  pageDragState: { id: string | null; dropped: boolean };
  setPageDragState: (s: { id: string | null; dropped: boolean }) => void;
  fullWidth?: boolean;
  sidebarWidth: number;
}) {
  // Container width inside the sidebar layout
  const containerWidth = fullWidth ? sidebarWidth - 64 : (sidebarWidth - 64 - 20) / 2;

  // Since FIXED_PAGE_SIZE width/height is 550, scale factor is containerWidth / 550
  const scale = Math.max(0.05, containerWidth / 550);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setCurrentPage(page.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setCurrentPage(page.id);
        }
      }}
      draggable
      onDragStart={() => setPageDragState({ id: page.id, dropped: false })}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const draggedId = pageDragState.id;
        if (!draggedId || draggedId === page.id) return;
        const ids = pages.map((p) => p.id);
        const from = ids.indexOf(draggedId);
        const to = ids.indexOf(page.id);
        if (from < 0 || to < 0) return;
        ids.splice(from, 1);
        ids.splice(to, 0, draggedId);
        useBookStore.getState().reorderPages(ids);
        setPageDragState({ id: draggedId, dropped: true });
      }}
      onDragEnd={() => {
        if (
          pageDragState.id &&
          !pageDragState.dropped &&
          typeof window !== "undefined" &&
          window.innerWidth < 768
        ) {
          deletePage(pageDragState.id);
        }
        setPageDragState({ id: null, dropped: false });
      }}
      className={`group relative overflow-hidden rounded-lg border bg-background text-left transition select-none shadow-sm ${
        active ? "border-accent ring-2 ring-accent/20" : "border-border/80 hover:border-accent/40"
      }`}
      style={{ width: containerWidth }}
    >
      <div
        className="relative overflow-hidden bg-muted aspect-square w-full"
        style={{ height: containerWidth }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: 550,
            height: 550,
            pointerEvents: "none",
          }}
        >
          <Page pageId={page.id} interactive={false} />
        </div>
      </div>
      <div className="flex min-h-8 items-center justify-center gap-2 border-t bg-card px-2 py-1.5 text-center text-[10px] font-semibold">
        <span className="block truncate">{pageLabel(index, total)}</span>
      </div>
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <span
          role="button"
          tabIndex={0}
          title="Duplicate page"
          onClick={(e) => {
            e.stopPropagation();
            duplicatePage(page.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              duplicatePage(page.id);
            }
          }}
          className="grid h-6 w-6 place-items-center rounded-md bg-background/90 text-foreground shadow-sm hover:bg-background"
        >
          <Copy className="h-3.5 w-3.5" />
        </span>
        <span
          role="button"
          tabIndex={0}
          title="Delete page"
          onClick={(e) => {
            e.stopPropagation();
            deletePage(page.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              deletePage(page.id);
            }
          }}
          className={`grid h-6 w-6 place-items-center rounded-md bg-background/90 shadow-sm ${
            pages.length <= 1 ? "pointer-events-none text-muted-foreground/40" : "text-sky-600"
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

function Grid({
  items,
  onAdd,
  onFav,
  onDel,
  onExclude,
}: {
  items: { id: string; src: string; name: string; favorite?: boolean; excluded?: boolean }[];
  onAdd: (id: string) => void;
  onFav: (id: string) => void;
  onDel: (id: string) => void;
  onExclude: (id: string) => void;
}) {
  return (
    <div className="grid grid-flow-col auto-cols-[120px] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 snap-x touch-pan-x">
      {items.map((img) => (
        <div
          key={img.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/photobook-image", img.id);
            e.dataTransfer.setData("text/plain", img.id);
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => {
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              onAdd(img.id);
            }
          }}
          onDoubleClick={() => onAdd(img.id)}
          className="group relative aspect-square overflow-hidden rounded-lg border border-border/80 bg-muted shadow-sm transition hover:border-accent/40 hover:shadow-md snap-start"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExclude(img.id);
            }}
            className={`absolute left-1.5 top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded border bg-white/95 text-charcoal shadow-sm transition hover:scale-105 ${
              img.excluded
                ? "border-accent bg-accent text-accent-foreground"
                : "border-muted-foreground/30 opacity-0 group-hover:opacity-100"
            }`}
            title={img.excluded ? "Excluded from Magic Fill" : "Include in Magic Fill"}
          >
            {img.excluded ? (
              <Check className="h-3 w-3 stroke-[3.5]" />
            ) : (
              <Check className="h-3 w-3 opacity-30" />
            )}
          </button>

          <img
            src={img.src}
            alt={img.name}
            className={`h-full w-full object-cover transition duration-300 ${
              img.excluded ? "opacity-40 grayscale-[40%]" : ""
            }`}
          />
          <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 via-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onFav(img.id);
              }}
            >
              <Heart className={`h-3.5 w-3.5 ${img.favorite ? "fill-current" : ""}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white hover:bg-sky-500/80"
              onClick={(e) => {
                e.stopPropagation();
                onDel(img.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
