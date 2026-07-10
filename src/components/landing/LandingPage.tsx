import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ChevronRight, Clock3, FolderOpen, Layers, Lock, LogOut, Plus, Shield, Upload } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { LoginModal } from "./LoginModal";
import { NewProjectModal } from "./NewProjectModal";
import { ProjectSelectionModal } from "./ProjectSelectionModal";
import { TemplateStartModal } from "./TemplateStartModal";
import { useBookStore } from "@/lib/photobook/store";
import { TemplatePreview } from "@/components/photobook/TemplatePreview";
import type { SavedPageTemplate } from "@/lib/photobook/types";

const C = {
  brand: "oklch(0.55 0.14 35)",
  brandSoft: "oklch(0.88 0.06 55)",
  ink: "oklch(0.18 0.02 60)",
  cream: "oklch(0.983 0.012 85)",
};

const TEMPLATE_CATEGORY_ORDER = ["Birthday", "Travel", "Wedding", "Family", "Couples", "Baby", "Common", "General"];

function FloatingPhoto({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`absolute h-32 w-28 rounded-xl border border-white/70 bg-white p-1.5 shadow-2xl ${className ?? ""}`} style={style}>
      <img src={src} alt="" className="h-full w-full rounded-lg object-cover" />
    </div>
  );
}

function TemplateCard({ template, onClick }: { template: SavedPageTemplate; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group min-w-0 text-left">
      <div className="relative aspect-square overflow-hidden rounded-md border border-black/10 bg-white shadow-[0_8px_24px_-18px_rgba(0,0,0,0.45)] transition duration-300 group-hover:-translate-y-1">
        <TemplatePreview template={template} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-end bg-black/0 p-3 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
          <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-black shadow-md">Use template</span>
        </div>
      </div>
      <div className="mt-3 truncate text-sm font-semibold" style={{ color: C.ink }}>
        {template.label}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: `${C.ink}70` }}>
        {template.category?.trim() || "General"}
      </div>
    </button>
  );
}

function HomeTemplatesGrid({ templates, onShowMore }: { templates: SavedPageTemplate[]; onShowMore: () => void }) {
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
        .slice(0, 12),
    [activeCategory, templates],
  );

  if (!templates || templates.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">No templates available.</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2" aria-label="Template categories">
        {["All", ...categories].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className="rounded-full border px-4 py-2 text-sm font-semibold transition"
            style={{
              borderColor: activeCategory === category ? C.ink : `${C.ink}18`,
              background: activeCategory === category ? C.ink : "rgba(255,255,255,0.65)",
              color: activeCategory === category ? C.cream : `${C.ink}b3`,
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visibleTemplates.map((template) => (
          <TemplateCard key={template.id} template={template} onClick={onShowMore} />
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  const { currentUser, logout, isAdmin } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProjects, setShowProjects] = useState<"recent" | "open" | null>(null);
  const adminTemplates = useBookStore((s) => s.adminTemplates ?? []);
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const { top, height } = heroRef.current.getBoundingClientRect();
      setScrollPct(Math.max(0, Math.min(1, -top / height)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: C.cream, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-40 border-b" style={{ backdropFilter: "blur(12px)", background: `${C.cream}b0`, borderColor: `${C.ink}0d` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" style={{ color: C.brand }} />
            <span className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
              Yaara
            </span>
          </div>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <span className="hidden text-sm font-medium sm:block">{currentUser.username}</span>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: `${C.ink}22`, color: C.brand }}>
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                )}
                <button onClick={logout} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: `${C.ink}22` }}>
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold" style={{ borderColor: `${C.ink}22` }}>
                <Lock className="h-3.5 w-3.5" />
                Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      <section ref={heroRef} className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-18 pt-16 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: `${C.ink}1a`, background: "rgba(255,255,255,0.65)", color: `${C.ink}b3` }}>
              Beautiful photobooks for every memory
            </div>
            <h1 className="mt-6 text-4xl leading-[1.05] tracking-tight md:text-6xl" style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", fontWeight: 700 }}>
              Your memories,{" "}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>
                bound beautifully.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7" style={{ color: `${C.ink}b3` }}>
              Design clean 5.5 × 5.5 photobooks for travel, birthdays, weddings, family stories, and gifts with templates, stickers, and print-ready PDF export.
            </p>
            <div className="mt-7 max-w-md space-y-3">
              <button onClick={() => setShowNewProject(true)} className="group flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-semibold text-white" style={{ background: C.brand, boxShadow: "0 18px 30px -18px rgba(0,0,0,0.45)" }}>
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4 transition group-hover:rotate-90" />
                  Create New Project
                </span>
                <ChevronRight className="h-4 w-4 opacity-80" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowTemplates(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: `${C.ink}20` }}>
                  <Layers className="h-4 w-4" />
                  Templates
                </button>
                <button onClick={() => setShowProjects("recent")} className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: `${C.ink}20` }}>
                  <Clock3 className="h-4 w-4" />
                  Recent
                </button>
              </div>
              <button onClick={() => setShowProjects("open")} className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed px-5 py-4 text-left text-sm font-semibold" style={{ borderColor: `${C.ink}2a`, color: `${C.ink}99` }}>
                <span className="inline-flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Open My Projects (.wanderbook file)
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-white/60 px-4 py-2 text-xs" style={{ borderColor: `${C.ink}14`, color: `${C.ink}78` }}>
              <Upload className="h-3.5 w-3.5" />
              5.5 × 5.5 square format · Print-ready PDF export
            </div>
          </div>

          <div className="relative flex h-[460px] items-center justify-center" style={{ perspective: "1600px", transform: `translateY(${scrollPct * 60}px)`, transition: "transform 0.08s linear" }}>
            <div className="relative h-80 w-64 rounded-r-xl shadow-2xl" style={{ background: `linear-gradient(135deg, ${C.brand}, oklch(0.38 0.12 25))`, boxShadow: "0 40px 80px -20px rgba(0,0,0,0.4), inset -8px 0 20px rgba(0,0,0,0.25)", transform: "rotateY(-25deg)", transformStyle: "preserve-3d", transformOrigin: "left center" }}>
              <div className="absolute bottom-0 left-0 top-0 w-3 rounded-l bg-black/30" />
              <div className="absolute right-0 top-1 bottom-1 w-2 rounded-r bg-white/20" />
              <div className="absolute inset-6 flex flex-col justify-between" style={{ color: "rgba(255,255,255,0.9)" }}>
                <div className="text-[10px] uppercase tracking-[0.35em] opacity-60">Yaara</div>
                <div>
                  <div className="text-3xl leading-tight" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
                    Your Story
                  </div>
                  <div className="mt-2 text-xs opacity-60">2026 Edition</div>
                </div>
              </div>
            </div>
            <FloatingPhoto src="https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80" className="left-[2%] top-[8%]" style={{ animationDelay: "0s" }} />
            <FloatingPhoto src="https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80" className="right-[1%] top-[5%]" style={{ animationDelay: "0.4s" }} />
            <FloatingPhoto src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&q=80" className="bottom-[5%] right-[2%]" style={{ animationDelay: "0.8s" }} />
            <FloatingPhoto src="https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&q=80" className="bottom-[8%] left-[0%]" style={{ animationDelay: "1.2s" }} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-[28px] border bg-white/65 p-5 md:p-6" style={{ borderColor: `${C.ink}12` }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: `${C.ink}68` }}>
                Templates
              </div>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl" style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}>
                Start with a layout bucket
              </h2>
            </div>
            <button onClick={() => setShowTemplates(true)} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: `${C.ink}20` }}>
              Browse all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <HomeTemplatesGrid templates={adminTemplates} onShowMore={() => setShowTemplates(true)} />
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs" style={{ borderColor: `${C.ink}0d`, color: `${C.ink}70` }}>
        © 2026 Yaara — Custom Photobook Studio. All rights reserved.
      </footer>

      <LoginModal open={showLogin} onOpenChange={setShowLogin} />
      <NewProjectModal open={showNewProject} onOpenChange={setShowNewProject} />
      <TemplateStartModal open={showTemplates} onOpenChange={setShowTemplates} />
      {showProjects && (
        <ProjectSelectionModal
          open={true}
          onOpenChange={(v) => {
            if (!v) setShowProjects(null);
          }}
          mode={showProjects}
        />
      )}
    </div>
  );
}
