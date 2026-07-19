import { useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useBookStore } from "@/lib/photobook/store";
import { useAuthStore } from "@/lib/auth";
import { FIXED_PAGE_SIZE_ID, PAGE_SIZES, type SavedPageTemplate } from "@/lib/photobook/types";
import {
  normalizeTemplateCategory,
  TEMPLATE_CATEGORIES,
} from "@/lib/photobook/template-categories";
import { appendAdminTemplateChecked, uploadTemplateAsset } from "@/lib/api/templates.functions";
import { TemplatePreview } from "../photobook/TemplatePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

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

const MAX_TEMPLATE_ASSET_DATA_URL_LENGTH = 800_000;

type ImportProgress = {
  open: boolean;
  running: boolean;
  phase: string;
  detail: string;
  totalPages: number;
  convertedPages: number;
  uploadedAssets: number;
  savedTemplates: number;
  failedTemplates: number;
  errors: string[];
};

const emptyImportProgress: ImportProgress = {
  open: false,
  running: false,
  phase: "Waiting",
  detail: "",
  totalPages: 0,
  convertedPages: 0,
  uploadedAssets: 0,
  savedTemplates: 0,
  failedTemplates: 0,
  errors: [],
};

const templateAssetKey = (kind: string, id: string) => `${kind}:${id}`;

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const compressTemplateAssetDataUrl = async (
  dataUrl: string,
  kind: "background" | "sticker" | "overlay",
) => {
  if (dataUrl.length <= MAX_TEMPLATE_ASSET_DATA_URL_LENGTH) return dataUrl;
  if (typeof window === "undefined") return dataUrl;
  if (dataUrl.startsWith("data:image/svg+xml")) return dataUrl;

  const blob = await dataUrlToBlob(dataUrl);
  const img = new window.Image();
  const objectUrl = URL.createObjectURL(blob);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = objectUrl;
    });

    const maxDim = kind === "sticker" ? 900 : 1400;
    const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * ratio));
    const height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0, width, height);

    if (kind === "sticker" || kind === "overlay") {
      if (kind === "overlay") {
        const png = canvas.toDataURL("image/png");
        if (png.length <= MAX_TEMPLATE_ASSET_DATA_URL_LENGTH) {
          canvas.width = 1;
          canvas.height = 1;
          return png;
        }
      }

      let quality = kind === "overlay" ? 0.95 : 0.86;
      let compressed = canvas.toDataURL("image/webp", quality);
      while (compressed.length > MAX_TEMPLATE_ASSET_DATA_URL_LENGTH && quality > 0.5) {
        quality -= 0.08;
        compressed = canvas.toDataURL("image/webp", quality);
      }

      if (compressed.length > MAX_TEMPLATE_ASSET_DATA_URL_LENGTH) {
        const fallbackBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", 0.5),
        );
        compressed = fallbackBlob ? await readBlobAsDataUrl(fallbackBlob) : compressed;
      }

      canvas.width = 1;
      canvas.height = 1;
      return compressed;
    }

    let quality = 0.76;
    let compressed = canvas.toDataURL("image/jpeg", quality);

    while (compressed.length > MAX_TEMPLATE_ASSET_DATA_URL_LENGTH && quality > 0.45) {
      quality -= 0.08;
      compressed = canvas.toDataURL("image/jpeg", quality);
    }

    if (compressed.length > MAX_TEMPLATE_ASSET_DATA_URL_LENGTH) {
      const fallbackBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.42),
      );
      compressed = fallbackBlob ? await readBlobAsDataUrl(fallbackBlob) : compressed;
    }

    canvas.width = 1;
    canvas.height = 1;
    return compressed;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const uploadCachedTemplateAsset = async (
  cache: Map<string, Promise<string>>,
  kind: "background" | "sticker" | "overlay",
  asset: { id: string; name: string; base64: string },
  onUploaded?: () => void,
) => {
  const key = templateAssetKey(kind, asset.id);
  const existing = cache.get(key);
  if (existing) return existing;

  const uploadPromise = uploadTemplateAsset({
    data: {
      kind,
      name: asset.name,
      dataUrl: await compressTemplateAssetDataUrl(asset.base64, kind),
    },
  }).then((result) => {
    onUploaded?.();
    return result.url;
  });

  cache.set(key, uploadPromise);
  return uploadPromise;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const errorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return typeof error === "string" ? error : "Unknown error";
};

const saveTemplateWithVerification = async (
  template: SavedPageTemplate,
  index: number,
  total: number,
  updateProgress: (patch: Partial<ImportProgress>) => void,
) => {
  let lastError = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    updateProgress({
      phase: "Saving templates",
      detail: `Saving template ${index} of ${total}: ${template.label}${attempt > 1 ? ` (retry ${attempt})` : ""}`,
    });

    try {
      const result = await appendAdminTemplateChecked({ data: { template } });
      if (result.success && result.verified) {
        return result;
      }
      lastError = result.error || "Template was not verified after save.";
    } catch (error) {
      lastError = errorMessage(error);
    }

    if (attempt < 3) {
      updateProgress({
        phase: "Waiting to retry",
        detail: `Template ${index} was not verified. Waiting before retry...`,
      });
      await wait(900 * attempt);
    }
  }

  throw new Error(lastError || "Template could not be saved after retries.");
};

const currentPageWidth = PAGE_SIZES[0].width;
const currentPageHeight = PAGE_SIZES[0].height;

const getLegacyPageSize = (projectData: any) => {
  const width =
    typeof projectData?.book?.pageWidth === "number"
      ? projectData.book.pageWidth
      : typeof projectData?.pageWidth === "number"
        ? projectData.pageWidth
        : undefined;
  const height =
    typeof projectData?.book?.pageHeight === "number"
      ? projectData.book.pageHeight
      : typeof projectData?.pageHeight === "number"
        ? projectData.pageHeight
        : undefined;
  return { width, height };
};

const normalizeImportedElements = (elements: any[], projectData: any) => {
  const maxRight = elements.reduce(
    (max, el) => Math.max(max, Number(el.x || 0) + Number(el.w || 0)),
    0,
  );
  const maxBottom = elements.reduce(
    (max, el) => Math.max(max, Number(el.y || 0) + Number(el.h || 0)),
    0,
  );
  const legacySize = getLegacyPageSize(projectData);
  const sourceWidth =
    legacySize.width && legacySize.width > 0
      ? legacySize.width
      : Math.max(currentPageWidth, maxRight);
  const sourceHeight =
    legacySize.height && legacySize.height > 0
      ? legacySize.height
      : Math.max(currentPageHeight, maxBottom);

  if (sourceWidth <= currentPageWidth * 1.05 && sourceHeight <= currentPageHeight * 1.05) {
    return elements;
  }

  const scaleX = currentPageWidth / sourceWidth;
  const scaleY = currentPageHeight / sourceHeight;

  return elements.map((el) => ({
    ...el,
    x: Math.round(Number(el.x || 0) * scaleX),
    y: Math.round(Number(el.y || 0) * scaleY),
    w: Math.max(1, Math.round(Number(el.w || 1) * scaleX)),
    h: Math.max(1, Math.round(Number(el.h || 1) * scaleY)),
    fontSize:
      typeof el.fontSize === "number"
        ? Math.max(6, Math.round(el.fontSize * Math.min(scaleX, scaleY)))
        : el.fontSize,
  }));
};

interface ConvertProjectDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function ConvertProjectDialog({ open, onOpenChange }: ConvertProjectDialogProps) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<string>("General Mag");
  const [frameLocked, setFrameLocked] = useState(true);
  const [backgroundLocked, setBackgroundLocked] = useState(true);
  const [importProgress, setImportProgress] = useState<ImportProgress>(emptyImportProgress);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initAdminTemplates = useBookStore((s) => s.initAdminTemplates);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const progressBase = {
      ...emptyImportProgress,
      open: true,
      running: true,
      phase: "Reading files",
      totalPages: 0,
    };
    setImportProgress(progressBase);

    const updateProgress = (patch: Partial<ImportProgress>) => {
      setImportProgress((current) => ({ ...current, ...patch }));
    };

    try {
      const parsedProjects: { file: File; projectData: any; pages: any[] }[] = [];
      for (const file of files) {
        updateProgress({ phase: "Reading files", detail: file.name });
        const text = await file.text();
        const projectData = JSON.parse(text);
        const pages = projectData?.book?.pages;
        if (!Array.isArray(pages) || pages.length === 0) {
          throw new Error(`Invalid project: ${file.name}`);
        }
        parsedProjects.push({ file, projectData, pages });
        updateProgress({
          totalPages: parsedProjects.reduce((total, item) => total + item.pages.length, 0),
        });
      }

      const templates: SavedPageTemplate[] = [];
      let failedTemplates = 0;

      for (const { file, projectData, pages } of parsedProjects) {
        const assetUploadCache = new Map<string, Promise<string>>();

        for (let i = 0; i < pages.length; i += 1) {
          const page = pages[i];
          const tmplLabel = label.trim()
            ? files.length > 1 || pages.length > 1
              ? `${label.trim()} - Page ${i + 1}`
              : label.trim()
            : `${file.name.replace(/\.[^.]+$/, "")} - Page ${i + 1}`;

          try {
            updateProgress({
              phase: "Uploading assets",
              detail: `${file.name} - page ${i + 1} of ${pages.length}`,
            });

            let background = safeBackground(page.background);

            if (!background.startsWith("#")) {
              const bg = findAssetDataUrl(projectData.customBackgrounds, background);
              if (bg) {
                try {
                  background = await uploadCachedTemplateAsset(
                    assetUploadCache,
                    "background",
                    bg,
                    () => {
                      setImportProgress((current) => ({
                        ...current,
                        uploadedAssets: current.uploadedAssets + 1,
                      }));
                    },
                  );
                } catch (error) {
                  throw new Error(
                    `${file.name} page ${i + 1}: background upload failed (${errorMessage(error)})`,
                  );
                }
              }
            }

            const elements = [];
            const normalizedSourceElements = normalizeImportedElements(
              safeElements(page.elements),
              projectData,
            );
            for (const el of normalizedSourceElements) {
              if (el.type === "photo") {
                const photoEl = { ...el };
                for (const maskKey of ["magicMask", "eraseMask"] as const) {
                  if (!isDataUrl(photoEl[maskKey])) continue;
                  try {
                    photoEl[maskKey] = await uploadCachedTemplateAsset(
                      assetUploadCache,
                      "overlay",
                      {
                        id: `${el.id}_${maskKey}`,
                        name: maskKey,
                        base64: photoEl[maskKey],
                      },
                      () => {
                        setImportProgress((current) => ({
                          ...current,
                          uploadedAssets: current.uploadedAssets + 1,
                        }));
                      },
                    );
                  } catch (error) {
                    throw new Error(
                      `${file.name} page ${i + 1}: ${maskKey} upload failed (${errorMessage(error)})`,
                    );
                  }
                }
                elements.push(photoEl);
                continue;
              }

              if (el.type !== "sticker") {
                elements.push(el);
                continue;
              }

              if (isDataUrl(el.src)) {
                try {
                  const src = await uploadCachedTemplateAsset(
                    assetUploadCache,
                    "sticker",
                    {
                      id: el.id,
                      name: "sticker",
                      base64: el.src,
                    },
                    () => {
                      setImportProgress((current) => ({
                        ...current,
                        uploadedAssets: current.uploadedAssets + 1,
                      }));
                    },
                  );
                  elements.push({ ...el, src });
                  continue;
                } catch (error) {
                  throw new Error(
                    `${file.name} page ${i + 1}: sticker upload failed (${errorMessage(error)})`,
                  );
                }
              }

              const sticker = findAssetDataUrl(projectData.customStickers, el.stickerId);
              if (!sticker) {
                elements.push(el);
                continue;
              }
              try {
                const src = await uploadCachedTemplateAsset(
                  assetUploadCache,
                  "sticker",
                  sticker,
                  () => {
                    setImportProgress((current) => ({
                      ...current,
                      uploadedAssets: current.uploadedAssets + 1,
                    }));
                  },
                );
                elements.push({ ...el, src });
              } catch (error) {
                throw new Error(
                  `${file.name} page ${i + 1}: sticker upload failed (${errorMessage(error)})`,
                );
              }
            }

            let eraserOverlay: string | undefined;
            if (isDataUrl(page.eraserOverlay)) {
              try {
                eraserOverlay = await uploadCachedTemplateAsset(
                  assetUploadCache,
                  "overlay",
                  {
                    id: `overlay_${page.id ?? i}`,
                    name: "overlay",
                    base64: page.eraserOverlay,
                  },
                  () => {
                    setImportProgress((current) => ({
                      ...current,
                      uploadedAssets: current.uploadedAssets + 1,
                    }));
                  },
                );
              } catch (error) {
                throw new Error(
                  `${file.name} page ${i + 1}: overlay upload failed (${errorMessage(error)})`,
                );
              }
            }

            templates.push({
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
              category: normalizeTemplateCategory(category),
              frameLocked,
              backgroundLocked,
              isAdminTemplate: true,
              sortOrder: Date.now() + templates.length,
            } satisfies SavedPageTemplate);

            setImportProgress((current) => ({
              ...current,
              convertedPages: current.convertedPages + 1,
            }));
          } catch (error) {
            failedTemplates += 1;
            const message = `${tmplLabel}: ${errorMessage(error)}`;
            setImportProgress((current) => ({
              ...current,
              failedTemplates,
              phase: "Skipped template",
              detail: message,
              errors: [...current.errors, message],
            }));
          }
        }
      }

      let savedTemplates = 0;
      for (let index = 0; index < templates.length; index += 1) {
        const template = templates[index];
        try {
          await saveTemplateWithVerification(template, index + 1, templates.length, updateProgress);
          savedTemplates += 1;
          setImportProgress((current) => ({
            ...current,
            savedTemplates,
            phase: "Template saved",
            detail: `Template ${index + 1} of ${templates.length} saved: ${template.label}`,
          }));
        } catch (error) {
          failedTemplates += 1;
          const message = `${template.label}: ${errorMessage(error)}`;
          setImportProgress((current) => ({
            ...current,
            failedTemplates,
            phase: "Template failed",
            detail: message,
            errors: [...current.errors, message],
          }));
        }
      }

      updateProgress({ phase: "Refreshing admin list", detail: "Loading saved templates" });
      await initAdminTemplates();
      const totalTemplates = parsedProjects.reduce((total, item) => total + item.pages.length, 0);

      setImportProgress((current) => ({
        ...current,
        running: false,
        phase: failedTemplates > 0 ? "Completed with issues" : "Completed",
        detail: `${savedTemplates} of ${totalTemplates} template${totalTemplates === 1 ? "" : "s"} saved${failedTemplates > 0 ? `, ${failedTemplates} failed.` : "."}`,
      }));
      if (savedTemplates > 0 && failedTemplates > 0) {
        toast.warning(
          `${savedTemplates} template${savedTemplates === 1 ? "" : "s"} saved, ${failedTemplates} failed.`,
        );
      } else if (savedTemplates > 0) {
        toast.success(
          `${savedTemplates} template${savedTemplates === 1 ? "" : "s"} added successfully!`,
        );
      } else {
        toast.error("No templates were saved. Check the import details.");
      }
      setLabel("");
    } catch (error) {
      const message = (error as Error).message || "Unknown import error";
      setImportProgress((current) => ({
        ...current,
        running: false,
        phase: "Stopped",
        detail: message,
        errors: [...current.errors, message],
      }));
      toast.error(`Template import stopped: ${message}`);
    } finally {
      e.target.value = "";
    }
  };

  const totalProgressUnits = Math.max(importProgress.totalPages * 2, 1);
  const completedProgressUnits =
    importProgress.convertedPages +
    importProgress.savedTemplates +
    importProgress.failedTemplates * 2;
  const progressPercent = Math.min(
    100,
    Math.round((completedProgressUnits / totalProgressUnits) * 100),
  );

  return (
    <Dialog
      open={open || importProgress.open}
      onOpenChange={(nextOpen) => {
        if (importProgress.running) return;
        if (!nextOpen) setImportProgress(emptyImportProgress);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-500" />
            Convert Project(s) to Templates
          </DialogTitle>
          <DialogDescription>
            Upload one or more .wanderbook project files. Each page will become a separate admin
            template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {importProgress.open && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{importProgress.phase}</p>
                  {importProgress.detail && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {importProgress.detail}
                    </p>
                  )}
                </div>
                <Badge variant={importProgress.errors.length > 0 ? "destructive" : "secondary"}>
                  {progressPercent}%
                </Badge>
              </div>
              <Progress value={progressPercent} />
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                <span>
                  {importProgress.convertedPages}/{importProgress.totalPages} pages
                </span>
                <span>{importProgress.uploadedAssets} assets</span>
                <span>{importProgress.savedTemplates} saved</span>
                <span>{importProgress.failedTemplates} failed</span>
              </div>
              {importProgress.errors.length > 0 && (
                <div className="mt-2 space-y-1 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {importProgress.errors.slice(-3).map((message, index) => (
                    <div key={`${index}-${message}`}>{message}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Template Label (optional)</Label>
            <Input
              placeholder="Leave blank to use filename"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={importProgress.running}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={importProgress.running}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={frameLocked}
                onChange={(e) => setFrameLocked(e.target.checked)}
                className="rounded"
                disabled={importProgress.running}
              />
              Lock frames
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={backgroundLocked}
                onChange={(e) => setBackgroundLocked(e.target.checked)}
                className="rounded"
                disabled={importProgress.running}
              />
              Lock background
            </label>
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={importProgress.running}
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
  const updateAdminTemplate = useBookStore((s) => s.updateAdminTemplate);
  const [label, setLabel] = useState(template?.label ?? "");
  const [category, setCategory] = useState<string>(normalizeTemplateCategory(template?.category));
  const [frameLocked, setFrameLocked] = useState(template?.frameLocked ?? true);
  const [backgroundLocked, setBackgroundLocked] = useState(template?.backgroundLocked ?? true);

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
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Save Changes
            </Button>
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
          <Button
            onClick={handleCreateFolder}
            disabled={busy || !newFolderName.trim()}
            className="gap-1.5"
          >
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
  const deleteAdminTemplates = useBookStore((s) => s.deleteAdminTemplates);
  const reorderAdminTemplates = useBookStore((s) => s.reorderAdminTemplates);
  const addAdminTemplate = useBookStore((s) => s.addAdminTemplate);
  const savePageAsTemplate = useBookStore((s) => s.savePageAsTemplate);
  const currentPageId = useBookStore((s) => s.currentPageId);
  const assetsLoaded = useBookStore((s) => s.adminAssetsLoaded);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [showConvert, setShowConvert] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SavedPageTemplate | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [isDeletingTemplates, setIsDeletingTemplates] = useState(false);
  const [templatePage, setTemplatePage] = useState(0);

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

  if (!assetsLoaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-md border bg-card shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </span>
          <p className="mt-4 text-sm font-semibold">Loading admin workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Preparing templates, stickers, and backgrounds...
          </p>
        </div>
      </div>
    );
  }

  const allCategories = ["All", ...TEMPLATE_CATEGORIES];

  const filteredTemplates =
    activeCategory === "All"
      ? adminTemplates
      : adminTemplates.filter((t) => normalizeTemplateCategory(t.category) === activeCategory);

  const sortedTemplates = [...filteredTemplates].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const templatesPerPage = 24;
  const templatePageCount = Math.max(1, Math.ceil(sortedTemplates.length / templatesPerPage));
  const safeTemplatePage = Math.min(templatePage, templatePageCount - 1);
  const pagedTemplates = sortedTemplates.slice(
    safeTemplatePage * templatesPerPage,
    (safeTemplatePage + 1) * templatesPerPage,
  );
  const visibleTemplateIds = pagedTemplates.map((template) => template.id);
  const selectedVisibleCount = visibleTemplateIds.filter((id) =>
    selectedTemplateIds.has(id),
  ).length;
  const allVisibleSelected =
    visibleTemplateIds.length > 0 && selectedVisibleCount === visibleTemplateIds.length;

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleVisibleSelection = () => {
    setSelectedTemplateIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleTemplateIds.forEach((id) => next.delete(id));
      } else {
        visibleTemplateIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const deleteSelectedTemplates = async () => {
    const ids = Array.from(selectedTemplateIds);
    if (ids.length === 0) return;
    if (
      !confirm(`Delete ${ids.length} selected template${ids.length === 1 ? "" : "s"} permanently?`)
    ) {
      return;
    }
    setIsDeletingTemplates(true);
    try {
      await deleteAdminTemplates(ids);
      setSelectedTemplateIds(new Set());
      toast.success(`Deleted ${ids.length} template${ids.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete selected templates");
    } finally {
      setIsDeletingTemplates(false);
    }
  };

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
    <div className="flex min-h-screen flex-col bg-background sm:h-screen sm:min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/editor"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Back to editor"
            title="Back to editor"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-amber-500 text-white shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">Admin workspace</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Templates, stickers, and backgrounds
            </p>
          </div>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={() => setShowConvert(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Import photobook</span>
          <span className="sm:hidden">Import</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 border-b px-3 py-2 sm:px-4 md:grid-cols-4">
        {[
          {
            label: "Admin Templates",
            value: adminTemplates.length,
            icon: <LayoutGrid className="h-4 w-4" />,
            color: "text-amber-600",
          },
          {
            label: "User Templates",
            value: customTemplates.length,
            icon: <Tag className="h-4 w-4" />,
            color: "text-blue-600",
          },
          {
            label: "Global Stickers",
            value: adminStickerFolders.reduce((sum, folder) => sum + folder.stickers.length, 0),
            icon: <LayoutGrid className="h-4 w-4" />,
            color: "text-pink-600",
          },
          {
            label: "Global BGs",
            value: adminBackgrounds.length,
            icon: <FileCheck className="h-4 w-4" />,
            color: "text-green-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/20 px-2.5 py-2"
          >
            <div
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-md bg-background ${stat.color}`}
            >
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none">{stat.value}</p>
              <span className="block truncate text-[10px] font-semibold text-muted-foreground sm:text-xs">
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="admin-templates" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-3 mt-3 h-auto w-[calc(100%-1.5rem)] justify-start overflow-x-auto p-1 sm:mx-4 sm:w-[calc(100%-2rem)]">
          <TabsTrigger value="admin-templates">Admin Templates</TabsTrigger>
          <TabsTrigger value="user-templates">User Templates</TabsTrigger>
          <TabsTrigger value="global-stickers">Global Stickers</TabsTrigger>
          <TabsTrigger value="global-backgrounds">Global BGs</TabsTrigger>
        </TabsList>

        {/* ─── Admin Templates tab ─── */}
        <TabsContent value="admin-templates" className="flex flex-col flex-1 min-h-0 mt-4">
          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 sm:px-4">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setTemplatePage(0);
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
                {cat !== "All" && (
                  <span className="ml-1.5 opacity-60">
                    (
                    {
                      adminTemplates.filter((t) => normalizeTemplateCategory(t.category) === cat)
                        .length
                    }
                    )
                  </span>
                )}
              </button>
            ))}
          </div>

          {sortedTemplates.length > 0 && (
            <div className="mx-3 mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-2.5 py-2 sm:mx-4">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={toggleVisibleSelection}
                  disabled={isDeletingTemplates}
                >
                  {allVisibleSelected ? "Clear visible" : "Select visible"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedTemplateIds.size} selected
                </span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 gap-1.5 text-xs"
                onClick={deleteSelectedTemplates}
                disabled={selectedTemplateIds.size === 0 || isDeletingTemplates}
              >
                {isDeletingTemplates ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete selected
              </Button>
            </div>
          )}

          {/* Template list */}
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2 sm:px-4">
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
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {pagedTemplates.map((tmpl, idx) => {
                    const globalIndex = safeTemplatePage * templatesPerPage + idx;
                    return (
                      <div
                        key={tmpl.id}
                        className={`group relative flex min-w-0 flex-col gap-2 rounded-md border bg-card p-2 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          selectedTemplateIds.has(tmpl.id)
                            ? "border-primary ring-2 ring-primary/20"
                            : "hover:border-primary/50"
                        }`}
                      >
                        <label className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md border bg-background/95 shadow-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedTemplateIds.has(tmpl.id)}
                            onChange={() => toggleTemplateSelection(tmpl.id)}
                            aria-label={`Select ${tmpl.label || "untitled template"}`}
                          />
                        </label>
                        {/* Thumbnail or placeholder */}
                        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-md border bg-muted">
                          <TemplatePreview template={tmpl} />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{tmpl.label}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {tmpl.category && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {normalizeTemplateCategory(tmpl.category)}
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
                        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md border bg-background/95 p-1 opacity-100 shadow-sm backdrop-blur-sm transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveTemplate(tmpl.id, "up")}
                            disabled={globalIndex === 0}
                            title="Move template earlier"
                            aria-label={`Move ${tmpl.label || "template"} earlier`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveTemplate(tmpl.id, "down")}
                            disabled={globalIndex === sortedTemplates.length - 1}
                            title="Move template later"
                            aria-label={`Move ${tmpl.label || "template"} later`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <div className="w-px h-4 bg-border mx-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingTemplate(tmpl)}
                            title="Edit template details"
                            aria-label={`Edit ${tmpl.label || "template"} details`}
                          >
                            <Tag className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              if (!confirm(`Delete "${tmpl.label}" permanently?`)) return;
                              setSelectedTemplateIds((current) => {
                                const next = new Set(current);
                                next.delete(tmpl.id);
                                return next;
                              });
                              try {
                                await deleteAdminTemplate(tmpl.id);
                                toast.success("Template deleted");
                              } catch (error) {
                                toast.error(
                                  (error as Error).message || "Failed to delete template",
                                );
                              }
                            }}
                            title="Delete template"
                            aria-label={`Delete ${tmpl.label || "template"}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {templatePageCount > 1 && (
                  <div className="sticky bottom-0 mt-3 flex items-center justify-between gap-3 rounded-md border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
                    <span className="text-xs font-medium text-muted-foreground">
                      Page {safeTemplatePage + 1} of {templatePageCount} · {sortedTemplates.length}{" "}
                      templates
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={safeTemplatePage === 0}
                        onClick={() => setTemplatePage((page) => Math.max(0, page - 1))}
                        title="Previous template page"
                        aria-label="Previous template page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={safeTemplatePage >= templatePageCount - 1}
                        onClick={() =>
                          setTemplatePage((page) => Math.min(templatePageCount - 1, page + 1))
                        }
                        title="Next template page"
                        aria-label="Next template page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
      <EditTemplateDialog template={editingTemplate} onClose={() => setEditingTemplate(null)} />
    </div>
  );
}
