import { Rnd } from "react-rnd";
import { useRef, useState, useEffect } from "react";
import { useBookStore } from "@/lib/photobook/store";
import { themeClass, shapeStyle, THEMES } from "@/lib/photobook/catalogs";
import { createMagicLayoutSelection, type MagicLayoutSelection } from "@/lib/photobook/magicLayout";
import {
  PAGE_SIZES,
  type DrawingElement,
  type LibraryImage,
  type Page as PhotobookPage,
  type PageElement,
  type PhotoElement,
  type BackgroundTheme,
} from "@/lib/photobook/types";
import { photoFilterCss } from "@/lib/photobook/photo-filters";
import {
  Image as ImageIcon,
  ImageMinus,
  SendToBack,
  BringToFront,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Copy,
  Clipboard,
  RotateCw,
  RotateCcw,
  Trash2,
  Scissors,
  Wand2,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useAuthStore } from "@/lib/auth";

const MAGIC_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 20 17 7" stroke="black" stroke-width="2" stroke-linecap="round"/><path d="m14 4 6 6" stroke="black" stroke-width="2" stroke-linecap="round"/><path d="m12 7 5 5" stroke="white" stroke-width="1.2" stroke-linecap="round"/><path d="M5 5h3M6.5 3.5v3M18 17h3M19.5 15.5v3" stroke="black" stroke-width="1.5" stroke-linecap="round"/></svg>',
)}") 3 21, crosshair`;

const isImageUrl = (src?: string) => {
  if (!src) return false;
  return (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("/") ||
    src.startsWith("http:") ||
    src.startsWith("https:") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(src)
  );
};

const colorWithOpacity = (color: string, opacity: number) => {
  const alpha = Math.max(0, Math.min(1, opacity));
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
};

type DrawPoint = { x: number; y: number; pressure: number };

const getSmoothPathFromPoints = (points: DrawPoint[]) => {
  if (points.length < 2) return "";
  const [first, ...rest] = points;
  let path = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 0; i < rest.length - 1; i += 1) {
    const current = rest[i];
    const next = rest[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x.toFixed(1)} ${current.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  path += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return path;
};

const textPathForCurve = (curve: "arcUp" | "arcDown" | "wave", width: number, height: number) => {
  const y = height / 2;
  if (curve === "arcUp") {
    return `M ${width * 0.08} ${y} Q ${width / 2} ${height * 0.08} ${width * 0.92} ${y}`;
  }
  if (curve === "arcDown") {
    return `M ${width * 0.08} ${y} Q ${width / 2} ${height * 0.92} ${width * 0.92} ${y}`;
  }
  return `M ${width * 0.06} ${y} C ${width * 0.22} ${height * 0.12} ${width * 0.34} ${height * 0.88} ${width * 0.5} ${y} S ${width * 0.78} ${height * 0.12} ${width * 0.94} ${y}`;
};

type BackgroundRemovalProgress = { progress: number; status: string };

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the AI mask."));
    reader.readAsDataURL(blob);
  });

const removeImageBackground = async (
  src: string,
  onProgress?: (progress: BackgroundRemovalProgress) => void,
  signal?: AbortSignal,
) => {
  const { segmentForeground } = await import("@imgly/background-removal");
  const blob = await segmentForeground(src, {
    model: "isnet_fp16",
    proxyToWorker: true,
    fetchArgs: signal ? { signal } : undefined,
    output: { format: "image/png", quality: 1 },
    progress: (key, current, total) => {
      const ratio = total > 0 ? Math.min(1, current / total) : 0;
      if (key.startsWith("fetch:")) {
        onProgress?.({ progress: ratio * 0.55, status: "Loading the AI model" });
      } else if (key === "compute:decode") {
        onProgress?.({ progress: 0.62, status: "Reading your photo" });
      } else if (key === "compute:inference") {
        onProgress?.({ progress: 0.72, status: "Finding the main subject" });
      } else if (key === "compute:mask") {
        onProgress?.({ progress: 0.88, status: "Refining the edges" });
      } else if (key === "compute:encode") {
        onProgress?.({ progress: 0.94 + ratio * 0.04, status: "Finishing the mask" });
      }
    },
  });
  return blobToDataUrl(blob);
};

const getImageAspectRatio = (src: string) =>
  new Promise<number>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      resolve(width > 0 && height > 0 ? width / height : 1);
    };
    image.onerror = () => resolve(1);
    image.src = src;
  });

export function Page({
  pageId,
  interactive = true,
  pageNumber,
  canvasScale = 1,
  pageOverride,
  libraryOverride,
}: {
  pageId: string;
  interactive?: boolean;
  pageNumber?: number | string;
  canvasScale?: number;
  pageOverride?: PhotobookPage;
  libraryOverride?: LibraryImage[];
}) {
  const storedPage = useBookStore((s) => s.book.pages.find((p) => p.id === pageId));
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const storedLibrary = useBookStore((s) => s.library);
  const page = pageOverride ?? storedPage;
  const library = libraryOverride ?? storedLibrary;
  const updateElement = useBookStore((s) => s.updateElement);
  const removeElement = useBookStore((s) => s.removeElement);
  const replacePhotoImage = useBookStore((s) => s.replacePhotoImage);
  const selectElement = useBookStore((s) => s.selectElement);
  const selectedId = useBookStore((s) => s.selectedElementId);
  const addPhotoToCurrentPage = useBookStore((s) => s.addPhotoToCurrentPage);
  const addImagesFromFiles = useBookStore((s) => s.addImagesFromFiles);
  const setCurrentPage = useBookStore((s) => s.setCurrentPage);
  const moveElementLayer = useBookStore((s) => s.moveElementLayer);
  const pasteElement = useBookStore((s) => s.pasteElement);
  const copiedElement = useBookStore((s) => s.copiedElement);
  const isMagicLayoutMode = useBookStore((s) => s.isMagicLayoutMode);
  const magicLayoutTolerance = useBookStore((s) => s.magicLayoutTolerance);
  const magicLayoutFeather = useBookStore((s) => s.magicLayoutFeather);
  const magicLayoutExpand = useBookStore((s) => s.magicLayoutExpand);
  const addMagicPhotoFrame = useBookStore((s) => s.addMagicPhotoFrame);
  const editingBackgroundPageId = useBookStore((s) => s.editingBackgroundPageId);
  const updatePageBackgroundPosition = useBookStore((s) => s.updatePageBackgroundPosition);
  const customBackgroundsList = useBookStore((s) => s.customBackgroundsList ?? []);
  const drawMode = useBookStore((s) => s.drawMode);
  const drawBrushSize = useBookStore((s) => s.drawBrushSize);
  const drawBrushColor = useBookStore((s) => s.drawBrushColor);
  const drawBrushOpacity = useBookStore((s) => s.drawBrushOpacity);
  const addDrawingToCurrentPage = useBookStore((s) => s.addDrawingToCurrentPage);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [magicSelection, setMagicSelection] = useState<MagicLayoutSelection | null>(null);
  const [isMagicSelecting, setIsMagicSelecting] = useState(false);
  const [liveDrawingPath, setLiveDrawingPath] = useState("");
  const drawingPointsRef = useRef<DrawPoint[]>([]);

  useEffect(() => {
    if (!isMagicLayoutMode) setMagicSelection(null);
  }, [isMagicLayoutMode, page?.id]);

  if (!page) return null;

  const resolvedBg = page.background?.startsWith("bg_")
    ? customBackgroundsList.find((b) => b.id === page.background)?.src || ""
    : page.background;

  const isEditingBg = editingBackgroundPageId === page.id && interactive;
  const isStructureProtected = Boolean(page.adminTemplateProtected && !isAdmin);
  const isPageDrawMode = interactive && !isMagicLayoutMode && drawMode !== "off";
  const coordinateScale = Math.max(canvasScale || 1, 0.05);

  const handleBgMouseDown = (e: React.MouseEvent) => {
    if (!isEditingBg || (page.backgroundMode && page.backgroundMode !== "cover")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = page.backgroundX ?? 0;
    const initialY = page.backgroundY ?? 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / coordinateScale;
      const dy = (moveEvent.clientY - startY) / coordinateScale;
      updatePageBackgroundPosition(page.id, initialX + dx, initialY + dy);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleBgTouchStart = (e: React.TouchEvent) => {
    if (!isEditingBg || (page.backgroundMode && page.backgroundMode !== "cover")) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const initialX = page.backgroundX ?? 0;
    const initialY = page.backgroundY ?? 0;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      moveEvent.preventDefault();
      const t = moveEvent.touches[0];
      const dx = (t.clientX - startX) / coordinateScale;
      const dy = (t.clientY - startY) / coordinateScale;
      updatePageBackgroundPosition(page.id, initialX + dx, initialY + dy);
    };

    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const preset = PAGE_SIZES[0];
  const { width: pageW, height: pageH } = preset;

  const onDropPhoto = async (e: React.DragEvent) => {
    let id = e.dataTransfer.getData("text/photobook-image") || e.dataTransfer.getData("text/plain");
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (!id && file) {
      try {
        const addedIds = await addImagesFromFiles([file]);
        id = addedIds[0] ?? "";
      } catch (error) {
        console.error("Failed to add image on drop", error);
      }
    }
    if (!id) return;
    e.preventDefault();
    // If dropped onto an existing photo element, replace it instead of creating new
    const targetEl = (e.target as HTMLElement).closest<HTMLElement>("[data-photo-el]");
    if (targetEl?.dataset.photoEl) {
      setCurrentPage(pageId);
      replacePhotoImage(targetEl.dataset.photoEl, id);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scale = rect.width / pageW;
    const droppedImage = useBookStore.getState().library.find((image) => image.id === id);
    const aspectRatio = droppedImage?.src ? await getImageAspectRatio(droppedImage.src) : 1;
    const safeRatio = Math.max(0.2, Math.min(5, aspectRatio || 1));
    const width = safeRatio >= 1 ? 360 : 360 * safeRatio;
    const height = safeRatio >= 1 ? 360 / safeRatio : 360;
    const x = (e.clientX - rect.left) / scale - width / 2;
    const y = (e.clientY - rect.top) / scale - height / 2;
    setCurrentPage(pageId);
    addPhotoToCurrentPage(id, Math.max(0, x), Math.max(0, y), true, aspectRatio);
  };

  const handleMagicLayoutClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMagicLayoutMode || !interactive || isMagicSelecting) return;
    e.preventDefault();
    e.stopPropagation();

    if (!isImageUrl(resolvedBg)) {
      toast.warning("Magic Layout works best with a template/background image.");
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * pageW;
    const clickY = ((e.clientY - rect.top) / rect.height) * pageH;
    setIsMagicSelecting(true);

    try {
      const selection = await createMagicLayoutSelection({
        resolvedBg,
        pageW,
        pageH,
        clickX,
        clickY,
        backgroundMode: page.backgroundMode,
        backgroundScale: page.backgroundScale,
        backgroundX: page.backgroundX,
        backgroundY: page.backgroundY,
        tolerance: magicLayoutTolerance,
        expand: magicLayoutExpand,
        feather: magicLayoutFeather,
      });
      setMagicSelection(selection);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not select that frame area.");
      setMagicSelection(null);
    } finally {
      setIsMagicSelecting(false);
    }
  };

  const createMagicSlot = () => {
    if (!magicSelection) return;
    const id = addMagicPhotoFrame(page.id, magicSelection);
    if (id) {
      setMagicSelection(null);
      toast.success("Magic photo slot created. Drop or upload a photo into it.");
    }
  };

  const pointFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * pageW,
      y: ((e.clientY - rect.top) / rect.height) * pageH,
      pressure: e.pressure || 0.5,
    };
  };

  const drawStrokeWidth =
    drawMode === "marker"
      ? drawBrushSize * 1.8
      : drawMode === "highlighter"
        ? drawBrushSize * 2.4
        : drawMode === "pressure"
          ? drawBrushSize * 1.15
          : drawBrushSize;
  const drawStrokeOpacity =
    drawMode === "highlighter" ? Math.min(drawBrushOpacity, 0.38) : drawBrushOpacity;

  const pageContent = (
    <div className="relative" style={{ width: pageW, height: pageH }}>
      <div
        id={`page-render-${page.id}`}
        data-photobook-page
        onDragOver={interactive ? (e) => e.preventDefault() : undefined}
        onDrop={interactive ? onDropPhoto : undefined}
        onClick={
          interactive
            ? (e) => {
                if (isMagicLayoutMode) {
                  void handleMagicLayoutClick(e);
                  return;
                }
                if (e.target === e.currentTarget) selectElement(null);
              }
            : undefined
        }
        className={`${!isImageUrl(resolvedBg) && THEMES.some((t) => t.id === resolvedBg) ? themeClass(resolvedBg as BackgroundTheme) : ""} page-border-${page.border ?? "none"} w-full h-full relative overflow-hidden shadow-photo`}
        style={{
          borderRadius: 8,
          cursor: isMagicLayoutMode ? MAGIC_CURSOR : undefined,
          ...(!isImageUrl(resolvedBg) && !THEMES.some((t) => t.id === resolvedBg)
            ? {
                backgroundColor: resolvedBg,
              }
            : {}),
        }}
      >
        {isImageUrl(resolvedBg) && (
          <div
            className={`absolute inset-0 overflow-hidden select-none ${isEditingBg && (!page.backgroundMode || page.backgroundMode === "cover") ? "pointer-events-auto cursor-move" : "pointer-events-none"}`}
            style={{ zIndex: 0, borderRadius: 8 }}
            onMouseDown={handleBgMouseDown}
            onTouchStart={handleBgTouchStart}
          >
            <img
              src={resolvedBg}
              alt=""
              className={`w-full h-full ${
                page.backgroundMode === "contain"
                  ? "object-contain"
                  : page.backgroundMode === "stretch"
                    ? "object-fill"
                    : "object-cover"
              }`}
              draggable={false}
              style={{
                objectPosition:
                  !page.backgroundMode || page.backgroundMode === "cover"
                    ? `calc(50% + ${page.backgroundX ?? 0}px) calc(50% + ${page.backgroundY ?? 0}px)`
                    : "center",
                transform:
                  !page.backgroundMode || page.backgroundMode === "cover"
                    ? `scale(${page.backgroundScale ?? 1})`
                    : "none",
                transformOrigin: "center",
              }}
            />
          </div>
        )}
        {page.elements
          .slice()
          .sort((a, b) => a.z - b.z)
          .map((el) => (
            <ElementRenderer
              key={el.id}
              el={el}
              library={library}
              editingTextId={editingTextId}
              setEditingTextId={setEditingTextId}
              selected={selectedId === el.id && interactive}
              interactive={interactive}
              onSelect={() => selectElement(el.id)}
              onChange={(p) => updateElement(el.id, p)}
              onRemove={() => removeElement(el.id)}
              onReplaceImage={(imageId) => replacePhotoImage(el.id, imageId)}
              onClearImage={() => useBookStore.getState().clearPhotoImage(el.id)}
              onLayer={(direction) => moveElementLayer(el.id, direction)}
              label={el.type === "photo" ? "Photo" : "Element"}
              isFrameLocked={page.frameLocked && el.type === "photo"}
              isStructureProtected={isStructureProtected}
              canvasScale={coordinateScale}
            />
          ))}

        {isMagicLayoutMode && interactive && (
          <div
            className="pointer-events-none absolute left-1/2 top-3 z-[1200] -translate-x-1/2 rounded-full border border-sky-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-sky-700 shadow-lg"
            style={{ maxWidth: pageW - 32 }}
          >
            {isMagicSelecting
              ? "Detecting frame area..."
              : magicSelection
                ? "Preview selected area before creating the slot."
                : "Click inside the blank photo frame area."}
          </div>
        )}

        {magicSelection && isMagicLayoutMode && interactive && (
          <>
            <img
              src={magicSelection.overlaySrc}
              alt=""
              className="pointer-events-none absolute z-[1190]"
              style={{
                left: magicSelection.x,
                top: magicSelection.y,
                width: magicSelection.w,
                height: magicSelection.h,
              }}
            />
            <div
              className="absolute z-[1210] flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white/95 p-1.5 text-[11px] font-semibold text-sky-800 shadow-xl"
              style={{
                left: Math.min(Math.max(8, magicSelection.x), pageW - 190),
                top: Math.min(pageH - 42, Math.max(46, magicSelection.y - 44)),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="rounded-md bg-sky-500 px-2.5 py-1.5 text-white shadow-sm transition hover:bg-sky-600"
                onClick={createMagicSlot}
              >
                Create Photo Slot
              </button>
              <button
                type="button"
                className="rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100"
                onClick={() => setMagicSelection(null)}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {isPageDrawMode && (
          <div
            className="absolute inset-0 z-[1300] touch-none"
            style={{
              cursor: drawMode === "highlighter" ? "crosshair" : "cell",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentPage(page.id);
              selectElement(null);
              drawingPointsRef.current = [pointFromPointer(e)];
              setLiveDrawingPath("");
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drawingPointsRef.current.length) return;
              e.preventDefault();
              e.stopPropagation();
              const point = pointFromPointer(e);
              const last = drawingPointsRef.current[drawingPointsRef.current.length - 1];
              if (Math.hypot(point.x - last.x, point.y - last.y) < 1.5) return;
              drawingPointsRef.current.push(point);
              setLiveDrawingPath(getSmoothPathFromPoints(drawingPointsRef.current));
            }}
            onPointerUp={(e) => {
              if (!drawingPointsRef.current.length) return;
              e.preventDefault();
              e.stopPropagation();
              const path = getSmoothPathFromPoints(drawingPointsRef.current);
              drawingPointsRef.current = [];
              setLiveDrawingPath("");
              if (!path) return;
              addDrawingToCurrentPage(path, {
                stroke: drawBrushColor,
                strokeWidth: drawStrokeWidth,
                opacity: drawStrokeOpacity,
                brush: drawMode,
              });
            }}
            onPointerCancel={() => {
              drawingPointsRef.current = [];
              setLiveDrawingPath("");
            }}
          >
            {liveDrawingPath && (
              <svg className="pointer-events-none h-full w-full" viewBox={`0 0 ${pageW} ${pageH}`}>
                <path
                  d={liveDrawingPath}
                  fill="none"
                  stroke={drawBrushColor}
                  strokeWidth={drawStrokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={drawStrokeOpacity}
                  style={{
                    filter:
                      drawMode === "neon"
                        ? `drop-shadow(0 0 ${Math.max(6, drawStrokeWidth)}px ${drawBrushColor})`
                        : undefined,
                    mixBlendMode: drawMode === "highlighter" ? "multiply" : undefined,
                  }}
                />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!interactive) return pageContent;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{pageContent}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={() => pasteElement()} disabled={!copiedElement}>
          <Clipboard className="mr-2 h-4 w-4" /> Paste Element
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ElementRenderer({
  el,
  library,
  editingTextId,
  setEditingTextId,
  selected,
  interactive,
  canMoveFrame,
  onSelect,
  onChange,
  onRemove,
  onReplaceImage,
  onClearImage,
  onLayer,
  label,
  isFrameLocked,
  isStructureProtected,
  canvasScale,
}: {
  el: PageElement;
  library: { id: string; src: string }[];
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  selected: boolean;
  interactive: boolean;
  canMoveFrame?: boolean;
  onSelect: () => void;
  onChange: (p: Partial<PageElement>) => void;
  onRemove: () => void;
  onReplaceImage: (imageId: string) => void;
  onClearImage: () => void;
  onLayer: (direction: "front" | "back" | "forward" | "backward") => void;
  label: string;
  isFrameLocked?: boolean;
  isStructureProtected?: boolean;
  canvasScale: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rotateHandleRef = useRef<HTMLButtonElement>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemovalProgress, setBackgroundRemovalProgress] = useState(0);
  const [backgroundRemovalStatus, setBackgroundRemovalStatus] = useState("Preparing AI tools");
  const backgroundRemovalAbortRef = useRef<AbortController | null>(null);
  const backgroundRemovalRunRef = useRef(0);
  const [isCroppingPhoto, setIsCroppingPhoto] = useState(false);
  const addImagesFromFiles = useBookStore.getState().addImagesFromFiles;
  const customStickersList = useBookStore((s) => s.customStickersList ?? []);
  const isEraserMode = useBookStore((s) => s.isEraserMode);
  const isMagicLayoutMode = useBookStore((s) => s.isMagicLayoutMode);
  const isTextEditing =
    interactive &&
    !isStructureProtected &&
    editingTextId === el.id &&
    (el.type === "text" || el.type === "quote");
  const isProtectedTemplateElement = Boolean(isStructureProtected && !el.userAdded);
  const isElementLocked = Boolean(
    isProtectedTemplateElement ||
    (el.type === "photo" && el.locked) ||
    (el.type === "sticker" && el.locked),
  );

  useEffect(() => {
    const openCropMode = (event: Event) => {
      if (!interactive) return;
      const detail = (event as CustomEvent<{ elementId?: string; active?: boolean }>).detail;
      setIsCroppingPhoto(detail?.elementId === el.id && detail?.active !== false);
    };
    window.addEventListener("photobook:open-crop-tools", openCropMode);
    return () => window.removeEventListener("photobook:open-crop-tools", openCropMode);
  }, [el.id, interactive]);

  useEffect(() => {
    if (!selected || el.type !== "photo") setIsCroppingPhoto(false);
  }, [el.type, selected]);

  useEffect(
    () => () => {
      backgroundRemovalRunRef.current += 1;
      backgroundRemovalAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const removeSelectedBackground = (event: Event) => {
      if (!interactive) return;
      const detail = (event as CustomEvent<{ elementId?: string }>).detail;
      if (detail?.elementId === el.id && el.type === "photo") {
        void removePhotoBackground();
      }
    };
    window.addEventListener("photobook:remove-photo-background", removeSelectedBackground);
    return () =>
      window.removeEventListener("photobook:remove-photo-background", removeSelectedBackground);
  });

  const stickerSrc =
    el.type === "sticker"
      ? el.src ||
        (el.stickerId ? customStickersList.find((s) => s.id === el.stickerId)?.src : undefined)
      : undefined;

  if (el.type === "drawing") {
    const drawing = el as DrawingElement;
    return (
      <svg
        className="pointer-events-none absolute overflow-visible"
        viewBox={`0 0 ${drawing.w} ${drawing.h}`}
        style={{
          left: drawing.x,
          top: drawing.y,
          width: drawing.w,
          height: drawing.h,
          transform: `rotate(${drawing.rotation}deg)`,
          zIndex: drawing.z,
          mixBlendMode: drawing.brush === "highlighter" ? "multiply" : undefined,
        }}
      >
        <path
          d={drawing.path}
          fill="none"
          stroke={drawing.stroke}
          strokeWidth={drawing.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={drawing.opacity ?? 1}
          style={{
            filter:
              drawing.brush === "neon"
                ? `drop-shadow(0 0 ${Math.max(6, drawing.strokeWidth)}px ${drawing.stroke})`
                : undefined,
          }}
        />
      </svg>
    );
  }

  const uploadReplacement = async (file: File) => {
    try {
      const addedIds = await addImagesFromFiles([file]);
      const addedId = addedIds[0];
      if (addedId) onReplaceImage(addedId);
    } catch (error) {
      console.error("Failed to upload replacement", error);
    }
  };

  async function removePhotoBackground() {
    if (el.type !== "photo") return;
    const img = library.find((item) => item.id === el.imageId);
    if (!img?.src) {
      toast.warning("Add an image to this frame first.");
      return;
    }
    if (isRemovingBackground) return;
    const runId = backgroundRemovalRunRef.current + 1;
    backgroundRemovalRunRef.current = runId;
    const controller = new AbortController();
    backgroundRemovalAbortRef.current = controller;
    setIsRemovingBackground(true);
    setBackgroundRemovalProgress(0);
    setBackgroundRemovalStatus("Preparing AI tools");
    let timeoutId: number | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () =>
            reject(
              new Error(
                "Background removal took too long. Please retry; the first run downloads the AI model.",
              ),
            ),
          180_000,
        );
      });
      const mask = await Promise.race([
        removeImageBackground(
          img.src,
          ({ progress, status }) => {
            if (backgroundRemovalRunRef.current !== runId) return;
            setBackgroundRemovalProgress((current) => Math.max(current, Math.min(0.98, progress)));
            setBackgroundRemovalStatus(status);
          },
          controller.signal,
        ),
        timeout,
      ]);
      if (backgroundRemovalRunRef.current !== runId) return;
      onChange({ backgroundRemovalMask: mask, eraseMask: undefined });
      setBackgroundRemovalProgress(1);
      toast.success("Background removed. Use Restore to refine the result.", { duration: 3200 });
    } catch (error) {
      if (backgroundRemovalRunRef.current !== runId || controller.signal.aborted) return;
      console.error("Failed to remove background", error);
      toast.error(
        error instanceof Error ? error.message : "Could not remove the background from this image.",
      );
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (backgroundRemovalRunRef.current === runId) {
        backgroundRemovalRunRef.current += 1;
        controller.abort();
        backgroundRemovalAbortRef.current = null;
        setIsRemovingBackground(false);
        setBackgroundRemovalProgress(0);
        setBackgroundRemovalStatus("Preparing AI tools");
      }
    }
  }

  const cancelBackgroundRemoval = () => {
    if (!isRemovingBackground) return;
    backgroundRemovalRunRef.current += 1;
    backgroundRemovalAbortRef.current?.abort();
    backgroundRemovalAbortRef.current = null;
    setIsRemovingBackground(false);
    setBackgroundRemovalProgress(0);
    setBackgroundRemovalStatus("Preparing AI tools");
    toast.message("Background removal cancelled.");
  };

  const startRotationDrag = (clientX: number, clientY: number, shiftKey: boolean) => {
    if (isElementLocked) return;
    const node = contentRef.current;
    if (!node) return;
    onSelect();

    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    const startRotation = el.rotation ?? 0;

    const pointFromEvent = (event: MouseEvent | TouchEvent) => {
      if ("touches" in event && event.touches.length > 0) return event.touches[0];
      if ("changedTouches" in event && event.changedTouches.length > 0) {
        return event.changedTouches[0];
      }
      return event as MouseEvent;
    };

    const handleMove = (event: MouseEvent | TouchEvent) => {
      const point = pointFromEvent(event);
      if (!point) return;
      if ("touches" in event) event.preventDefault();
      const currentAngle =
        Math.atan2(point.clientY - centerY, point.clientX - centerX) * (180 / Math.PI);
      let rotation = startRotation + currentAngle - startAngle;
      const shouldSnap = shiftKey || ("shiftKey" in event && event.shiftKey);
      if (shouldSnap) rotation = Math.round(rotation / 15) * 15;
      onChange({ rotation: Math.round(rotation * 10) / 10 });
    };

    const finishRotation = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", finishRotation);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", finishRotation);
      window.removeEventListener("touchcancel", finishRotation);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", finishRotation);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", finishRotation);
    window.addEventListener("touchcancel", finishRotation);
  };

  const handleRotateMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    startRotationDrag(e.clientX, e.clientY, e.shiftKey);
  };

  const handleRotateTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    e.stopPropagation();
    startRotationDrag(touch.clientX, touch.clientY, false);
  };

  const content =
    el.type === "photo" ? (
      <PhotoBody
        el={el}
        library={library}
        canvasScale={canvasScale}
        selected={selected}
        interactive={interactive}
        isCropMode={isCroppingPhoto}
        onCropDone={() => setIsCroppingPhoto(false)}
        onSelect={interactive ? onSelect : undefined}
        onUploadRequest={interactive ? () => fileRef.current?.click() : undefined}
      />
    ) : el.type === "sticker" ? (
      stickerSrc ? (
        <img
          src={stickerSrc}
          alt="sticker"
          className="h-full w-full object-contain pointer-events-none select-none"
          style={{
            imageRendering: "auto",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-[clamp(2rem,8vw,6rem)] leading-none select-none"
          style={{ fontSize: el.h * 0.7 }}
        >
          {el.emoji}
        </div>
      )
    ) : el.type === "quote" || el.type === "text" ? (
      isTextEditing ? (
        <textarea
          autoFocus
          value={el.text}
          onChange={(e) => onChange({ text: e.target.value })}
          onBlur={() => setEditingTextId(null)}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="h-full w-full resize-none rounded-md border border-accent/30 bg-white/90 px-3 py-2 text-center outline-none"
          style={{
            fontSize: el.fontSize,
            fontFamily: el.fontFamily || '"Playfair Display", serif',
            color: el.color || "inherit",
            fontWeight: el.fontWeight || "normal",
            fontStyle: el.fontStyle || "italic",
            textAlign: el.align || "center",
            letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
            lineHeight: el.lineHeight ?? 1.18,
            textTransform: el.textTransform ?? "none",
            whiteSpace: "pre-wrap",
          }}
        />
      ) : el.textCurve && el.textCurve !== "none" ? (
        <svg
          className="h-full w-full overflow-visible"
          viewBox={`0 0 ${el.w} ${el.h}`}
          preserveAspectRatio="none"
          style={{
            backgroundColor: el.backgroundColor
              ? colorWithOpacity(el.backgroundColor, el.backgroundOpacity ?? 1)
              : undefined,
            borderRadius: el.backgroundColor ? 12 : undefined,
          }}
        >
          <defs>
            <path id={`text-curve-${el.id}`} d={textPathForCurve(el.textCurve, el.w, el.h)} />
          </defs>
          <text
            fill={el.color || "currentColor"}
            fontSize={el.fontSize}
            fontFamily={el.fontFamily || '"Playfair Display", serif'}
            fontWeight={el.fontWeight || "normal"}
            fontStyle={el.fontStyle || "italic"}
            letterSpacing={el.letterSpacing ?? 0}
            textAnchor="middle"
            style={{
              textTransform: el.textTransform ?? "none",
              paintOrder: "stroke",
              stroke: el.strokeColor,
              strokeWidth: el.strokeWidth || 0,
              filter: el.shadowColor
                ? `drop-shadow(${el.shadowX ?? 0}px ${el.shadowY ?? 2}px ${el.shadowBlur ?? 8}px ${el.shadowColor})`
                : undefined,
            }}
          >
            <textPath href={`#text-curve-${el.id}`} startOffset="50%">
              {el.text.replace(/\s+/g, " ")}
            </textPath>
          </text>
        </svg>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-center"
          style={{
            fontSize: el.fontSize,
            fontFamily: el.fontFamily || '"Playfair Display", serif',
            color: el.color || "inherit",
            fontWeight: el.fontWeight || "normal",
            fontStyle: el.fontStyle || "italic",
            textAlign: el.align || "center",
            letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
            lineHeight: el.lineHeight ?? 1.18,
            textTransform: el.textTransform ?? "none",
            whiteSpace: "pre-wrap",
            padding: el.padding ?? 16,
            WebkitTextStroke:
              el.strokeWidth && el.strokeColor
                ? `${el.strokeWidth}px ${el.strokeColor}`
                : undefined,
            textShadow: el.shadowColor
              ? `${el.shadowX ?? 0}px ${el.shadowY ?? 2}px ${el.shadowBlur ?? 8}px ${el.shadowColor}`
              : undefined,
            backgroundColor: el.backgroundColor
              ? colorWithOpacity(el.backgroundColor, el.backgroundOpacity ?? 1)
              : undefined,
            borderRadius: el.backgroundColor ? 12 : undefined,
          }}
        >
          {el.text}
        </div>
      )
    ) : null;

  if (!interactive) {
    return (
      <div
        style={{
          position: "absolute",
          left: el.x,
          top: el.y,
          width: el.w,
          height: el.h,
          transform: `rotate(${el.rotation}deg)`,
          zIndex: el.z,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <Rnd
      scale={canvasScale}
      size={{ width: el.w, height: el.h }}
      position={{ x: el.x, y: el.y }}
      onDragStart={isElementLocked || isCroppingPhoto ? undefined : onSelect}
      onDragStop={
        isElementLocked || isCroppingPhoto ? undefined : (_, d) => onChange({ x: d.x, y: d.y })
      }
      onResizeStop={
        isElementLocked
          ? undefined
          : (_, __, ref, ___, pos) =>
              onChange({ w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y })
      }
      disableDragging={
        isRemovingBackground ||
        isCroppingPhoto ||
        isEraserMode ||
        isMagicLayoutMode ||
        isElementLocked
      }
      enableResizing={
        isRemovingBackground ||
        isCroppingPhoto ||
        isEraserMode ||
        isMagicLayoutMode ||
        isElementLocked
          ? false
          : undefined
      }
      cancel={
        el.type === "photo" && (isCroppingPhoto || isElementLocked || !el.freePhoto)
          ? ".photo-pan-surface"
          : undefined
      }
      className={`group ${selected && !isElementLocked ? "outline outline-2 outline-accent outline-offset-2" : ""}`}
      style={{ zIndex: el.z, overflow: "visible" }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        if (!isStructureProtected && (el.type === "text" || el.type === "quote")) {
          e.stopPropagation();
          setEditingTextId(el.id);
        }
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={contentRef}
            className="relative h-full w-full"
            style={{ transform: `rotate(${el.rotation}deg)`, transformOrigin: "center" }}
            {...(el.type === "photo" ? { "data-photo-el": el.id } : {})}
            onDoubleClick={(e) => {
              if (!isStructureProtected && (el.type === "text" || el.type === "quote")) {
                e.stopPropagation();
                setEditingTextId(el.id);
              }
            }}
            onDragOver={
              el.type === "photo"
                ? (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }
                : undefined
            }
            onDrop={
              el.type === "photo"
                ? async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const draggedId =
                      e.dataTransfer.getData("text/photobook-image") ||
                      e.dataTransfer.getData("text/plain");
                    if (draggedId) {
                      onReplaceImage(draggedId);
                      return;
                    }
                    const file = Array.from(e.dataTransfer.files).find((f) =>
                      f.type.startsWith("image/"),
                    );
                    if (file) await uploadReplacement(file);
                  }
                : undefined
            }
          >
            {content}
            {isRemovingBackground && el.type === "photo" && (
              <div
                className="absolute inset-0 z-30 grid place-items-center overflow-hidden bg-slate-950/35 px-4 backdrop-blur-[2px]"
                role="status"
                aria-live="polite"
                aria-label="Removing image background"
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <div className="relative w-full max-w-48 overflow-hidden rounded-lg border border-white/30 bg-slate-950/75 p-3 text-white shadow-2xl">
                  <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-sky-400/15 via-transparent to-violet-400/15" />
                  <div className="relative flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/12 ring-1 ring-white/20">
                      <LoaderCircle className="h-5 w-5 animate-spin text-sky-300" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-tight">Removing background</p>
                      <p className="mt-0.5 text-[10px] leading-tight text-white/70">
                        {backgroundRemovalStatus}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-[width] duration-300 ease-out"
                      style={{
                        width: `${Math.max(8, Math.round(backgroundRemovalProgress * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="relative mt-2.5 flex items-center justify-between gap-2 text-[10px]">
                    <span className="tabular-nums text-white/65">
                      {Math.min(98, Math.round(backgroundRemovalProgress * 100))}%
                    </span>
                    <button
                      type="button"
                      className="rounded-md border border-white/25 bg-white/10 px-2 py-1 font-semibold text-white transition hover:bg-white/20"
                      onClick={cancelBackgroundRemoval}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            {interactive && el.type === "photo" && !isStructureProtected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ locked: !el.locked });
                }}
                className={`absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all ${
                  el.locked
                    ? "bg-accent text-accent-foreground scale-110"
                    : "bg-white/80 text-charcoal/60 hover:bg-white/95 opacity-0 group-hover:opacity-100"
                }`}
                title={el.locked ? "Unlock image frame" : "Lock image frame"}
              >
                {el.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
            )}
            {selected && !isElementLocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute -right-3 -top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-sky-500 text-white shadow-md transition hover:scale-110 hover:bg-sky-600"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>{el.type === "photo" ? label : "Element"}</ContextMenuLabel>
          {el.type === "photo" && (
            <>
              <ContextMenuItem onSelect={() => onChange({ locked: !el.locked })}>
                {el.locked ? (
                  <Unlock className="mr-2 h-4 w-4" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {el.locked ? "Unlock image frame" : "Lock image frame"}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => {
                  onSelect();
                  window.dispatchEvent(
                    new CustomEvent("photobook:open-crop-tools", {
                      detail: { elementId: el.id },
                    }),
                  );
                }}
              >
                <Scissors className="mr-2 h-4 w-4" /> Crop Image
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => void removePhotoBackground()}
                disabled={!el.imageId || isRemovingBackground}
              >
                <Wand2 className="mr-2 h-4 w-4" /> Remove Background
              </ContextMenuItem>
              {el.backgroundRemovalMask && (
                <ContextMenuItem onSelect={() => onChange({ backgroundRemovalMask: undefined })}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Restore Original Background
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => fileRef.current?.click()}>
                <ImageIcon className="mr-2 h-4 w-4" /> Upload new image
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <ImageIcon className="mr-2 h-4 w-4" /> Change from library
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="max-h-72 w-64 overflow-y-auto">
                  {library.length === 0 ? (
                    <ContextMenuLabel className="text-muted-foreground">
                      No images uploaded
                    </ContextMenuLabel>
                  ) : (
                    library.map((img, index) => (
                      <ContextMenuItem key={img.id} onSelect={() => onReplaceImage(img.id)}>
                        <img src={img.src} alt="" className="mr-2 h-7 w-7 rounded object-cover" />
                        Image {index + 1}
                      </ContextMenuItem>
                    ))
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
              {el.imageId && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onSelect={onClearImage}
                    className="text-destructive focus:text-destructive"
                  >
                    <ImageMinus className="mr-2 h-4 w-4" /> Clear Image
                  </ContextMenuItem>
                </>
              )}
            </>
          )}
          {!isElementLocked && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onChange({ rotation: (el.rotation ?? 0) - 90 })}>
                <RotateCcw className="mr-2 h-4 w-4" /> Rotate -90°
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onChange({ rotation: (el.rotation ?? 0) + 90 })}>
                <RotateCw className="mr-2 h-4 w-4" /> Rotate +90°
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onChange({ rotation: 0 })}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset Rotation
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => useBookStore.getState().copyElement(el.id)}>
                <Copy className="mr-2 h-4 w-4" /> Copy Element
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onLayer("front")}>
                <BringToFront className="mr-2 h-4 w-4" /> Bring to front
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onLayer("forward")}>
                <ArrowUp className="mr-2 h-4 w-4" /> Move forward
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onLayer("backward")}>
                <ArrowDown className="mr-2 h-4 w-4" /> Move backward
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onLayer("back")}>
                <SendToBack className="mr-2 h-4 w-4" /> Send to back
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={onRemove} className="text-sky-700 focus:text-sky-700">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
        {el.type === "photo" && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await uploadReplacement(f);
              e.target.value = "";
            }}
          />
        )}
      </ContextMenu>
      {selected && !isElementLocked && !isEraserMode && !isMagicLayoutMode && (
        <div className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-[calc(100%+6px)] flex-col items-center">
          <button
            ref={rotateHandleRef}
            type="button"
            onMouseDown={handleRotateMouseDown}
            onTouchStart={handleRotateTouchStart}
            className="grid h-8 w-8 place-items-center rounded-full border border-sky-200 bg-white text-sky-600 shadow-lg transition hover:scale-105 hover:border-sky-300 hover:bg-sky-50"
            title="Drag to rotate"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <span className="h-3 w-px bg-sky-400/70" />
        </div>
      )}
    </Rnd>
  );
}

function PhotoEraserCanvas({
  frameW,
  frameH,
  existingMask,
  mode,
  imageNaturalSize,
  baseFitScale,
  imageScale,
  imageX,
  imageY,
  imageRotation,
  onSave,
}: {
  frameW: number;
  frameH: number;
  existingMask?: string;
  mode: "erase" | "restore";
  imageNaturalSize: { width: number; height: number };
  baseFitScale: number;
  imageScale: number;
  imageX: number;
  imageY: number;
  imageRotation: number;
  onSave: (mask: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brushSize = useBookStore((s) => s.eraserBrushSize);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const editSubjectMask =
      mode === "restore" && imageNaturalSize.width > 0 && imageNaturalSize.height > 0;
    const scaleFactor = 2;
    canvas.width = Math.max(
      1,
      Math.round(editSubjectMask ? imageNaturalSize.width : frameW * scaleFactor),
    );
    canvas.height = Math.max(
      1,
      Math.round(editSubjectMask ? imageNaturalSize.height : frameH * scaleFactor),
    );
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!existingMask) return;
    const mask = new Image();
    mask.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
    };
    mask.src = existingMask;
  }, [existingMask, frameH, frameW, imageNaturalSize.height, imageNaturalSize.width, mode]);

  const pointFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    if (mode !== "restore" || imageNaturalSize.width <= 0 || imageNaturalSize.height <= 0) {
      return {
        displayX,
        displayY,
        x: displayX * (canvas.width / rect.width),
        y: displayY * (canvas.height / rect.height),
        scale: canvas.width / rect.width,
      };
    }

    const frameX = (displayX / rect.width) * frameW;
    const frameY = (displayY / rect.height) * frameH;
    const translatedX = frameX - (frameW / 2 + imageX);
    const translatedY = frameY - (frameH / 2 + imageY);
    const radians = (-imageRotation * Math.PI) / 180;
    const rotatedX = translatedX * Math.cos(radians) - translatedY * Math.sin(radians);
    const rotatedY = translatedX * Math.sin(radians) + translatedY * Math.cos(radians);
    const pixelsPerPageUnit = 1 / Math.max(0.0001, baseFitScale * imageScale);
    return {
      displayX,
      displayY,
      x: imageNaturalSize.width / 2 + rotatedX * pixelsPerPageUnit,
      y: imageNaturalSize.height / 2 + rotatedY * pixelsPerPageUnit,
      scale: pixelsPerPageUnit,
    };
  };

  const eraseAt = (e: React.PointerEvent<HTMLCanvasElement>, drawing: boolean) => {
    const canvas = canvasRef.current;
    const point = pointFromPointer(e);
    if (!canvas || !point) return;
    setCursorPos({ x: point.displayX, y: point.displayY });
    if (!drawing) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = mode === "restore" ? "source-over" : "destination-out";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = brushSize * point.scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.globalCompositeOperation = "source-over";
  };

  const saveMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    ctx?.beginPath();
    saveMask();
  };

  return (
    <div
      className="absolute inset-0 z-20 select-none cursor-none"
      onPointerEnter={() => setShowCursor(true)}
      onPointerLeave={() => {
        setShowCursor(false);
        endDrawing();
      }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-none touch-none opacity-0"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDrawing(true);
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          const point = pointFromPointer(e);
          if (ctx && point) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
          }
          eraseAt(e, true);
        }}
        onPointerMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
          eraseAt(e, isDrawing);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          endDrawing();
        }}
        onPointerCancel={endDrawing}
      />
      {showCursor && (
        <div
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-sm ring-1 ${
            mode === "restore"
              ? "bg-emerald-400/25 ring-emerald-600/50"
              : "bg-sky-500/25 ring-sky-600/40"
          }`}
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: brushSize,
            height: brushSize,
          }}
        />
      )}
    </div>
  );
}

function useCombinedPhotoMask(
  magicMask: string | undefined,
  eraseMask: string | undefined,
  width: number,
  height: number,
) {
  const firstMask = magicMask || eraseMask;
  const [combinedMask, setCombinedMask] = useState<string | undefined>(firstMask);

  useEffect(() => {
    let cancelled = false;
    const masks = [magicMask, eraseMask].filter((mask): mask is string => Boolean(mask));
    if (masks.length <= 1) {
      setCombinedMask(masks[0]);
      return;
    }

    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    void (async () => {
      try {
        const images = await Promise.all(masks.map(load));
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * 2));
        canvas.height = Math.max(1, Math.round(height * 2));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setCombinedMask(masks[0]);
          return;
        }
        ctx.drawImage(images[0], 0, 0, canvas.width, canvas.height);
        for (const image of images.slice(1)) {
          ctx.globalCompositeOperation = "destination-in";
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        }
        ctx.globalCompositeOperation = "source-over";
        setCombinedMask(canvas.toDataURL("image/png"));
      } catch {
        if (!cancelled) setCombinedMask(masks[0]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eraseMask, height, magicMask, width]);

  return combinedMask;
}

function PhotoBody({
  el,
  library,
  canvasScale,
  selected,
  interactive,
  isCropMode,
  onCropDone,
  onSelect,
  onUploadRequest,
}: {
  el: PhotoElement;
  library: { id: string; src: string }[];
  canvasScale: number;
  selected: boolean;
  interactive: boolean;
  isCropMode: boolean;
  onCropDone: () => void;
  onSelect?: () => void;
  onUploadRequest?: () => void;
}) {
  const img = library.find((i) => i.id === el.imageId);
  const radius = el.radius ?? 0;
  const inner = shapeStyle(el.shape, radius);
  const updateElement = useBookStore((s) => s.updateElement);
  const isEraserMode = useBookStore((s) => s.isEraserMode);
  const imageMaskBrushMode = useBookStore((s) => s.imageMaskBrushMode);
  const isFrameEraserActive = Boolean(interactive && isEraserMode && selected && img);
  const isInteractivePan = Boolean(
    interactive && (isCropMode || !el.freePhoto) && img && !isFrameEraserActive,
  );
  const coordinateScale = Math.max(canvasScale || 1, 0.05);
  const panStartRef = useRef<{
    x: number;
    y: number;
    imageX: number;
    imageY: number;
  } | null>(null);
  const naturalSizeRef = useRef({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureStartRef = useRef<{
    distance: number;
    imageScale: number;
  } | null>(null);

  const beginPan = (clientX: number, clientY: number) => {
    if (!interactive || !img || isFrameEraserActive) return;
    panStartRef.current = {
      x: clientX,
      y: clientY,
      imageX: el.imageX ?? 0,
      imageY: el.imageY ?? 0,
    };
  };

  const clampOffset = (value: number) => Math.max(-400, Math.min(400, value));

  const updatePan = (clientX: number, clientY: number) => {
    const start = panStartRef.current;
    if (!start) return;
    updateElement(el.id, {
      imageX: clampOffset(start.imageX + (clientX - start.x) / coordinateScale),
      imageY: clampOffset(start.imageY + (clientY - start.y) / coordinateScale),
    });
  };

  const endPan = () => {
    panStartRef.current = null;
  };

  const startTwoFingerGesture = () => {
    const [a, b] = [...pointersRef.current.values()];
    if (!a || !b) return;
    gestureStartRef.current = {
      distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      imageScale: el.imageScale ?? 1,
    };
    endPan();
  };

  const updateTwoFingerGesture = () => {
    const start = gestureStartRef.current;
    const [a, b] = [...pointersRef.current.values()];
    if (!start || !a || !b) return;
    const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    updateElement(el.id, {
      imageScale: Math.max(
        el.freePhoto ? 0.1 : 1,
        Math.min(4, start.imageScale * (distance / start.distance)),
      ),
    });
  };

  const effectiveMask = useCombinedPhotoMask(el.magicMask, el.eraseMask, el.w, el.h);
  const imageMaskStyle: React.CSSProperties | undefined = effectiveMask
    ? {
        WebkitMaskImage: `url(${effectiveMask})`,
        maskImage: `url(${effectiveMask})`,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }
    : undefined;
  const subjectMaskStyle: React.CSSProperties | undefined = el.backgroundRemovalMask
    ? {
        WebkitMaskImage: `url(${el.backgroundRemovalMask})`,
        maskImage: `url(${el.backgroundRemovalMask})`,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }
    : undefined;

  const frameStyle: React.CSSProperties & {
    "--frame-color"?: string;
    "--frame-border-color"?: string;
    "--frame-color-secondary"?: string;
  } = {
    borderRadius: el.freePhoto ? 0 : el.shape && el.shape !== "none" ? 0 : radius,
    opacity: el.opacity ?? 1,
    overflow: el.freePhoto && !isCropMode ? "visible" : "hidden",
  };

  if (el.frameColor) {
    frameStyle["--frame-color"] = el.frameColor;
    frameStyle["--frame-border-color"] = el.frameColor;
    frameStyle["--frame-color-secondary"] = el.frameColor;
  }

  if (!img) {
    if (el.magicMask) {
      return (
        <div className="relative h-full w-full overflow-visible" style={frameStyle}>
          <div
            className="absolute inset-0 bg-sky-400/20 ring-1 ring-inset ring-sky-400/50"
            style={imageMaskStyle}
          />
          {selected && (
            <button
              type="button"
              className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-sky-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-sky-700 shadow-lg transition hover:bg-sky-50"
              onClick={(e) => {
                e.stopPropagation();
                onUploadRequest?.();
              }}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Upload Photo
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        className={`relative grid h-full w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed text-center text-xs transition ${
          el.locked
            ? "border-accent/60 bg-accent/10 text-accent-foreground"
            : "border-muted-foreground/30 bg-muted/70 text-muted-foreground"
        }`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.45)_0_25%,transparent_25%_50%,rgba(255,255,255,.45)_50%_75%,transparent_75%)] bg-[length:18px_18px] opacity-30" />
        <div className="relative flex flex-col items-center gap-1 px-3">
          <ImageIcon className="h-6 w-6 opacity-60" />
          <span className="font-semibold">
            {el.locked ? "Locked empty frame" : "Drop photo here"}
          </span>
          <span className="text-[10px] opacity-70">
            {el.locked ? "Magic Fill will unlock it" : "Drag, upload, or Magic Fill"}
          </span>
        </div>
      </div>
    );
  }

  const scale = el.imageScale ?? 1;
  const minImageScale = el.freePhoto ? 0.1 : 1;
  const baseFitScale =
    naturalSize.width > 0 && naturalSize.height > 0
      ? el.freePhoto
        ? Math.min(el.w / naturalSize.width, el.h / naturalSize.height)
        : Math.max(el.w / naturalSize.width, el.h / naturalSize.height)
      : 1;
  const baseImageWidth = naturalSize.width > 0 ? naturalSize.width * baseFitScale : el.w;
  const baseImageHeight = naturalSize.height > 0 ? naturalSize.height * baseFitScale : el.h;

  return (
    <div
      className={`${el.freePhoto ? "frame-none" : `frame-${el.frame ?? "none"}`} h-full w-full`}
      style={frameStyle}
      data-free-photo={el.freePhoto ? "true" : undefined}
    >
      <div
        className={`photo-pan-surface relative flex h-full w-full items-center justify-center overflow-hidden ${
          interactive && img ? "touch-none" : ""
        } ${isInteractivePan ? "cursor-grab active:cursor-grabbing" : ""} ${
          isCropMode ? "ring-2 ring-inset ring-sky-500" : ""
        }`}
        onMouseDown={(e) => {
          if (isInteractivePan) e.stopPropagation();
        }}
        onTouchStart={(e) => {
          if (isInteractivePan || (interactive && img && !el.freePhoto)) e.stopPropagation();
        }}
        style={inner}
        onWheel={(e) => {
          if (!isCropMode && !(selected && !el.freePhoto)) return;
          e.preventDefault();
          e.stopPropagation();
          const nextScale = Math.max(
            minImageScale,
            Math.min(4, (el.imageScale ?? 1) + (e.deltaY < 0 ? 0.08 : -0.08)),
          );
          updateElement(el.id, { imageScale: nextScale });
        }}
        onPointerDown={(e) => {
          const isTouchGesture = e.pointerType === "touch";
          const shouldPanImage = isInteractivePan || (isTouchGesture && !el.freePhoto);
          if (!shouldPanImage) return;
          e.preventDefault();
          e.stopPropagation();
          onSelect?.();
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointersRef.current.size >= 2) startTwoFingerGesture();
          else beginPan(e.clientX, e.clientY);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!pointersRef.current.has(e.pointerId)) return;
          e.stopPropagation();
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointersRef.current.size >= 2) updateTwoFingerGesture();
          else updatePan(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (!pointersRef.current.has(e.pointerId)) return;
          e.stopPropagation();
          pointersRef.current.delete(e.pointerId);
          gestureStartRef.current = null;
          const remaining = [...pointersRef.current.values()][0];
          if (remaining) beginPan(remaining.x, remaining.y);
          else endPan();
        }}
        onPointerCancel={(e) => {
          pointersRef.current.delete(e.pointerId);
          gestureStartRef.current = null;
          endPan();
        }}
      >
        <div
          className="pointer-events-none flex h-full w-full items-center justify-center"
          style={imageMaskStyle}
        >
          <img
            src={img.src}
            alt=""
            className="max-h-none max-w-none shrink-0 select-none"
            draggable={false}
            onLoad={(event) => {
              const size = {
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              };
              naturalSizeRef.current = size;
              setNaturalSize(size);
            }}
            style={{
              width: baseImageWidth,
              height: baseImageHeight,
              transform: `translate3d(${el.imageX ?? 0}px, ${el.imageY ?? 0}px, 0) scale(${scale}) rotate(${el.imageRotation ?? 0}deg)`,
              transformOrigin: "center",
              filter: photoFilterCss(el),
              ...subjectMaskStyle,
            }}
          />
        </div>
        {isFrameEraserActive && (
          <PhotoEraserCanvas
            frameW={el.w}
            frameH={el.h}
            mode={imageMaskBrushMode}
            existingMask={
              imageMaskBrushMode === "restore" ? el.backgroundRemovalMask : el.eraseMask
            }
            onSave={(mask) =>
              updateElement(
                el.id,
                imageMaskBrushMode === "restore"
                  ? { backgroundRemovalMask: mask }
                  : { eraseMask: mask },
              )
            }
            imageNaturalSize={naturalSize}
            baseFitScale={baseFitScale}
            imageScale={scale}
            imageX={el.imageX ?? 0}
            imageY={el.imageY ?? 0}
            imageRotation={el.imageRotation ?? 0}
          />
        )}
        {isCropMode && !isFrameEraserActive && (
          <>
            <div className="pointer-events-none absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 opacity-55">
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} className="border border-white/45" />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex items-center justify-center gap-2">
              <span className="rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
                Drag to position · wheel or pinch to zoom
              </span>
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-900 shadow-lg hover:bg-slate-100"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onCropDone();
                }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
      {el.caption && (
        <div className="font-display mt-1 text-center text-sm italic text-foreground/80">
          {el.caption}
        </div>
      )}
    </div>
  );
}
