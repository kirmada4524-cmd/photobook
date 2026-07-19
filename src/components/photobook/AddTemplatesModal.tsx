import { useMemo, useState } from "react";
import { useBookStore } from "@/lib/photobook/store";
import { TemplatePreview } from "./TemplatePreview";
import { SavedPageTemplate } from "@/lib/photobook/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LayoutGrid, CheckSquare, Search, Square } from "lucide-react";
import { toast } from "sonner";

export function AddTemplatesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const adminTemplates = useBookStore((s) => s.adminTemplates);
  const addPage = useBookStore((s) => s.addPage);
  const applyPageTemplate = useBookStore((s) => s.applyPageTemplate);

  // Allow user to access all templates, regardless of current page size.
  const availableTemplates = adminTemplates;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = useMemo(
    () => ["All", ...new Set(availableTemplates.map((template) => template.category || "General"))],
    [availableTemplates],
  );
  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return availableTemplates.filter((template) => {
      const category = template.category || "General";
      return (
        (activeCategory === "All" || category === activeCategory) &&
        (!normalizedQuery ||
          template.label.toLowerCase().includes(normalizedQuery) ||
          category.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [activeCategory, availableTemplates, query]);
  const templatesByCategory = useMemo(
    () =>
      filteredTemplates.reduce(
        (acc, template) => {
          const category = template.category || "General";
          if (!acc[category]) acc[category] = [];
          acc[category].push(template);
          return acc;
        },
        {} as Record<string, typeof availableTemplates>,
      ),
    [filteredTemplates],
  );

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsAdding(true);

    try {
      const selectedTemplates = availableTemplates.filter((t) => selectedIds.has(t.id));
      for (const tmpl of selectedTemplates) {
        addPage();
        await applyPageTemplate(tmpl);
      }
      toast.success(`Added ${selectedTemplates.length} templates as new pages`);
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add some templates");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-accent" />
            Add Multiple Templates
          </DialogTitle>
          <DialogDescription>
            Select templates to insert. Each selected template will be added as a new page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 border-y py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates or categories"
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          {availableTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <LayoutGrid className="h-12 w-12 mb-4 opacity-20" />
              <p>No templates available.</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Search className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm font-semibold">No matching templates</p>
              <p className="mt-1 text-xs">Try another search or category.</p>
            </div>
          ) : (
            <div className="space-y-8 pb-4">
              {Object.entries(templatesByCategory).map(([category, templates]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                    {category} Templates
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {templates.map((tmpl) => {
                      const isSelected = selectedIds.has(tmpl.id);
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => handleToggle(tmpl.id)}
                          className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden bg-muted/30 flex items-center justify-center ${
                            isSelected
                              ? "border-accent shadow-sm"
                              : "border-transparent hover:border-accent/30"
                          }`}
                          style={{ aspectRatio: "1/1" }}
                        >
                          <TemplatePreview template={tmpl} className="opacity-80" />

                          {/* Overlay check */}
                          <div className="absolute top-2 right-2">
                            <div
                              className={`h-5 w-5 rounded-md flex items-center justify-center ${isSelected ? "bg-accent text-accent-foreground" : "bg-black/20 text-white/50"}`}
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </div>
                          </div>

                          {/* Label */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-white text-[10px] font-medium truncate backdrop-blur-sm">
                            {tmpl.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedIds.size} template{selectedIds.size !== 1 ? "s" : ""} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0 || isAdding}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              {isAdding ? "Adding..." : "Add Selected as Pages"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
