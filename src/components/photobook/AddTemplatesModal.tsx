import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { LayoutGrid, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

const templateCategoryLabel = (category?: string) =>
  !category || category === "Common" ? "General" : category;

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

  const templatesByCategory = availableTemplates.reduce((acc, t) => {
    const cat = templateCategoryLabel(t.category);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, typeof availableTemplates>);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

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
      const selectedTemplates = availableTemplates.filter(t => selectedIds.has(t.id));
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

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          {availableTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <LayoutGrid className="h-12 w-12 mb-4 opacity-20" />
              <p>No templates available.</p>
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
                            isSelected ? "border-accent shadow-sm" : "border-transparent hover:border-accent/30"
                          }`}
                          style={{ aspectRatio: "1/1" }}
                        >
                          <TemplatePreview template={tmpl} className="opacity-80" />
                          
                          {/* Overlay check */}
                          <div className="absolute top-2 right-2">
                            <div className={`h-5 w-5 rounded-md flex items-center justify-center ${isSelected ? "bg-accent text-accent-foreground" : "bg-black/20 text-white/50"}`}>
                              {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
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
