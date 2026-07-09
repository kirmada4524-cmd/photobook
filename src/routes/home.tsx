import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { BookOpen, LayoutGrid, LogOut, Lock, Upload, Sparkles, Truck, ArrowRight, Star, Plus, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { useBookStore } from "@/lib/photobook/store";
import { TemplateStartModal } from "@/components/landing/TemplateStartModal";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Yaara - Custom Photobook Studio" },
      {
        name: "description",
        content:
          "Create beautiful 5.5 x 5.5 photobooks for birthdays, weddings, travel, family memories, and gifts.",
      },
    ],
  }),
  component: HomePage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND = "oklch(0.55 0.14 35)";
const BRAND_SOFT = "oklch(0.88 0.06 55)";
const INK = "oklch(0.18 0.02 60)";
const CREAM = "oklch(0.983 0.012 85)";

// ─── Sample book categories ───────────────────────────────────────────────────
const samples = [
  {
    title: "Travel",
    tag: "12 spreads",
    color: "from-[oklch(0.60_0.15_35)] to-[oklch(0.40_0.12_30)]",
    img: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80",
    img2: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80",
    img3: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  },
  {
    title: "Wedding",
    tag: "24 spreads",
    color: "from-[oklch(0.65_0.10_320)] to-[oklch(0.45_0.10_300)]",
    img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    img2: "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400&q=80",
    img3: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80",
  },
  {
    title: "Family",
    tag: "16 spreads",
    color: "from-[oklch(0.60_0.14_160)] to-[oklch(0.40_0.12_150)]",
    img: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&q=80",
    img2: "https://images.unsplash.com/photo-1543342384-1f1350e27861?w=400&q=80",
    img3: "https://images.unsplash.com/photo-1602576666092-bf6447a729fc?w=400&q=80",
  },
  {
    title: "Birthday",
    tag: "10 spreads",
    color: "from-[oklch(0.65_0.15_60)] to-[oklch(0.45_0.12_50)]",
    img: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80",
    img2: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    img3: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80",
  },
];

const steps = [
  {
    icon: Upload,
    num: "01",
    title: "Upload",
    desc: "Drop in your favorite photos from any device — we accept JPG, PNG, and WebP.",
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
    desc: "Premium printed book, at your door in 3–5 days. Ships worldwide.",
  },
];

// ─── Floating photo card ──────────────────────────────────────────────────────
function FloatingCard({
  src,
  style,
  delay,
}: {
  src: string;
  style: React.CSSProperties;
  delay: number;
}) {
  return (
    <div
      className="absolute w-28 h-32 rounded-xl bg-white p-1.5 shadow-2xl border border-white/60"
      style={{
        ...style,
        animation: `homeFloat ${3.5 + delay * 0.4}s ease-in-out ${delay * 0.25}s infinite alternate`,
      }}
    >
      <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
    </div>
  );
}

// ─── Logged-out landing page ──────────────────────────────────────────────────
function LandingView({ onSignIn }: { onSignIn: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const { top, height } = heroRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, -top / height));
      setScrollPct(pct);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: CREAM, color: INK, fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Nav ── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backdropFilter: "blur(12px)",
          background: `${CREAM}b0`,
          borderColor: `${INK}0d`,
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: BRAND }} />
            <span
              className="text-xl"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Yaara
            </span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm" style={{ color: `${INK}b3` }}>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#samples" className="hover:text-foreground transition">Samples</a>
          </nav>
          <button
            onClick={onSignIn}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:scale-105 active:scale-95"
            style={{ background: INK }}
          >
            Sign in
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-28 grid md:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div className="home-fade-up" style={{ animationDelay: "0s" }}>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-6"
              style={{ borderColor: `${INK}1a`, background: "rgba(255,255,255,0.6)", color: `${INK}b3` }}
            >
              <Star className="w-3 h-3 fill-current" style={{ color: BRAND }} />
              Loved by 12,000+ storytellers
            </div>
            <h1
              className="text-5xl md:text-6xl leading-[1.05] tracking-tight"
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
            <p className="mt-5 text-lg max-w-md" style={{ color: `${INK}b3` }}>
              Turn your favorite photos into a premium printed photobook in minutes.
              Upload, arrange, order — that's it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onSignIn}
                className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 active:scale-95"
                style={{ background: BRAND }}
              >
                Create your book
                <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
              </button>
              <a
                href="#samples"
                className="rounded-full border px-6 py-3 text-sm font-semibold hover:bg-white/80 transition"
                style={{ borderColor: `${INK}33` }}
              >
                See samples
              </a>
            </div>
            <div className="mt-8 flex items-center gap-3 text-xs" style={{ color: `${INK}99` }}>
              <div className="flex -space-x-2">
                {["35", "160", "320", "60"].map((hue, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white"
                    style={{ background: `oklch(0.65 0.14 ${hue})` }}
                  />
                ))}
              </div>
              <span>Free preview · Ships in 3–5 days</span>
            </div>
          </div>

          {/* Right — animated book + floating photos */}
          <div
            className="relative h-[420px] flex items-center justify-center"
            style={{
              perspective: "1600px",
              transform: `rotate(${-25 * scrollPct}deg) translateY(${80 * scrollPct}px)`,
              transition: "transform 0.1s linear",
            }}
          >
            {/* Book spine */}
            <div
              className="relative w-64 h-80 rounded-r-xl shadow-2xl home-book-enter"
              style={{
                background: `linear-gradient(135deg, ${BRAND}, oklch(0.4 0.12 30))`,
                boxShadow: "0 40px 80px -20px rgba(0,0,0,0.35), inset -8px 0 20px rgba(0,0,0,0.3)",
                transform: "rotateY(-25deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="absolute inset-6 flex flex-col justify-between"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                <div className="text-xs tracking-[0.3em] uppercase opacity-70">Yaara</div>
                <div>
                  <div
                    className="text-3xl"
                    style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
                  >
                    Our Story
                  </div>
                  <div className="text-xs mt-2 opacity-70">2025 Edition</div>
                </div>
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l bg-black/30" />
            </div>

            {/* Floating photos */}
            {[
              {
                src: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80",
                style: { top: "10%", left: "2%" },
                delay: 0,
              },
              {
                src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80",
                style: { top: "8%", right: "0%" },
                delay: 0.8,
              },
              {
                src: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&q=80",
                style: { bottom: "8%", right: "2%" },
                delay: 1.5,
              },
              {
                src: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&q=80",
                style: { bottom: "10%", left: "0%" },
                delay: 1.1,
              },
            ].map((p, i) => (
              <FloatingCard key={i} src={p.src} style={p.style} delay={p.delay} />
            ))}
          </div>
        </div>

        {/* Ambient blobs */}
        <div
          className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{ background: BRAND_SOFT }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: BRAND }}
        />
      </section>

      {/* ── How it works ── */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16 home-fade-up-scroll">
          <div
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ color: `${INK}80` }}
          >
            How it works
          </div>
          <h2
            className="text-4xl md:text-5xl tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", fontWeight: 700 }}
          >
            Three steps.{" "}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>
              That's all.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl bg-white p-8 border transition hover:-translate-y-1 home-fade-up-scroll"
              style={{
                borderColor: `${INK}0d`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                animationDelay: `${i * 0.12}s`,
              }}
            >
              <div
                className="absolute top-6 right-6 text-5xl font-bold select-none"
                style={{ color: `${INK}08` }}
              >
                {s.num}
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
                style={{ background: BRAND_SOFT }}
              >
                <s.icon className="w-5 h-5" style={{ color: BRAND }} />
              </div>
              <div
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
              >
                {s.title}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: `${INK}99` }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Samples ── */}
      <section id="samples" className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex items-end justify-between mb-12 home-fade-up-scroll">
          <div>
            <div
              className="text-xs tracking-[0.3em] uppercase mb-3"
              style={{ color: `${INK}80` }}
            >
              Samples
            </div>
            <h2
              className="text-4xl md:text-5xl tracking-tight"
              style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", fontWeight: 700 }}
            >
              What you can{" "}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>
                make
              </span>
            </h2>
          </div>
          <p className="hidden md:block max-w-xs text-sm" style={{ color: `${INK}99` }}>
            Every book is fully customizable — start from a template or a blank page.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {samples.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-2xl overflow-hidden bg-white border cursor-pointer transition hover:-translate-y-2 home-fade-up-scroll"
              style={{
                borderColor: `${INK}0d`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div className="relative aspect-[3/4]">
                <img
                  src={s.img}
                  alt={s.title}
                  className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {/* Mini overlay photos */}
                <img
                  src={s.img2}
                  alt=""
                  className="absolute bottom-14 right-3 w-16 h-16 rounded object-cover border-2 border-white shadow-lg transition group-hover:rotate-0"
                  style={{ transform: "rotate(6deg)" }}
                />
                <img
                  src={s.img3}
                  alt=""
                  className="absolute bottom-24 right-14 w-14 h-14 rounded object-cover border-2 border-white shadow-lg transition group-hover:rotate-0"
                  style={{ transform: "rotate(-8deg)" }}
                />
                <div className="absolute bottom-4 left-4 text-white">
                  <div
                    className="text-lg font-semibold"
                    style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
                  >
                    {s.title}
                  </div>
                  <div className="text-xs opacity-80">{s.tag}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div
          className="relative overflow-hidden rounded-3xl p-12 md:p-16 text-center home-fade-up-scroll"
          style={{ background: INK }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${BRAND}, transparent 50%), radial-gradient(circle at 70% 80%, ${BRAND_SOFT}, transparent 50%)`,
            }}
          />
          <div className="relative">
            <h2
              className="text-4xl md:text-5xl tracking-tight"
              style={{
                fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                fontWeight: 700,
                color: CREAM,
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
            <p className="mt-4 max-w-md mx-auto text-sm" style={{ color: `${CREAM}b3` }}>
              Free preview before you print · Ships worldwide · Satisfaction guaranteed
            </p>
            <button
              onClick={onSignIn}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition hover:scale-105 active:scale-95"
              style={{ background: CREAM, color: INK }}
            >
              Create your photobook
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t py-8 text-center text-xs"
        style={{ borderColor: `${INK}0d`, color: `${INK}80` }}
      >
        © 2026 Yaara · Made with care
      </footer>
    </div>
  );
}

// ─── Logged-in dashboard ──────────────────────────────────────────────────────
function DashboardView({
  username,
  isAdmin,
  savedProjects,
  onLogout,
  onOpenTemplates,
}: {
  username: string;
  isAdmin: boolean;
  savedProjects: { id: string; label: string; cover?: string; updatedAt: string | number }[];
  onLogout: () => void;
  onOpenTemplates: () => void;
}) {
  return (
    <div
      className="min-h-screen"
      style={{ background: CREAM, color: INK, fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Dashboard Nav ── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backdropFilter: "blur(12px)",
          background: `${CREAM}b0`,
          borderColor: `${INK}0d`,
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: BRAND }} />
            <span
              className="text-xl"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Yaara
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right text-sm">
              <p className="font-medium leading-tight">{username}</p>
            </div>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                style={{ borderColor: `${INK}22` }}
              >
                <Lock className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
              style={{ borderColor: `${INK}22` }}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Dashboard body ── */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Greeting */}
        <div className="mb-10 home-fade-up">
          <h1
            className="text-3xl md:text-4xl tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", fontWeight: 700 }}
          >
            Welcome back,{" "}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>
              {username}!
            </span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: `${INK}99` }}>
            Continue working on your photobooks or start something new.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-14">
          {/* New Project */}
          <Link
            to="/editor"
            className="group relative overflow-hidden rounded-2xl p-6 text-white flex flex-col gap-3 transition hover:-translate-y-1 hover:shadow-xl home-fade-up"
            style={{
              background: `linear-gradient(135deg, ${BRAND}, oklch(0.38 0.12 25))`,
              animationDelay: "0.05s",
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">New Project</p>
              <p className="text-xs text-white/70 mt-0.5">Start from a blank canvas</p>
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-hover:opacity-80 transition" />
          </Link>

          {/* Templates */}
          <button
            onClick={onOpenTemplates}
            className="group relative overflow-hidden rounded-2xl p-6 flex flex-col gap-3 transition hover:-translate-y-1 hover:shadow-lg text-left home-fade-up"
            style={{
              background: "white",
              border: `1px solid ${INK}15`,
              animationDelay: "0.1s",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: BRAND_SOFT }}
            >
              <LayoutGrid className="w-5 h-5" style={{ color: BRAND }} />
            </div>
            <div>
              <p className="font-semibold text-sm">Templates</p>
              <p className="text-xs mt-0.5" style={{ color: `${INK}80` }}>Browse pre-made designs</p>
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-hover:opacity-70 transition" style={{ color: INK }} />
          </button>

          {/* Import */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-3 border-2 border-dashed home-fade-up"
            style={{ borderColor: `${INK}22`, animationDelay: "0.15s" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${INK}0a` }}
            >
              <FileText className="w-5 h-5" style={{ color: `${INK}80` }} />
            </div>
            <div>
              <p className="font-semibold text-sm">Import</p>
              <p className="text-xs mt-0.5" style={{ color: `${INK}60` }}>Open a .wanderbook file</p>
            </div>
          </div>
        </div>

        {/* Recent projects */}
        <div className="home-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}
            >
              Your Projects
              <span
                className="ml-2 text-base font-normal"
                style={{ color: `${INK}60` }}
              >
                ({savedProjects.length})
              </span>
            </h2>
            {savedProjects.length > 0 && (
              <Link
                to="/editor"
                className="text-xs font-semibold flex items-center gap-1 transition hover:opacity-70"
                style={{ color: BRAND }}
              >
                New project <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {savedProjects.length === 0 ? (
            <div
              className="rounded-2xl border-2 border-dashed p-16 text-center"
              style={{ borderColor: `${INK}18` }}
            >
              <BookOpen
                className="h-10 w-10 mx-auto mb-4"
                style={{ color: `${INK}40` }}
              />
              <p className="font-medium text-sm">No saved projects yet</p>
              <p className="text-xs mt-1.5" style={{ color: `${INK}60` }}>
                Create a new project or pick a template to get started.
              </p>
              <Link
                to="/editor"
                className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-105"
                style={{ background: BRAND }}
              >
                <Plus className="w-4 h-4" />
                Create your first book
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {savedProjects.map((project, i) => (
                <div
                  key={project.id}
                  className="group rounded-2xl border bg-white overflow-hidden cursor-pointer transition hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    borderColor: `${INK}0d`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  <div className="aspect-square bg-muted/50 flex items-center justify-center overflow-hidden">
                    {project.cover ? (
                      <img
                        src={project.cover}
                        alt={project.label}
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <BookOpen className="h-8 w-8" style={{ color: `${INK}40` }} />
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-sm truncate">{project.label}</h4>
                    <p className="text-[11px] mt-0.5" style={{ color: `${INK}60` }}>
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                    <Link
                      to="/editor"
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                      style={{ background: BRAND }}
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Root page component ──────────────────────────────────────────────────────
function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { currentUser, logout, isAdmin } = useAuthStore();
  const router = useRouter();
  const savedProjects = useBookStore((s) => s.savedProjects);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4"
            style={{ borderColor: `${BRAND}40`, borderTopColor: BRAND }}
          />
          <p className="text-sm font-medium" style={{ color: `${INK}80` }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  if (!currentUser) {
    return (
      <>
        <LandingView onSignIn={() => router.navigate({ to: "/login" })} />
        <TemplateStartModal open={showTemplates} onOpenChange={setShowTemplates} />
      </>
    );
  }

  return (
    <>
      <DashboardView
        username={currentUser.username}
        isAdmin={isAdmin}
        savedProjects={savedProjects}
        onLogout={handleLogout}
        onOpenTemplates={() => setShowTemplates(true)}
      />
      <TemplateStartModal open={showTemplates} onOpenChange={setShowTemplates} />
    </>
  );
}
