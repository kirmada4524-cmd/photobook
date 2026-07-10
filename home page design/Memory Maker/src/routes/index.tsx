import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { BookOpen, Upload, Sparkles, Truck, ArrowRight, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

const samples = [
  {
    title: "Travel",
    tag: "12 spreads",
    imgs: [
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80",
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    ],
  },
  {
    title: "Wedding",
    tag: "24 spreads",
    imgs: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80",
    ],
  },
  {
    title: "Family",
    tag: "16 spreads",
    imgs: [
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&q=80",
      "https://images.unsplash.com/photo-1543342384-1f1350e27861?w=400&q=80",
      "https://images.unsplash.com/photo-1602576666092-bf6447a729fc?w=400&q=80",
    ],
  },
  {
    title: "Birthday",
    tag: "10 spreads",
    imgs: [
      "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80",
    ],
  },
];

const steps = [
  { icon: Upload, title: "Upload", desc: "Drop in your favorite photos from any device." },
  { icon: Sparkles, title: "Arrange", desc: "Smart layouts auto-arrange your spreads." },
  { icon: Truck, title: "Delivered", desc: "Premium printed book, at your door in days." },
];

function Index() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bookRotate = useTransform(scrollYProgress, [0, 1], [0, -25]);
  const bookY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <div className="min-h-screen bg-cream text-ink" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Nav */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-40 backdrop-blur-md bg-cream/70 border-b border-ink/5"
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: "var(--brand)" }} />
            <span
              className="text-xl"
              style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
            >
              Yaara
            </span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm text-ink/70">
            <a href="#how" className="hover:text-ink transition">
              How it works
            </a>
            <a href="#samples" className="hover:text-ink transition">
              Samples
            </a>
            <a href="#pricing" className="hover:text-ink transition">
              Pricing
            </a>
          </nav>
          <button
            className="rounded-full px-5 py-2 text-sm font-medium text-cream transition hover:scale-105"
            style={{ background: "var(--ink)" }}
          >
            Start now
          </button>
        </div>
      </motion.header>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-3 py-1 text-xs text-ink/70 mb-6"
            >
              <Star className="w-3 h-3 fill-current" style={{ color: "var(--brand)" }} />
              Loved by 12,000+ storytellers
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl md:text-6xl leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              Your memories,{" "}
              <span
                style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}
              >
                bound beautifully.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-5 text-lg text-ink/70 max-w-md"
            >
              Turn your favorite photos into a premium printed photobook in minutes. Upload,
              arrange, order — that's it.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <button
                className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-cream transition hover:scale-105"
                style={{ background: "var(--brand)" }}
              >
                Create your book
                <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
              </button>
              <button className="rounded-full border border-ink/20 px-6 py-3 text-sm font-medium hover:bg-white transition">
                See samples
              </button>
            </motion.div>
            <div className="mt-8 flex items-center gap-4 text-xs text-ink/60">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-cream bg-gradient-to-br from-brand-soft to-brand"
                    style={{
                      background: `linear-gradient(135deg, var(--brand-soft), var(--brand))`,
                    }}
                  />
                ))}
              </div>
              <span>Free preview · Ships in 3–5 days</span>
            </div>
          </div>

          {/* Animated book */}
          <motion.div
            style={{ rotate: bookRotate, y: bookY }}
            className="relative h-[420px] flex items-center justify-center [perspective:1600px]"
          >
            <motion.div
              initial={{ rotateY: -80, opacity: 0 }}
              animate={{ rotateY: -25, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ rotateY: -12 }}
              className="relative w-64 h-80 rounded-r-lg shadow-2xl [transform-style:preserve-3d]"
              style={{
                background: `linear-gradient(135deg, var(--brand), oklch(0.4 0.12 30))`,
                boxShadow: "0 40px 80px -20px rgba(0,0,0,0.35), inset -8px 0 20px rgba(0,0,0,0.3)",
              }}
            >
              <div className="absolute inset-6 flex flex-col justify-between text-cream/90">
                <div className="text-xs tracking-[0.3em] uppercase opacity-70">Yaara</div>
                <div>
                  <div
                    className="text-3xl"
                    style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
                  >
                    Our Story
                  </div>
                  <div className="text-xs mt-2 opacity-70">2025 Edition</div>
                </div>
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/30" />
            </motion.div>

            {/* Floating photos */}
            {[
              {
                src: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80",
                x: -160,
                y: -100,
                r: -12,
                d: 0.6,
              },
              {
                src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80",
                x: 140,
                y: -60,
                r: 10,
                d: 0.8,
              },
              {
                src: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&q=80",
                x: 170,
                y: 120,
                r: -8,
                d: 1.0,
              },
              {
                src: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&q=80",
                x: -180,
                y: 90,
                r: 14,
                d: 1.2,
              },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.6, x: p.x, y: p.y, rotate: p.r }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: p.x,
                  y: p.y,
                  rotate: p.r,
                }}
                transition={{ duration: 0.8, delay: p.d }}
                whileHover={{ scale: 1.08, rotate: 0, zIndex: 20 }}
                className="absolute w-28 h-32 rounded-md bg-white p-2 shadow-xl"
              >
                <img src={p.src} alt="" className="w-full h-full object-cover rounded-sm" />
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Ambient gradient blobs */}
        <div
          className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{ background: "var(--brand-soft)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: "var(--brand)" }}
        />
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <motion.div {...fadeUp} className="text-center mb-14">
          <div className="text-xs tracking-[0.3em] uppercase text-ink/50 mb-3">How it works</div>
          <h2
            className="text-4xl md:text-5xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            Three steps.{" "}
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}>
              That's all.
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              whileHover={{ y: -6 }}
              className="relative rounded-2xl bg-white p-8 border border-ink/5 shadow-sm"
            >
              <div className="absolute top-6 right-6 text-5xl text-ink/5 font-bold">0{i + 1}</div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
                style={{ background: "var(--brand-soft)" }}
              >
                <s.icon className="w-5 h-5" style={{ color: "var(--brand)" }} />
              </div>
              <div
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.title}
              </div>
              <p className="text-sm text-ink/60 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Samples */}
      <section id="samples" className="mx-auto max-w-6xl px-6 py-20">
        <motion.div {...fadeUp} className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs tracking-[0.3em] uppercase text-ink/50 mb-3">Samples</div>
            <h2
              className="text-4xl md:text-5xl tracking-tight"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              What you can{" "}
              <span
                style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}
              >
                make
              </span>
            </h2>
          </div>
          <p className="hidden md:block max-w-xs text-sm text-ink/60">
            Every book is fully customizable — start from a template or a blank page.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {samples.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              whileHover={{ y: -8 }}
              className="group relative rounded-2xl overflow-hidden bg-white border border-ink/5 shadow-sm cursor-pointer"
            >
              <div className="relative aspect-[3/4]">
                <img
                  src={s.imgs[0]}
                  alt={s.title}
                  className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {/* small collage overlays */}
                <motion.img
                  src={s.imgs[1]}
                  className="absolute bottom-14 right-3 w-16 h-16 rounded object-cover border-2 border-white shadow-lg"
                  initial={{ rotate: 6 }}
                  whileHover={{ rotate: 0, scale: 1.05 }}
                />
                <motion.img
                  src={s.imgs[2]}
                  className="absolute bottom-24 right-14 w-14 h-14 rounded object-cover border-2 border-white shadow-lg"
                  initial={{ rotate: -8 }}
                  whileHover={{ rotate: 0 }}
                />
                <div className="absolute bottom-4 left-4 text-white">
                  <div
                    className="text-lg font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.title}
                  </div>
                  <div className="text-xs opacity-80">{s.tag}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl p-12 md:p-16 text-center"
          style={{ background: "var(--ink)" }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 30% 20%, var(--brand), transparent 50%), radial-gradient(circle at 70% 80%, var(--brand-soft), transparent 50%)`,
            }}
          />
          <div className="relative">
            <h2
              className="text-4xl md:text-5xl text-cream tracking-tight"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              Start your book{" "}
              <span
                style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}
              >
                today
              </span>
            </h2>
            <p className="mt-4 text-cream/70 max-w-md mx-auto">
              From $39 · Free preview before you print · Ships worldwide
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-medium text-ink"
              style={{ background: "var(--cream)" }}
            >
              Create your photobook
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-ink/5 py-8 text-center text-xs text-ink/50">
        © 2026 Yaara · Made with care
      </footer>
    </div>
  );
}
