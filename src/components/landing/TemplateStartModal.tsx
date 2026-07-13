import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Check, LayoutGrid, Sparkles } from "lucide-react";
import { toast } from "sonner";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: SavedPageTemplate[];
  initialCategory?: string | null;
}) {
  const router = useRouter();
  const initAdminTemplates = useBookStore((s) => s.initAdminTemplates);
  const addPage = useBookStore((s) => s.addPage);
  const resetBook = useBookStore((s) => s.resetBook);
  const applyPageTemplate = useBookStore((s) => s.applyPageTemplate);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isStarting, setIsStarting] = useState(false);
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
  const filteredTemplates = useMemo(
    () =>
      activeCategory === "All"
        ? templates
        : templates.filter(
            (template) => normalizeTemplateCategory(template.category) === activeCategory,
          ),
    [activeCategory, templates],
  );

  const startWithTemplate = async () => {
    if (selectedTemplateIds.length === 0) return;
    setIsStarting(true);
    try {
      resetBook();
      const selectedTemplates = selectedTemplateIds
        .map((id) => templates.find((template) => template.id === id))
        .filter((template): template is SavedPageTemplate => Boolean(template));
      for (let index = 0; index < selectedTemplates.length; index += 1) {
        const template = selectedTemplates[index];
        if (index > 0) addPage();
        await applyPageTemplate(template);
      }
      onOpenChange(false);
      await router.navigate({ to: "/editor" });
    } catch (error) {
      console.error(error);
      toast.error("Could not start with this template");
    } finally {
      setIsStarting(false);
    }
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
            Pick one or more templates from a category, then open them in the editor.
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
                    className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                    style={{
                      borderColor: activeCategory === category ? "rgb(59 130 246)" : "rgb(226 232 240)",
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
                  return (
                    <button
                      key={template.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedTemplateIds((current) =>
                          current.includes(template.id)
                            ? current.filter((id) => id !== template.id)
                            : [...current, template.id],
                        );
                      }}
                      className={`group relative aspect-square overflow-hidden rounded-xl bg-slate-100 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                        isSelected
                          ? "-translate-y-0.5 ring-2 ring-blue-500 shadow-lg"
                          : "ring-1 ring-black/[0.06] shadow-sm hover:shadow-lg"
                      }`}
                    >
                      <TemplatePreview
                        template={template}
                        className="absolute inset-0 transition-transform duration-[600ms] ease-out group-hover:scale-[1.08]"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2.5 pb-2 pt-7">
                        <span className="block truncate text-left text-[11px] font-semibold text-white/95">
                          {template.label}
                        </span>
                      </div>
                      <span
                        className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border text-white shadow-sm transition-all duration-300 ${
                          isSelected
                            ? "scale-100 border-blue-300 bg-blue-500 opacity-100"
                            : "scale-90 border-white/70 bg-white/85 text-transparent opacity-0 group-hover:opacity-100 group-hover:text-black/40"
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected ? (
                          <span className="text-xs font-bold tabular-nums">{selectedIndex + 1}</span>
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </button>
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
              onClick={startWithTemplate}
              disabled={selectedTemplateIds.length === 0 || isStarting}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              {isStarting ? "Starting..." : "Start in Editor"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
