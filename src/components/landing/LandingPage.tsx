import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FolderOpen,
  Layers,
  Lock,
  LogOut,
  Plus,
  Rocket,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth";
import { useBookStore } from "@/lib/photobook/store";
import { applyTemplate, TEMPLATES } from "@/lib/photobook/templates";
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

const TEMPLATE_CATEGORY_ORDER = [
  "Birthday",
  "Travel",
  "Wedding",
  "Family",
  "Couples",
  "Baby",
  "Common",
  "Cover Page",
  "Back Cover",
  "Minimal",
  "Magazine",
  "Scrapbook",
  "Polaroid",
  "Grid",
  "Collage",
  "General",
];

const BUILT_IN_TEMPLATES: SavedPageTemplate[] = TEMPLATES.map((template, index) => ({
  id: `built-in-${template.id}`,
  label: template.label,
  background: "#f8f4ea",
  elements: applyTemplate(template.id, [], FIXED_PAGE_SIZE.width, FIXED_PAGE_SIZE.height),
  sizeId: FIXED_PAGE_SIZE_ID,
  category: template.style,
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
      className="group min-w-0 text-left focus-visible:outline-none"
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-md border-2 bg-white transition duration-200 group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 ${
          selected
            ? "border-emerald-600 shadow-[0_12px_28px_-16px_rgba(5,150,105,0.8)]"
            : "border-black/10 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.45)]"
        }`}
      >
        <TemplatePreview template={template} className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/65 px-2.5 py-2 text-white backdrop-blur-sm">
          <span className="truncate text-[11px] font-semibold">{template.label}</span>
          <span className="ml-2 shrink-0 text-[10px] opacity-75">
            {template.category?.trim() || "General"}
          </span>
        </div>
        <span
          className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border transition ${
            selected
              ? "scale-100 border-emerald-500 bg-emerald-600 text-white"
              : "scale-90 border-white/80 bg-white/85 text-transparent group-hover:text-black/30"
          }`}
          aria-hidden="true"
        >
          {selected && order ? (
            <span className="text-[11px] font-bold">{order}</span>
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{template.label}</span>
        <span className={`text-[11px] font-semibold ${selected ? "text-emerald-700" : "text-black/45"}`}>
          {selected ? "Added" : "Add"}
        </span>
      </div>
    </button>
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
  onShowMore: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = useMemo(() => {
    const found = Array.from(new Set(templates.map((template) => template.category?.trim() || "General")));
    return found.sort((a, b) => {
      const pa = TEMPLATE_CATEGORY_ORDER.indexOf(a);
      const pb = TEMPLATE_CATEGORY_ORDER.indexOf(b);
      if (pa === -1 && pb === -1) return a.localeCompare(b);
      if (pa === -1) return 1;
      if (pb === -1) return -1;
      return pa - pb;
    });
  }, [templates]);
  const visibleTemplates = useMemo(
    () =>
      templates
        .filter((template) => activeCategory === "All" || (template.category?.trim() || "General") === activeCategory)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label))
        .slice(0, 8),
    [activeCategory, templates],
  );

  return (
    <div>
      <div
        className="mb-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Template categories"
      >
        {["All", ...categories].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
            style={{
              borderColor: activeCategory === category ? C.ink : `${C.ink}18`,
              background: activeCategory === category ? C.ink : "white",
              color: activeCategory === category ? C.cream : `${C.ink}b3`,
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-md bg-black/5" />
          ))}
        </div>
      ) : visibleTemplates.length === 0 ? (
        <div className="py-10 text-center text-sm text-black/50">No templates in this bucket.</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visibleTemplates.map((template) => {
            const selectedIndex = selectedIds.indexOf(template.id);
            return (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedIndex >= 0}
                order={selectedIndex >= 0 ? selectedIndex + 1 : undefined}
                onToggle={() => onToggle(template.id)}
              />
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button onClick={onShowMore} className="inline-flex items-center gap-2 text-sm font-semibold text-black/65 transition hover:text-black">
          Browse every template
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div
          data-testid="template-bucket"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl items-center gap-3 rounded-lg border border-black/10 bg-white/95 p-2.5 shadow-2xl backdrop-blur-xl motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:bottom-5 sm:p-3"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-emerald-800" style={{ background: C.mint }}>
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
            disabled={isStarting}
            data-testid="open-bucket-editor"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: C.brand }}
          >
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">{isStarting ? "Opening..." : "Open in Editor"}</span>
            <span className="sm:hidden">Open</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const { currentUser, logout, isAdmin } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProjects, setShowProjects] = useState<"recent" | "open" | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const adminTemplates = useBookStore((s) => s.adminTemplates ?? []);
  const availableTemplates = adminTemplates.length > 0 ? adminTemplates : BUILT_IN_TEMPLATES;
  const initAdminTemplates = useBookStore((s) => s.initAdminTemplates);
  const resetBook = useBookStore((s) => s.resetBook);
  const addPage = useBookStore((s) => s.addPage);
  const applyPageTemplate = useBookStore((s) => s.applyPageTemplate);
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
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; animation: none !important; } }
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
                <button onClick={logout} title="Logout" className="grid h-8 w-8 place-items-center rounded-md border" style={{ borderColor: `${C.ink}22` }}>
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
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:py-12">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: C.brand }}>
              <Sparkles className="h-3.5 w-3.5" /> Beautiful photobooks, made simply
            </div>
            <h1 className="mt-4 max-w-xl text-4xl leading-[1.02] md:text-6xl" style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", fontWeight: 700 }}>
              Your memories, <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>bound beautifully.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-black/60 sm:text-base">
              Pick a template, add it to your bucket, and start designing in seconds.
            </p>

            <div className="mt-6 grid max-w-lg grid-cols-2 gap-2.5">
              <button onClick={() => setShowNewProject(true)} className="group col-span-2 flex items-center justify-between rounded-md px-4 py-3 text-sm font-semibold text-white shadow-lg" style={{ background: C.brand }}>
                <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4 transition group-hover:rotate-90" />Create New Project</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => setShowTemplates(true)} className="inline-flex items-center justify-center gap-2 rounded-md border bg-white px-3 py-2.5 text-sm font-semibold" style={{ borderColor: `${C.ink}18` }}>
                <Layers className="h-4 w-4" /> Templates
              </button>
              <button onClick={() => setShowProjects("recent")} className="inline-flex items-center justify-center gap-2 rounded-md border bg-white px-3 py-2.5 text-sm font-semibold" style={{ borderColor: `${C.ink}18` }}>
                <Clock3 className="h-4 w-4" /> Recent
              </button>
              <button onClick={() => setShowProjects("open")} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm font-semibold text-black/60" style={{ borderColor: `${C.ink}2a` }}>
                <FolderOpen className="h-4 w-4" /> Open .wanderbook project
              </button>
            </div>
          </div>

          <AnimatedHeroBook scrollPct={scrollPct} />
        </div>
      </section>

      <section className="bg-white/55 py-10 md:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: C.brand }}>Template buckets</div>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl" style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}>Choose pages for your book</h2>
              <p className="mt-1 text-sm text-black/50">Tap templates to build your bucket. The number shows page order.</p>
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
            onShowMore={() => setShowTemplates(true)}
          />
        </div>
      </section>

      <footer className="border-t py-5 text-center text-xs text-black/45" style={{ borderColor: `${C.ink}0d` }}>
        (c) 2026 Yaara Photobook Studio
      </footer>

      <LoginModal open={showLogin} onOpenChange={setShowLogin} />
      <NewProjectModal open={showNewProject} onOpenChange={setShowNewProject} />
      <TemplateStartModal open={showTemplates} onOpenChange={setShowTemplates} />
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
