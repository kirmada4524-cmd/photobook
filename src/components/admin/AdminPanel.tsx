import { useState, useRef } from "react";
import { useBookStore } from "@/lib/photobook/store";
import { useAuthStore } from "@/lib/auth";
import { FIXED_PAGE_SIZE_ID, PAGE_SIZES, type SavedPageTemplate } from "@/lib/photobook/types";
import { appendAdminTemplates, uploadTemplateAsset } from "@/lib/api/templates.functions";
import { TemplatePreview } from "../photobook/TemplatePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Tag,
  Lock,
  LayoutGrid,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const TEMPLATE_CATEGORIES: string[] = [
  "Cover Page",
  "Back Cover",
  "Birthday",
  "Travel",
  "Common",
];

const filesToPayload = (files: File[]) =>
  Promise.all(
    files.map(
      (file) =>
        new Promise<{ name: string; dataUrl: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );

const isDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:");

const safeBackground = (value: unknown) => (typeof value === "string" && value ? value : "cream");

const safeElements = (elements: unknown) =>
  Array.isArray(elements)
    ? elements
        .filter((el) => el && typeof el === "object" && typeof (el as any).type === "string")
        .map((el) => {
          const next = { ...(el as any) };
          if (next.type === "photo") {
            next.imageId = "";
          }
          return next;
        })
    : [];

const findAssetDataUrl = (assets: unknown, id: unknown) => {
  if (!Array.isArray(assets) || typeof id !== "string") return null;
  const asset = assets.find((item) => item?.id === id);
  const dataUrl = asset?.base64 ?? asset?.src;
  return isDataUrl(dataUrl)
    ? {
        id,
        name: typeof asset.name === "string" ? asset.name : "asset",
        base64: dataUrl,
      }
    : null;
};

const TEMPLATE_IMPORT_BATCH_SIZE = 10;

const templateAssetKey = (kind: string, id: string) => `${kind}:${id}`;

const uploadCachedTemplateAsset = async (
  cache: Map<string, Promise<string>>,
  kind: "background" | "sticker" | "overlay",
  asset: { id: string; name: string; base64: string },
) => {
  const key = templateAssetKey(kind, asset.id);
  const existing = cache.get(key);
  if (existing) return existing;

  const uploadPromise = uploadTemplateAsset({
    data: {
      kind,
      name: asset.name,
      dataUrl: asset.base64,
    },
  }).then((result) => result.url);

  cache.set(key, uploadPromise);
  return uploadPromise;
};

const appendTemplatesInBatches = async (templates: SavedPageTemplate[]) => {
  for (let index = 0; index < templates.length; index += TEMPLATE_IMPORT_BATCH_SIZE) {
    const batch = templates.slice(index, index + TEMPLATE_IMPORT_BATCH_SIZE);
    const result = await appendAdminTemplates({ data: batch });
    if (!result.success) {
      throw new Error(result.error || "Failed to save templates");
    }
  }
};

interface ConvertProjectDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function ConvertProjectDialog({ open, onOpenChange }: ConvertProjectDialogProps) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<string>("Common");
  const [frameLocked, setFrameLocked] = useState(true);
  const [backgroundLocked, setBackgroundLocked] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminTemplates = useBookStore((s) => s.adminTemplates);
  const initAdminTemplates = useBookStore((s) => s.initAdminTemplates);

  const allCategories = Array.from(new Set([
    ...TEMPLATE_CATEGORIES,
    ...adminTemplates.map((t) => t.category).filter(Boolean)
  ])) as string[];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const importPromise = Promise.all(
      files.map(async (file) => {
        const text = await file.text();
        const projectData = JSON.parse(text);
        const pages = projectData?.book?.pages;
        if (!Array.isArray(pages) || pages.length === 0) {
          throw new Error(`Invalid project: ${file.name}`);
        }
        const assetUploadCache = new Map<string, Promise<string>>();

        return Promise.all(pages.map(async (page: any, i: number) => {
          const tmplLabel = label.trim()
            ? files.length > 1 || pages.length > 1
              ? `${label.trim()} - Page ${i + 1}`
              : label.trim()
            : `${file.name.replace(/\.[^.]+$/, "")} - Page ${i + 1}`;

          let background = safeBackground(page.background);

          if (!background.startsWith("#")) {
            const bg = findAssetDataUrl(projectData.customBackgrounds, background);
            if (bg) {
              background = await uploadCachedTemplateAsset(assetUploadCache, "background", bg);
            }
          }

          const elements = await Promise.all(
            safeElements(page.elements).map(async (el: any) => {
              if (el.type !== "sticker") return el;

              if (isDataUrl(el.src)) {
                const src = await uploadCachedTemplateAsset(assetUploadCache, "sticker", {
                  id: el.id,
                  name: "sticker",
                  base64: el.src,
                });
                return { ...el, src };
              }

              const sticker = findAssetDataUrl(projectData.customStickers, el.stickerId);
              if (!sticker) return el;
              const src = await uploadCachedTemplateAsset(assetUploadCache, "sticker", sticker);
              return { ...el, src };
            }),
          );

          const eraserOverlay =
            isDataUrl(page.eraserOverlay)
              ? await uploadCachedTemplateAsset(assetUploadCache, "overlay", {
                  id: `overlay_${page.id ?? i}`,
                  name: "overlay",
                  base64: page.eraserOverlay,
                })
              : undefined;

          return {
            id: `tmpl_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
            label: tmplLabel,
            background,
            border: page.border,
            backgroundMode: page.backgroundMode,
            eraserOverlay,
            elements,
            embeddedAssets: undefined,
            thumbnail: undefined,
            backgroundScale: typeof page.backgroundScale === "number" ? page.backgroundScale : 1,
            backgroundX: typeof page.backgroundX === "number" ? page.backgroundX : 0,
            backgroundY: typeof page.backgroundY === "number" ? page.backgroundY : 0,
            sizeId: FIXED_PAGE_SIZE_ID,
            category: category.trim() || "Common",
            frameLocked,
            backgroundLocked,
            isAdminTemplate: true,
          } satisfies SavedPageTemplate;
        }));
      }),
    ).then((groups) => {
      const templates = groups.flat();
      return appendTemplatesInBatches(templates).then(async () => {
        await initAdminTemplates();
        return templates.length;
      });
    });

    toast.promise(
      importPromise,
      {
        loading: "Converting project(s) to templates...",
        success: (count) => `${count} template${count === 1 ? "" : "s"} added successfully!`,
        error: (err: unknown) => `Failed: ${(err as Error).message}`,
      },
    );

    setLabel("");
    e.target.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-500" />
            Convert Project(s) to Templates
          </DialogTitle>
          <DialogDescription>
            Upload one or more .wanderbook project files. Each page will become a separate admin template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Template Label (optional)</Label>
            <Input
              placeholder="Leave blank to use filename"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="template-categories"
              placeholder="Type or select..."
            />
            <datalist id="template-categories">
              {allCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={frameLocked}
                onChange={(e) => setFrameLocked(e.target.checked)}
                className="rounded"
              />
              Lock frames
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={backgroundLocked}
                onChange={(e) => setBackgroundLocked(e.target.checked)}
                className="rounded"
              />
              Lock background
            </label>
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Select Project File(s)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wanderbook,application/json"
            multiple
            onChange={handleFileChange}
            hidden
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditTemplateDialogProps {
  template: SavedPageTemplate | null;
  onClose: () => void;
}

function EditTemplateDialog({ template, onClose }: EditTemplateDialogProps) {
  const adminTemplates = useBookStore((s) => s.adminTemplates);
  const updateAdminTemplate = useBookStore((s) => s.updateAdminTemplate);
  const [label, setLabel] = useState(template?.label ?? "");
  const [category, setCategory] = useState<string>(template?.category || "Common");
  const [frameLocked, setFrameLocked] = useState(template?.frameLocked ?? true);
  const [backgroundLocked, setBackgroundLocked] = useState(template?.backgroundLocked ?? true);

  const allCategories = Array.from(new Set([
    ...TEMPLATE_CATEGORIES,
    ...adminTemplates.map((t) => t.category).filter(Boolean)
  ])) as string[];

  if (!template) return null;

  const handleSave = () => {
    updateAdminTemplate(template.id, {
      label,
      category,
      sizeId: FIXED_PAGE_SIZE_ID,
      frameLocked,
      backgroundLocked,
    });
    toast.success("Template updated");
    onClose();
  };

  return (
    <Dialog open={!!template} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="template-categories-edit"
              placeholder="Type or select..."
            />
            <datalist id="template-categories-edit">
              {allCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={frameLocked} onChange={(e) => setFrameLocked(e.target.checked)} className="rounded" />
              Lock frames
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={backgroundLocked} onChange={(e) => setBackgroundLocked(e.target.checked)} className="rounded" />
              Lock background
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminStickerFoldersTab() {
  const folders = useBookStore((s) => s.adminStickerFolders ?? []);
  const assetsLoaded = useBookStore((s) => s.adminAssetsLoaded);
  const createFolder = useBookStore((s) => s.createAdminStickerFolder);
  const renameFolder = useBookStore((s) => s.updateAdminStickerFolder);
  const deleteFolder = useBookStore((s) => s.deleteAdminStickerFolder);
  const addStickers = useBookStore((s) => s.addAdminStickersToFolder);
  const deleteSticker = useBookStore((s) => s.deleteAdminSticker);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFolderIdRef = useRef<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createFolder(name);
      setNewFolderName("");
      toast.success("Sticker folder added");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add folder");
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    const folderId = uploadFolderIdRef.current ?? uploadFolderId;
    if (!files || files.length === 0 || !folderId) return;
    setBusy(true);
    try {
      const payload = await filesToPayload(Array.from(files));
      await addStickers(folderId, payload);
      toast.success(`Added ${payload.length} sticker${payload.length === 1 ? "" : "s"}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload stickers");
    } finally {
      setBusy(false);
      uploadFolderIdRef.current = null;
      setUploadFolderId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <TabsContent value="global-stickers" className="flex flex-col flex-1 min-h-0 mt-4">
      <div className="px-6 pb-3">
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3 sm:flex-row">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name, e.g. Birthday, Travel, Cute"
            className="h-9"
          />
          <Button onClick={handleCreateFolder} disabled={busy || !newFolderName.trim()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Folder
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleUpload(e.target.files)}
      />

      <div className="flex-1 overflow-y-auto px-6 py-3">
        {!assetsLoaded ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Loading global stickers...</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No global sticker folders yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Create a folder, then upload multiple stickers into it.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {folders.map((folder) => (
              <div key={folder.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Input
                      defaultValue={folder.name}
                      className="h-8 max-w-xs text-sm font-semibold"
                      onBlur={async (e) => {
                        const name = e.target.value.trim();
                        if (name && name !== folder.name) {
                          try {
                            await renameFolder(folder.id, name);
                            toast.success("Folder renamed");
                          } catch (error) {
                            console.error(error);
                            toast.error("Failed to rename folder");
                          }
                        }
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {folder.stickers.length} sticker{folder.stickers.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={busy}
                      onClick={() => {
                        uploadFolderIdRef.current = folder.id;
                        setUploadFolderId(folder.id);
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Add Stickers
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={busy}
                      onClick={async () => {
                        if (!confirm(`Delete "${folder.name}" and all stickers inside it?`)) return;
                        try {
                          await deleteFolder(folder.id);
                          toast.success("Folder deleted");
                        } catch (error) {
                          console.error(error);
                          toast.error("Failed to delete folder");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {folder.stickers.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                    This folder is empty.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                    {folder.stickers.map((sticker) => (
                      <div
                        key={sticker.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/20 p-2"
                      >
                        <img
                          src={sticker.src}
                          alt={sticker.name}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                        <button
                          className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow group-hover:flex"
                          title="Delete sticker"
                          onClick={async () => {
                            try {
                              await deleteSticker(folder.id, sticker.id);
                              toast.success("Sticker deleted");
                            } catch (error) {
                              console.error(error);
                              toast.error("Failed to delete sticker");
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  );
}

function AdminBackgroundsTab() {
  const backgrounds = useBookStore((s) => s.adminBackgrounds ?? []);
  const assetsLoaded = useBookStore((s) => s.adminAssetsLoaded);
  const addBackgrounds = useBookStore((s) => s.addAdminBackgrounds);
  const deleteBackground = useBookStore((s) => s.deleteAdminBackground);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      const payload = await filesToPayload(Array.from(files));
      await addBackgrounds(payload);
      toast.success(`Added ${payload.length} background${payload.length === 1 ? "" : "s"}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload backgrounds");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <TabsContent value="global-backgrounds" className="flex flex-col flex-1 min-h-0 mt-4">
      <div className="px-6 pb-3">
        <Button
          className="gap-1.5"
          variant="outline"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Upload Global Backgrounds
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3">
        {!assetsLoaded ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Loading global backgrounds...</p>
          </div>
        ) : backgrounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No global backgrounds yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Upload backgrounds here and they will appear in every editor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {backgrounds.map((bg) => (
              <div key={bg.id} className="group relative overflow-hidden rounded-xl border bg-card">
                <div className="aspect-square bg-muted">
                  <img
                    src={bg.src}
                    alt={bg.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{bg.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 hidden h-8 w-8 bg-background/90 text-destructive shadow hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                  onClick={async () => {
                    try {
                      await deleteBackground(bg.id);
                      toast.success("Background deleted");
                    } catch (error) {
                      console.error(error);
                      toast.error("Failed to delete background");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  );
}

export function AdminPanel() {
  const { isAdmin } = useAuthStore();
  const adminTemplates = useBookStore((s) => s.adminTemplates ?? []);
  const customTemplates = useBookStore((s) => s.customTemplates ?? []);
  const savedProjects = useBookStore((s) => s.savedProjects ?? []);
  const adminStickerFolders = useBookStore((s) => s.adminStickerFolders ?? []);
  const adminBackgrounds = useBookStore((s) => s.adminBackgrounds ?? []);
  const deleteAdminTemplate = useBookStore((s) => s.deleteAdminTemplate);
  const reorderAdminTemplates = useBookStore((s) => s.reorderAdminTemplates);
  const addAdminTemplate = useBookStore((s) => s.addAdminTemplate);
  const savePageAsTemplate = useBookStore((s) => s.savePageAsTemplate);
  const currentPageId = useBookStore((s) => s.currentPageId);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [showConvert, setShowConvert] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SavedPageTemplate | null>(null);

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  const allCategories = ["All", ...TEMPLATE_CATEGORIES];

  const filteredTemplates =
    activeCategory === "All"
      ? adminTemplates
      : adminTemplates.filter((t) => t.category === activeCategory);

  const sortedTemplates = [...filteredTemplates].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const moveTemplate = (id: string, dir: "up" | "down") => {
    const idx = sortedTemplates.findIndex((t) => t.id === id);
    if (dir === "up" && idx <= 0) return;
    if (dir === "down" && idx >= sortedTemplates.length - 1) return;
    const newOrder = [...sortedTemplates];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    // Reorder using ALL admin template IDs but preserve category filters
    const allIds = adminTemplates.map((t) => t.id);
    const movedIds = newOrder.map((t) => t.id);
    // Replace positions of filtered items in global order
    let mi = 0;
    const finalIds = allIds.map((id) => {
      if (filteredTemplates.some((t) => t.id === id)) {
        return movedIds[mi++];
      }
      return id;
    });
    reorderAdminTemplates(finalIds);
  };

  const promoteCustomToAdmin = (template: SavedPageTemplate) => {
    addAdminTemplate({
      ...template,
      isAdminTemplate: true,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: `[Admin] ${template.label}`,
      sizeId: FIXED_PAGE_SIZE_ID,
    });
    toast.success("Template promoted to admin template");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Manage templates and platform settings</p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowConvert(true)}
        >
          <Plus className="h-4 w-4" />
          Upload Photobook as Templates
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b lg:grid-cols-4">
        {[
          { label: "Admin Templates", value: adminTemplates.length, icon: <LayoutGrid className="h-4 w-4" />, color: "text-amber-600" },
          { label: "User Templates", value: customTemplates.length, icon: <Tag className="h-4 w-4" />, color: "text-blue-600" },
          {
            label: "Global Stickers",
            value: adminStickerFolders.reduce((sum, folder) => sum + folder.stickers.length, 0),
            icon: <LayoutGrid className="h-4 w-4" />,
            color: "text-pink-600",
          },
          { label: "Global BGs", value: adminBackgrounds.length, icon: <FileCheck className="h-4 w-4" />, color: "text-green-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-muted/30 p-4">
            <div className={`flex items-center gap-2 ${stat.color} mb-1`}>
              {stat.icon}
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="admin-templates" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-6 mt-4 w-fit">
          <TabsTrigger value="admin-templates">Admin Templates</TabsTrigger>
          <TabsTrigger value="user-templates">User Templates</TabsTrigger>
          <TabsTrigger value="global-stickers">Global Stickers</TabsTrigger>
          <TabsTrigger value="global-backgrounds">Global BGs</TabsTrigger>
        </TabsList>

        {/* ─── Admin Templates tab ─── */}
        <TabsContent value="admin-templates" className="flex flex-col flex-1 min-h-0 mt-4">
          {/* Category filter */}
          <div className="flex gap-2 px-6 overflow-x-auto pb-2">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
                {cat !== "All" && (
                  <span className="ml-1.5 opacity-60">
                    ({adminTemplates.filter((t) => t.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
            {sortedTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No admin templates yet.</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Upload project files or convert user templates.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 gap-1.5"
                  onClick={() => setShowConvert(true)}
                >
                  <Upload className="h-4 w-4" />
                  Add from Project File
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedTemplates.map((tmpl, idx) => (
                  <div
                    key={tmpl.id}
                    className="group relative flex flex-col gap-3 rounded-xl border bg-card p-3 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md"
                  >
                  {/* Thumbnail or placeholder */}
                  <div className="relative w-full aspect-square shrink-0 rounded-lg bg-muted border overflow-hidden">
                    <TemplatePreview template={tmpl} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{tmpl.label}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {tmpl.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tmpl.category}
                        </Badge>
                      )}
                      {tmpl.sizeId && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {PAGE_SIZES[0].label}
                        </Badge>
                      )}
                      {(tmpl.frameLocked || tmpl.backgroundLocked) && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                          <Lock className="h-3 w-3" />
                          {[tmpl.frameLocked && "frames", tmpl.backgroundLocked && "bg"]
                            .filter(Boolean)
                            .join("+")}
                        </span>
                      )}
                    </div>
                  </div>
                                {/* Actions (Absolute in grid) */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg shadow-sm border p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveTemplate(tmpl.id, "up")}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveTemplate(tmpl.id, "down")}
                      disabled={idx === sortedTemplates.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingTemplate(tmpl)}
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        deleteAdminTemplate(tmpl.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </TabsContent>

        {/* ─── User Templates tab ─── */}
        <TabsContent value="user-templates" className="flex flex-col flex-1 min-h-0 mt-4">
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
            {customTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Tag className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No user-created templates yet.</p>
              </div>
            ) : (
              customTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 group hover:border-primary/30 transition-colors"
                >
                  <div className="h-12 w-16 shrink-0 rounded-lg bg-muted/50 border overflow-hidden">
                    {tmpl.thumbnail ? (
                      <img src={tmpl.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                        <LayoutGrid className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{tmpl.label}</p>
                    {tmpl.sizeId && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">
                        {PAGE_SIZES[0].label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => promoteCustomToAdmin(tmpl)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Promote
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        <AdminStickerFoldersTab />
        <AdminBackgroundsTab />
      </Tabs>

      {/* Dialogs */}
      <ConvertProjectDialog open={showConvert} onOpenChange={setShowConvert} />
      <EditTemplateDialog
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
      />
    </div>
  );
}
