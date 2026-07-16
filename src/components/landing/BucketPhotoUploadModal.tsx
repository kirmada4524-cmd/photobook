import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBookStore } from "@/lib/photobook/store";
import type { SavedPageTemplate } from "@/lib/photobook/types";

type BuildPhase = "idle" | "resetting" | "uploading" | "building" | "filling";

const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export function BucketPhotoUploadModal({
  open,
  onOpenChange,
  templates,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: SavedPageTemplate[];
  onFinished?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resetBook = useBookStore((state) => state.resetBook);
  const addImagesFromFiles = useBookStore((state) => state.addImagesFromFiles);
  const addPage = useBookStore((state) => state.addPage);
  const applyPageTemplate = useBookStore((state) => state.applyPageTemplate);
  const magicFillAllEmptyFrames = useBookStore((state) => state.magicFillAllEmptyFrames);
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [isDragging, setIsDragging] = useState(false);

  const previews = useMemo(
    () => files.map((file) => ({ key: fileKey(file), file, src: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.src));
    },
    [previews],
  );

  useEffect(() => {
    if (open) return;
    setFiles([]);
    setPhase("idle");
    setIsDragging(false);
  }, [open]);

  const photoSlots = useMemo(
    () =>
      templates.reduce(
        (count, template) =>
          count + template.elements.filter((element) => element.type === "photo").length,
        0,
      ),
    [templates],
  );

  const addFiles = (incoming: FileList | File[]) => {
    const images = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      toast.error("Choose JPG, PNG, WebP, GIF, or another image file.");
      return;
    }

    setFiles((current) => {
      const known = new Set(current.map(fileKey));
      const next = [...current];
      for (const file of images) {
        const key = fileKey(file);
        if (!known.has(key)) {
          next.push(file);
          known.add(key);
        }
      }
      return next.slice(0, 120);
    });
  };

  const buildBook = async () => {
    if (templates.length === 0 || files.length === 0 || phase !== "idle") return;

    try {
      setPhase("resetting");
      await resetBook();

      setPhase("uploading");
      await addImagesFromFiles(files);

      setPhase("building");
      for (let index = 0; index < templates.length; index += 1) {
        if (index > 0) addPage();
        await applyPageTemplate(templates[index]);
      }

      setPhase("filling");
      const stats = magicFillAllEmptyFrames();
      onFinished?.();
      onOpenChange(false);
      toast.success(
        stats.framesFilled > 0
          ? `${stats.framesFilled} photo slots filled across ${stats.pagesTouched} pages`
          : `${templates.length} template pages are ready`,
      );
      await router.navigate({ to: "/editor" });
    } catch (error) {
      console.error(error);
      toast.error("Could not prepare this photobook. Your selected files are still here.");
      setPhase("idle");
    }
  };

  const phaseLabel: Record<BuildPhase, string> = {
    idle: "",
    resetting: "Preparing project",
    uploading: "Adding photos",
    building: "Building pages",
    filling: "Magic filling book",
  };
  const isBuilding = phase !== "idle";

  return (
    <Dialog open={open} onOpenChange={(next) => !isBuilding && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-hidden p-0 sm:max-w-4xl">
        <div className="border-b bg-white py-4 pl-4 pr-12 sm:px-6">
          <DialogHeader>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100">
                  <Check className="h-3 w-3" />
                </span>
                Templates
              </span>
              <span className="h-px w-8 bg-slate-200" />
              <span className="inline-flex items-center gap-1.5 text-slate-900">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white">
                  2
                </span>
                Photos
              </span>
              <span className="h-px w-8 bg-slate-200" />
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Editor</span>
              </span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl">Add photos to your book</DialogTitle>
            <DialogDescription>
              {templates.length} {templates.length === 1 ? "page" : "pages"} selected · {photoSlots}{" "}
              {photoSlots === 1 ? "photo slot" : "photo slots"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 overflow-y-auto bg-slate-50/80 px-4 py-4 sm:px-6 sm:py-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={isBuilding}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsDragging(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            className={`group grid min-h-36 w-full place-items-center border-2 border-dashed px-5 py-7 text-center transition sm:min-h-44 ${
              isDragging
                ? "border-rose-500 bg-rose-50 shadow-[inset_0_0_0_4px_rgba(244,63,94,.06)]"
                : "border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-50"
            }`}
          >
            <span>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white shadow-lg transition group-hover:-translate-y-1">
                <UploadCloud className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-bold text-slate-900">
                Drop photos or choose files
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {files.length > 0
                  ? `${files.length} selected · ${Math.max(0, photoSlots - files.length)} slots remaining`
                  : "JPG, PNG, WebP and GIF"}
              </span>
            </span>
          </button>

          {previews.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <ImagePlus className="h-4 w-4" /> {previews.length} photos
                </div>
                <button
                  type="button"
                  disabled={isBuilding}
                  onClick={() => setFiles([])}
                  className="inline-flex h-8 items-center gap-1.5 px-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {previews.map((preview, index) => (
                  <div
                    key={preview.key}
                    className="group relative aspect-square overflow-hidden border border-slate-200 bg-white shadow-sm"
                  >
                    <img
                      src={preview.src}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <span className="absolute bottom-1 left-1 grid h-5 min-w-5 place-items-center rounded-full bg-black/70 px-1 text-[9px] font-bold text-white">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      disabled={isBuilding}
                      title="Remove photo"
                      aria-label={`Remove ${preview.file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((file) => fileKey(file) !== preview.key),
                        )
                      }
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/95 text-slate-800 opacity-0 shadow transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            disabled={isBuilding}
            onClick={() => onOpenChange(false)}
            className="h-10 px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            disabled={files.length === 0 || isBuilding}
            onClick={buildBook}
            className="inline-flex h-11 min-w-44 items-center justify-center gap-2 bg-slate-950 px-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isBuilding ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" /> {phaseLabel[phase]}
              </>
            ) : (
              <>
                Create & Fill Book <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
