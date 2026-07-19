import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderOpen,
  Heart,
  ImagePlus,
  Layers,
  Lock,
  LogOut,
  Plus,
  Shield,
  Sparkles,
  Trash2,
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

const C = {
  brand: "oklch(0.55 0.14 35)",
  brandDark: "oklch(0.39 0.11 30)",
  ink: "oklch(0.18 0.02 60)",
  catalog: "#FEF5DA",
  paper: "#FFFCF4",
  mint: "oklch(0.9 0.05 160)",
};

function AnimatedHeroBook({ scrollPct }: { scrollPct: number }) {
  return (
    <div
      className="relative mx-auto h-[270px] w-full max-w-md sm:h-[320px]"
      style={{ perspective: "1500px", transform: `translateY(${scrollPct * 28}px)` }}
      aria-hidden="true"
    >
      <div className="absolute inset-x-8 bottom-4 h-8 rounded-[50%] bg-black/20 blur-xl" />
      <div className="absolute left-1/2 top-1/2 h-[230px] w-[320px] -translate-x-1/2 -translate-y-1/2 sm:h-[270px] sm:w-[390px]">
        <div
          className="absolute inset-0 rounded-md shadow-[0_26px_60px_-28px_rgba(51,35,22,0.9)]"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.39 0.11 30), oklch(0.55 0.14 35) 48%, oklch(0.31 0.09 30))",
            transform: "rotateX(8deg) rotateZ(-2deg)",
          }}
        />
        <div className="absolute inset-y-4 left-4 right-4 overflow-hidden rounded-md bg-[linear-gradient(90deg,#f5efe2_0%,#fffaf1_47%,#d8c9b4_50%,#fffaf1_53%,#f5efe2_100%)] shadow-inner" />
        <div className="absolute inset-y-6 left-7 w-[43%] overflow-hidden rounded-l-md border border-black/5 bg-[#fffaf1] p-4 shadow-[inset_-18px_0_25px_-30px_rgba(0,0,0,0.9)]">
          <div className="h-full overflow-hidden rounded-sm border border-black/5 bg-[linear-gradient(135deg,#e6f2de,#fff8eb_58%,#f4c5a5)] p-3">
            <div className="h-20 rounded-sm bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&q=80')] bg-cover bg-center shadow-sm" />
            <div className="mt-4 h-2 w-20 rounded-full bg-black/15" />
            <div className="mt-2 h-2 w-28 rounded-full bg-black/10" />
            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="h-14 rounded-sm bg-white/75 shadow-sm" />
              <div className="h-14 rounded-sm bg-white/75 shadow-sm" />
            </div>
          </div>
        </div>
        <div className="absolute inset-y-6 right-7 w-[43%] overflow-hidden rounded-r-md border border-black/5 bg-[#fffaf1] p-4 shadow-[inset_18px_0_25px_-30px_rgba(0,0,0,0.9)]">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: C.brand }}
          >
            Yaara
          </div>
          <div
            className="mt-3 text-3xl leading-none"
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              color: C.brandDark,
            }}
          >
            Your Story
          </div>
          <div className="mt-3 h-2 w-24 rounded-full bg-black/12" />
          <div className="mt-2 h-2 w-16 rounded-full bg-black/10" />
          <div className="mt-8 h-24 rounded-sm bg-[url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&q=80')] bg-cover bg-center shadow-sm" />
        </div>
        <div className="absolute inset-y-5 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-black/20 blur-[1px]" />
        <div className="absolute inset-y-5 left-1/2 w-[44%] origin-left overflow-hidden rounded-r-md border border-black/5 bg-[#fff9ee] p-4 shadow-2xl motion-safe:animate-[book-page-turn_4.8s_ease-in-out_infinite]">
          <div className="relative h-full overflow-hidden rounded-sm bg-[linear-gradient(135deg,#fffdf8,#f3e0c7)] p-3">
            <div className="h-24 rounded-sm bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80')] bg-cover bg-center shadow-sm" />
            <div className="mt-4 h-2 w-20 rounded-full bg-black/12" />
            <div className="mt-2 h-2 w-28 rounded-full bg-black/10" />
            <div className="absolute bottom-5 right-5 text-[10px] font-semibold text-black/25">
              01
            </div>
          </div>
        </div>
      </div>
    </div>
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
      className={`template-cinema-card group relative aspect-square w-full min-w-0 overflow-hidden rounded-md border-2 bg-[#fffdf7] shadow-[0_12px_30px_-20px_rgba(76,45,31,.5)] transition duration-300 ease-out focus-within:ring-2 focus-within:ring-[#bd5b49] ${
        selected ? "border-emerald-500" : "border-[#ddcfaa]"
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
              : "scale-90 border-white/80 bg-[#57342e]/85 text-white/85 group-hover:scale-100"
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
            : "border-[#e0d2ac] bg-[#fffdf7]/95 text-[#4d372f]"
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
      className="border-b border-[#daceaa] py-4 last:border-b-0 sm:py-5"
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate text-lg font-semibold sm:text-xl"
            style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
          >
            {category}
          </h3>
          <p className="text-xs text-[#7b6d5e]">
            {templates.length} design{templates.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => scrollRail(-1)}
            className="grid h-8 w-8 place-items-center rounded-md border border-[#cfc19b] bg-[#fffaf0]/70 text-[#70584c] transition hover:border-[#b99d78] hover:bg-[#fffdf7] hover:text-[#442c27]"
            title="Scroll left"
            aria-label={`Scroll ${category} left`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(1)}
            className="grid h-8 w-8 place-items-center rounded-md border border-[#cfc19b] bg-[#fffaf0]/70 text-[#70584c] transition hover:border-[#b99d78] hover:bg-[#fffdf7] hover:text-[#442c27]"
            title="Scroll right"
            aria-label={`Scroll ${category} right`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onShowMore(category)}
            className="ml-1 inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-bold text-[#963f36] transition hover:bg-[#fffaf0] hover:text-[#652b27]"
          >
            See all
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="template-rail -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 py-2 [scrollbar-color:rgba(111,82,65,.3)_transparent] [scrollbar-width:thin] sm:gap-3"
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
            <div key={index} className="border-b border-[#daceaa] py-4">
              <div className="mb-3 h-6 w-40 animate-pulse rounded bg-[#e7d9b5]" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 5 }).map((__, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="aspect-square w-[136px] shrink-0 animate-pulse rounded-md border border-[#dfd1ad] bg-[#fffaf0]/70 sm:w-40"
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
            <div className="border border-dashed border-[#cdbd95] bg-white/35 px-4 py-12 text-center text-sm font-semibold text-[#75675a]">
              No templates are available yet.
            </div>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div
          data-testid="template-bucket"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl items-center gap-2 border border-black/10 bg-white/95 p-2.5 shadow-[0_24px_70px_-24px_rgba(0,0,0,.65)] backdrop-blur-xl motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:bottom-5 sm:gap-3 sm:p-3"
        >
          <div className="hidden h-11 shrink-0 items-center -space-x-2 sm:flex">
            {selectedTemplates.slice(0, 4).map((template, index) => (
              <div
                key={template.id}
                className="relative h-11 w-11 overflow-hidden border-2 border-white bg-slate-100 shadow-sm"
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
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-emerald-800 sm:hidden"
            style={{ background: C.mint }}
          >
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">Template bucket</div>
            <div className="truncate text-xs text-black/50">
              {selectedIds.length} page{selectedIds.length === 1 ? "" : "s"} selected in order
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            title="Clear bucket"
            aria-label="Clear template bucket"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-black/45 transition hover:bg-black/5 hover:text-black"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onStart}
            aria-label="Add photos to selected templates"
            data-testid="open-bucket-editor"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
            style={{ background: C.brand }}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add photos</span>
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
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

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

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const { top, height } = heroRef.current.getBoundingClientRect();
      setScrollPct(Math.max(0, Math.min(1, -top / height)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: C.paper, color: C.ink, fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @keyframes book-page-turn {
          0%, 18% { transform: rotateY(-2deg); filter: brightness(1); }
          44%, 58% { transform: rotateY(-52deg); filter: brightness(0.96); }
          82%, 100% { transform: rotateY(-2deg); filter: brightness(1); }
        }
        @keyframes template-card-shine {
          from { transform: translateX(-220%) skewX(-12deg); opacity: 0; }
          35% { opacity: .65; }
          to { transform: translateX(620%) skewX(-12deg); opacity: 0; }
        }
        @media (hover: hover) {
          .template-cinema-card:hover {
            z-index: 20;
            transform: translateY(-6px) scale(1.035);
            border-color: rgba(145,82,65,.68);
            box-shadow: 0 24px 44px -25px rgba(83,48,35,.72);
          }
          .template-rail:has(.template-cinema-card:hover) .template-cinema-card:not(:hover) {
            transform: scale(.985);
            opacity: .82;
          }
          .template-cinema-card:hover .template-card-shine {
            animation: template-card-shine .85s ease-out both;
          }
        }
        .template-rail {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .template-rail::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; animation: none !important; } }
      `}</style>

      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backdropFilter: "blur(12px)",
          background: "rgba(255,252,244,.9)",
          borderColor: `${C.ink}0d`,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" style={{ color: C.brand }} />
            <span
              className="text-xl"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Yaara
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <span className="hidden text-sm font-medium sm:block">{currentUser.username}</span>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                    style={{ borderColor: `${C.ink}22`, color: C.brand }}
                  >
                    <Shield className="h-3.5 w-3.5" /> Admin
                  </Link>
                )}
                <button
                  onClick={logout}
                  title="Logout"
                  className="grid h-8 w-8 place-items-center rounded-md border"
                  style={{ borderColor: `${C.ink}22` }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: `${C.ink}22` }}
              >
                <Lock className="h-3.5 w-3.5" /> Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      <section
        ref={heroRef}
        className="relative overflow-hidden border-b border-black/5"
        style={{ background: C.paper }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:py-12">
          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold"
              style={{ color: C.brand }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Create a photobook in minutes
            </div>
            <h1
              className="mt-4 max-w-xl text-4xl leading-[1.02] md:text-[44px] lg:text-6xl"
              style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", fontWeight: 700 }}
            >
              Your memories,{" "}
              <span
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
              >
                bound beautifully.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-black/60 sm:text-base">
              Choose your pages, add your photos, and make a book that feels completely yours.
            </p>

            <div className="mt-6 grid max-w-lg grid-cols-2 gap-2.5">
              <button
                onClick={() => setShowNewProject(true)}
                className="group col-span-2 flex items-center justify-between rounded-md px-4 py-3 text-sm font-semibold text-white shadow-lg"
                style={{ background: C.brand }}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4 transition group-hover:rotate-90" />
                  Create New Project
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("template-catalog")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-md border bg-white px-2.5 py-2.5 text-xs font-semibold sm:px-3 sm:text-sm"
                style={{ borderColor: `${C.ink}18` }}
              >
                <Layers className="h-4 w-4 shrink-0" /> Browse Templates
              </button>
              <button
                onClick={() => setShowProjects("recent")}
                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-md border bg-white px-2.5 py-2.5 text-xs font-semibold sm:px-3 sm:text-sm"
                style={{ borderColor: `${C.ink}18` }}
              >
                <Clock3 className="h-4 w-4 shrink-0" /> Recent Projects
              </button>
              <button
                onClick={() => setShowProjects("open")}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm font-semibold text-black/60"
                style={{ borderColor: `${C.ink}2a` }}
              >
                <FolderOpen className="h-4 w-4" /> Open Project File (.wanderbook)
              </button>
            </div>
          </div>

          <AnimatedHeroBook scrollPct={scrollPct} />
        </div>
      </section>

      <section
        id="template-catalog"
        className="border-y py-7 md:py-10"
        style={{ background: C.catalog, borderColor: "#dfd1ad" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-1 grid gap-5 border-b border-[#daceaa] pb-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#a44639]">
                Start with your pages
              </div>
              <h2
                className="mt-1 text-2xl font-semibold md:text-3xl"
                style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
              >
                Choose templates for your book
              </h2>
              <p className="mt-1 text-sm text-[#746558]">
                {isLoadingTemplates
                  ? "Loading admin designs..."
                  : `${availableTemplates.length} admin designs - most-loved templates appear first`}
              </p>
            </div>

            <div
              className="flex items-center gap-2 text-[11px] font-bold text-[#766357] sm:gap-3 sm:text-xs"
              aria-label="Create a book in three stages"
            >
              <div className="flex items-center gap-1.5 text-[#8f3f35]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#9e4639] text-white">
                  <Layers className="h-3.5 w-3.5" />
                </span>
                <span>Templates</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#ae9a78]" />
              <div className="flex items-center gap-1.5">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-[#cfbe96] bg-[#fffaf0]">
                  <ImagePlus className="h-3.5 w-3.5" />
                </span>
                <span>Photos</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#ae9a78]" />
              <div className="flex items-center gap-1.5">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-[#cfbe96] bg-[#fffaf0]">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span>Editor</span>
              </div>
            </div>
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

      <footer
        className="border-t py-5 text-center text-xs text-black/45"
        style={{ background: C.catalog, borderColor: "#dfd1ad" }}
      >
        (c) 2026 Yaara Photobook Studio
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
