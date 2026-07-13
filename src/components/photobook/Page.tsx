import { Rnd } from "react-rnd";
import { useRef, useState, useEffect } from "react";
import { useBookStore } from "@/lib/photobook/store";
import { themeClass, shapeStyle, THEMES } from "@/lib/photobook/catalogs";
import { createMagicLayoutSelection, type MagicLayoutSelection } from "@/lib/photobook/magicLayout";
import {
  PAGE_SIZES,
  type PageElement,
  type PhotoElement,
  type BackgroundTheme,
} from "@/lib/photobook/types";
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

export function Page({
  pageId,
  interactive = true,
  pageNumber,
  canvasScale = 1,
}: {
  pageId: string;
  interactive?: boolean;
  pageNumber?: number | string;
  canvasScale?: number;
}) {
  const page = useBookStore((s) => s.book.pages.find((p) => p.id === pageId));
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const library = useBookStore((s) => s.library);
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
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [magicSelection, setMagicSelection] = useState<MagicLayoutSelection | null>(null);
  const [isMagicSelecting, setIsMagicSelecting] = useState(false);

  useEffect(() => {
    if (!isMagicLayoutMode) setMagicSelection(null);
  }, [isMagicLayoutMode, page?.id]);

  if (!page) return null;

  const resolvedBg = page.background?.startsWith("bg_")
    ? customBackgroundsList.find((b) => b.id === page.background)?.src || ""
    : page.background;

  const isEditingBg = editingBackgroundPageId === page.id && interactive;
  const isStructureProtected = Boolean(page.adminTemplateProtected && !isAdmin);
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
    const x = (e.clientX - rect.left) / scale - 180;
    const y = (e.clientY - rect.top) / scale - 180;
    setCurrentPage(pageId);
    addPhotoToCurrentPage(id, Math.max(0, x), Math.max(0, y));
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
  const addImagesFromFiles = useBookStore.getState().addImagesFromFiles;
  const customStickersList = useBookStore((s) => s.customStickersList ?? []);
  const isEraserMode = useBookStore((s) => s.isEraserMode);
  const isMagicLayoutMode = useBookStore((s) => s.isMagicLayoutMode);
  const isTextEditing =
    interactive &&
    !isStructureProtected &&
    editingTextId === el.id &&
    (el.type === "text" || el.type === "quote");

  // Keep the in-progress text in local state while editing so we only push ONE undo-history
  // entry per edit session (committed on blur) instead of one per keystroke.
  const [textDraft, setTextDraft] = useState("");
  useEffect(() => {
    if (isTextEditing && (el.type === "text" || el.type === "quote")) {
      setTextDraft(el.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTextEditing]);

  const commitTextDraft = () => {
    if (el.type === "text" || el.type === "quote") {
      if (textDraft !== el.text) onChange({ text: textDraft });
    }
    setEditingTextId(null);
  };
  const isElementLocked = Boolean(
    isStructureProtected ||
    (el.type === "photo" && el.locked) ||
    (el.type === "sticker" && el.locked),
  );
  const stickerSrc =
    el.type === "sticker"
      ? el.src ||
        (el.stickerId ? customStickersList.find((s) => s.id === el.stickerId)?.src : undefined)
      : undefined;

  const uploadReplacement = async (file: File) => {
    try {
      const addedIds = await addImagesFromFiles([file]);
      const addedId = addedIds[0];
      if (addedId) onReplaceImage(addedId);
    } catch (error) {
      console.error("Failed to upload replacement", error);
    }
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
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={commitTextDraft}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setTextDraft(el.text);
              setEditingTextId(null);
            }
          }}
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
          }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center px-4 text-center"
          style={{
            fontSize: el.fontSize,
            fontFamily: el.fontFamily || '"Playfair Display", serif',
            color: el.color || "inherit",
            fontWeight: el.fontWeight || "normal",
            fontStyle: el.fontStyle || "italic",
            textAlign: el.align || "center",
            opacity: el.opacity ?? 1,
            textShadow: el.textShadow || undefined,
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
      onDragStart={isElementLocked ? undefined : onSelect}
      onDragStop={isElementLocked ? undefined : (_, d) => onChange({ x: d.x, y: d.y })}
      onResizeStop={
        isElementLocked
          ? undefined
          : (_, __, ref, ___, pos) =>
              onChange({ w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y })
      }
      disableDragging={isEraserMode || isMagicLayoutMode || isElementLocked}
      enableResizing={isEraserMode || isMagicLayoutMode || isElementLocked ? false : undefined}
      cancel={el.type === "photo" ? ".photo-pan-surface" : undefined}
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
                aria-label={el.locked ? "Unlock image frame" : "Lock image frame"}
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
                className="absolute -right-3 -top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:scale-110 hover:bg-destructive/90"
                title="Delete"
                aria-label="Delete element"
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
              <ContextMenuItem
                onSelect={onRemove}
                className="text-destructive focus:text-destructive"
              >
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
  onSave,
}: {
  frameW: number;
  frameH: number;
  existingMask?: string;
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

    const scaleFactor = 2;
    canvas.width = Math.max(1, Math.round(frameW * scaleFactor));
    canvas.height = Math.max(1, Math.round(frameH * scaleFactor));
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
  }, [frameW, frameH, existingMask]);

  const pointFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      displayX: e.clientX - rect.left,
      displayY: e.clientY - rect.top,
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
      scale: canvas.width / rect.width,
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
    ctx.globalCompositeOperation = "destination-out";
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
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-sky-500/25 shadow-sm ring-1 ring-sky-600/40"
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
  const [combinedMask, setCombinedMask] = useState<string | undefined>(magicMask || eraseMask);

  useEffect(() => {
    let cancelled = false;
    if (!magicMask || !eraseMask) {
      setCombinedMask(magicMask || eraseMask);
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
        const [magicImg, eraseImg] = await Promise.all([load(magicMask), load(eraseMask)]);
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * 2));
        canvas.height = Math.max(1, Math.round(height * 2));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setCombinedMask(magicMask);
          return;
        }
        ctx.drawImage(magicImg, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(eraseImg, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
        setCombinedMask(canvas.toDataURL("image/png"));
      } catch {
        if (!cancelled) setCombinedMask(magicMask);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [magicMask, eraseMask, width, height]);

  return combinedMask;
}

function PhotoBody({
  el,
  library,
  canvasScale,
  selected,
  interactive,
  onSelect,
  onUploadRequest,
}: {
  el: PhotoElement;
  library: { id: string; src: string }[];
  canvasScale: number;
  selected: boolean;
  interactive: boolean;
  onSelect?: () => void;
  onUploadRequest?: () => void;
}) {
  const img = library.find((i) => i.id === el.imageId);
  const radius = el.radius ?? 0;
  const inner = shapeStyle(el.shape, radius);
  const updateElement = useBookStore((s) => s.updateElement);
  const isEraserMode = useBookStore((s) => s.isEraserMode);
  const isFrameEraserActive = Boolean(interactive && isEraserMode && selected && img);
  const isInteractivePan = Boolean(
    interactive && (el.locked || el.magicFrame) && img && !isFrameEraserActive,
  );
  const coordinateScale = Math.max(canvasScale || 1, 0.05);
  const panStartRef = useRef<{ x: number; y: number; imageX: number; imageY: number } | null>(null);
  // Image panning is driven IMPERATIVELY during the drag: we mutate the image element's
  // style directly (rAF-throttled) instead of calling setState on every pointer-move, which
  // would re-render the whole photo (image + masks + frame) each frame and feel janky.
  // The final offset is committed to the store once on release (single undo entry).
  const panImgRef = useRef<HTMLImageElement | null>(null);
  const liveOffsetRef = useRef<{ imageX: number; imageY: number } | null>(null);
  const panRafRef = useRef<number | null>(null);
  const effectiveImageX = el.imageX ?? 0;
  const effectiveImageY = el.imageY ?? 0;

  useEffect(() => {
    return () => {
      if (panRafRef.current != null) cancelAnimationFrame(panRafRef.current);
    };
  }, []);

  const applyLiveOffset = () => {
    const node = panImgRef.current;
    const off = liveOffsetRef.current;
    if (!node || !off) return;
    if ((el.imageScale ?? 1) < 1) {
      node.style.transform = `translate(${off.imageX}px, ${off.imageY}px)`;
    } else {
      node.style.objectPosition = `calc(50% + ${off.imageX}px) calc(50% + ${off.imageY}px)`;
    }
  };

  const beginPan = (clientX: number, clientY: number) => {
    if (!isInteractivePan) return;
    panStartRef.current = {
      x: clientX,
      y: clientY,
      imageX: el.imageX ?? 0,
      imageY: el.imageY ?? 0,
    };
    liveOffsetRef.current = { imageX: el.imageX ?? 0, imageY: el.imageY ?? 0 };
  };

  const updatePan = (clientX: number, clientY: number) => {
    const start = panStartRef.current;
    if (!start) return;
    liveOffsetRef.current = {
      imageX: start.imageX + (clientX - start.x) / coordinateScale,
      imageY: start.imageY + (clientY - start.y) / coordinateScale,
    };
    if (panRafRef.current == null) {
      panRafRef.current = requestAnimationFrame(() => {
        panRafRef.current = null;
        applyLiveOffset();
      });
    }
  };

  const endPan = () => {
    const start = panStartRef.current;
    const off = liveOffsetRef.current;
    panStartRef.current = null;
    liveOffsetRef.current = null;
    if (panRafRef.current != null) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }
    // Commit a single history entry only if the image actually moved.
    if (start && off && (off.imageX !== start.imageX || off.imageY !== start.imageY)) {
      updateElement(el.id, { imageX: off.imageX, imageY: off.imageY });
    }
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

  const frameStyle: React.CSSProperties = {
    borderRadius: el.shape && el.shape !== "none" ? 0 : radius,
    opacity: el.opacity ?? 1,
    overflow: "hidden",
  };

  if (el.frameColor) {
    (frameStyle as any)["--frame-color"] = el.frameColor;
    (frameStyle as any)["--frame-border-color"] = el.frameColor;
    (frameStyle as any)["--frame-color-secondary"] = el.frameColor;
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
  const isZoomedOut = scale < 1;

  return (
    <div className={`frame-${el.frame ?? "none"} h-full w-full`} style={frameStyle}>
      <div
        className={`photo-pan-surface relative h-full w-full overflow-hidden flex items-center justify-center bg-black/[0.03] ${
          isInteractivePan ? "cursor-grab active:cursor-grabbing touch-none" : ""
        }`}
        onMouseDown={(e) => {
          if (isInteractivePan) e.stopPropagation();
        }}
        onTouchStart={(e) => {
          if (isInteractivePan) e.stopPropagation();
        }}
        style={inner}
        onPointerDown={(e) => {
          if (!isInteractivePan) return;
          e.preventDefault();
          e.stopPropagation();
          onSelect?.();
          beginPan(e.clientX, e.clientY);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!isInteractivePan) return;
          if (!panStartRef.current) return;
          e.stopPropagation();
          updatePan(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (!isInteractivePan) return;
          e.stopPropagation();
          endPan();
        }}
        onPointerCancel={endPan}
        onPointerLeave={() => {
          if (!isInteractivePan) return;
          endPan();
        }}
      >
        <div
          className="pointer-events-none flex h-full w-full items-center justify-center"
          style={imageMaskStyle}
        >
          {isZoomedOut ? (
            // ZOOM OUT: shrink the image so the full image is visible inside the frame
            <img
              ref={panImgRef}
              src={img.src}
              alt=""
              draggable={false}
              style={{
                width: `${scale * 100}%`,
                height: `${scale * 100}%`,
                objectFit: "contain",
                objectPosition: "center",
                transform: `translate(${effectiveImageX}px, ${effectiveImageY}px)`,
                flexShrink: 0,
              }}
            />
          ) : (
            // ZOOM IN: fill the frame and allow cropping / panning
            <img
              ref={panImgRef}
              src={img.src}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
              style={{
                objectPosition: `calc(50% + ${effectiveImageX}px) calc(50% + ${effectiveImageY}px)`,
                transform: `scale(${scale})`,
                transformOrigin: "center",
              }}
            />
          )}
        </div>
        {isFrameEraserActive && (
          <PhotoEraserCanvas
            frameW={el.w}
            frameH={el.h}
            existingMask={el.eraseMask}
            onSave={(mask) => updateElement(el.id, { eraseMask: mask })}
          />
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
