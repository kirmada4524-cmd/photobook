import { Rnd } from "react-rnd";
import { useRef, useState, useEffect } from "react";
import { useBookStore } from "@/lib/photobook/store";
import { themeClass, shapeStyle, THEMES } from "@/lib/photobook/catalogs";
import {
  PAGE_SIZES,
  type PageElement,
  type PhotoElement,
  type BackgroundTheme,
} from "@/lib/photobook/types";
import {
  X,
  Image as ImageIcon,
  ImageMinus,
  SendToBack,
  BringToFront,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Sparkles,
  Lock,
  Unlock,
  Copy,
  Clipboard,
  RotateCw,
  RotateCcw,
} from "lucide-react";
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
import { toast } from "sonner";

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
  const isEraserMode = useBookStore((s) => s.isEraserMode);
  const setPageOverlay = useBookStore((s) => s.setPageOverlay);
  const editingBackgroundPageId = useBookStore((s) => s.editingBackgroundPageId);
  const updatePageBackgroundPosition = useBookStore((s) => s.updatePageBackgroundPosition);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  if (!page) return null;

  const customBackgroundsList = useBookStore((s) => s.customBackgroundsList ?? []);
  const resolvedBg = page.background?.startsWith("bg_")
    ? customBackgroundsList.find((b) => b.id === page.background)?.src || ""
    : page.background;

  const isEditingBg = editingBackgroundPageId === page.id && interactive;
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

  const photoLabels = new Map(
    page.elements
      .filter((el) => el.type === "photo")
      .map((el, index) => [el.id, `Frame ${index + 1}`]),
  );

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

  const pageContent = (
    <div className="relative" style={{ width: pageW, height: pageH }}>
      <div
        id={`page-render-${page.id}`}
        data-photobook-page
        onDragOver={interactive ? (e) => e.preventDefault() : undefined}
        onDrop={interactive ? onDropPhoto : undefined}
        onClick={(e) => {
          if (e.target === e.currentTarget) selectElement(null);
        }}
        className={`${!isImageUrl(resolvedBg) && THEMES.some((t) => t.id === resolvedBg) ? themeClass(resolvedBg as BackgroundTheme) : ""} page-border-${page.border ?? "none"} w-full h-full relative overflow-hidden shadow-photo`}
        style={{
          borderRadius: 8,
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
              label={photoLabels.get(el.id) ?? "Element"}
              isFrameLocked={page.frameLocked && el.type === "photo"}
              canvasScale={coordinateScale}
            />
          ))}

        {page.eraserOverlay && (
          <img
            src={page.eraserOverlay}
            alt=""
            className="absolute inset-0 pointer-events-none"
            style={{
              width: pageW,
              height: pageH,
              zIndex: 900,
            }}
          />
        )}

        {isEraserMode && interactive && (
          <PageEraserCanvas
            pageId={page.id}
            pageW={pageW}
            pageH={pageH}
            background={page.background}
            resolvedBg={resolvedBg}
            existingOverlay={page.eraserOverlay}
            onSave={(dataUrl) => setPageOverlay(page.id, dataUrl)}
          />
        )}
      </div>

      {interactive && (
        <div className="absolute right-3 top-3 z-50 flex items-center gap-2 rounded-lg bg-black/40 p-1.5 backdrop-blur-md">
          <button
            onClick={(e) => {
              e.stopPropagation();
              useBookStore.getState().shufflePageImages(pageId);
            }}
            className="flex h-7 items-center gap-1 rounded bg-white/10 px-2 text-xs font-semibold text-white transition hover:bg-white/20"
            title="Shuffle images on this page"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Shuffle
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const result = useBookStore.getState().autofillLeastUsedImages(pageId);
              if (result.framesFilled > 0) {
                toast.success(
                  `Autofilled ${result.framesFilled} frame${result.framesFilled === 1 ? "" : "s"} on this page${result.framesUnlocked ? ` and unlocked ${result.framesUnlocked}` : ""}.`,
                );
              } else if (result.skippedReason === "no-available-images") {
                toast.warning("Upload or include photos before autofill.");
              } else if (result.skippedReason === "no-photo-frames") {
                toast.message("Apply a layout with photo frames first.");
              } else {
                toast.message("No unlocked frames to autofill on this page.");
              }
            }}
            className="flex h-7 items-center gap-1 rounded bg-accent px-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent/90"
            title="Autofill slots with least-used unticked images"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Autofill
          </button>
        </div>
      )}
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
  canvasScale: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rotateHandleRef = useRef<HTMLButtonElement>(null);
  const addImagesFromFiles = useBookStore.getState().addImagesFromFiles;
  const customStickersList = useBookStore((s) => s.customStickersList ?? []);
  const isEraserMode = useBookStore((s) => s.isEraserMode);
  const isTextEditing = interactive && editingTextId === el.id && (el.type === "text" || el.type === "quote");
  const isElementLocked = Boolean(isFrameLocked || (el.type === "sticker" && el.locked));

  // --- Rotation drag: incremental delta avoids atan2 wrap jumps (fast/slow feel) ---
  const startRotationDrag = (clientX: number, clientY: number, shiftKey: boolean) => {
    const handle = rotateHandleRef.current;
    if (!handle) return;
    const rndEl = handle.parentElement;
    if (!rndEl) return;

    const getCenter = () => {
      const rect = rndEl.getBoundingClientRect();
      return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    };

    let { cx, cy } = getCenter();
    let lastAngle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    let currentRot = el.rotation ?? 0;

    const applyRotation = (moveX: number, moveY: number, snap: boolean) => {
      ({ cx, cy } = getCenter());
      const angle = Math.atan2(moveY - cy, moveX - cx) * (180 / Math.PI);
      let delta = angle - lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngle = angle;
      currentRot += delta;
      if (snap) currentRot = Math.round(currentRot / 15) * 15;
      onChange({ rotation: Math.round(currentRot * 10) / 10 });
    };

    const onMouseMove = (moveE: MouseEvent) => {
      moveE.preventDefault();
      applyRotation(moveE.clientX, moveE.clientY, moveE.shiftKey);
    };

    const onTouchMove = (moveE: TouchEvent) => {
      if (moveE.touches.length === 0) return;
      moveE.preventDefault();
      const t = moveE.touches[0];
      applyRotation(t.clientX, t.clientY, shiftKey);
    };

    const cleanup = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", cleanup);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", cleanup);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", cleanup);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", cleanup);
  };

  const handleRotateDrag = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    startRotationDrag(e.clientX, e.clientY, e.shiftKey);
  };

  const handleRotateTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    if (t) startRotationDrag(t.clientX, t.clientY, false);
  };
  const uploadReplacement = async (file: File) => {
    try {
      const addedIds = await addImagesFromFiles([file]);
      const addedId = addedIds[0];
      if (addedId) onReplaceImage(addedId);
    } catch (error) {
      console.error("Failed to upload replacement", error);
    }
  };
  const content =
    el.type === "photo" ? (
      <PhotoBody el={el} library={library} />
    ) : el.type === "sticker" ? (
      el.stickerId || el.src ? (
        <img
          src={
            el.stickerId
              ? customStickersList.find((s) => s.id === el.stickerId)?.src || el.src
              : el.src
          }
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
      onResizeStop={isElementLocked ? undefined : (_, __, ref, ___, pos) =>
        onChange({ w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y })
      }
      disableDragging={isEraserMode || isElementLocked}
      enableResizing={isEraserMode || isElementLocked ? false : undefined}
      className={`group ${selected && !isElementLocked ? "outline outline-2 outline-accent outline-offset-2" : ""}`}
      style={{ zIndex: el.z, overflow: "visible" }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        if (el.type === "text" || el.type === "quote") {
          e.stopPropagation();
          setEditingTextId(el.id);
        }
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="relative h-full w-full"
            style={{ transform: `rotate(${el.rotation}deg)`, transformOrigin: "center" }}
            {...(el.type === "photo" ? { "data-photo-el": el.id } : {})}
            onDoubleClick={(e) => {
              if (el.type === "text" || el.type === "quote") {
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
            {interactive && el.type === "photo" && (
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
            {selected && (
              <>
                <div className="absolute left-2 top-2 z-10 rounded-full bg-charcoal/80 px-2 py-0.5 text-[10px] font-semibold text-cream shadow-sm">
                  {label} {isElementLocked ? "(Locked)" : ""}
                </div>
                {!isElementLocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="absolute -right-3 -top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:scale-110"
                    title="Delete"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {el.type === "photo" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current?.click();
                    }}
                    className="absolute -left-3 -top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-charcoal text-cream shadow-md hover:scale-110"
                    title="Replace image"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                  </button>
                )}
                {el.type === "photo" && el.imageId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearImage();
                    }}
                    className="absolute -left-3 -bottom-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:scale-110"
                    title="Clear image"
                  >
                    <ImageMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
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
              <ContextMenuItem onSelect={onRemove} className="text-destructive focus:text-destructive">
                <X className="mr-2 h-4 w-4" /> Delete
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

      {/* === Canva-style overlay controls: rendered OUTSIDE the rotated div, directly in Rnd === */}
      {selected && (
        <>
          {/* Element type label */}
          <div className="absolute left-2 top-2 z-[100] rounded-full bg-charcoal/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm pointer-events-none select-none">
            {label}
          </div>

          {/* ✕ Delete — top-right */}
          {!isElementLocked && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute -right-3 -top-3 z-[100] grid h-7 w-7 place-items-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 hover:scale-110 transition-transform"
              title="Delete"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* 🔵 Rotation handle — centred ABOVE the element, Canva-style */}
          {!isElementLocked && (
            <div
            className="absolute left-1/2 z-[100] -translate-x-1/2 flex flex-col items-center"
            style={{ bottom: "calc(100% + 4px)" }}
          >
            {/* Stem line */}
            <div className="w-px h-4 bg-accent/60" />
            <button
              ref={rotateHandleRef}
              onMouseDown={handleRotateDrag}
              onTouchStart={handleRotateTouchStart}
              className="h-7 w-7 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 hover:scale-110 cursor-grab active:cursor-grabbing transition-transform touch-none"
              title="Drag to rotate · Shift = snap 15°"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            </div>
          )}

          {/* Quick rotation bar — centred BELOW the element */}
          {!isElementLocked && (
            <div
            className="absolute left-1/2 z-[100] -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-charcoal/90 px-2 py-1 shadow-lg"
            style={{ top: "calc(100% + 6px)" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange({ rotation: (el.rotation ?? 0) - 90 });
              }}
              className="h-5 w-5 grid place-items-center rounded-full hover:bg-white/20 text-white transition-colors"
              title="-90°"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange({ rotation: (el.rotation ?? 0) - 15 });
              }}
              className="px-1 text-[9px] font-bold text-white/70 hover:text-white transition-colors"
              title="-15°"
            >
              -15
            </button>
            <span className="text-[9px] font-mono text-white min-w-[30px] text-center select-none">
              {Math.round(el.rotation ?? 0)}°
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange({ rotation: (el.rotation ?? 0) + 15 });
              }}
              className="px-1 text-[9px] font-bold text-white/70 hover:text-white transition-colors"
              title="+15°"
            >
              +15
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange({ rotation: (el.rotation ?? 0) + 90 });
              }}
              className="h-5 w-5 grid place-items-center rounded-full hover:bg-white/20 text-white transition-colors"
              title="+90°"
            >
              <RotateCw className="h-3 w-3" />
            </button>
            <div className="w-px h-3 bg-white/20 mx-0.5" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange({ rotation: 0 });
              }}
              className="px-1 text-[9px] font-bold text-white/40 hover:text-white transition-colors"
              title="Reset"
            >
              ↺0°
            </button>
          </div>
          )}

          {/* Replace image — top-left (photos only) */}
          {el.type === "photo" && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="absolute -left-3 -top-3 z-[100] grid h-7 w-7 place-items-center rounded-full bg-charcoal text-white shadow-md hover:scale-110 transition-transform"
              title="Replace image"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Clear image — bottom-left */}
          {el.type === "photo" && el.imageId && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onClearImage();
              }}
              className="absolute -left-3 -bottom-3 z-[100] grid h-7 w-7 place-items-center rounded-full bg-red-500 text-white shadow-md hover:scale-110 transition-transform"
              title="Clear image"
            >
              <ImageMinus className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
    </Rnd>
  );
}

function PageEraserCanvas({
  pageId,
  pageW,
  pageH,
  background,
  resolvedBg,
  existingOverlay,
  onSave,
}: {
  pageId: string;
  pageW: number;
  pageH: number;
  background: string;
  resolvedBg: string;
  existingOverlay?: string;
  onSave: (overlay: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brushSize = useBookStore((s) => s.eraserBrushSize);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);

  // Determine the stroke style based on the background color/theme
  const getStrokeStyle = (ctx: CanvasRenderingContext2D): string | CanvasPattern => {
    const isImage =
      resolvedBg.startsWith("data:") ||
      resolvedBg.startsWith("blob:") ||
      resolvedBg.startsWith("/") ||
      resolvedBg.startsWith("http:") ||
      resolvedBg.startsWith("https:") ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(resolvedBg);

    if (isImage) {
      const img = new Image();
      img.src = resolvedBg;
      if (img.complete) {
        try {
          const pat = ctx.createPattern(img, "repeat");
          if (pat) return pat;
        } catch (e) {
          console.error("Pattern creation error:", e);
        }
      }
    }

    const THEME_COLORS: Record<string, string> = {
      cream: "#faf6ec",
      linen: "#f3ede0",
      vintage: "#e8dcc0",
      dark: "#1f1a16",
      minimal: "#ffffff",
      sunset: "#ff9a8b",
      mountain: "#c0cbb6",
      pastel: "#f7e6e0",
      ocean: "#88b8d4",
      forest: "#7a9168",
      desert: "#f5d9a8",
      noir: "#0e0e10",
      rose: "#e8a48a",
      kraft: "#c79c6c",
      blueprint: "#1d3a64",
      terrazzo: "#f3ece1",
      coverLuxe: "#211a14",
      passport: "#17374a",
      map: "#f6ecd7",
      boarding: "#fbf5e7",
      tropical: "#f6eccd",
      alpine: "#eef3ee",
      city: "#171719",
      postcard: "#fbf0db",
      journal: "#ead9b8",
      botanical: "#f5eddc",
    };

    return THEME_COLORS[background] || resolvedBg || "#ffffff";
  };

  const patternRef = useRef<CanvasPattern | string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleFactor = 2;
    canvas.width = pageW * scaleFactor;
    canvas.height = pageH * scaleFactor;

    const isImage =
      resolvedBg.startsWith("data:") ||
      resolvedBg.startsWith("blob:") ||
      resolvedBg.startsWith("/") ||
      resolvedBg.startsWith("http:") ||
      resolvedBg.startsWith("https:") ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(resolvedBg);

    if (isImage) {
      const img = new Image();
      img.onload = () => {
        try {
          const pat = ctx.createPattern(img, "repeat");
          if (pat) patternRef.current = pat;
        } catch (e) {
          console.error("Pattern load error:", e);
        }
      };
      img.src = resolvedBg;
    }

    if (existingOverlay) {
      const overlayImg = new Image();
      overlayImg.onload = () => {
        ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
      };
      overlayImg.src = existingOverlay;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [pageId, pageW, pageH, resolvedBg, existingOverlay]);

  const draw = (clientX: number, clientY: number, drawing: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x_client = clientX - rect.left;
    const y_client = clientY - rect.top;

    setCursorPos({ x: x_client, y: y_client });

    if (drawing) {
      const scaleFactor = canvas.width / rect.width;
      const x = x_client * scaleFactor;
      const y = y_client * scaleFactor;
      const brushSizeLogical = brushSize * scaleFactor;

      ctx.lineWidth = brushSizeLogical;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.strokeStyle = patternRef.current || getStrokeStyle(ctx);

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.beginPath();
    }
    draw(e.clientX, e.clientY, true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    draw(e.clientX, e.clientY, isDrawing);
  };

  const handleMouseUpOrLeave = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.beginPath();

      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    }
  };

  return (
    <div
      className="absolute inset-0 select-none cursor-none z-[900]"
      onMouseEnter={() => setShowCursor(true)}
      onMouseLeave={() => {
        setShowCursor(false);
        handleMouseUpOrLeave();
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUpOrLeave}
        onMouseMove={handleMouseMove}
        className="w-full h-full cursor-none"
      />
      {showCursor && (
        <div
          className="pointer-events-none absolute rounded-full border border-white bg-charcoal/20 mix-blend-difference -translate-x-1/2 -translate-y-1/2 shadow-sm z-[990]"
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

function PhotoBody({ el, library }: { el: PhotoElement; library: { id: string; src: string }[] }) {
  const img = library.find((i) => i.id === el.imageId);
  const inner = shapeStyle(el.shape, el.frame === "none" ? el.radius : 4);

  if (!img) {
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

  const frameStyle: React.CSSProperties = {
    borderRadius: el.frame === "none" ? (el.shape && el.shape !== "none" ? 0 : el.radius) : 0,
    opacity: el.opacity ?? 1,
  };

  if (el.frameColor) {
    (frameStyle as any)["--frame-color"] = el.frameColor;
    (frameStyle as any)["--frame-border-color"] = el.frameColor;
    (frameStyle as any)["--frame-color-secondary"] = el.frameColor;
  }

  return (
    <div
      className={`frame-${el.frame} h-full w-full`}
      style={frameStyle}
    >
      <div className="h-full w-full overflow-hidden flex items-center justify-center" style={inner}>
        {isZoomedOut ? (
          // ZOOM OUT: shrink the image so the full image is visible inside the frame
          <img
            src={img.src}
            alt=""
            draggable={false}
            style={{
              width: `${scale * 100}%`,
              height: `${scale * 100}%`,
              objectFit: "contain",
              objectPosition: "center",
              transform: `translate(${el.imageX ?? 0}px, ${el.imageY ?? 0}px)`,
              flexShrink: 0,
            }}
          />
        ) : (
          // ZOOM IN: fill the frame and allow cropping / panning
          <img
            src={img.src}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            style={{
              objectPosition: `calc(50% + ${el.imageX ?? 0}px) calc(50% + ${el.imageY ?? 0}px)`,
              transform: `scale(${scale})`,
              transformOrigin: "center",
            }}
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
