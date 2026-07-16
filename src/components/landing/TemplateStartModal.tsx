import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Heart, ImagePlus, LayoutGrid, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplatePreview } from "@/components/photobook/TemplatePreview";
import { useBookStore } from "@/lib/photobook/store";
import {
  normalizeTemplateCategory,
  TEMPLATE_CATEGORIES,
} from "@/lib/photobook/template-categories";
import type { SavedPageTemplate } from "@/lib/photobook/types";

export function TemplateStartModal({
  open,
  onOpenChange,
  templates,
  initialCategory,
  onProceed,
  likeCounts = {},
  likedTemplateIds = [],
  onToggleLike,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: SavedPageTemplate[];
  initialCategory?: string | null;
  onProceed: (templates: SavedPageTemplate[]) => void;
  likeCounts?: Record<string, number>;
  likedTemplateIds?: string[];
  onToggleLike?: (templateId: string) => void;
}) {
  const initAdminTemplates = useBookStore((s) => s.initAdminTemplates);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  useEffect(() => {
    if (!open || templates.length > 0) return;
    setIsLoadingTemplates(true);
    initAdminTemplates().finally(() => setIsLoadingTemplates(false));
  }, [initAdminTemplates, open, templates.length]);

  useEffect(() => {
    if (!open) {
      setSelectedTemplateIds([]);
      setActiveCategory("All");
      return;
    }
    setActiveCategory(initialCategory ? normalizeTemplateCategory(initialCategory) : "All");
  }, [initialCategory, open]);

  const categories = useMemo(
    () =>
      TEMPLATE_CATEGORIES.filter((category) =>
        templates.some((template) => normalizeTemplateCategory(template.category) === category),
      ),
    [templates],
  );
  const filteredTemplates = useMemo(() => {
    const filtered =
      activeCategory === "All"
        ? templates
        : templates.filter(
            (template) => normalizeTemplateCategory(template.category) === activeCategory,
          );
    return filtered
      .slice()
      .sort(
        (a, b) =>
          (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0) ||
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );
  }, [activeCategory, likeCounts, templates]);

  const continueWithTemplates = () => {
    if (selectedTemplateIds.length === 0) return;
    const selectedTemplates = selectedTemplateIds
      .map((id) => templates.find((template) => template.id === id))
      .filter((template): template is SavedPageTemplate => Boolean(template));
    onProceed(selectedTemplates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-blue-500" />
            Choose Template Bucket
          </DialogTitle>
          <DialogDescription>
            Pick one or more templates from a category, then add your photos.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
          {isLoadingTemplates ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-500">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
              <p className="font-medium">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-500">
              <Sparkles className="mb-4 h-10 w-10 opacity-30" />
              <p className="font-medium">No templates are available yet.</p>
            </div>
          ) : (
            <div className="space-y-5 pb-4">
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {["All", ...categories].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                    style={{
                      borderColor:
                        activeCategory === category ? "rgb(59 130 246)" : "rgb(226 232 240)",
                      background: activeCategory === category ? "rgb(59 130 246)" : "white",
                      color: activeCategory === category ? "white" : "rgb(51 65 85)",
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredTemplates.map((template) => {
                  const selectedIndex = selectedTemplateIds.indexOf(template.id);
                  const isSelected = selectedIndex >= 0;
                  const liked = likedTemplateIds.includes(template.id);
                  const likeCount = likeCounts[template.id] ?? 0;
                  return (
                    <div
                      key={template.id}
                      className={`group relative aspect-square overflow-hidden border-2 bg-slate-100 transition duration-300 hover:z-10 hover:-translate-y-1 hover:scale-[1.03] ${
                        isSelected
                          ? "border-emerald-500 shadow-[0_16px_34px_-20px_rgba(5,150,105,.85)]"
                          : "border-transparent shadow-sm hover:border-slate-300 hover:shadow-xl"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateIds((current) =>
                            current.includes(template.id)
                              ? current.filter((id) => id !== template.id)
                              : [...current, template.id],
                          );
                        }}
                        className="absolute inset-0 h-full w-full"
                        aria-label={`${isSelected ? "Remove" : "Add"} ${template.label}`}
                      >
                        <TemplatePreview
                          template={template}
                          showSamplePhotos
                          className="transition duration-500 group-hover:scale-[1.04]"
                        />
                        <span className="absolute left-2 top-2 grid h-7 min-w-7 place-items-center rounded-full border border-white/70 bg-black/45 px-1 text-white shadow backdrop-blur-sm">
                          {isSelected ? (
                            <span className="text-xs font-bold">{selectedIndex + 1}</span>
                          ) : (
                            <Square className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </button>
                      <button
                        type="button"
                        title={liked ? "Unlike template" : "Like template"}
                        aria-pressed={liked}
                        aria-label={`${liked ? "Unlike" : "Like"} ${template.label || "template"}; ${likeCount} likes`}
                        onClick={() => onToggleLike?.(template.id)}
                        className={`absolute bottom-2 right-2 z-10 inline-flex h-8 items-center gap-1 rounded-full border px-2 text-[10px] font-bold shadow-lg backdrop-blur-md transition hover:scale-105 ${
                          liked
                            ? "border-rose-300 bg-rose-500 text-white"
                            : "border-white/70 bg-white/90 text-slate-700"
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                        {likeCount}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="min-w-0 truncate text-sm text-slate-500">
            {selectedTemplateIds.length === 0
              ? "Select one or more templates"
              : `${selectedTemplateIds.length} template${selectedTemplateIds.length === 1 ? "" : "s"} selected in order`}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={continueWithTemplates}
              disabled={selectedTemplateIds.length === 0}
              className="gap-2"
            >
              <ImagePlus className="h-4 w-4" />
              Add photos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
