import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Heart, ImagePlus, LayoutGrid, Search, Square } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!open || templates.length > 0) return;
    setIsLoadingTemplates(true);
    initAdminTemplates().finally(() => setIsLoadingTemplates(false));
  }, [initAdminTemplates, open, templates.length]);

  useEffect(() => {
    if (!open) {
      setSelectedTemplateIds([]);
      setActiveCategory("All");
      setSearchQuery("");
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
    const categoryTemplates =
      activeCategory === "All"
        ? templates
        : templates.filter(
            (template) => normalizeTemplateCategory(template.category) === activeCategory,
          );
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? categoryTemplates.filter((template) =>
          `${template.label} ${normalizeTemplateCategory(template.category)}`
            .toLowerCase()
            .includes(query),
        )
      : categoryTemplates;
    return filtered
      .slice()
      .sort(
        (a, b) =>
          (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0) ||
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );
  }, [activeCategory, likeCounts, searchQuery, templates]);

  const selectedTemplates = useMemo(
    () =>
      selectedTemplateIds
        .map((id) => templates.find((template) => template.id === id))
        .filter((template): template is SavedPageTemplate => Boolean(template)),
    [selectedTemplateIds, templates],
  );

  const templateCountForCategory = (category: string) =>
    category === "All"
      ? templates.length
      : templates.filter((template) => normalizeTemplateCategory(template.category) === category)
          .length;

  const toggleSelection = (templateId: string) => {
    setSelectedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  };

  const continueWithTemplates = () => {
    if (selectedTemplateIds.length === 0) return;
    onProceed(selectedTemplates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="template-picker-dialog h-[min(92dvh,820px)] w-[calc(100vw-16px)] max-w-none gap-0 overflow-hidden border-0 bg-[#0b1120] p-0 text-white shadow-[0_36px_120px_rgba(0,0,0,.72)] sm:max-w-[1120px]">
        <div className="template-picker-header">
          <div className="template-picker-title-icon" aria-hidden="true">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <DialogHeader className="min-w-0 space-y-0 text-left">
            <span className="template-picker-step">Step 1 of 2</span>
            <DialogTitle className="template-picker-title">Choose pages for your book</DialogTitle>
            <DialogDescription className="template-picker-description">
              Select page designs in the order you want them. You will add photos next.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="template-picker-workspace">
          <aside className="template-picker-sidebar" aria-label="Template filters">
            <label className="template-picker-search">
              <span className="sr-only">Search templates</span>
              <Search className="h-4 w-4" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search designs"
              />
            </label>

            <div className="template-picker-category-label">Collections</div>
            <div className="template-picker-categories" role="tablist" aria-label="Collections">
              {["All", ...categories].map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(category)}
                    className={isActive ? "is-active" : ""}
                  >
                    <span>{category}</span>
                    <span>{templateCountForCategory(category)}</span>
                  </button>
                );
              })}
            </div>

            <div className="template-picker-help">
              <Check className="h-4 w-4" />
              <p>Selection numbers become the page order in your new book.</p>
            </div>
          </aside>

          <section className="template-picker-content" aria-label="Available page designs">
            <div className="template-picker-toolbar">
              <div>
                <h3>{activeCategory === "All" ? "All page designs" : activeCategory}</h3>
                <p>
                  {filteredTemplates.length} design{filteredTemplates.length === 1 ? "" : "s"}
                  {searchQuery.trim() ? " found" : " available"}
                </p>
              </div>
              {selectedTemplateIds.length > 0 && (
                <button type="button" onClick={() => setSelectedTemplateIds([])}>
                  Clear selection
                </button>
              )}
            </div>

            <div className="template-picker-scroll">
              {isLoadingTemplates ? (
                <div className="template-picker-empty">
                  <div className="template-picker-spinner" />
                  <p>Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="template-picker-empty">
                  <LayoutGrid className="h-9 w-9" />
                  <h3>No page designs yet</h3>
                  <p>Published admin templates will appear here.</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="template-picker-empty">
                  <Search className="h-9 w-9" />
                  <h3>No matching designs</h3>
                  <p>Try another search or choose a different collection.</p>
                </div>
              ) : (
                <div className="template-picker-grid">
                  {filteredTemplates.map((template) => {
                    const selectedIndex = selectedTemplateIds.indexOf(template.id);
                    const isSelected = selectedIndex >= 0;
                    const liked = likedTemplateIds.includes(template.id);
                    const likeCount = likeCounts[template.id] ?? 0;
                    return (
                      <div
                        key={template.id}
                        className={`template-picker-card group ${isSelected ? "is-selected" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSelection(template.id)}
                          className="template-picker-card-select"
                          aria-pressed={isSelected}
                          aria-label={`${isSelected ? "Remove" : "Add"} ${template.label}`}
                        >
                          <TemplatePreview
                            template={template}
                            showSamplePhotos
                            className="template-picker-preview"
                          />
                          <span className="template-picker-order" aria-hidden="true">
                            {isSelected ? (
                              <span>{selectedIndex + 1}</span>
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
                          className={`template-picker-like ${liked ? "is-liked" : ""}`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                          {likeCount}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="template-picker-footer">
          <div className="template-picker-selection">
            <div className="template-picker-thumbnails" aria-hidden="true">
              {selectedTemplates.slice(0, 5).map((template, index) => (
                <div key={template.id}>
                  <TemplatePreview template={template} showSamplePhotos />
                  <span>{index + 1}</span>
                </div>
              ))}
            </div>
            <div className="template-picker-selection-copy">
              <strong>
                {selectedTemplateIds.length === 0
                  ? "No pages selected"
                  : `${selectedTemplateIds.length} page${selectedTemplateIds.length === 1 ? "" : "s"} selected`}
              </strong>
              <span>
                {selectedTemplateIds.length === 0
                  ? "Choose at least one design to continue"
                  : "Your selection order is saved"}
              </span>
            </div>
          </div>
          <div className="template-picker-actions">
            <button type="button" onClick={() => onOpenChange(false)} className="secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={continueWithTemplates}
              disabled={selectedTemplateIds.length === 0}
              className="primary"
            >
              <ImagePlus className="h-4 w-4" />
              Add photos
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
