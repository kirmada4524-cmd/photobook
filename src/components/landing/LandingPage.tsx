import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FolderOpen,
  Frame,
  Heart,
  ImagePlus,
  Images,
  LayoutTemplate,
  Layers,
  LogIn,
  LogOut,
  Palette,
  Plus,
  ScanEye,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth";
import { useBookStore } from "@/lib/photobook/store";
import {
  normalizeTemplateCategory,
  TEMPLATE_CATEGORIES,
} from "@/lib/photobook/template-categories";
import type { SavedPageTemplate } from "@/lib/photobook/types";
import { getTemplateLikeSummary, toggleTemplateLike } from "@/lib/api/template-likes.functions";
import { TemplatePreview } from "@/components/photobook/TemplatePreview";
import { LoginModal } from "./LoginModal";
import { NewProjectModal } from "./NewProjectModal";
import { ProjectSelectionModal } from "./ProjectSelectionModal";
import { TemplateStartModal } from "./TemplateStartModal";
import { BucketPhotoUploadModal } from "./BucketPhotoUploadModal";
import { HomeHeroScene } from "./HomeHeroScene";

function HomeHero({
  onCreate,
  onExplore,
  onContinue,
  onOpenProject,
}: {
  onCreate: () => void;
  onExplore: () => void;
  onContinue: () => void;
  onOpenProject: () => void;
}) {
  return (
    <section id="home" className="home-hero">
      <HomeHeroScene />
      <div className="home-hero-grid" aria-hidden="true" />

      <div className="home-hero-content">
        <div className="home-hero-kicker">
          <Images className="h-4 w-4" />
          Premium memories, beautifully arranged
        </div>
        <h1>
          Every photo tells a story. <span>Make it unforgettable.</span>
        </h1>
        <p>
          Choose beautiful admin-made pages, upload your favorite photos, and start with a
          ready-to-edit photobook that already feels personal.
        </p>

        <div className="home-hero-actions">
          <button type="button" onClick={onCreate} className="home-cta-primary">
            Create Your Album
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={onExplore} className="home-cta-secondary">
            Explore Templates
          </button>
        </div>

        <div className="home-hero-utility">
          <button type="button" onClick={onContinue}>
            <Clock3 className="h-4 w-4" /> Continue project
          </button>
          <span aria-hidden="true" />
          <button type="button" onClick={onOpenProject}>
            <FolderOpen className="h-4 w-4" /> Open .wanderbook
          </button>
        </div>

        <div className="home-proof-row" aria-label="Product highlights">
          <div>
            <Check className="h-4 w-4" /> Easy to design
          </div>
          <div>
            <LayoutTemplate className="h-4 w-4" /> Admin-crafted templates
          </div>
          <div>
            <Download className="h-4 w-4" /> Print-ready export
          </div>
        </div>
      </div>
    </section>
  );
}

function TemplateCard({
  template,
  selected,
  order,
  liked,
  likeCount,
  likePending,
  onToggle,
  onToggleLike,
}: {
  template: SavedPageTemplate;
  selected: boolean;
  order?: number;
  liked: boolean;
  likeCount: number;
  likePending: boolean;
  onToggle: () => void;
  onToggleLike: () => void;
}) {
  return (
    <div
      data-testid={`home-template-${template.id}`}
      className={`template-cinema-card group relative aspect-square w-full min-w-0 overflow-hidden rounded-md border bg-white shadow-[0_18px_40px_-24px_rgba(40,62,92,.4)] transition duration-300 ease-out focus-within:ring-2 focus-within:ring-violet-400 ${
        selected ? "border-emerald-500 ring-2 ring-emerald-400/25" : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={`${selected ? "Remove" : "Add"} ${template.label} template`}
        className="absolute inset-0 h-full w-full overflow-hidden focus-visible:outline-none"
      >
        <TemplatePreview
          template={template}
          showSamplePhotos
          className="absolute inset-0 transition duration-500 ease-out group-hover:scale-[1.055]"
        />
        <span className="template-card-shine pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 blur-md" />
        <span
          className={`absolute left-2 top-2 grid h-7 min-w-7 place-items-center rounded-full border px-1 shadow-lg backdrop-blur-md transition ${
            selected
              ? "scale-100 border-emerald-300 bg-emerald-500 text-white"
              : "scale-90 border-white/50 bg-slate-900/70 text-white/90 group-hover:scale-100"
          }`}
          aria-hidden="true"
        >
          {selected && order ? (
            <span className="text-[11px] font-bold">{order}</span>
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleLike}
        disabled={likePending}
        aria-pressed={liked}
        aria-label={`${liked ? "Unlike" : "Like"} ${template.label || "template"}; ${likeCount} likes`}
        title={liked ? "Unlike template" : "Like template"}
        className={`absolute bottom-2 right-2 z-10 inline-flex h-8 min-w-12 items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-extrabold shadow-lg backdrop-blur-md transition hover:scale-105 disabled:opacity-60 ${
          liked
            ? "border-rose-300 bg-rose-500 text-white"
            : "border-slate-200 bg-white/95 text-slate-700"
        }`}
      >
        <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
        <span>{likeCount}</span>
      </button>
    </div>
  );
}

function TemplateCategorySection({
  category,
  templates,
  selectedIds,
  likeCounts,
  likedTemplateIds,
  pendingLikeIds,
  onToggle,
  onToggleLike,
  onShowMore,
}: {
  category: string;
  templates: SavedPageTemplate[];
  selectedIds: string[];
  likeCounts: Record<string, number>;
  likedTemplateIds: string[];
  pendingLikeIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleLike: (id: string) => void;
  onShowMore: (category: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(320, rail.clientWidth * 0.82), behavior: "smooth" });
  };

  return (
    <section
      data-template-category={category}
      className="home-template-category border-b border-slate-200 py-5 last:border-b-0 sm:py-6"
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate text-lg font-semibold sm:text-xl"
            style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
          >
            {category}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {templates.length} design{templates.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => scrollRail(-1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            title="Scroll left"
            aria-label={`Scroll ${category} left`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            title="Scroll right"
            aria-label={`Scroll ${category} right`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onShowMore(category)}
            className="ml-1 inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-50 hover:text-violet-900"
          >
            See all
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="template-rail -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-2 [scrollbar-color:rgba(100,116,139,.24)_transparent] [scrollbar-width:thin] sm:gap-4"
      >
        {templates.map((template) => {
          const selectedIndex = selectedIds.indexOf(template.id);
          return (
            <div key={template.id} className="w-[136px] shrink-0 snap-start sm:w-40 lg:w-[172px]">
              <TemplateCard
                template={template}
                selected={selectedIndex >= 0}
                order={selectedIndex >= 0 ? selectedIndex + 1 : undefined}
                liked={likedTemplateIds.includes(template.id)}
                likeCount={likeCounts[template.id] ?? 0}
                likePending={pendingLikeIds.has(template.id)}
                onToggle={() => onToggle(template.id)}
                onToggleLike={() => onToggleLike(template.id)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HomeTemplatesGrid({
  templates,
  selectedIds,
  likeCounts,
  likedTemplateIds,
  pendingLikeIds,
  isLoading,
  onToggle,
  onToggleLike,
  onClear,
  onStart,
  onShowMore,
}: {
  templates: SavedPageTemplate[];
  selectedIds: string[];
  likeCounts: Record<string, number>;
  likedTemplateIds: string[];
  pendingLikeIds: Set<string>;
  isLoading: boolean;
  onToggle: (id: string) => void;
  onToggleLike: (id: string) => void;
  onClear: () => void;
  onStart: () => void;
  onShowMore: (category: string) => void;
}) {
  const templatesByCategory = useMemo(() => {
    const grouped = new Map<string, SavedPageTemplate[]>();
    TEMPLATE_CATEGORIES.forEach((category) => grouped.set(category, []));
    templates.forEach((template) => {
      const normalized = normalizeTemplateCategory(template.category);
      grouped.set(normalized, [...(grouped.get(normalized) ?? []), template]);
    });
    grouped.forEach((items, category) => {
      grouped.set(
        category,
        items
          .slice()
          .sort(
            (a, b) =>
              (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0) ||
              (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
              a.label.localeCompare(b.label),
          ),
      );
    });
    return grouped;
  }, [likeCounts, templates]);

  const populatedCategories = TEMPLATE_CATEGORIES.filter(
    (category) => (templatesByCategory.get(category)?.length ?? 0) > 0,
  );
  const selectedTemplates = selectedIds
    .map((id) => templates.find((template) => template.id === id))
    .filter((template): template is SavedPageTemplate => Boolean(template));

  return (
    <div>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-b border-slate-200 py-4">
              <div className="mb-3 h-6 w-40 animate-pulse rounded bg-slate-200" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 5 }).map((__, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="aspect-square w-[136px] shrink-0 animate-pulse rounded-md border border-slate-200 bg-white sm:w-40"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {populatedCategories.map((category) => {
            const categoryTemplates = templatesByCategory.get(category) ?? [];
            return (
              <TemplateCategorySection
                key={category}
                category={category}
                templates={categoryTemplates}
                selectedIds={selectedIds}
                likeCounts={likeCounts}
                likedTemplateIds={likedTemplateIds}
                pendingLikeIds={pendingLikeIds}
                onToggle={onToggle}
                onToggleLike={onToggleLike}
                onShowMore={onShowMore}
              />
            );
          })}
          {populatedCategories.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 bg-white/70 px-4 py-12 text-center text-sm font-semibold text-slate-500">
              No templates are available yet.
            </div>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div
          data-testid="template-bucket"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl items-center gap-2 rounded-md border border-white/15 bg-[#111827]/95 p-2.5 text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,.9)] backdrop-blur-xl motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:bottom-5 sm:gap-3 sm:p-3"
        >
          <div className="hidden h-11 shrink-0 items-center -space-x-2 sm:flex">
            {selectedTemplates.slice(0, 4).map((template, index) => (
              <div
                key={template.id}
                className="relative h-11 w-11 overflow-hidden rounded-sm border-2 border-[#111827] bg-slate-800 shadow-sm"
                style={{ zIndex: 4 - index }}
              >
                <TemplatePreview template={template} showSamplePhotos />
              </div>
            ))}
            {selectedTemplates.length > 4 && (
              <span className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-slate-900 text-[10px] font-bold text-white">
                +{selectedTemplates.length - 4}
              </span>
            )}
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-emerald-400/15 text-emerald-300 sm:h-10 sm:w-10 sm:hidden">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">Selected pages</div>
            <div className="truncate text-xs text-slate-400">
              {selectedIds.length} page{selectedIds.length === 1 ? "" : "s"} ready - Next: add
              photos
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            title="Clear selected pages"
            aria-label="Clear selected pages"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-white/[0.08] hover:text-white sm:h-10 sm:w-10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onStart}
            aria-label="Add photos to selected templates"
            data-testid="open-bucket-editor"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-pink-500 px-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:-translate-y-0.5 sm:h-10"
          >
            <ImagePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add photos</span>
            <span className="sm:hidden">Next</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function LandingPage() {
  const { currentUser, logout, isAdmin } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateModalCategory, setTemplateModalCategory] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState<"recent" | "open" | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [photoSetupTemplates, setPhotoSetupTemplates] = useState<SavedPageTemplate[]>([]);
  const [showPhotoSetup, setShowPhotoSetup] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedTemplateIds, setLikedTemplateIds] = useState<string[]>([]);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const voterKeyRef = useRef("");
  const adminTemplates = useBookStore((s) => s.adminTemplates ?? []);
  const availableTemplates = useMemo(
    () =>
      adminTemplates
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label)),
    [adminTemplates],
  );
  const initAdminTemplates = useBookStore((s) => s.initAdminTemplates);

  useEffect(() => {
    let active = true;
    initAdminTemplates().finally(() => {
      if (active) setIsLoadingTemplates(false);
    });
    return () => {
      active = false;
    };
  }, [initAdminTemplates]);

  useEffect(() => {
    let active = true;
    const stored = window.localStorage.getItem("yaara-template-voter");
    const voterKey =
      stored ||
      (window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (!stored) window.localStorage.setItem("yaara-template-voter", voterKey);
    voterKeyRef.current = voterKey;

    getTemplateLikeSummary({ data: { voterKey } }).then((summary) => {
      if (!active) return;
      setLikeCounts(summary.counts);
      setLikedTemplateIds(summary.likedTemplateIds);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((current) =>
      current.includes(id) ? current.filter((templateId) => templateId !== id) : [...current, id],
    );
  };

  const openPhotoSetup = (templates: SavedPageTemplate[]) => {
    if (templates.length === 0) {
      toast.error("Select at least one template");
      return;
    }
    setPhotoSetupTemplates(templates);
    setShowPhotoSetup(true);
  };

  const startSelectedTemplates = () => {
    const selectedTemplates = selectedTemplateIds
      .map((id) => availableTemplates.find((template) => template.id === id))
      .filter((template): template is SavedPageTemplate => Boolean(template));
    openPhotoSetup(selectedTemplates);
  };

  const handleToggleLike = async (templateId: string) => {
    const voterKey = voterKeyRef.current;
    if (!voterKey || pendingLikeIds.has(templateId)) return;
    const wasLiked = likedTemplateIds.includes(templateId);
    const previousCount = likeCounts[templateId] ?? 0;

    setPendingLikeIds((current) => new Set(current).add(templateId));
    setLikedTemplateIds((current) =>
      wasLiked ? current.filter((id) => id !== templateId) : [...current, templateId],
    );
    setLikeCounts((current) => ({
      ...current,
      [templateId]: Math.max(0, previousCount + (wasLiked ? -1 : 1)),
    }));

    try {
      const result = await toggleTemplateLike({ data: { templateId, voterKey } });
      setLikeCounts((current) => ({ ...current, [templateId]: result.likeCount }));
      setLikedTemplateIds((current) => {
        const without = current.filter((id) => id !== templateId);
        return result.liked ? [...without, templateId] : without;
      });
    } catch (error) {
      console.error(error);
      setLikeCounts((current) => ({ ...current, [templateId]: previousCount }));
      setLikedTemplateIds((current) => {
        const without = current.filter((id) => id !== templateId);
        return wasLiked ? [...without, templateId] : without;
      });
      toast.error("Could not update this like yet.");
    } finally {
      setPendingLikeIds((current) => {
        const next = new Set(current);
        next.delete(templateId);
        return next;
      });
    }
  };

  return (
    <div className="home-page min-h-screen">
      <header className="home-header">
        <div className="home-header-inner">
          <a href="#home" className="home-logo" aria-label="Yaara home">
            <span className="home-logo-mark">
              <Images className="h-5 w-5" />
            </span>
            <span>Yaara</span>
          </a>

          <nav className="home-nav-links" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#template-catalog">Templates</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">About</a>
          </nav>

          <nav className="home-account-actions" aria-label="Account navigation">
            {currentUser ? (
              <>
                <span className="home-user-name">{currentUser.username}</span>
                {isAdmin && (
                  <Link to="/admin" className="home-admin-link">
                    <Shield className="h-3.5 w-3.5" /> Admin
                  </Link>
                )}
                <button
                  onClick={logout}
                  title="Logout"
                  aria-label="Logout"
                  className="home-icon-btn"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="home-login-btn">
                <LogIn className="h-4 w-4" /> <span>Login</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                document.getElementById("template-catalog")?.scrollIntoView({ behavior: "smooth" })
              }
              className="home-nav-cta"
            >
              Create Album
            </button>
          </nav>
        </div>
      </header>

      <main>
        <HomeHero
          onCreate={() =>
            document.getElementById("template-catalog")?.scrollIntoView({ behavior: "smooth" })
          }
          onExplore={() =>
            document.getElementById("template-catalog")?.scrollIntoView({ behavior: "smooth" })
          }
          onContinue={() => setShowProjects("recent")}
          onOpenProject={() => setShowProjects("open")}
        />

        <section id="how-it-works" className="home-section home-how-section">
          <div className="home-section-inner">
            <div className="home-section-heading home-section-heading-centered">
              <div>
                <span>How it works</span>
                <h2>From camera roll to finished book.</h2>
                <p>One guided flow keeps every step clear, even if this is your first photobook.</p>
              </div>
            </div>
            <div className="home-how-grid">
              {[
                {
                  icon: LayoutTemplate,
                  title: "Choose pages",
                  copy: "Pick the admin-crafted layouts that fit your story.",
                },
                {
                  icon: Upload,
                  title: "Upload photos",
                  copy: "Add your favorite photos before the editor opens.",
                },
                {
                  icon: Palette,
                  title: "Make it yours",
                  copy: "Fine-tune photos, text, frames, stickers, and color.",
                },
                {
                  icon: ScanEye,
                  title: "Preview & export",
                  copy: "Turn the pages, review the book, and export for print.",
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="home-how-step">
                    <div className="home-step-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="template-catalog" className="home-section home-template-section">
          <div className="home-section-inner">
            <div className="home-section-heading home-template-heading">
              <div>
                <span>Template collection</span>
                <h2>Pages designed to feel like your story.</h2>
                <p>
                  {isLoadingTemplates
                    ? "Loading admin designs..."
                    : `${availableTemplates.length} admin designs - most-loved templates appear first.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProject(true)}
                className="home-blank-btn"
              >
                <Plus className="h-4 w-4" /> Start with a blank book
              </button>
            </div>
            <HomeTemplatesGrid
              templates={availableTemplates}
              selectedIds={selectedTemplateIds}
              likeCounts={likeCounts}
              likedTemplateIds={likedTemplateIds}
              pendingLikeIds={pendingLikeIds}
              isLoading={isLoadingTemplates}
              onToggle={toggleTemplate}
              onToggleLike={handleToggleLike}
              onClear={() => setSelectedTemplateIds([])}
              onStart={startSelectedTemplates}
              onShowMore={(category) => {
                setTemplateModalCategory(category);
                setShowTemplates(true);
              }}
            />
          </div>
        </section>

        <section id="about" className="home-section home-benefits-section">
          <div className="home-section-inner">
            <div className="home-section-heading home-section-heading-centered">
              <div>
                <span>Why Yaara</span>
                <h2>Creative freedom without a complicated workspace.</h2>
              </div>
            </div>
            <div className="home-benefit-grid">
              {[
                {
                  icon: Frame,
                  title: "Flexible frames",
                  copy: "Reposition and zoom photos while the layout stays composed.",
                },
                {
                  icon: LayoutTemplate,
                  title: "Curated layouts",
                  copy: "Start from templates built and published by your admin team.",
                },
                {
                  icon: Eye,
                  title: "Real book preview",
                  copy: "See the pages turn before you export the final book.",
                },
                {
                  icon: Images,
                  title: "Photo-first workflow",
                  copy: "Choose pages, add photos, then enter the editor with a first draft.",
                },
                {
                  icon: Palette,
                  title: "Personal editing",
                  copy: "Add text, stickers, backgrounds, drawing, and photo adjustments.",
                },
                {
                  icon: Download,
                  title: "Print-ready output",
                  copy: "Export a clean high-resolution PDF when your story is ready.",
                },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="home-benefit-item">
                    <Icon className="h-5 w-5" />
                    <h3>{feature.title}</h3>
                    <p>{feature.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="home-final-cta">
          <div>
            <span>Your photos already tell the story.</span>
            <h2>Give them a place worth keeping.</h2>
            <p>Choose your favorite pages, upload once, and continue in the editor.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              document.getElementById("template-catalog")?.scrollIntoView({ behavior: "smooth" })
            }
            className="home-cta-primary"
          >
            Create Your Album <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </main>

      <footer id="contact" className="home-footer">
        <div className="home-footer-inner">
          <div>
            <a href="#home" className="home-logo" aria-label="Yaara home">
              <span className="home-logo-mark">
                <Images className="h-5 w-5" />
              </span>
              <span>Yaara</span>
            </a>
            <p>Premium photobooks, shaped around the memories that matter.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#template-catalog">Templates</a>
            <a href="#how-it-works">How it works</a>
            <button type="button" onClick={() => setShowProjects("recent")}>
              My projects
            </button>
          </nav>
          <span>(c) 2026 Yaara Photobook Studio</span>
        </div>
      </footer>

      <LoginModal open={showLogin} onOpenChange={setShowLogin} />
      <NewProjectModal open={showNewProject} onOpenChange={setShowNewProject} />
      <TemplateStartModal
        open={showTemplates}
        onOpenChange={setShowTemplates}
        templates={availableTemplates}
        initialCategory={templateModalCategory}
        onProceed={openPhotoSetup}
        likeCounts={likeCounts}
        likedTemplateIds={likedTemplateIds}
        onToggleLike={handleToggleLike}
      />
      <BucketPhotoUploadModal
        open={showPhotoSetup}
        onOpenChange={setShowPhotoSetup}
        templates={photoSetupTemplates}
        onFinished={() => setSelectedTemplateIds([])}
      />
      {showProjects && (
        <ProjectSelectionModal
          open={true}
          onOpenChange={(value) => {
            if (!value) setShowProjects(null);
          }}
          mode={showProjects}
        />
      )}
    </div>
  );
}
