import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth";
import { LoginModal } from "./LoginModal";
import { NewProjectModal } from "./NewProjectModal";
import { ProjectSelectionModal } from "./ProjectSelectionModal";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Clock,
  FolderOpen,
  LogIn,
  LogOut,
  Plus,
  Shield,
  Sparkles,
  Star,
  Layers,
  Download,
  Palette,
} from "lucide-react";

export function LandingPage() {
  const { currentUser, logout, isAdmin } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showProjects, setShowProjects] = useState<"recent" | "open" | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col overflow-x-hidden relative">
      {/* Background soft gradients */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[800px] w-[800px] rounded-full bg-blue-200/50 blur-[100px]" />
        <div className="absolute top-[20%] -left-40 h-[600px] w-[600px] rounded-full bg-cyan-200/40 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[500px] w-[700px] rounded-full bg-indigo-200/30 blur-[100px]" />
      </div>

      {/* ── Top Navigation ─────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-md bg-white/40 border-b border-white/60 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span
            className="text-2xl font-bold tracking-tight text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Yaara
          </span>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-600/10 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                {isAdmin ? "Admin" : "User"} - {currentUser.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-900/10"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-blue-200 bg-white/60 text-blue-600 hover:bg-blue-50 hover:text-blue-700 shadow-sm"
              onClick={() => setShowLogin(true)}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="relative max-w-4xl backdrop-blur-xl bg-white/40 border border-white/60 p-12 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-sm font-medium text-blue-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Custom Photobook Creator
          </div>

          {/* Heading */}
          <h1
            className="text-5xl font-bold tracking-tight md:text-7xl text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Create a Photobook for{" "}
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              Every Memory
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed font-medium">
            Yaara helps you design beautiful 5.5 x 5.5 photobooks for birthdays, weddings,
            travel, family stories, couples, and gifts with easy templates, stickers,
            backgrounds, and print-ready PDF export.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Create New Project */}
            <button
              id="btn-create-project"
              onClick={() => setShowNewProject(true)}
              className="group relative flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-8 py-4 text-base font-semibold text-white shadow-xl transition-all hover:scale-105 hover:shadow-blue-500/25 active:scale-100 border border-white/20"
            >
              <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
              Create New Project
              <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Recently Used Projects */}
            <button
              id="btn-recent-projects"
              onClick={() => setShowProjects("recent")}
              className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-8 py-4 text-base font-semibold text-slate-700 backdrop-blur-md shadow-sm transition-all hover:bg-white/80 hover:scale-105 active:scale-100"
            >
              <Clock className="h-5 w-5 text-indigo-500" />
              Recent Projects
            </button>

            {/* Open My Projects */}
            <button
              id="btn-open-projects"
              onClick={() => setShowProjects("open")}
              className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-8 py-4 text-base font-semibold text-slate-700 backdrop-blur-md shadow-sm transition-all hover:bg-white/80 hover:scale-105 active:scale-100"
            >
              <FolderOpen className="h-5 w-5 text-cyan-500" />
              Open My Projects
            </button>
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-24 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-12 text-center text-3xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Everything You Need to Build Your Book
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Layers className="h-6 w-6" />,
                color: "from-blue-400 to-indigo-500",
                title: "Occasion Templates",
                desc: "Start with ready layouts for birthdays, weddings, travel, couples, family memories, baby books, and gifts.",
              },
              {
                icon: <Palette className="h-6 w-6" />,
                color: "from-cyan-400 to-blue-500",
                title: "Drag-and-Drop Editing",
                desc: "Place photos, frames, text, stickers, and backgrounds exactly where you want them.",
              },
              {
                icon: <Star className="h-6 w-6" />,
                color: "from-indigo-400 to-purple-500",
                title: "Stickers & Frames",
                desc: "Use admin sticker folders, custom uploads, frame styles, and text to personalize each page.",
              },
              {
                icon: <BookOpen className="h-6 w-6" />,
                color: "from-sky-400 to-blue-500",
                title: "5.5 x 5.5 Format",
                desc: "Build every book in one consistent square size that is simple to preview, export, and print.",
              },
              {
                icon: <Sparkles className="h-6 w-6" />,
                color: "from-blue-500 to-cyan-500",
                title: "Real Book Preview",
                desc: "Flip through your photobook on mobile or desktop before exporting.",
              },
              {
                icon: <Download className="h-6 w-6" />,
                color: "from-indigo-500 to-blue-600",
                title: "Print-Ready PDF",
                desc: "Export a clean high-quality PDF for printing, sharing, or saving.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="group rounded-3xl border border-white/60 bg-white/40 p-6 backdrop-blur-xl transition-all hover:bg-white/60 shadow-sm hover:shadow-md hover:-translate-y-1"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feat.color} text-white shadow-md`}
                >
                  {feat.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-800">{feat.title}</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-200/60 bg-white/30 backdrop-blur-md px-6 py-6 text-center lg:px-12">
        <p className="text-sm font-medium text-slate-500">
          Copyright 2026 Yaara - Custom Photobook Studio. All rights reserved.
        </p>
      </footer>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <LoginModal open={showLogin} onOpenChange={setShowLogin} />
      <NewProjectModal open={showNewProject} onOpenChange={setShowNewProject} />
      {showProjects && (
        <ProjectSelectionModal
          open={true}
          onOpenChange={(v) => { if (!v) setShowProjects(null); }}
          mode={showProjects}
        />
      )}
    </div>
  );
}
