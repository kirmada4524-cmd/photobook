import { useBookStore, type DrawMode } from "@/lib/photobook/store";
import { useAuthStore } from "@/lib/auth";
import { TEMPLATES } from "@/lib/photobook/templates";
import { FRAMES, THEMES, PAGE_BORDERS } from "@/lib/photobook/catalogs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PhotoElement, QuoteElement, TextElement, PageElement } from "@/lib/photobook/types";
import {
  PHOTO_FILTER_DEFAULTS,
  PHOTO_FILTER_PRESETS,
  resetPhotoEditsPatch,
} from "@/lib/photobook/photo-filters";
import {
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImageMinus,
  ImagePlus,
  Paintbrush,
  Eraser,
  RotateCcw,
  Loader2,
  PenLine,
  Brush,
  Highlighter,
  Zap,
  Scissors,
  SlidersHorizontal,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const isBgImage = (bg?: string) => {
  if (!bg) return false;
  return (
    bg.startsWith("bg_") ||
    bg.startsWith("data:") ||
    bg.startsWith("blob:") ||
    bg.startsWith("/") ||
    bg.startsWith("http:") ||
    bg.startsWith("https:") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(bg)
  );
};

export function DesignSidebar() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const applyLayout = useBookStore((s) => s.applyLayout);
  const addSticker = useBookStore((s) => s.addStickerToCurrentPage);
  const currentPageId = useBookStore((s) => s.currentPageId);
  const setPageBackground = useBookStore((s) => s.setPageBackground);
  const setPageBorder = useBookStore((s) => s.setPageBorder);
  const selectedId = useBookStore((s) => s.selectedElementId);
  const updateElement = useBookStore((s) => s.updateElement);
  const replacePhotoImage = useBookStore((s) => s.replacePhotoImage);
  const moveElementLayer = useBookStore((s) => s.moveElementLayer);
  const library = useBookStore((s) => s.library);
  const page = useBookStore((s) => s.book.pages.find((p) => p.id === s.currentPageId));
  const selected = page?.elements.find((e) => e.id === selectedId);
  const pageStructureLocked = Boolean(page?.adminTemplateProtected && !isAdmin);
  const isPhoto = selected?.type === "photo";
  const adminTemplates = useBookStore((s) => s.adminTemplates ?? []);

  const editingBackgroundPageId = useBookStore((s) => s.editingBackgroundPageId);
  const setEditingBackgroundPageId = useBookStore((s) => s.setEditingBackgroundPageId);
  const updatePageBackgroundPosition = useBookStore((s) => s.updatePageBackgroundPosition);
  const updatePageBackgroundScale = useBookStore((s) => s.updatePageBackgroundScale);

  const adminStickerFolders = useBookStore((s) => s.adminStickerFolders ?? []);
  const adminBackgrounds = useBookStore((s) => s.adminBackgrounds ?? []);
  const customStickersList = useBookStore((s) => s.customStickersList ?? []);
  const drawMode = useBookStore((s) => s.drawMode);
  const setDrawMode = useBookStore((s) => s.setDrawMode);
  const drawBrushSize = useBookStore((s) => s.drawBrushSize);
  const setDrawBrushSize = useBookStore((s) => s.setDrawBrushSize);
  const drawBrushColor = useBookStore((s) => s.drawBrushColor);
  const setDrawBrushColor = useBookStore((s) => s.setDrawBrushColor);
  const drawBrushOpacity = useBookStore((s) => s.drawBrushOpacity);
  const setDrawBrushOpacity = useBookStore((s) => s.setDrawBrushOpacity);
  const clearCurrentPageDrawings = useBookStore((s) => s.clearCurrentPageDrawings);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("layouts");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isGlobalTemplateSaving, setIsGlobalTemplateSaving] = useState(false);
  const [replaceTemplateId, setReplaceTemplateId] = useState<string | null>(null);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateCategoryInput, setTemplateCategoryInput] = useState("");
  const editorStickerFolders = adminStickerFolders
    .map((folder) => ({
      ...folder,
      stickers: folder.stickers.filter((sticker) => sticker.src),
    }))
    .filter((folder) => folder.stickers.length > 0);
  const editorStickerCount = editorStickerFolders.reduce(
    (count, folder) => count + folder.stickers.length,
    0,
  );

  const width = useBookStore((s) => s.designSidebarWidth ?? 320);
  const setWidth = useBookStore((s) => s.setDesignSidebarWidth);
  const isResizing = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    setWidth(window.innerWidth - e.clientX);
  };

  const stopResize = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  };

  useEffect(() => {
    if (selected?.type === "photo") {
      setActiveTab("frames");
    } else if (selected?.type === "text" || selected?.type === "quote") {
      setActiveTab("quotes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const openCropTools = () => setActiveTab("frames");
    window.addEventListener("photobook:open-crop-tools", openCropTools);
    return () => window.removeEventListener("photobook:open-crop-tools", openCropTools);
  }, []);

  useEffect(() => {
    const openDesignTab = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (["layouts", "frames", "border", "stickers", "quotes", "draw", "bg"].includes(tab ?? "")) {
        const protectedTab = ["border", "quotes", "bg"].includes(tab ?? "");
        setActiveTab(pageStructureLocked && protectedTab ? "layouts" : (tab as string));
      }
    };
    window.addEventListener("photobook:design-tab", openDesignTab);
    return () => window.removeEventListener("photobook:design-tab", openDesignTab);
  }, [pageStructureLocked]);

  const filteredTemplates = TEMPLATES;
  const panelMeta: Record<string, { title: string; subtitle: string }> = {
    layouts: { title: "Templates", subtitle: "Apply a layout to this page" },
    frames: {
      title:
        selected?.type === "text" || selected?.type === "quote" ? "Text editor" : "Image tools",
      subtitle:
        selected?.type === "text" || selected?.type === "quote"
          ? "Typography, spacing and effects"
          : "Frame, crop and image position",
    },
    border: { title: "Page border", subtitle: "Finish the edge of this page" },
    stickers: { title: "Stickers", subtitle: `${editorStickerCount} studio assets available` },
    quotes: { title: "Text editor", subtitle: "Add and style text on the page" },
    draw: { title: "Draw", subtitle: "Pens, markers and freehand tools" },
    bg: { title: "Background", subtitle: "Colors and studio backgrounds" },
  };
  const currentPanel = panelMeta[activeTab] ?? panelMeta.layouts;

  const safeApplyLayout = (templateId: (typeof TEMPLATES)[number]["id"]) => {
    try {
      applyLayout(templateId);
      useBookStore.getState().selectElement(null);
      setActiveTab("layouts");
    } catch (error) {
      console.error("Failed to apply layout", error);
      toast.error("This layout could not be applied. Please try another layout.");
    }
  };

  return (
    <aside
      style={typeof window !== "undefined" && window.innerWidth < 768 ? undefined : { width }}
      className="editor-sidebar relative flex h-full shrink-0 flex-col md:border-l w-full md:w-auto bg-background"
    >
      <div className="editor-sidebar-header hidden md:flex items-center justify-between px-3.5 py-3">
        <div>
          <h2 className="text-sm font-semibold">{currentPanel.title}</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{currentPanel.subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={useBookStore((s) => s.toggleDesignSidebar)}
          title="Hide sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="editor-design-tabs mx-3 my-2 flex h-auto justify-start gap-1 overflow-x-auto p-1">
          <TabsTrigger value="layouts" className="min-w-fit px-2.5 text-[11px]">
            Layout
          </TabsTrigger>
          <TabsTrigger value="frames" className="min-w-fit px-2.5 text-[11px]">
            {selected?.type === "photo"
              ? "Frame"
              : selected?.type === "text" || selected?.type === "quote"
                ? "Text"
                : "Frame"}
          </TabsTrigger>
          <TabsTrigger
            value="border"
            disabled={pageStructureLocked}
            className="min-w-fit px-2.5 text-[11px]"
          >
            Border
          </TabsTrigger>
          <TabsTrigger value="stickers" className="min-w-fit px-2.5 text-[11px]">
            Stick
          </TabsTrigger>
          <TabsTrigger
            value="quotes"
            disabled={pageStructureLocked}
            className="min-w-fit px-2.5 text-[11px]"
          >
            Text
          </TabsTrigger>
          <TabsTrigger value="draw" className="min-w-fit px-2.5 text-[11px]">
            Draw
          </TabsTrigger>
          <TabsTrigger
            value="bg"
            disabled={pageStructureLocked}
            className="min-w-fit px-2.5 text-[11px]"
          >
            BG
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          <TabsContent value="layouts" className="mt-0 space-y-4">
            {activeTab === "layouts" && (
              <>
                <div className="space-y-3 border-b pb-4 mb-2">
                  {isAdmin && (
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center justify-between">
                      <span>Global Templates</span>
                    </div>
                  )}

                  {isSavingTemplate && isAdmin ? (
                    <div className="flex flex-col gap-2 px-1 bg-accent/5 p-2 rounded-lg border border-dashed border-accent/20">
                      <div className="flex gap-1.5 items-center">
                        <Input
                          value={templateNameInput}
                          onChange={(e) => setTemplateNameInput(e.target.value)}
                          placeholder="Template name..."
                          className="h-7 text-xs flex-1 bg-background"
                        />
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <Input
                          value={templateCategoryInput}
                          onChange={(e) => setTemplateCategoryInput(e.target.value)}
                          placeholder="Category (e.g. Birthday)"
                          className="h-7 text-xs flex-1 bg-background"
                        />
                      </div>
                      <div className="flex gap-1.5 items-center mt-1">
                        <Button
                          size="sm"
                          className="h-7 text-[10px] px-2.5 font-semibold bg-charcoal text-cream hover:bg-charcoal/90"
                          disabled={isGlobalTemplateSaving}
                          onClick={async () => {
                            if (!page) return;

                            let savingToast: string | number | undefined;
                            try {
                              setIsGlobalTemplateSaving(true);
                              savingToast = toast.loading("Saving global template...");
                              // Generate thumbnail of the page
                              let thumbnailDataUrl: string | undefined;
                              const pageEl = document.getElementById(`page-render-${page.id}`);
                              if (pageEl) {
                                try {
                                  const html2canvas = (await import("html2canvas-pro")).default;
                                  const canvas = await html2canvas(pageEl, {
                                    scale: 0.7,
                                    useCORS: true,
                                    logging: false,
                                    allowTaint: false,
                                    backgroundColor: null,
                                  });
                                  thumbnailDataUrl = canvas.toDataURL("image/webp", 0.86);
                                  canvas.width = 1;
                                  canvas.height = 1;
                                } catch (error) {
                                  console.error("Failed to generate template thumbnail:", error);
                                }
                              }

                              // Use DOM input elements since we don't have separate React state variables for these yet.
                              const isFrameLocked =
                                (document.getElementById("admin-frame-lock") as HTMLInputElement)
                                  ?.checked ?? true;
                              const isBgLocked =
                                (document.getElementById("admin-bg-lock") as HTMLInputElement)
                                  ?.checked ?? true;

                              await useBookStore
                                .getState()
                                .savePageAsTemplate(page.id, templateNameInput, thumbnailDataUrl, {
                                  isAdminTemplate: true,
                                  category: templateCategoryInput.trim() || "General",
                                  frameLocked: isFrameLocked,
                                  backgroundLocked: isBgLocked,
                                  replaceTemplateId: replaceTemplateId || undefined,
                                });
                              toast.success(
                                replaceTemplateId
                                  ? "Template replaced"
                                  : "Saved in global templates",
                                { id: savingToast },
                              );
                              setIsSavingTemplate(false);
                              setReplaceTemplateId(null);
                              setTemplateNameInput("");
                              setTemplateCategoryInput("");
                            } catch (error) {
                              console.error(error);
                              toast.error(
                                (error as Error).message || "Failed to save global template",
                                {
                                  id: savingToast,
                                },
                              );
                            } finally {
                              setIsGlobalTemplateSaving(false);
                            }
                          }}
                        >
                          {isGlobalTemplateSaving ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] px-2.5"
                          disabled={isGlobalTemplateSaving}
                          onClick={() => {
                            setIsSavingTemplate(false);
                            setReplaceTemplateId(null);
                            setTemplateNameInput("");
                            setTemplateCategoryInput("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-black/5 mt-1">
                        <div className="flex items-center gap-3 pl-1">
                          <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              id="admin-frame-lock"
                              defaultChecked
                              className="rounded h-2.5 w-2.5"
                            />
                            Lock Frames
                          </label>
                          <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              id="admin-bg-lock"
                              defaultChecked
                              className="rounded h-2.5 w-2.5"
                            />
                            Lock Background
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : isAdmin ? (
                    <div className="grid grid-cols-2 gap-2 px-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-[11px] gap-1 h-7 font-semibold"
                        onClick={() => {
                          setIsSavingTemplate(true);
                          setTemplateNameInput(`Global Template ${adminTemplates.length + 1}`);
                        }}
                      >
                        Save in Global Templates
                      </Button>
                      {page?.sourceTemplateId && (
                        <Button
                          size="sm"
                          className="col-span-2 h-8 text-[11px] font-semibold"
                          onClick={() => {
                            const template = adminTemplates.find(
                              (item) => item.id === page.sourceTemplateId,
                            );
                            if (!template) return;
                            setReplaceTemplateId(template.id);
                            setTemplateNameInput(template.label);
                            setTemplateCategoryInput(template.category || "General Mag");
                            setIsSavingTemplate(true);
                          }}
                        >
                          Replace This Admin Template
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-[11px] gap-1 h-7 font-semibold"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Import JSON
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".wanderpage,.json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const json = JSON.parse(event.target?.result as string);
                              if (json.background && json.elements) {
                                useBookStore.getState().importCustomTemplate(json);
                              } else {
                                alert(
                                  "Invalid template file format. Must contain background and elements.",
                                );
                              }
                            } catch (err) {
                              alert("Failed to parse template JSON file.");
                            }
                          };
                          reader.readAsText(file);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                {/* Predefined Layouts */}
                {filteredTemplates.length === 0 && (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No templates match your search.
                  </div>
                )}
                {Array.from(new Set(filteredTemplates.map((t) => t.style))).map((style) => {
                  const catTemplates = filteredTemplates.filter((t) => t.style === style);
                  return (
                    <div key={style} className="space-y-1.5">
                      <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>{style} Templates</span>
                        <span>{catTemplates.length}</span>
                      </div>
                      <div className="grid grid-flow-col auto-cols-[140px] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 snap-x touch-pan-x">
                        {catTemplates.map((t) => (
                          <div
                            key={t.id}
                            className="group rounded-xl border bg-card p-2 text-left transition hover:border-accent hover:shadow-md snap-start"
                          >
                            <button
                              className="w-full text-left"
                              onClick={() => safeApplyLayout(t.id)}
                            >
                              <LayoutThumb id={t.id} />
                              <div className="mt-1.5 px-0.5 text-[11px] font-semibold leading-tight truncate">
                                {t.label}
                              </div>
                              <div className="px-0.5 text-[9px] text-muted-foreground">
                                {t.minPhotos}
                                {t.maxPhotos && t.maxPhotos !== t.minPhotos
                                  ? `-${t.maxPhotos}`
                                  : ""}{" "}
                                frames · {t.category}
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>

          <TabsContent value="frames" className="mt-0 space-y-3">
            {activeTab === "frames" && (
              <>
                {isPhoto ? (
                  <>
                    <PhotoControls
                      selected={selected as PhotoElement}
                      updateElement={updateElement}
                      moveElementLayer={moveElementLayer}
                      structureLocked={pageStructureLocked}
                    />
                    <ReplaceImagePicker
                      library={library}
                      onPick={(id) => replacePhotoImage(selected!.id, id)}
                    />
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Select a photo on the page to apply a frame. Text editing is available in the
                    Text tab.
                  </div>
                )}
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Frames
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {FRAMES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        if (isPhoto)
                          updateElement(selected!.id, { frame: f.id } as Partial<PhotoElement>);
                      }}
                      className={`rounded-lg border p-2 text-[11px] transition hover:border-accent ${
                        isPhoto && (selected as PhotoElement).frame === f.id
                          ? "border-accent ring-1 ring-accent"
                          : ""
                      }`}
                    >
                      <div
                        className={`frame-${f.id} mx-auto mb-1 h-10 w-10 overflow-hidden rounded-sm`}
                      >
                        <div className="h-full w-full bg-muted" />
                      </div>
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="border" className="mt-0 space-y-3">
            {activeTab === "border" && (
              <div className="grid grid-cols-2 gap-2">
                {PAGE_BORDERS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setPageBorder(currentPageId, b.id)}
                    className={`page-border-thumb-${b.id} relative h-20 overflow-hidden rounded-xl border bg-card text-xs font-medium shadow-sm transition hover:border-accent ${
                      (page?.border ?? "none") === b.id ? "border-accent ring-1 ring-accent" : ""
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stickers" className="mt-0 space-y-4">
            {activeTab === "stickers" && (
              <>
                <div className="rounded-xl border bg-card p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full gap-2 text-xs font-semibold"
                    onClick={() => stickerInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload Sticker
                  </Button>
                  <input
                    ref={stickerInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []).filter((file) =>
                        file.type.startsWith("image/"),
                      );
                      if (files.length === 0) return;
                      try {
                        for (const file of files) {
                          await useBookStore.getState().addCustomSticker(file);
                        }
                        toast.success(
                          `Added ${files.length} local sticker${files.length === 1 ? "" : "s"}`,
                        );
                      } catch (error) {
                        console.error("Failed to add sticker", error);
                        toast.error("Could not add sticker");
                      } finally {
                        e.target.value = "";
                      }
                    }}
                    multiple
                  />
                </div>

                {customStickersList.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                      Your Stickers
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {customStickersList.map((sticker) => (
                        <button
                          key={sticker.id}
                          onClick={() => addSticker(sticker.id)}
                          className="aspect-square w-full overflow-hidden rounded-lg border bg-card p-1 transition hover:scale-110 hover:border-accent"
                          title={sticker.name}
                        >
                          <img
                            src={sticker.src}
                            alt={sticker.name}
                            className="h-full w-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {editorStickerCount > 0 ? (
                  <div className="space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                      Global Sticker Folders
                    </div>
                    {editorStickerFolders.map((folder) => (
                      <div key={folder.id} className="space-y-1.5">
                        <div className="flex items-center justify-between px-1 text-[11px] font-semibold">
                          <span className="truncate">{folder.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {folder.stickers.length}
                          </span>
                        </div>
                        {folder.stickers.length > 0 ? (
                          <div className="grid grid-cols-4 gap-1.5">
                            {folder.stickers.map((sticker) => (
                              <button
                                key={sticker.id}
                                onClick={() => addSticker(sticker.src)}
                                className="aspect-square w-full overflow-hidden rounded-lg border bg-card p-1 transition hover:scale-110 hover:border-accent"
                                title={sticker.name}
                              >
                                <img
                                  src={sticker.src}
                                  alt={sticker.name}
                                  className="h-full w-full object-contain"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">No admin stickers yet.</div>
                    <div className="mt-1">
                      Upload stickers from the Admin Panel to show them here.
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="mt-0 space-y-3.5">
            {activeTab === "quotes" && (
              <>
                <div className="space-y-1.5 rounded-xl border bg-card p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Text Box
                  </div>
                  <Button
                    onClick={() => useBookStore.getState().addTextToCurrentPage()}
                    className="w-full bg-charcoal text-cream hover:bg-charcoal/90"
                  >
                    [+] Add Text Box
                  </Button>
                </div>

                {selected?.type === "text" || selected?.type === "quote" ? (
                  <TextControls
                    selected={selected as QuoteElement | TextElement}
                    updateElement={updateElement}
                    moveElementLayer={moveElementLayer}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Add a text box or select existing text on the page to edit all typography here.
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="draw" className="mt-0 space-y-3.5">
            {activeTab === "draw" && (
              <DrawControls
                mode={drawMode}
                setMode={setDrawMode}
                size={drawBrushSize}
                setSize={setDrawBrushSize}
                color={drawBrushColor}
                setColor={setDrawBrushColor}
                opacity={drawBrushOpacity}
                setOpacity={setDrawBrushOpacity}
                onClear={() => {
                  const removed = clearCurrentPageDrawings();
                  if (removed > 0)
                    toast.success(`Removed ${removed} drawing stroke${removed === 1 ? "" : "s"}`);
                  else toast.message("No drawing strokes on this page.");
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="bg" className="mt-0 space-y-4">
            {activeTab === "bg" && (
              <>
                <div className="rounded-xl border bg-card p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full gap-2 text-xs font-semibold"
                    onClick={() => backgroundInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload Background Image
                  </Button>
                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const file = Array.from(e.target.files ?? []).find((item) =>
                        item.type.startsWith("image/"),
                      );
                      if (!file) return;
                      try {
                        await useBookStore.getState().addCustomBackground(file);
                        const uploaded = useBookStore.getState().customBackgroundsList.at(-1);
                        if (uploaded) setPageBackground(currentPageId, uploaded.id);
                        toast.success("Background added to this editor");
                      } catch (error) {
                        console.error("Failed to add background", error);
                        toast.error("Could not add background");
                      } finally {
                        e.target.value = "";
                      }
                    }}
                  />
                </div>

                {adminBackgrounds.length > 0 ? (
                  <div className="space-y-2 border-b pb-3 mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                      Global Backgrounds
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {adminBackgrounds.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setPageBackground(currentPageId, bg.src)}
                          className="h-20 w-full overflow-hidden rounded-xl border-2 border-transparent shadow-sm transition hover:scale-105 hover:border-accent"
                          title={bg.name}
                        >
                          <img
                            src={bg.src}
                            alt={bg.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">No admin backgrounds yet.</div>
                    <div className="mt-1">
                      Upload backgrounds from the Admin Panel to show them here.
                    </div>
                  </div>
                )}

                {/* Paint Colours */}
                <div className="space-y-2 border-b pb-3 mb-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center justify-between">
                    <span>Paint Colours</span>
                    {/* Custom Color Picker */}
                    <div className="flex items-center gap-1.5" title="Custom color picker">
                      <span className="text-[10px] font-medium text-accent">Custom Color</span>
                      <div className="relative h-5 w-5 rounded-full border border-border overflow-hidden hover:scale-110 cursor-pointer flex items-center justify-center">
                        <input
                          type="color"
                          value={
                            page?.background &&
                            !page.background?.startsWith("bg_") &&
                            !page.background?.startsWith("data:") &&
                            !page.background?.startsWith("blob:") &&
                            !page.background?.startsWith("/") &&
                            !page.background?.startsWith("http") &&
                            !THEMES.some((t) => t.id === page.background)
                              ? page.background
                              : "#FFFFFF"
                          }
                          onChange={(e) => setPageBackground(currentPageId, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                        />
                        <div
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{
                            backgroundColor:
                              page?.background &&
                              !page.background?.startsWith("bg_") &&
                              !page.background?.startsWith("data:") &&
                              !page.background?.startsWith("blob:") &&
                              !page.background?.startsWith("/") &&
                              !page.background?.startsWith("http") &&
                              !THEMES.some((t) => t.id === page.background)
                                ? page.background
                                : "#FFFFFF",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={
                          page?.background &&
                          !page.background?.startsWith("bg_") &&
                          !page.background?.startsWith("data:") &&
                          !page.background?.startsWith("blob:") &&
                          !page.background?.startsWith("/") &&
                          !page.background?.startsWith("http") &&
                          !THEMES.some((t) => t.id === page.background)
                            ? page.background
                            : ""
                        }
                        placeholder="#HEX"
                        onChange={(e) => setPageBackground(currentPageId, e.target.value)}
                        className="h-6 w-16 text-[10px] px-1 py-0.5 rounded text-center uppercase font-mono border"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { label: "Soft Cream", value: "#FDFBF7" },
                      { label: "Sage Green", value: "#D1E2D3" },
                      { label: "Olive Green", value: "#8E9B85" },
                      { label: "Muted Terracotta", value: "#D9A08B" },
                      { label: "Soft Ochre", value: "#EED7B5" },
                      { label: "Dusty Rose", value: "#E4C5C4" },
                      { label: "Slate Blue", value: "#B8C6D8" },
                      { label: "Navy Blue", value: "#2C3E50" },
                      { label: "Warm Charcoal", value: "#34495E" },
                      { label: "Classic White", value: "#FFFFFF" },
                      { label: "Mist Gray", value: "#F2F4F4" },
                      { label: "Earthy Brown", value: "#D5C5B5" },
                    ].map((col) => (
                      <button
                        key={col.value}
                        onClick={() => setPageBackground(currentPageId, col.value)}
                        className={`h-7 w-full rounded-lg border shadow-sm transition hover:scale-110 hover:border-accent ${
                          page?.background === col.value
                            ? "border-accent ring-1 ring-accent"
                            : "border-border"
                        }`}
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Background Fit Options */}
                {page && page.background && (
                  <div className="space-y-2 border-b pb-3 mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                      Background Fitting
                    </div>
                    <div className="flex gap-1.5 px-1">
                      {[
                        { label: "Fill / Zoom", value: "cover" },
                        { label: "Fit Entire Image", value: "contain" },
                        { label: "Stretch", value: "stretch" },
                      ].map((mode) => (
                        <Button
                          key={mode.value}
                          size="sm"
                          variant={
                            (page.backgroundMode || "cover") === mode.value ? "default" : "outline"
                          }
                          className="flex-1 text-[10px] h-7 px-1 font-semibold"
                          onClick={() => {
                            useBookStore
                              .getState()
                              .updatePageBackgroundMode(currentPageId, mode.value as any);
                          }}
                        >
                          {mode.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Background Image Options */}
                {page && page.background && isBgImage(page.background) && (
                  <div className="space-y-2 border-b pb-3 mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center justify-between">
                      <span>Background Image Options</span>
                    </div>
                    {editingBackgroundPageId === page.id ? (
                      <div className="bg-accent/5 p-3 rounded-lg border border-dashed border-accent/25 space-y-3">
                        <div className="text-[10px] leading-normal text-muted-foreground bg-accent/10 px-2 py-1.5 rounded border border-accent/15 flex items-center gap-1.5 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping shrink-0" />
                          <span>Layout Mode Active: Drag background image on the page to pan.</span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Zoom / Scale</span>
                            <span className="font-semibold tabular-nums">
                              {Math.round((page.backgroundScale ?? 1) * 100)}%
                            </span>
                          </div>
                          <Slider
                            min={1}
                            max={4}
                            step={0.05}
                            value={[page.backgroundScale ?? 1]}
                            onValueChange={([val]) => updatePageBackgroundScale(page.id, val)}
                            className="py-1.5"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Position Offset</span>
                            <span className="font-semibold tabular-nums">
                              X: {page.backgroundX ?? 0}px, Y: {page.backgroundY ?? 0}px
                            </span>
                          </div>

                          {/* D-Pad Pan Controls */}
                          <div className="flex flex-col items-center gap-1 mt-1 pb-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-10 p-0 text-[10px]"
                              onClick={() =>
                                updatePageBackgroundPosition(
                                  page.id,
                                  page.backgroundX ?? 0,
                                  (page.backgroundY ?? 0) - 5,
                                )
                              }
                              title="Pan Up"
                            >
                              ▲
                            </Button>
                            <div className="flex gap-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-10 p-0 text-[10px]"
                                onClick={() =>
                                  updatePageBackgroundPosition(
                                    page.id,
                                    (page.backgroundX ?? 0) - 5,
                                    page.backgroundY ?? 0,
                                  )
                                }
                                title="Pan Left"
                              >
                                ◀
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-10 p-0 text-[10px]"
                                onClick={() =>
                                  updatePageBackgroundPosition(
                                    page.id,
                                    (page.backgroundX ?? 0) + 5,
                                    page.backgroundY ?? 0,
                                  )
                                }
                                title="Pan Right"
                              >
                                ▶
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-10 p-0 text-[10px]"
                              onClick={() =>
                                updatePageBackgroundPosition(
                                  page.id,
                                  page.backgroundX ?? 0,
                                  (page.backgroundY ?? 0) + 5,
                                )
                              }
                              title="Pan Down"
                            >
                              ▼
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-1.5 pt-1.5 border-t">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 text-[10px] h-7 px-1"
                            onClick={() => {
                              updatePageBackgroundScale(page.id, 1);
                              updatePageBackgroundPosition(page.id, 0, 0);
                            }}
                          >
                            Reset
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 text-[10px] h-7 bg-charcoal text-cream hover:bg-charcoal/90"
                            onClick={() => setEditingBackgroundPageId(null)}
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-[11px] gap-1.5 h-8 font-semibold"
                        onClick={() => setEditingBackgroundPageId(page.id)}
                      >
                        <Paintbrush className="h-3.5 w-3.5" />
                        Edit BG Zoom & Position
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>
      {/* Resizer Handle */}
      <div
        onMouseDown={startResize}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 active:bg-accent transition z-50"
      />
    </aside>
  );
}

function ReplaceImagePicker({
  library,
  onPick,
}: {
  library: { id: string; src: string; name: string }[];
  onPick: (id: string) => void;
}) {
  if (library.length === 0) return null;
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Change image
      </div>
      <div className="grid max-h-44 grid-cols-4 gap-1.5 overflow-y-auto">
        {library.map((img) => (
          <button
            key={img.id}
            onClick={() => onPick(img.id)}
            title={img.name}
            className="aspect-square overflow-hidden rounded-md border transition hover:border-accent hover:ring-1 hover:ring-accent"
          >
            <img
              src={img.src}
              alt={img.name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function DrawControls({
  mode,
  setMode,
  size,
  setSize,
  color,
  setColor,
  opacity,
  setOpacity,
  onClear,
}: {
  mode: DrawMode;
  setMode: (mode: DrawMode) => void;
  size: number;
  setSize: (size: number) => void;
  color: string;
  setColor: (color: string) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  onClear: () => void;
}) {
  const tools: { mode: DrawMode; label: string; icon: typeof PenLine }[] = [
    { mode: "off", label: "Select", icon: Paintbrush },
    { mode: "pen", label: "Pen", icon: PenLine },
    { mode: "marker", label: "Marker", icon: Brush },
    { mode: "highlighter", label: "Highlight", icon: Highlighter },
    { mode: "neon", label: "Neon", icon: Zap },
    { mode: "pressure", label: "Ink", icon: PenLine },
  ];

  const colors = [
    "#111827",
    "#ffffff",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#a16207",
    "#64748b",
  ];

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Drawing Tool
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const active = mode === tool.mode;
            return (
              <Button
                key={tool.mode}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-9 gap-1.5 px-2 text-[11px] font-semibold"
                onClick={() => setMode(tool.mode)}
                title={tool.label}
              >
                <Icon className="h-3.5 w-3.5" />
                {tool.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="text-xs font-medium">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded-md border bg-background p-0"
            title="Pick drawing color"
          />
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {colors.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              className={`h-7 rounded-md border transition hover:scale-105 ${
                color.toLowerCase() === swatch.toLowerCase()
                  ? "border-accent ring-1 ring-accent"
                  : "border-border"
              }`}
              style={{ backgroundColor: swatch }}
              title={swatch}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="font-medium">Brush Size</span>
          <span className="tabular-nums text-muted-foreground">{size}px</span>
        </div>
        <Slider value={[size]} min={2} max={80} step={1} onValueChange={([v]) => setSize(v)} />
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="font-medium">Opacity</span>
          <span className="tabular-nums text-muted-foreground">{Math.round(opacity * 100)}%</span>
        </div>
        <Slider
          value={[opacity]}
          min={0.05}
          max={1}
          step={0.05}
          onValueChange={([v]) => setOpacity(v)}
        />
      </div>

      <div className="rounded-lg border border-dashed bg-muted/35 p-2 text-[10px] leading-normal text-muted-foreground">
        Select a brush, then drag directly on the page. Strokes are saved with the page and work in
        preview/export.
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 text-xs font-semibold"
          onClick={() => setMode("off")}
        >
          Done
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 text-xs font-semibold text-sky-700 hover:text-sky-700"
          onClick={onClear}
        >
          Clear Drawings
        </Button>
      </div>
    </div>
  );
}

function PhotoControls({
  selected,
  updateElement,
  moveElementLayer,
  structureLocked = false,
}: {
  selected: PhotoElement;
  updateElement: (id: string, p: Partial<PhotoElement>) => void;
  moveElementLayer: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  structureLocked?: boolean;
}) {
  const isEraserMode = useBookStore((s) => s.isEraserMode);
  const setIsEraserMode = useBookStore((s) => s.setIsEraserMode);
  const eraserBrushSize = useBookStore((s) => s.eraserBrushSize);
  const setEraserBrushSize = useBookStore((s) => s.setEraserBrushSize);
  const setFilterValue = (patch: Partial<PhotoElement>) =>
    updateElement(selected.id, { ...patch, imageFilterPreset: "custom" });
  const openCrop = () =>
    window.dispatchEvent(
      new CustomEvent("photobook:open-crop-tools", {
        detail: { elementId: selected.id, active: true },
      }),
    );

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="default"
          className="h-9 gap-1.5 text-xs font-semibold"
          disabled={!selected.imageId}
          onClick={openCrop}
        >
          <Scissors className="h-3.5 w-3.5" />
          Crop Image
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1.5 text-xs font-semibold"
          disabled={!selected.imageId}
          onClick={() =>
            updateElement(selected.id, {
              imageX: 0,
              imageY: 0,
              imageScale: 1,
              imageRotation: 0,
            })
          }
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Crop
        </Button>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="block text-xs font-medium">Layer</label>
          {structureLocked && (
            <span className="text-[10px] font-medium text-muted-foreground">Template locked</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-full"
            title="Bring to front"
            disabled={structureLocked}
            onClick={() => moveElementLayer(selected.id, "front")}
          >
            <BringToFront className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-full"
            title="Move forward"
            disabled={structureLocked}
            onClick={() => moveElementLayer(selected.id, "forward")}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-full"
            title="Move backward"
            disabled={structureLocked}
            onClick={() => moveElementLayer(selected.id, "backward")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-full"
            title="Send to back"
            disabled={structureLocked}
            onClick={() => moveElementLayer(selected.id, "back")}
          >
            <SendToBack className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Corner radius</label>
        <Slider
          value={[selected.radius]}
          max={80}
          min={0}
          step={1}
          onValueChange={([v]) => updateElement(selected.id, { radius: v })}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Caption</label>
        <Input
          value={selected.caption ?? ""}
          onChange={(e) => updateElement(selected.id, { caption: e.target.value })}
          placeholder="Add a caption…"
        />
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="font-medium text-xs">Opacity</label>
          <span className="text-[10px] tabular-nums font-semibold">
            {Math.round((selected.opacity ?? 1) * 100)}%
          </span>
        </div>
        <Slider
          value={[selected.opacity ?? 1]}
          max={1}
          min={0}
          step={0.01}
          onValueChange={([v]) => updateElement(selected.id, { opacity: v })}
        />
      </div>
      <div className="border-t pt-3 mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Image Eraser
          </span>
          <Button
            size="sm"
            variant={isEraserMode ? "default" : "outline"}
            className="h-8 gap-1.5 text-xs font-semibold"
            disabled={!selected.imageId}
            onClick={() => setIsEraserMode(!isEraserMode)}
            title="Erase only inside the selected photo frame"
          >
            <Eraser className="h-3.5 w-3.5" />
            {isEraserMode ? "On" : "Erase"}
          </Button>
        </div>
        {isEraserMode && selected.imageId && (
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">Brush Size</span>
              <span className="text-[10px] tabular-nums font-semibold">{eraserBrushSize}px</span>
            </div>
            <Slider
              value={[eraserBrushSize]}
              max={90}
              min={8}
              step={1}
              onValueChange={([v]) => setEraserBrushSize(v)}
            />
          </div>
        )}
        {selected.eraseMask && (
          <Button
            variant="outline"
            className="h-8 w-full gap-1.5 text-xs font-semibold"
            onClick={() => updateElement(selected.id, { eraseMask: undefined })}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Erased Areas
          </Button>
        )}
      </div>
      <div className="border-t pt-3 mt-3 space-y-3">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Crop & Adjust Image
        </span>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">Zoom / Scale</span>
            <span className="text-[10px] tabular-nums font-semibold">
              {Math.round((selected.imageScale ?? 1) * 100)}%
            </span>
          </div>
          <Slider
            value={[selected.imageScale ?? 1]}
            max={4}
            min={selected.freePhoto ? 0.1 : 1}
            step={0.05}
            onValueChange={([v]) => updateElement(selected.id, { imageScale: v })}
          />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-[11px] font-medium text-muted-foreground">Image Rotation</span>
            <span className="text-[10px] tabular-nums font-semibold">
              {Math.round(selected.imageRotation ?? 0)} deg
            </span>
          </div>
          <Slider
            value={[selected.imageRotation ?? 0]}
            max={180}
            min={-180}
            step={1}
            onValueChange={([v]) => updateElement(selected.id, { imageRotation: v })}
          />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">Horizontal Offset</span>
            <span className="text-[10px] tabular-nums font-semibold">{selected.imageX ?? 0}px</span>
          </div>
          <Slider
            value={[selected.imageX ?? 0]}
            max={400}
            min={-400}
            step={1}
            onValueChange={([v]) => updateElement(selected.id, { imageX: v })}
          />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">Vertical Offset</span>
            <span className="text-[10px] tabular-nums font-semibold">{selected.imageY ?? 0}px</span>
          </div>
          <Slider
            value={[selected.imageY ?? 0]}
            max={400}
            min={-400}
            step={1}
            onValueChange={([v]) => updateElement(selected.id, { imageY: v })}
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Photo Filters
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px] font-semibold"
            onClick={() => updateElement(selected.id, resetPhotoEditsPatch())}
          >
            Reset all
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {PHOTO_FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`h-9 rounded-md border px-1 text-[10px] font-semibold transition hover:border-accent hover:bg-accent/5 ${
                (selected.imageFilterPreset ?? "original") === preset.id
                  ? "border-accent bg-accent/10 text-accent-foreground"
                  : "border-border"
              }`}
              onClick={() =>
                updateElement(selected.id, {
                  ...preset.patch,
                  imageFilterPreset: preset.id,
                })
              }
            >
              {preset.label}
            </button>
          ))}
        </div>

        {[
          {
            label: "Brightness",
            value: selected.imageBrightness ?? PHOTO_FILTER_DEFAULTS.imageBrightness,
            min: 0.4,
            max: 1.6,
            step: 0.02,
            key: "imageBrightness" as const,
            display: (value: number) => `${Math.round(value * 100)}%`,
          },
          {
            label: "Contrast",
            value: selected.imageContrast ?? PHOTO_FILTER_DEFAULTS.imageContrast,
            min: 0.4,
            max: 1.8,
            step: 0.02,
            key: "imageContrast" as const,
            display: (value: number) => `${Math.round(value * 100)}%`,
          },
          {
            label: "Saturation",
            value: selected.imageSaturation ?? PHOTO_FILTER_DEFAULTS.imageSaturation,
            min: 0,
            max: 2,
            step: 0.02,
            key: "imageSaturation" as const,
            display: (value: number) => `${Math.round(value * 100)}%`,
          },
          {
            label: "Grayscale",
            value: selected.imageGrayscale ?? PHOTO_FILTER_DEFAULTS.imageGrayscale,
            min: 0,
            max: 1,
            step: 0.02,
            key: "imageGrayscale" as const,
            display: (value: number) => `${Math.round(value * 100)}%`,
          },
          {
            label: "Warmth",
            value: selected.imageSepia ?? PHOTO_FILTER_DEFAULTS.imageSepia,
            min: 0,
            max: 0.7,
            step: 0.01,
            key: "imageSepia" as const,
            display: (value: number) => `${Math.round(value * 100)}%`,
          },
          {
            label: "Soft blur",
            value: selected.imageBlur ?? PHOTO_FILTER_DEFAULTS.imageBlur,
            min: 0,
            max: 6,
            step: 0.1,
            key: "imageBlur" as const,
            display: (value: number) => `${value.toFixed(1)}px`,
          },
        ].map((control) => (
          <div key={control.key}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-medium text-muted-foreground">{control.label}</span>
              <span className="tabular-nums text-[10px] font-semibold">
                {control.display(control.value)}
              </span>
            </div>
            <Slider
              value={[control.value]}
              min={control.min}
              max={control.max}
              step={control.step}
              onValueChange={([value]) => setFilterValue({ [control.key]: value })}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center border-t pt-3 mt-3">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground self-start mb-2">
          Fine Tune Pan (D-pad)
        </span>
        <div className="grid grid-cols-3 gap-1.5 w-28">
          <div />
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 hover:bg-muted"
            title="Pan Up (5px)"
            onClick={() => {
              const currentY = selected.imageY ?? 0;
              updateElement(selected.id, { imageY: Math.max(-400, currentY - 5) });
            }}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <div />

          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 hover:bg-muted"
            title="Pan Left (5px)"
            onClick={() => {
              const currentX = selected.imageX ?? 0;
              updateElement(selected.id, { imageX: Math.max(-400, currentX - 5) });
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center text-[10px] font-bold text-muted-foreground/60 select-none">
            Pan
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 hover:bg-muted"
            title="Pan Right (5px)"
            onClick={() => {
              const currentX = selected.imageX ?? 0;
              updateElement(selected.id, { imageX: Math.min(400, currentX + 5) });
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div />
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 hover:bg-muted"
            title="Pan Down (5px)"
            onClick={() => {
              const currentY = selected.imageY ?? 0;
              updateElement(selected.id, { imageY: Math.min(400, currentY + 5) });
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <div />
        </div>
      </div>

      {selected.frame && selected.frame !== "none" && (
        <div className="border-t pt-3 mt-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Frame Color</span>
            <div className="flex items-center gap-1.5" title="Custom frame color picker">
              <span className="text-[10px] font-medium text-accent">Custom Color</span>
              <div className="relative h-5 w-5 rounded-full border border-border overflow-hidden hover:scale-110 cursor-pointer flex items-center justify-center">
                <input
                  type="color"
                  value={selected.frameColor || "#FFFFFF"}
                  onChange={(e) => updateElement(selected.id, { frameColor: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                />
                <div
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: selected.frameColor || "#FFFFFF" }}
                />
              </div>
              <Input
                type="text"
                value={selected.frameColor || ""}
                placeholder="#HEX"
                onChange={(e) => updateElement(selected.id, { frameColor: e.target.value })}
                className="h-6 w-16 text-[10px] px-1 py-0.5 rounded text-center uppercase font-mono border"
              />
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {[
              { label: "White", value: "#FFFFFF" },
              { label: "Black", value: "#111111" },
              { label: "Gold", value: "#C9A84C" },
              { label: "Vintage Cream", value: "#efe3c8" },
              { label: "Sage Green", value: "#8E9B85" },
              { label: "Slate Blue", value: "#B8C6D8" },
              { label: "Terracotta", value: "#D9A08B" },
              { label: "Navy", value: "#2C3E50" },
              { label: "Warm Charcoal", value: "#34495E" },
              { label: "Dusty Rose", value: "#E4C5C4" },
              { label: "Linen", value: "#f2e6cf" },
              { label: "Stamp Brown", value: "#b98152" },
            ].map((col) => (
              <button
                key={col.value}
                onClick={() => updateElement(selected.id, { frameColor: col.value })}
                className={`h-6 w-full rounded-md border shadow-sm transition hover:scale-110 hover:border-accent ${
                  (selected.frameColor || "#FFFFFF").toLowerCase() === col.value.toLowerCase()
                    ? "border-accent ring-1 ring-accent"
                    : "border-border"
                }`}
                style={{ backgroundColor: col.value }}
                title={col.label}
              />
            ))}
          </div>
        </div>
      )}

      {selected.imageId && (
        <div className="border-t pt-3 mt-3 space-y-2">
          <Button
            variant="destructive"
            className="w-full h-8 text-xs font-semibold gap-1.5"
            onClick={() => useBookStore.getState().clearPhotoImage(selected.id)}
          >
            <ImageMinus className="h-3.5 w-3.5" />
            Clear Image from Frame
          </Button>
        </div>
      )}
    </div>
  );
}

function LayoutThumb({ id }: { id: string }) {
  const box = "absolute rounded-sm bg-charcoal/70";
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-cream">
      {id === "full" && <div className={`${box} inset-1.5`} />}
      {id === "polaroid1" && (
        <div className={`${box} left-1/4 top-[8%] bottom-[25%] right-1/4 border-2 border-white`} />
      )}
      {id === "center1" && <div className={`${box} inset-4`} />}
      {id === "editorial1" && <div className={`${box} bottom-1.5 left-1.5 top-1.5 w-[42%]`} />}
      {id === "cleanHero" && <div className={`${box} inset-3 border-2 border-white/80`} />}

      {id === "split2" && (
        <>
          <div className={`${box} bottom-1.5 left-1.5 top-1.5 w-[46%]`} />
          <div className={`${box} bottom-1.5 right-1.5 top-1.5 w-[46%]`} />
        </>
      )}
      {id === "vertical2" && (
        <>
          <div className={`${box} left-1.5 right-1.5 top-1.5 h-[42%]`} />
          <div className={`${box} bottom-1.5 left-1.5 right-1.5 h-[42%]`} />
        </>
      )}
      {id === "overlapping2" && (
        <>
          <div className={`${box} left-2 top-3 h-[60%] w-[38%] rotate-[-6deg]`} />
          <div className={`${box} right-2 top-2 h-[60%] w-[38%] rotate-[8deg]`} />
        </>
      )}
      {id === "editorial2" && (
        <>
          <div className={`${box} left-1.5 top-1.5 bottom-1.5 w-[38%]`} />
          <div className={`${box} right-1.5 top-3 bottom-3 w-[46%]`} />
        </>
      )}
      {id === "minimalPairs" && (
        <>
          <div className={`${box} bottom-3 left-2 top-3 w-[42%]`} />
          <div className={`${box} bottom-3 right-2 top-3 w-[42%]`} />
        </>
      )}
      {id === "asymmetric2" && (
        <>
          <div className={`${box} left-1.5 top-2 h-[52%] w-[54%]`} />
          <div className={`${box} right-1.5 bottom-2 h-[58%] w-[32%] border border-white/60`} />
        </>
      )}
      {id === "diagonal2" && (
        <>
          <div className={`${box} left-2 top-2 h-[42%] w-[42%]`} />
          <div className={`${box} right-2 bottom-2 h-[42%] w-[42%]`} />
        </>
      )}

      {id === "collage3" && (
        <>
          <div className={`${box} bottom-1.5 left-1.5 top-1.5 w-[58%]`} />
          <div className={`${box} right-1.5 top-1.5 h-[46%] w-[36%]`} />
          <div className={`${box} bottom-1.5 right-1.5 h-[46%] w-[36%]`} />
        </>
      )}
      {id === "strip3" && (
        <>
          <div className={`${box} left-1.5 top-1.5 bottom-1.5 w-[28%]`} />
          <div className={`${box} left-[36%] top-1.5 bottom-1.5 w-[28%]`} />
          <div className={`${box} right-1.5 top-1.5 bottom-1.5 w-[28%]`} />
        </>
      )}
      {id === "horizontal3" && (
        <>
          <div className={`${box} left-1.5 right-1.5 top-1.5 h-[26%]`} />
          <div className={`${box} left-1.5 right-1.5 top-[37%] h-[26%]`} />
          <div className={`${box} left-1.5 right-1.5 bottom-1.5 h-[26%]`} />
        </>
      )}
      {id === "overlapping3" && (
        <>
          <div className={`${box} left-2 top-[25%] h-[50%] w-[30%] rotate-[-12deg]`} />
          <div className={`${box} right-2 top-[25%] h-[50%] w-[30%] rotate-[10deg]`} />
          <div
            className={`${box} left-1/2 top-1/2 h-[55%] w-[32%] -translate-x-1/2 -translate-y-1/2 rotate-[-2deg]`}
          />
        </>
      )}
      {id === "storyStack" && (
        <>
          <div className={`${box} bottom-1.5 left-1.5 top-1.5 w-[52%]`} />
          <div className={`${box} right-1.5 top-1.5 h-[43%] w-[36%]`} />
          <div className={`${box} bottom-1.5 right-1.5 h-[43%] w-[36%]`} />
        </>
      )}
      {id === "triptych3" && (
        <>
          <div className={`${box} left-1.5 top-4 bottom-4 w-[28%]`} />
          <div className={`${box} left-[36%] top-2 bottom-2 w-[28%]`} />
          <div className={`${box} right-1.5 top-4 bottom-4 w-[28%]`} />
        </>
      )}
      {id === "scatter3" && (
        <>
          <div
            className={`${box} left-1 top-4 h-[48%] w-[28%] rotate-[-8deg] border border-white/60`}
          />
          <div
            className={`${box} right-1 bottom-4 h-[48%] w-[28%] rotate-[6deg] border border-white/60`}
          />
          <div
            className={`${box} left-[36%] top-3 h-[52%] w-[28%] rotate-[-3deg] border border-white/60`}
          />
        </>
      )}
      {id === "fullHero3" && (
        <>
          <div className={`${box} left-1 top-1 bottom-1 w-[56%]`} />
          <div className={`${box} right-1 top-1 h-[45%] w-[40%]`} />
          <div className={`${box} right-1 bottom-1 h-[45%] w-[40%]`} />
        </>
      )}

      {id === "grid4" && (
        <>
          <div className={`${box} left-1.5 top-1.5 h-[46%] w-[46%]`} />
          <div className={`${box} right-1.5 top-1.5 h-[46%] w-[46%]`} />
          <div className={`${box} bottom-1.5 left-1.5 h-[46%] w-[46%]`} />
          <div className={`${box} bottom-1.5 right-1.5 h-[46%] w-[46%]`} />
        </>
      )}
      {id === "filmstrip" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`${box} top-[25%] h-[50%] w-[20%]`}
              style={{ left: `${4 + i * 23}%` }}
            />
          ))}
        </>
      )}
      {id === "editorial4" && (
        <>
          <div className={`${box} left-1.5 top-1.5 bottom-1.5 w-[50%]`} />
          <div className={`${box} right-1.5 top-1.5 h-[26%] w-[38%]`} />
          <div className={`${box} right-1.5 top-[37%] h-[26%] w-[38%]`} />
          <div className={`${box} right-1.5 bottom-1.5 h-[26%] w-[38%]`} />
        </>
      )}
      {id === "overlapping4" && (
        <>
          <div className={`${box} left-2 top-2 h-[40%] w-[30%] rotate-[-6deg]`} />
          <div className={`${box} right-2 top-2 h-[40%] w-[30%] rotate-[8deg]`} />
          <div className={`${box} left-3 bottom-2 h-[40%] w-[30%] rotate-[4deg]`} />
          <div className={`${box} right-3 bottom-2 h-[40%] w-[30%] rotate-[-5deg]`} />
        </>
      )}
      {id === "travelPostcards" && (
        <>
          <div className={`${box} left-2 top-2 h-[40%] w-[42%] rotate-[-2deg]`} />
          <div className={`${box} right-2 top-2 h-[40%] w-[42%] rotate-[2deg]`} />
          <div className={`${box} bottom-2 left-2 h-[40%] w-[42%] rotate-[2deg]`} />
          <div className={`${box} bottom-2 right-2 h-[40%] w-[42%] rotate-[-2deg]`} />
        </>
      )}
      {id === "mosaic4" && (
        <>
          <div className={`${box} left-1.5 top-1.5 h-[46%] w-[42%]`} />
          <div className={`${box} right-1.5 top-1.5 h-[36%] w-[46%]`} />
          <div className={`${box} left-1.5 bottom-1.5 h-[38%] w-[46%]`} />
          <div className={`${box} right-1.5 bottom-1.5 h-[48%] w-[42%]`} />
        </>
      )}
      {id === "stripes4" && (
        <>
          <div className={`${box} left-1.5 top-1.5 bottom-1.5 w-[20%]`} />
          <div className={`${box} left-[26%] top-1.5 bottom-1.5 w-[20%]`} />
          <div className={`${box} left-[51%] top-1.5 bottom-1.5 w-[20%]`} />
          <div className={`${box} right-1.5 top-1.5 bottom-1.5 w-[20%]`} />
        </>
      )}
      {id === "fullGrid4" && (
        <>
          <div className={`${box} left-1 top-1 h-[45%] w-[47%]`} />
          <div className={`${box} right-1 top-1 h-[45%] w-[47%]`} />
          <div className={`${box} left-1 bottom-1 h-[45%] w-[47%]`} />
          <div className={`${box} right-1 bottom-1 h-[45%] w-[47%]`} />
        </>
      )}

      {id === "collage5" && (
        <>
          <div
            className={`${box} left-1/2 top-1/2 h-[46%] w-[36%] -translate-x-1/2 -translate-y-1/2`}
          />
          <div className={`${box} left-1.5 top-1.5 h-[26%] w-[26%]`} />
          <div className={`${box} right-1.5 top-1.5 h-[26%] w-[26%]`} />
          <div className={`${box} left-1.5 bottom-1.5 h-[26%] w-[26%]`} />
          <div className={`${box} right-1.5 bottom-1.5 h-[26%] w-[26%]`} />
        </>
      )}
      {id === "grid5" && (
        <>
          <div className={`${box} left-1.5 top-1.5 h-[40%] w-[28%]`} />
          <div className={`${box} left-[36%] top-1.5 h-[40%] w-[28%]`} />
          <div className={`${box} right-1.5 top-1.5 h-[40%] w-[28%]`} />
          <div className={`${box} left-[8%] bottom-1.5 h-[40%] w-[38%]`} />
          <div className={`${box} right-[8%] bottom-1.5 h-[40%] w-[38%]`} />
        </>
      )}
      {id === "overlapping5" && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`${box} top-1/3 h-[45%] w-[16%]`}
              style={{ left: `${3 + i * 20}%`, transform: `rotate(${(i - 2) * 6}deg)` }}
            />
          ))}
        </>
      )}
      {id === "polaroidWall" && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`${box} h-[34%] w-[23%] border-2 border-white`}
              style={{
                left: `${7 + (i % 3) * 30}%`,
                top: `${i < 3 ? 12 : 54}%`,
                transform: `rotate(${(i - 2) * 4}deg)`,
              }}
            />
          ))}
        </>
      )}
      {id === "fullSplit5" && (
        <>
          <div className={`${box} left-1 top-1 h-[45%] w-[47%]`} />
          <div className={`${box} right-1 top-1 h-[45%] w-[47%]`} />
          <div className={`${box} left-1 bottom-1 h-[45%] w-[30%]`} />
          <div className={`${box} left-[35%] bottom-1 h-[45%] w-[30%]`} />
          <div className={`${box} right-1 bottom-1 h-[45%] w-[30%]`} />
        </>
      )}

      {id === "magazine" && (
        <>
          <div className={`${box} left-1.5 right-1.5 top-1.5 h-[60%]`} />
          <div className={`${box} bottom-1.5 left-1.5 h-[28%] w-[30%]`} />
          <div className={`${box} bottom-1.5 left-1/2 h-[28%] w-[30%] -translate-x-1/2`} />
          <div className={`${box} bottom-1.5 right-1.5 h-[28%] w-[30%]`} />
        </>
      )}
      {id === "scrapbook" && (
        <>
          <div className={`${box} left-[8%] top-[10%] h-[40%] w-[34%] rotate-[-8deg]`} />
          <div className={`${box} right-[8%] top-[14%] h-[36%] w-[30%] rotate-[6deg]`} />
          <div className={`${box} bottom-[10%] left-[14%] h-[36%] w-[28%] rotate-[5deg]`} />
          <div className={`${box} bottom-[12%] right-[12%] h-[32%] w-[26%] rotate-[-6deg]`} />
        </>
      )}
      {id === "mosaic6" && (
        <>
          <div className={`${box} left-1.5 top-1.5 h-[26%] w-[44%]`} />
          <div className={`${box} left-1.5 top-[37%] h-[26%] w-[44%]`} />
          <div className={`${box} left-1.5 bottom-1.5 h-[26%] w-[44%]`} />
          <div className={`${box} right-1.5 top-1.5 h-[42%] w-[44%]`} />
          <div className={`${box} right-1.5 bottom-1.5 h-[42%] w-[44%]`} />
          <div
            className={`${box} left-[28%] top-[35%] h-[30%] w-[44%] rotate-[3deg] border-2 border-white`}
          />
        </>
      )}
      {id === "mosaic8" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`${box} top-1.5 h-[42%] w-[20%]`}
              style={{ left: `${2 + i * 24}%` }}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`${box} bottom-1.5 h-[42%] w-[20%]`}
              style={{ left: `${2 + i * 24}%` }}
            />
          ))}
        </>
      )}
      {id === "canvaGrid" && (
        <>
          <div className={`${box} bottom-1.5 left-1.5 top-1.5 w-[48%]`} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`${box} h-[25%] w-[18%]`}
              style={{ left: `${55 + (i % 2) * 21}%`, top: `${6 + Math.floor(i / 2) * 31}%` }}
            />
          ))}
        </>
      )}
      {id === "passportGrid" && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`${box} h-[38%] w-[28%] border border-white/80`}
              style={{ left: `${3 + (i % 3) * 32}%`, top: `${8 + Math.floor(i / 3) * 46}%` }}
            />
          ))}
        </>
      )}
    </div>
  );
}

function TextControls({
  selected,
  updateElement,
  moveElementLayer,
}: {
  selected: QuoteElement | TextElement;
  updateElement: (id: string, p: Partial<PageElement>) => void;
  moveElementLayer: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
}) {
  const markerFont = '"Permanent Marker", cursive';
  const colorInputValue = (value?: string, fallback = "#37322d") =>
    value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const fonts = [
    { label: "Modern Sans", value: "var(--font-sans)" },
    { label: "Classic Serif", value: '"Playfair Display", serif' },
    { label: "Elegant Cursive", value: '"Dancing Script", cursive' },
    { label: "Playful Writing", value: '"Caveat", cursive' },
    { label: "Decorative Serif", value: '"Cinzel", serif' },
    { label: "Fancy Script", value: '"Sacramento", cursive' },
    { label: "Marker Pen", value: markerFont },
  ];

  const stylePresets = [
    {
      label: "Clean",
      patch: {
        fontFamily: "var(--font-sans)",
        fontWeight: "normal",
        fontStyle: "normal",
        letterSpacing: 0,
        lineHeight: 1.18,
        textCurve: "none",
        backgroundColor: undefined,
        strokeWidth: 0,
        shadowColor: undefined,
      },
    },
    {
      label: "Marker",
      patch: {
        fontFamily: markerFont,
        fontWeight: "normal",
        fontStyle: "normal",
        letterSpacing: 0,
        lineHeight: 1,
        textCurve: "none",
        shadowColor: "rgba(0,0,0,.18)",
        shadowBlur: 2,
        shadowX: 1,
        shadowY: 2,
      },
    },
    {
      label: "Signature",
      patch: {
        fontFamily: '"Sacramento", cursive',
        fontWeight: "normal",
        fontStyle: "normal",
        fontSize: Math.max(selected.fontSize, 46),
        lineHeight: 0.95,
        textCurve: "none",
      },
    },
    {
      label: "Serif",
      patch: {
        fontFamily: '"Playfair Display", serif',
        fontWeight: "600",
        fontStyle: "normal",
        letterSpacing: 0,
        textCurve: "none",
      },
    },
    {
      label: "Typewriter",
      patch: {
        fontFamily: '"Courier New", monospace',
        fontWeight: "normal",
        fontStyle: "normal",
        letterSpacing: 1,
        lineHeight: 1.25,
        textCurve: "none",
      },
    },
    {
      label: "Label",
      patch: {
        fontFamily: "var(--font-sans)",
        fontWeight: "bold",
        fontStyle: "normal",
        textTransform: "uppercase",
        textCurve: "none",
        letterSpacing: 2,
        backgroundColor: "#ffffff",
        backgroundOpacity: 0.82,
        padding: 12,
      },
    },
  ] as const;

  const colors = [
    { label: "Charcoal", value: "oklch(0.22 0.012 50)" },
    { label: "Muted Gold", value: "oklch(0.72 0.12 75)" },
    { label: "Terracotta", value: "oklch(0.55 0.14 35)" },
    { label: "Forest Green", value: "oklch(0.45 0.12 140)" },
    { label: "Steel Blue", value: "oklch(0.48 0.10 240)" },
    { label: "Crimson", value: "oklch(0.50 0.18 20)" },
    { label: "Muted Plum", value: "oklch(0.40 0.10 320)" },
    { label: "Cream / Sand", value: "oklch(0.85 0.03 85)" },
    { label: "Chocolate", value: "oklch(0.32 0.06 45)" },
  ];

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium">Text Content</label>
        <textarea
          value={selected.text}
          onChange={(e) => updateElement(selected.id, { text: e.target.value })}
          className="w-full min-h-[60px] rounded-lg border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-accent"
          placeholder="Enter text..."
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Quick Styles</label>
        <div className="grid grid-cols-2 gap-1.5">
          {stylePresets.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant="outline"
              className="h-8 justify-start text-xs"
              onClick={() => updateElement(selected.id, preset.patch as Partial<PageElement>)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Font Family</label>
        <div className="grid grid-cols-2 gap-1">
          {fonts.map((f) => (
            <button
              key={f.value}
              onClick={() => updateElement(selected.id, { fontFamily: f.value })}
              className={`rounded border px-2 py-1.5 text-left text-[10px] font-medium transition hover:border-accent ${
                (selected.fontFamily ||
                  (selected.type === "quote"
                    ? '"Playfair Display", serif'
                    : "var(--font-sans)")) === f.value
                  ? "border-accent bg-accent/5"
                  : "bg-background"
              }`}
              style={{ fontFamily: f.value }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Font Size</label>
        <div className="flex items-center gap-2">
          <Slider
            value={[selected.fontSize]}
            max={120}
            min={12}
            step={1}
            onValueChange={([v]) => updateElement(selected.id, { fontSize: v })}
            className="flex-1"
          />
          <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
            {selected.fontSize}px
          </span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="block text-xs font-medium">Text Color</label>
          <input
            type="color"
            value={colorInputValue(selected.color)}
            onChange={(e) => updateElement(selected.id, { color: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded-md border bg-background p-0"
            title="Pick a custom text color"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => updateElement(selected.id, { color: c.value })}
              className={`h-6 w-6 rounded-full border transition hover:scale-110 ${
                (selected.color || "oklch(0.22 0.012 50)") === c.value
                  ? "ring-2 ring-accent ring-offset-1 border-transparent"
                  : "border-border"
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Line Height</label>
        <div className="flex items-center gap-2">
          <Slider
            value={[selected.lineHeight ?? 1.18]}
            max={2}
            min={0.8}
            step={0.02}
            onValueChange={([v]) => updateElement(selected.id, { lineHeight: v })}
            className="flex-1"
          />
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
            {(selected.lineHeight ?? 1.18).toFixed(2)}
          </span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Letter Spacing</label>
        <div className="flex items-center gap-2">
          <Slider
            value={[selected.letterSpacing ?? 0]}
            max={12}
            min={-1}
            step={0.5}
            onValueChange={([v]) => updateElement(selected.id, { letterSpacing: v })}
            className="flex-1"
          />
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
            {selected.letterSpacing ?? 0}px
          </span>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Formatting</label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selected.fontWeight === "bold" ? "default" : "outline"}
            className="h-8 flex-1 text-xs"
            onClick={() =>
              updateElement(selected.id, {
                fontWeight: selected.fontWeight === "bold" ? "normal" : "bold",
              })
            }
          >
            Bold
          </Button>
          <Button
            size="sm"
            variant={selected.fontStyle === "italic" ? "default" : "outline"}
            className="h-8 flex-1 text-xs"
            onClick={() =>
              updateElement(selected.id, {
                fontStyle: selected.fontStyle === "italic" ? "normal" : "italic",
              })
            }
          >
            Italic
          </Button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Transform</label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["none", "uppercase", "lowercase", "capitalize"] as const).map((transform) => (
            <Button
              key={transform}
              size="sm"
              variant={(selected.textTransform ?? "none") === transform ? "default" : "outline"}
              className="h-8 px-1 text-[10px]"
              onClick={() => updateElement(selected.id, { textTransform: transform })}
            >
              {transform === "none"
                ? "Aa"
                : transform === "uppercase"
                  ? "AA"
                  : transform === "lowercase"
                    ? "aa"
                    : "Title"}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Text Curve</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "None", value: "none" },
            { label: "Arc up", value: "arcUp" },
            { label: "Arc down", value: "arcDown" },
            { label: "Wave", value: "wave" },
          ].map((curve) => (
            <Button
              key={curve.value}
              size="sm"
              variant={(selected.textCurve ?? "none") === curve.value ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() =>
                updateElement(selected.id, {
                  textCurve: curve.value as QuoteElement["textCurve"],
                })
              }
            >
              {curve.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-muted/25 p-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium">Text Background</label>
          <input
            type="color"
            value={colorInputValue(selected.backgroundColor, "#ffffff")}
            onChange={(e) => updateElement(selected.id, { backgroundColor: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded-md border bg-background p-0"
          />
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={selected.backgroundColor ? "default" : "outline"}
            className="h-7 flex-1 text-[10px]"
            onClick={() =>
              updateElement(selected.id, {
                backgroundColor: selected.backgroundColor ? undefined : "#ffffff",
                backgroundOpacity: selected.backgroundOpacity ?? 0.82,
                padding: selected.padding ?? 12,
              })
            }
          >
            {selected.backgroundColor ? "On" : "Off"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-[10px]"
            onClick={() =>
              updateElement(selected.id, {
                backgroundColor: undefined,
                strokeWidth: 0,
                shadowColor: undefined,
              })
            }
          >
            Clear FX
          </Button>
        </div>
        {selected.backgroundColor && (
          <>
            <div>
              <div className="mb-1 flex justify-between text-[10px]">
                <span>Opacity</span>
                <span>{Math.round((selected.backgroundOpacity ?? 0.82) * 100)}%</span>
              </div>
              <Slider
                value={[selected.backgroundOpacity ?? 0.82]}
                min={0.05}
                max={1}
                step={0.05}
                onValueChange={([v]) => updateElement(selected.id, { backgroundOpacity: v })}
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px]">
                <span>Padding</span>
                <span>{selected.padding ?? 12}px</span>
              </div>
              <Slider
                value={[selected.padding ?? 12]}
                min={0}
                max={36}
                step={1}
                onValueChange={([v]) => updateElement(selected.id, { padding: v })}
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant={selected.strokeWidth ? "default" : "outline"}
          className="h-8 text-xs"
          onClick={() =>
            updateElement(selected.id, {
              strokeColor: selected.strokeColor || "#ffffff",
              strokeWidth: selected.strokeWidth ? 0 : 1,
            })
          }
        >
          Outline
        </Button>
        <Button
          size="sm"
          variant={selected.shadowColor ? "default" : "outline"}
          className="h-8 text-xs"
          onClick={() =>
            updateElement(selected.id, {
              shadowColor: selected.shadowColor ? undefined : "rgba(0,0,0,.28)",
              shadowBlur: selected.shadowBlur ?? 8,
              shadowX: selected.shadowX ?? 0,
              shadowY: selected.shadowY ?? 3,
            })
          }
        >
          Shadow
        </Button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Alignment</label>
        <div className="flex gap-1.5">
          {(["left", "center", "right"] as const).map((align) => {
            const Icon =
              align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            const active = (selected.align || "center") === align;
            return (
              <Button
                key={align}
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-8 flex-1"
                onClick={() => updateElement(selected.id, { align })}
                title={`Align ${align}`}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Layer & Depth</label>
        <div className="grid grid-cols-4 gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-full"
            title="Bring to front"
            onClick={() => moveElementLayer(selected.id, "front")}
          >
            <BringToFront className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-full"
            title="Move forward"
            onClick={() => moveElementLayer(selected.id, "forward")}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-full"
            title="Move backward"
            onClick={() => moveElementLayer(selected.id, "backward")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-full"
            title="Send to back"
            onClick={() => moveElementLayer(selected.id, "back")}
          >
            <SendToBack className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
