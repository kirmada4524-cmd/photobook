import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { CheckSquare, LayoutGrid, Sparkles, Square } from "lucide-react";
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
import type { SavedPageTemplate } from "@/lib/photobook/types";

export function TemplateStartModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const adminTemplates = useBookStore((s) => s.adminTemplates);
  const initAdminTemplates = useBookStore((s) => s.initAdminTemplates);
  const addPage = useBookStore((s) => s.addPage);
  const resetBook = useBookStore((s) => s.resetBook);
  const applyPageTemplate = useBookStore((s) => s.applyPageTemplate);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  useEffect(() => {
    if (!open || adminTemplates.length > 0) return;
    setIsLoadingTemplates(true);
    initAdminTemplates().finally(() => setIsLoadingTemplates(false));
  }, [adminTemplates.length, initAdminTemplates, open]);

  useEffect(() => {
    if (open) return;
    setSelectedTemplateIds(new Set());
    setActiveCategory("All");
  }, [open]);

  const categories = useMemo(
    () => Array.from(new Set(adminTemplates.map((template) => template.category || "General"))).sort(),
    [adminTemplates],
  );
  const filteredTemplates = useMemo(
    () =>
      activeCategory === "All"
        ? adminTemplates
        : adminTemplates.filter((template) => (template.category || "General") === activeCategory),
    [activeCategory, adminTemplates],
  );

  const startWithTemplate = async () => {
    if (selectedTemplateIds.size === 0) return;
    setIsStarting(true);
    try {
      resetBook();
      const selectedTemplates = adminTemplates.filter((template) =>
        selectedTemplateIds.has(template.id),
      );
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
          ) : adminTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-500">
              <Sparkles className="mb-4 h-10 w-10 opacity-30" />
              <p className="font-medium">No templates are available yet.</p>
            </div>
          ) : (
            <div className="space-y-5 pb-4">
              <div className="flex flex-wrap gap-2">
                {["All", ...categories].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
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
                  const isSelected = selectedTemplateIds.has(template.id);
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateIds((current) => {
                          const next = new Set(current);
                          if (next.has(template.id)) next.delete(template.id);
                          else next.add(template.id);
                          return next;
                        });
                      }}
                      className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 transition ${
                        isSelected ? "border-blue-500 shadow-md" : "border-transparent hover:border-blue-300"
                      }`}
                    >
                      <TemplatePreview template={template} className="opacity-90" />
                      <span className="absolute right-2 top-2 rounded-md bg-black/40 p-1 text-white backdrop-blur-sm">
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </span>
                      <span className="absolute inset-x-0 bottom-0 truncate bg-slate-950/65 px-2 py-2 text-left text-[11px] font-semibold text-white backdrop-blur-sm">
                        {template.label}
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
            {selectedTemplateIds.size === 0
              ? "Select one or more templates"
              : `${selectedTemplateIds.size} template${selectedTemplateIds.size === 1 ? "" : "s"} selected`}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={startWithTemplate}
              disabled={selectedTemplateIds.size === 0 || isStarting}
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
