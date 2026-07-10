import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth";
import { LoginModal } from "./LoginModal";
import { NewProjectModal } from "./NewProjectModal";
import { ProjectSelectionModal } from "./ProjectSelectionModal";
import { TemplateStartModal } from "./TemplateStartModal";
import { useBookStore } from "@/lib/photobook/store";
import { TemplatePreview } from "@/components/photobook/TemplatePreview";
import type { SavedPageTemplate } from "@/lib/photobook/types";
import {
  BookOpen,
  Clock,
  FolderOpen,
  LogOut,
  Plus,
  Shield,
  Sparkles,
  Star,
  Layers,
  Download,
  Palette,
  Upload,
  Truck,
  ArrowRight,
  Lock,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  brand: "oklch(0.55 0.14 35)",
  brandSoft: "oklch(0.88 0.06 55)",
  ink: "oklch(0.18 0.02 60)",
  cream: "oklch(0.983 0.012 85)",
};

// ─── Samples data ─────────────────────────────────────────────────────────────
const SAMPLES = [
  {
    title: "Travel",
    tag: "12 spreads",
    img: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80",
    img2: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80",
    img3: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  },
  {
    title: "Wedding",
    tag: "24 spreads",
    img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    img2: "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400&q=80",
    img3: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80",
  },
  {
    title: "Family",
    tag: "16 spreads",
    img: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&q=80",
    img2: "https://images.unsplash.com/photo-1543342384-1f1350e27861?w=400&q=80",
    img3: "https://images.unsplash.com/photo-1602576666092-bf6447a729fc?w=400&q=80",
  },
  {
    title: "Birthday",
    tag: "10 spreads",
    img: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80",
    img2: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    img3: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80",
  },
];

const STEPS = [
  {
    icon: Upload,
    num: "01",
    title: "Upload",
    desc: "Drop in your favorite photos from any device — JPG, PNG, or WebP.",
  },
  {
    icon: Sparkles,
    num: "02",
    title: "Arrange",
    desc: "Smart layouts auto-fill your spreads, or go fully custom with our drag-and-drop editor.",
  },
  {
    icon: Truck,
    num: "03",
    title: "Delivered",
    desc: "Premium printed book at your door in 3–5 days. Ships worldwide.",
  },
];

const FEATURES = [
  {
    icon: Layers,
    color: `linear-gradient(135deg, oklch(0.65 0.14 250), oklch(0.5 0.18 265))`,
    title: "Occasion Templates",
    desc: "Start with ready layouts for birthdays, weddings, travel, couples, family memories, baby books, and gifts.",
  },
  {
    icon: Palette,
    color: `linear-gradient(135deg, oklch(0.65 0.14 195), oklch(0.55 0.18 235))`,
    title: "Drag-and-Drop Editing",
    desc: "Place photos, frames, text, stickers, and backgrounds exactly where you want them.",
  },
  {
    icon: Star,
    color: `linear-gradient(135deg, oklch(0.60 0.16 290), oklch(0.50 0.20 310))`,
    title: "Stickers & Frames",
    desc: "Use admin sticker folders, custom uploads, frame styles, and text to personalize each page.",
  },
  {
    icon: BookOpen,
    color: `linear-gradient(135deg, oklch(0.65 0.14 35), oklch(0.45 0.12 25))`,
    title: "5.5 × 5.5 Format",
    desc: "Build every book in one consistent square size that is simple to preview, export, and print.",
  },
  {
    icon: Sparkles,
    color: `linear-gradient(135deg, oklch(0.65 0.18 60), oklch(0.55 0.16 45))`,
    title: "Real Book Preview",
    desc: "Flip through your photobook on mobile or desktop before exporting.",
  },
  {
    icon: Download,
    color: `linear-gradient(135deg, oklch(0.60 0.14 160), oklch(0.48 0.16 145))`,
    title: "Print-Ready PDF",
    desc: "Export a clean high-quality PDF for printing, sharing, or saving.",
  },
];

// ─── Floating photo card ──────────────────────────────────────────────────────
function FloatingPhoto({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute w-28 h-32 rounded-xl bg-white p-1.5 shadow-2xl border border-white/70 hp-float ${className ?? ""}`}
      style={style}
    >
      <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
    </div>
  );
}

const TEMPLATE_CATEGORY_ORDER = ["Birthday", "Travel", "Wedding", "Family", "Couples", "Baby", "Common", "General"];

function TemplateCard({ template, onClick }: { template: SavedPageTemplate; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-w-0 text-left"
    >
      <div className="relative aspect-square overflow-hidden rounded-md border border-black/10 bg-white shadow-[0_8px_24px_-18px_rgba(0,0,0,0.45)] transition duration-300 group-hover:-translate-y-1 group-hover:border-black/25 group-hover:shadow-[0_18px_35px_-20px_rgba(0,0,0,0.5)]">
        <TemplatePreview
          template={template}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-end bg-black/0 p-3 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
          <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-black shadow-md">
            Use template
          </span>
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

function HomeTemplatesGrid({
  templates,
  onShowMore,
}: {
  templates: SavedPageTemplate[];
  onShowMore: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = useMemo(() => {
    const found = Array.from(new Set(templates.map((template) => template.category?.trim() || "General")));
    return found.sort((a, b) => {
      const priorityA = TEMPLATE_CATEGORY_ORDER.indexOf(a);
      const priorityB = TEMPLATE_CATEGORY_ORDER.indexOf(b);
      if (priorityA === -1 && priorityB === -1) return a.localeCompare(b);
      if (priorityA === -1) return 1;
      if (priorityB === -1) return -1;
      return priorityA - priorityB;
    });
  }, [templates]);
  const visibleTemplates = useMemo(
    () =>
      templates
        .filter(
          (template) =>
            activeCategory === "All" || (template.category?.trim() || "General") === activeCategory,
        )
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label))
        .slice(0, 12),
    [activeCategory, templates],
  );

  if (!templates || templates.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No templates available.</div>;
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap gap-2" aria-label="Template categories">
        {["All", ...categories].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className="rounded-full border px-4 py-2 text-sm font-semibold transition"
            style={{
              borderColor: activeCategory === category ? C.ink : `${C.ink}18`,
              background: activeCategory === category ? C.ink : "rgba(255,255,255,0.55)",
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

      {visibleTemplates.length === 0 && (
        <div className="border-y border-black/10 py-12 text-center text-sm" style={{ color: `${C.ink}80` }}>
          No templates in this category yet.
        </div>
      )}
    </div>
  );
}

// ─── Main LandingPage ─────────────────────────────────────────────────────────
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

  const handleLogout = () => {
    logout();
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: C.cream, color: C.ink, fontFamily: "'Inter', sans-serif" }}
    >
      {/* ═══════════════════════════════════════
          NAV
      ═══════════════════════════════════════ */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backdropFilter: "blur(12px)",
          background: `${C.cream}b0`,
          borderColor: `${C.ink}0d`,
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: C.brand }} />
            <span
              className="text-xl"
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
              }}
            >
              Yaara
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex gap-8 text-sm" style={{ color: `${C.ink}b3` }}>
            <a href="#how" className="hover:opacity-100 opacity-70 transition">
              How it works
            </a>
            <a href="#samples" className="hover:opacity-100 opacity-70 transition">
              Samples
            </a>
            <a href="#features" className="hover:opacity-100 opacity-70 transition">
              Features
            </a>
          </nav>

          {/* Right-side auth */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <span className="hidden sm:block text-sm font-medium" style={{ color: C.ink }}>
                  {currentUser.username}
                </span>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-white/80"
                    style={{ borderColor: `${C.ink}22`, color: C.brand }}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-white/80"
                  style={{ borderColor: `${C.ink}22`, color: C.ink }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition hover:bg-white/80"
                style={{ borderColor: `${C.ink}22`, color: C.ink }}
              >
                <Lock className="h-3.5 w-3.5" />
                Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-28 grid md:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div className="hp-fade-up">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-6"
              style={{
                borderColor: `${C.ink}1a`,
                background: "rgba(255,255,255,0.65)",
                color: `${C.ink}b3`,
              }}
            >
              <Star className="w-3 h-3 fill-current" style={{ color: C.brand }} />
              Beautiful photobooks for every memory
            </div>

            {/* Headline */}
            <h1
              className="text-5xl md:text-6xl leading-[1.05] tracking-tight"
              style={{
                fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                fontWeight: 700,
              }}
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

            <p className="mt-5 text-lg max-w-md" style={{ color: `${C.ink}b3` }}>
              Design beautiful 5.5 × 5.5 photobooks for birthdays, weddings, travel, family stories,
              and gifts — with easy templates, stickers, and print-ready PDF export.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
              <button
                id="btn-create-project"
                onClick={() => setShowNewProject(true)}
                className="group col-span-2 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 active:scale-95"
                style={{ background: C.brand }}
              >
                <Plus className="w-4 h-4 transition group-hover:rotate-90" />
                Create New Project
              </button>

              <button
                id="btn-start-template"
                onClick={() => setShowTemplates(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition hover:bg-white hover:scale-105 active:scale-95"
                style={{ border: `1px solid ${C.ink}22`, color: C.ink }}
              >
                <Layers className="w-4 h-4" />
                Templates
              </button>

              <button
                id="btn-recent-projects"
                onClick={() => setShowProjects("recent")}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition hover:bg-white hover:scale-105 active:scale-95"
                style={{ border: `1px solid ${C.ink}22`, color: C.ink }}
              >
                <Clock className="w-4 h-4" />
                Recent Projects
              </button>

              <button
                id="btn-open-projects"
                onClick={() => setShowProjects("open")}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition hover:bg-white hover:scale-105 active:scale-95 col-span-2"
                style={{ border: `1px dashed ${C.ink}33`, color: `${C.ink}99` }}
              >
                <FolderOpen className="w-4 h-4" />
                Open My Projects (.wanderbook file)
              </button>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-3 text-xs" style={{ color: `${C.ink}80` }}>
              <div className="flex -space-x-2">
                {["35", "160", "320", "60"].map((hue, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white"
                    style={{ background: `oklch(0.65 0.14 ${hue})` }}
                  />
                ))}
              </div>
              <span>5.5 × 5.5 square format · Print-ready PDF export</span>
            </div>
          </div>

          {/* Right — 3D book + floating photos */}
          <div
            className="relative h-[460px] flex items-center justify-center"
            style={{
              perspective: "1600px",
              transform: `translateY(${scrollPct * 60}px)`,
              transition: "transform 0.08s linear",
            }}
          >
            {/* 3D Book */}
            <div
              className="hp-book-enter relative w-64 h-80 rounded-r-xl shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${C.brand}, oklch(0.38 0.12 25))`,
                boxShadow: "0 40px 80px -20px rgba(0,0,0,0.4), inset -8px 0 20px rgba(0,0,0,0.25)",
                transform: "rotateY(-25deg)",
                transformStyle: "preserve-3d",
                transformOrigin: "left center",
              }}
            >
              {/* Book spine shadow */}
              <div className="absolute left-0 top-0 bottom-0 w-3 rounded-l bg-black/30" />
              {/* Book pages edge */}
              <div className="absolute right-0 top-1 bottom-1 w-2 rounded-r bg-white/20" />
              {/* Book content */}
              <div
                className="absolute inset-6 flex flex-col justify-between"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                <div className="text-[10px] tracking-[0.35em] uppercase opacity-60">Yaara</div>
                <div>
                  <div
                    className="text-3xl leading-tight"
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontStyle: "italic",
                    }}
                  >
                    Our Story
                  </div>
                  <div className="text-xs mt-2 opacity-60">2025 Edition</div>
                </div>
              </div>
            </div>

            {/* Floating photo cards */}
            <FloatingPhoto
              src="https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80"
              className="hp-float-1"
              style={{ top: "8%", left: "2%", animationDelay: "0s" }}
            />
            <FloatingPhoto
              src="https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80"
              className="hp-float-2"
              style={{ top: "5%", right: "1%", animationDelay: "0.4s" }}
            />
            <FloatingPhoto
              src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&q=80"
              className="hp-float-3"
              style={{ bottom: "5%", right: "2%", animationDelay: "0.8s" }}
            />
            <FloatingPhoto
              src="https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&q=80"
              className="hp-float-4"
              style={{ bottom: "8%", left: "0%", animationDelay: "1.2s" }}
            />

            {/* Ambient glow behind book */}
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{ background: C.brandSoft }}
            />
          </div>
        </div>

        {/* Background blobs */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-35"
          style={{ background: C.brandSoft }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: C.brand }}
        />
      </section>

      {/* ═══════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════ */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <div
            className="text-xs tracking-[0.3em] uppercase mb-3 font-semibold"
            style={{ color: `${C.ink}70` }}
          >
            How it works
          </div>
          <h2
            className="text-4xl md:text-5xl tracking-tight"
            style={{
              fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
              fontWeight: 700,
            }}
          >
            Three steps.{" "}
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              That's all.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl bg-white p-8 border transition-all hover:-translate-y-1 hover:shadow-md"
              style={{
                borderColor: `${C.ink}0d`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="absolute top-6 right-6 text-5xl font-bold select-none"
                style={{ color: `${C.ink}08`, fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {s.num}
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
                style={{ background: C.brandSoft }}
              >
                <s.icon className="w-5 h-5" style={{ color: C.brand }} />
              </div>
              <div
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
              >
                {s.title}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: `${C.ink}99` }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SAMPLES
      ═══════════════════════════════════════ */}
      <section id="samples" className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div
              className="text-xs tracking-[0.3em] uppercase mb-3 font-semibold"
              style={{ color: `${C.ink}70` }}
            >
              Samples
            </div>
            <h2
              className="text-4xl md:text-5xl tracking-tight"
              style={{
                fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                fontWeight: 700,
              }}
            >
              What you can{" "}
              <span
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
              >
                make
              </span>
            </h2>
          </div>
          {/* intentionally removed verbose descriptor */}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SAMPLES.map((s) => (
            <div
              key={s.title}
              className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-2 hover:shadow-xl"
              style={{
                border: `1px solid ${C.ink}0d`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onClick={() => setShowNewProject(true)}
            >
              <div className="relative aspect-[3/4]">
                <img
                  src={s.img}
                  alt={s.title}
                  className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <img
                  src={s.img2}
                  alt=""
                  className="absolute bottom-14 right-3 w-16 h-16 rounded-lg object-cover border-2 border-white shadow-lg transition-transform group-hover:rotate-0"
                  style={{ transform: "rotate(6deg)" }}
                />
                <img
                  src={s.img3}
                  alt=""
                  className="absolute bottom-24 right-14 w-14 h-14 rounded-lg object-cover border-2 border-white shadow-lg transition-transform group-hover:rotate-0"
                  style={{ transform: "rotate(-8deg)" }}
                />
                <div className="absolute bottom-4 left-4 text-white">
                  <div
                    className="text-lg font-semibold"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    {s.title}
                  </div>
                  <div className="text-xs opacity-75">{s.tag}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          TEMPLATES (Home gallery)
      ═══════════════════════════════════════ */}
      <section id="templates" className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div
              className="text-xs tracking-[0.3em] uppercase mb-3 font-semibold"
              style={{ color: `${C.ink}70` }}
            >
              Templates
            </div>
            <h2
              className="text-3xl md:text-4xl tracking-tight"
              style={{
                fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                fontWeight: 700,
              }}
            >
              Ready-made layouts to get started
            </h2>
          </div>
          <div>
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-white"
              style={{ border: `1px solid ${C.ink}22`, color: C.ink }}
            >
              Browse all templates
            </button>
          </div>
        </div>

        <HomeTemplatesGrid templates={adminTemplates} onShowMore={() => setShowTemplates(true)} />
      </section>

      {/* ═══════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════ */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <div
            className="text-xs tracking-[0.3em] uppercase mb-3 font-semibold"
            style={{ color: `${C.ink}70` }}
          >
            Features
          </div>
          <h2
            className="text-4xl md:text-5xl tracking-tight"
            style={{
              fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
              fontWeight: 700,
            }}
          >
            Everything you need{" "}
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              to build your book
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="group rounded-2xl bg-white p-6 border transition-all hover:-translate-y-1 hover:shadow-md"
              style={{
                borderColor: `${C.ink}0d`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md"
                style={{ background: feat.color }}
              >
                <feat.icon className="h-6 w-6" />
              </div>
              <h3
                className="mb-2 text-lg font-bold"
                style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
              >
                {feat.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: `${C.ink}80` }}>
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA BANNER
      ═══════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div
          className="relative overflow-hidden rounded-3xl p-12 md:p-16 text-center"
          style={{ background: C.ink }}
        >
          <div
            className="absolute inset-0 opacity-25"
            style={{
              background: `radial-gradient(circle at 25% 25%, ${C.brand}, transparent 55%), radial-gradient(circle at 75% 75%, ${C.brandSoft}, transparent 55%)`,
            }}
          />
          <div className="relative">
            <h2
              className="text-4xl md:text-5xl tracking-tight"
              style={{
                fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                fontWeight: 700,
                color: C.cream,
              }}
            >
              Start your book{" "}
              <span
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
              >
                today
              </span>
            </h2>
            <p className="mt-4 max-w-md mx-auto text-sm" style={{ color: `${C.cream}cc` }}>
              5.5 × 5.5 square format · Print-ready PDF · Stickers, frames & templates included
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition hover:scale-105 active:scale-95"
              style={{ background: C.cream, color: C.ink }}
            >
              Create your photobook
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <footer
        className="border-t py-8 text-center text-xs"
        style={{ borderColor: `${C.ink}0d`, color: `${C.ink}70` }}
      >
        © 2026 Yaara — Custom Photobook Studio. All rights reserved.
      </footer>

      {/* ═══════════════════════════════════════
          MODALS
      ═══════════════════════════════════════ */}
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
