import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import gsap from "gsap";
import { useGsapEntrance, useScrollReveal } from "@/lib/anim";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FolderOpen,
  Layers,
  LayoutGrid,
  Lock,
  LogOut,
  Plus,
  Rocket,
  Shield,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth";
import { useBookStore } from "@/lib/photobook/store";
import { applyTemplate, TEMPLATES, type Template } from "@/lib/photobook/templates";
import {
  normalizeTemplateCategory,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from "@/lib/photobook/template-categories";
import { FIXED_PAGE_SIZE, FIXED_PAGE_SIZE_ID, type SavedPageTemplate } from "@/lib/photobook/types";
import { TemplatePreview } from "@/components/photobook/TemplatePreview";
import { LoginModal } from "./LoginModal";
import { NewProjectModal } from "./NewProjectModal";
import { ProjectSelectionModal } from "./ProjectSelectionModal";
import { TemplateStartModal } from "./TemplateStartModal";

const C = {
  brand: "oklch(0.55 0.14 35)",
  brandDark: "oklch(0.39 0.11 30)",
  ink: "oklch(0.18 0.02 60)",
  cream: "oklch(0.983 0.012 85)",
  mint: "oklch(0.9 0.05 160)",
};

// Built-in templates carry a frame-count "style"; map it to a meaningful landing-page category
// (the "Mag" taxonomy) so category rails are semantic instead of arbitrary/round-robin.
const STYLE_TO_CATEGORY: Record<Template["style"], TemplateCategory> = {
  Minimal: "Elegant Mag",
  Magazine: "General Mag",
  Scrapbook: "Journal Mag",
  Travel: "Journal Mag",
  Polaroid: "Pinteresty",
  Grid: "General Mag",
  Collage: "Pinteresty",
};

// A small palette of tasteful warm backgrounds so built-in previews don't all look flat/identical.
const STYLE_TO_BACKGROUND: Record<Template["style"], string> = {
  Minimal: "#ffffff",
  Magazine: "#f8f4ea",
  Scrapbook: "#efe3cf",
  Travel: "#f4ead4",
  Polaroid: "#f3ede0",
  Grid: "#eef1ec",
  Collage: "#f6e8e2",
};

const BUILT_IN_TEMPLATES: SavedPageTemplate[] = TEMPLATES.map((template, index) => ({
  id: `built-in-${template.id}`,
  label: template.label,
  background: STYLE_TO_BACKGROUND[template.style] ?? "#f8f4ea",
  elements: applyTemplate(template.id, [], FIXED_PAGE_SIZE.width, FIXED_PAGE_SIZE.height),
  sizeId: FIXED_PAGE_SIZE_ID,
  category: STYLE_TO_CATEGORY[template.style] ?? "General Mag",
  frameLocked: false,
  backgroundLocked: true,
  sortOrder: index,
}));

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
            background: "linear-gradient(90deg, oklch(0.39 0.11 30), oklch(0.55 0.14 35) 48%, oklch(0.31 0.09 30))",
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
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.brand }}>Yaara</div>
          <div className="mt-3 text-3xl leading-none" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: C.brandDark }}>
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
            <div className="absolute bottom-5 right-5 text-[10px] font-semibold text-black/25">01</div>
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
  onToggle,
}: {
  template: SavedPageTemplate;
  selected: boolean;
  order?: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid={`home-template-${template.id}`}
      aria-pressed={selected}
      aria-label={`${selected ? "Remove" : "Add"} ${template.label} template`}
      className="group block w-full min-w-0 text-left focus-visible:outline-none"
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-xl bg-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:ring-emerald-500 ${
          selected
            ? "-translate-y-1 ring-2 ring-emerald-500 shadow-[0_18px_40px_-18px_rgba(5,150,105,0.75)]"
            : "ring-1 ring-black/[0.08] shadow-[0_10px_28px_-20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_22px_46px_-22px_rgba(0,0,0,0.5)]"
        }`}
      >
        <TemplatePreview
          template={template}
          showSamplePhotos
          className="absolute inset-0 transition-transform duration-[600ms] ease-out group-hover:scale-[1.08]"
        />

        {/* Label scrim — keeps template names readable at a glance */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-2.5 pb-2 pt-7">
          <span className="block truncate text-[11px] font-semibold text-white/95">
            {template.label}
          </span>
        </div>

        {/* Hover "Add" affordance (hidden once selected) */}
        {!selected && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="translate-y-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-black opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
              style={{ color: C.brand }}
            >
              <span className="inline-flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add
              </span>
            </span>
          </div>
        )}

        {/* Selection / order badge */}
        <span
          className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border text-white shadow-sm transition-all duration-300 ${
            selected
              ? "scale-100 border-emerald-300 bg-emerald-600 opacity-100"
              : "scale-90 border-white/70 bg-white/85 text-transparent opacity-0 group-hover:opacity-100 group-hover:text-black/40"
          }`}
          aria-hidden="true"
        >
          {selected && order ? (
            <span className="text-[11px] font-bold tabular-nums">{order}</span>
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
    </button>
  );
}

function TemplateCategorySection({
  category,
  templates,
  selectedIds,
  onToggle,
  onShowMore,
}: {
  category: string;
  templates: SavedPageTemplate[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onShowMore: (category: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(320, rail.clientWidth * 0.82), behavior: "smooth" });
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = rail;
      setEdges({
        left: scrollLeft > 4,
        right: scrollLeft < scrollWidth - clientWidth - 4,
      });
    };
    update();
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      rail.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [templates.length]);

  const railMask =
    edges.left && edges.right
      ? "linear-gradient(90deg, transparent, #000 42px, #000 calc(100% - 42px), transparent)"
      : edges.right
        ? "linear-gradient(90deg, #000 calc(100% - 42px), transparent)"
        : edges.left
          ? "linear-gradient(90deg, transparent, #000 42px)"
          : undefined;

  return (
    <section
      data-template-category={category}
      className="border-b border-black/[0.07] py-4 last:border-b-0 sm:py-5"
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold sm:text-xl" style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}>
            {category}
          </h3>
          <p className="text-xs text-black/45">{templates.length} template{templates.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => scrollRail(-1)}
            disabled={!edges.left}
            className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-black/55 transition-all duration-200 hover:-translate-y-0.5 hover:bg-black/[0.04] hover:text-black hover:shadow-sm disabled:cursor-default disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:shadow-none"
            title="Scroll left"
            aria-label={`Scroll ${category} left`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(1)}
            disabled={!edges.right}
            className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-black/55 transition-all duration-200 hover:-translate-y-0.5 hover:bg-black/[0.04] hover:text-black hover:shadow-sm disabled:cursor-default disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:shadow-none"
            title="Scroll right"
            aria-label={`Scroll ${category} right`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onShowMore(category)}
            className="ml-1 h-8 rounded-md px-2.5 text-xs font-bold transition hover:bg-black/[0.04]"
            style={{ color: C.brand }}
          >
            See all
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        style={{ maskImage: railMask, WebkitMaskImage: railMask }}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1.5 [scrollbar-color:rgba(0,0,0,.22)_transparent] [scrollbar-width:thin] sm:gap-3"
      >
        {templates.map((template) => {
          const selectedIndex = selectedIds.indexOf(template.id);
          return (
            <div key={template.id} className="w-[132px] shrink-0 snap-start sm:w-40">
              <TemplateCard
                template={template}
                selected={selectedIndex >= 0}
                order={selectedIndex >= 0 ? selectedIndex + 1 : undefined}
                onToggle={() => onToggle(template.id)}
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
  isLoading,
  isStarting,
  onToggle,
  onClear,
  onStart,
  onShowMore,
}: {
  templates: SavedPageTemplate[];
  selectedIds: string[];
  isLoading: boolean;
  isStarting: boolean;
  onToggle: (id: string) => void;
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
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label)),
      );
    });
    return grouped;
  }, [templates]);

  const populatedCategories = TEMPLATE_CATEGORIES.filter(
    (category) => (templatesByCategory.get(category)?.length ?? 0) > 0,
  );

  // Selected templates in tap order — drives the bucket bar's stacked thumbnails.
  const selectedTemplates = selectedIds
    .map((id) => templates.find((template) => template.id === id))
    .filter((template): template is SavedPageTemplate => Boolean(template));

  return (
    <div>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-b border-black/5 py-4">
              <div className="u-shimmer mb-3 h-6 w-40 rounded bg-black/5" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 5 }).map((__, itemIndex) => (
                  <div key={itemIndex} className="u-shimmer aspect-square w-[132px] shrink-0 rounded-md bg-black/5 sm:w-40" />
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
                onToggle={onToggle}
                onShowMore={onShowMore}
              />
            );
          })}
          {populatedCategories.length === 0 && (
            <div className="rounded-md border border-dashed border-black/15 bg-white px-4 py-12 text-center text-sm font-semibold text-black/45">
              No templates are available yet.
            </div>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div
          data-testid="template-bucket"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-black/[0.08] bg-white/85 p-2.5 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.5)] backdrop-blur-xl motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:bottom-5 sm:p-3"
        >
          {/* Stacked thumbnails of the current selection, in page order */}
          <div className="flex shrink-0 items-center pl-1 pr-1">
            {selectedTemplates.slice(0, 5).map((template, index) => (
              <div
                key={template.id}
                className="relative -ml-3 h-11 w-11 overflow-hidden rounded-lg shadow-md ring-2 ring-white transition-transform first:ml-0 hover:-translate-y-0.5 motion-safe:animate-in motion-safe:zoom-in-75"
                style={{ zIndex: 10 - index }}
                title={`${index + 1}. ${template.label}`}
              >
                <TemplatePreview template={template} showSamplePhotos className="absolute inset-0" />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 text-center text-[9px] font-bold leading-4 text-white">
                  {index + 1}
                </span>
              </div>
            ))}
            {selectedTemplates.length > 5 && (
              <div
                className="relative -ml-3 grid h-11 w-11 place-items-center rounded-lg bg-black/80 text-xs font-bold text-white shadow-md ring-2 ring-white"
                style={{ zIndex: 4 }}
              >
                +{selectedTemplates.length - 5}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">Your book</div>
            <div className="truncate text-xs text-black/50">
              {selectedIds.length} page{selectedIds.length === 1 ? "" : "s"} selected · numbers show order
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            title="Clear bucket"
            aria-label="Clear template bucket"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-black/45 transition-all duration-200 hover:-translate-y-0.5 hover:bg-black/5 hover:text-black active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={isStarting}
            data-testid="open-bucket-editor"
            className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] disabled:opacity-60"
            style={{ background: C.brand }}
          >
            <Rocket className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">{isStarting ? "Opening..." : "Open in Editor"}</span>
            <span className="sm:hidden">Open</span>
          </button>
        </div>
      )}
    </div>
  );
}

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Designer templates",
    body: "Start from dozens of ready-made layouts for every occasion — birthdays, travel, weddings and more.",
  },
  {
    icon: WandSparkles,
    title: "Magic Fill",
    body: "Drop in your photos and auto-fill every frame in a single tap. Shuffle until it feels just right.",
  },
  {
    icon: Download,
    title: "Print-ready PDF",
    body: "Export a crisp, high-resolution book that looks exactly like your design — ready to print.",
  },
];

function FeatureStrip() {
  const revealRef = useScrollReveal<HTMLDivElement>("[data-feature-card]", { y: 24 });
  return (
    <section className="border-b border-black/[0.06]">
      <div
        ref={revealRef}
        className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:grid-cols-3 sm:gap-4 sm:px-6 md:py-10"
      >
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            data-feature-card
            className="group flex items-start gap-3 rounded-xl border border-black/[0.08] bg-white/70 p-4 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.5)] transition duration-200 hover:-translate-y-0.5 hover:border-black/[0.14] hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.55)] sm:flex-col sm:gap-2.5"
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110"
              style={{ background: `color-mix(in oklab, ${C.brand} 14%, white)`, color: C.brand }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3
                className="text-[15px] font-semibold"
                style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
              >
                {title}
              </h3>
              <p className="mt-1 text-[13px] leading-5 text-black/55">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingPage() {
  const router = useRouter();
  const { currentUser, logout, isAdmin } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateModalCategory, setTemplateModalCategory] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState<"recent" | "open" | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const adminTemplates = useBookStore((s) => s.adminTemplates ?? []);
  const availableTemplates = useMemo(() => {
    const adminIds = new Set(adminTemplates.map((template) => template.id));
    return [
      ...adminTemplates,
      ...BUILT_IN_TEMPLATES.filter((template) => !adminIds.has(template.id)),
    ];
  }, [adminTemplates]);
  const initAdminTemplates = useBookStore((s) => s.initAdminTemplates);
  const resetBook = useBookStore((s) => s.resetBook);
  const addPage = useBookStore((s) => s.addPage);
  const applyPageTemplate = useBookStore((s) => s.applyPageTemplate);
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

  // Orchestrated hero entrance (reduced-motion safe).
  // IMPORTANT: GSAP only animates TRANSFORM here, never opacity. `.from()` applies its start
  // value via immediateRender; if a tween is ever throttled/interrupted the target would be
  // stranded at that value. By keeping opacity out of GSAP, a stalled tween leaves content a few
  // px offset but fully VISIBLE. The fade is handled by a pure-CSS keyframe that always completes.
  const heroAnimRef = useGsapEntrance<HTMLDivElement>(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.7 } });
    tl.from("[data-anim='eyebrow']", { y: 16 })
      .from("[data-anim='title']", { y: 26 }, "-=0.5")
      .from("[data-anim='subtitle']", { y: 18 }, "-=0.5")
      .from("[data-anim='cta'] > *", { y: 16, stagger: 0.08 }, "-=0.45")
      .from("[data-anim='hero-book']", { y: 30, scale: 0.96, duration: 0.9 }, "-=0.65");
  });

  // Reveal template category rails as they scroll into view (re-runs once templates load).
  const templatesRevealRef = useScrollReveal<HTMLElement>(
    "[data-template-category]",
    { y: 28 },
    [isLoadingTemplates],
  );

  // Slow ambient drift on the decorative hero blobs.
  const decoRef = useGsapEntrance<HTMLDivElement>(() => {
    gsap.to("[data-anim='blob']", {
      y: (i: number) => (i % 2 === 0 ? -22 : 20),
      x: (i: number) => (i % 2 === 0 ? 14 : -12),
      duration: 7,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      stagger: 0.6,
    });
  });

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

  const startSelectedTemplates = async () => {
    const selectedTemplates = selectedTemplateIds
      .map((id) => availableTemplates.find((template) => template.id === id))
      .filter((template): template is SavedPageTemplate => Boolean(template));
    if (selectedTemplates.length === 0) {
      toast.error("Select at least one template");
      return;
    }

    setIsStarting(true);
    try {
      resetBook();
      for (let index = 0; index < selectedTemplates.length; index += 1) {
        if (index > 0) addPage();
        await applyPageTemplate(selectedTemplates[index]);
      }
      toast.success(`${selectedTemplates.length} template page${selectedTemplates.length === 1 ? "" : "s"} ready`);
      await router.navigate({ to: "/editor" });
    } catch (error) {
      console.error(error);
      toast.error("Could not open these templates");
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: C.cream, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes book-page-turn {
          0%, 18% { transform: rotateY(-2deg); filter: brightness(1); }
          44%, 58% { transform: rotateY(-52deg); filter: brightness(0.96); }
          82%, 100% { transform: rotateY(-2deg); filter: brightness(1); }
        }
        /* Pure-CSS fade for the hero — always reaches opacity:1, so content can never strand hidden. */
        @keyframes hero-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .hero-fade { animation: hero-fade-in 0.9s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          * { scroll-behavior: auto !important; animation: none !important; }
          .hero-fade { opacity: 1 !important; }
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b" style={{ backdropFilter: "blur(12px)", background: `${C.cream}e8`, borderColor: `${C.ink}0d` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" style={{ color: C.brand }} />
            <span className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>Yaara</span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <span className="hidden text-sm font-medium sm:block">{currentUser.username}</span>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: `${C.ink}22`, color: C.brand }}>
                    <Shield className="h-3.5 w-3.5" /> Admin
                  </Link>
                )}
                <button onClick={logout} title="Logout" aria-label="Log out" className="grid h-8 w-8 place-items-center rounded-md border" style={{ borderColor: `${C.ink}22` }}>
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: `${C.ink}22` }}>
                <Lock className="h-3.5 w-3.5" /> Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      <section ref={heroRef} className="relative overflow-hidden border-b border-black/5">
        {/* Decorative animated backdrop */}
        <div ref={decoRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            data-anim="blob"
            className="absolute -left-24 -top-16 h-72 w-72 rounded-full blur-3xl sm:h-96 sm:w-96"
            style={{ background: `radial-gradient(circle, color-mix(in oklab, ${C.brand} 30%, transparent), transparent 70%)` }}
          />
          <div
            data-anim="blob"
            className="absolute -right-16 top-24 h-72 w-72 rounded-full blur-3xl sm:h-96 sm:w-96"
            style={{ background: `radial-gradient(circle, color-mix(in oklab, ${C.mint} 55%, transparent), transparent 70%)` }}
          />
          <div
            data-anim="blob"
            className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, color-mix(in oklab, ${C.brand} 16%, transparent), transparent 70%)` }}
          />
        </div>

        <div
          ref={heroAnimRef}
          className="hero-fade relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:py-12"
        >
          <div className="relative z-10">
            <div
              data-anim="eyebrow"
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                color: C.brand,
                borderColor: `color-mix(in oklab, ${C.brand} 25%, transparent)`,
                background: `color-mix(in oklab, ${C.brand} 8%, white)`,
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Beautiful photobooks, made simply
            </div>
            <h1 data-anim="title" className="mt-4 max-w-xl text-4xl leading-[1.02] md:text-6xl" style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", fontWeight: 700 }}>
              Your memories, <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>bound beautifully.</span>
            </h1>
            <p data-anim="subtitle" className="mt-4 max-w-md text-sm leading-6 text-black/60 sm:text-base">
              Pick a template, add it to your bucket, and start designing in seconds.
            </p>

            <div data-anim="cta" className="mt-6 grid max-w-lg grid-cols-2 gap-2.5">
              <button
                onClick={() => setShowNewProject(true)}
                className="group relative col-span-2 flex items-center justify-between overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_-14px_rgba(150,70,40,0.65)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-16px_rgba(150,70,40,0.7)] active:scale-[0.99]"
                style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})` }}
              >
                {/* Shine sweep on hover */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  Create New Project
                </span>
                <ChevronRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button onClick={() => { setTemplateModalCategory(null); setShowTemplates(true); }} className="group inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md active:scale-[0.98]" style={{ borderColor: `${C.ink}18` }}>
                <Layers className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" style={{ color: C.brand }} /> Templates
              </button>
              <button onClick={() => setShowProjects("recent")} className="group inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md active:scale-[0.98]" style={{ borderColor: `${C.ink}18` }}>
                <Clock3 className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" style={{ color: C.brand }} /> Recent
              </button>
              <button onClick={() => setShowProjects("open")} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm font-semibold text-black/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-solid hover:text-black/80 active:scale-[0.99]" style={{ borderColor: `${C.ink}2a` }}>
                <FolderOpen className="h-4 w-4" /> Open saved project
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-black/45">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: C.brand }} /> No account needed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: C.brand }} /> Works in your browser
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: C.brand }} /> Print-ready export
              </span>
            </div>
          </div>

          <div data-anim="hero-book">
            <AnimatedHeroBook scrollPct={scrollPct} />
          </div>
        </div>
      </section>

      <FeatureStrip />

      <section ref={templatesRevealRef} className="bg-white/55 py-7 md:py-9">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-3 flex items-end justify-between gap-3 sm:mb-2">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] sm:text-xs" style={{ color: C.brand }}>Template buckets</div>
              <h2 className="mt-1 text-xl font-semibold sm:text-2xl md:text-3xl" style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}>Choose pages for your book</h2>
              <p className="mt-1 text-[13px] text-black/50 sm:text-sm">Tap templates to build your bucket. The number shows page order.</p>
            </div>
          </div>
          <HomeTemplatesGrid
            templates={availableTemplates}
            selectedIds={selectedTemplateIds}
            isLoading={isLoadingTemplates}
            isStarting={isStarting}
            onToggle={toggleTemplate}
            onClear={() => setSelectedTemplateIds([])}
            onStart={startSelectedTemplates}
            onShowMore={(category) => {
              setTemplateModalCategory(category);
              setShowTemplates(true);
            }}
          />
        </div>
      </section>

      {/* Clearance so the fixed template-bucket bar never covers the footer on mobile */}
      {selectedTemplateIds.length > 0 && <div className="h-24 sm:h-20" aria-hidden="true" />}

      <footer className="border-t" style={{ borderColor: `${C.ink}0d` }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: C.brand }} />
            <span className="text-base" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
              Yaara
            </span>
          </div>
          <p className="text-xs text-black/45">© 2026 Yaara Photobook Studio · Made for your memories</p>
        </div>
      </footer>

      <LoginModal open={showLogin} onOpenChange={setShowLogin} />
      <NewProjectModal open={showNewProject} onOpenChange={setShowNewProject} />
      <TemplateStartModal
        open={showTemplates}
        onOpenChange={setShowTemplates}
        templates={availableTemplates}
        initialCategory={templateModalCategory}
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
