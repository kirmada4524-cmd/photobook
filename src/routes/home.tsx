import { useState, useEffect } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Lock, Users } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useBookStore } from "@/lib/photobook/store";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Yaara - Custom Photobook Studio" },
      { name: "description", content: "Create beautiful 5.5 x 5.5 photobooks for any special memory with Yaara." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { currentUser, logout, isAdmin } = useAuthStore();
  const router = useRouter();
  const savedProjects = useBookStore((s) => s.savedProjects);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600" />
          <p className="text-sm text-slate-500 animate-pulse font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent">
              <BookOpen className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Yaara</h1>
              <p className="text-xs text-muted-foreground">Custom Photobook Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <>
                <div className="text-right text-sm">
                  <p className="font-medium">{currentUser.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                </div>
                {isAdmin && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin">
                      <Lock className="h-4 w-4 mr-2" />
                      Admin
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!currentUser ? (
        <main className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl font-bold mb-4">Welcome to Yaara</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create beautiful 5.5 x 5.5 photobooks for birthdays, weddings, travel,
              family memories, couples, and gifts. Design, customize, and export print-ready PDFs.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild className="gap-2">
                <Link to="/login">
                  <BookOpen className="h-5 w-5" />
                  Sign In
                </Link>
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Easy Design</h3>
              <p className="text-sm text-muted-foreground">
                Ready templates and drag-and-drop tools make every book simple to build
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Customizable</h3>
              <p className="text-sm text-muted-foreground">
                Add photos, text, stickers, backgrounds, and frames for any occasion
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">
                Export clean high-quality PDFs made for printing, sharing, or saving
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* Dashboard */
        <main className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-12">
            <h2 className="font-display text-3xl font-bold mb-2">Welcome back, {currentUser.username}!</h2>
            <p className="text-muted-foreground">Continue working on your photobooks or start something new</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            <Button
              size="lg"
              asChild
              className="gap-2 h-20 text-lg"
            >
              <Link to="/editor">
                <BookOpen className="h-6 w-6" />
                New Project
              </Link>
            </Button>
            <div className="rounded-lg border-2 border-dashed bg-muted/50 p-6 text-center">
              <p className="text-muted-foreground">Import a project file</p>
            </div>
          </div>

          {/* Recent Projects */}
          <div>
            <h3 className="font-display text-xl font-bold mb-6">
              Your Projects ({savedProjects.length})
            </h3>
            {savedProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/50 p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No saved projects yet. Create one to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-6">
                {savedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group rounded-lg border bg-card p-4 cursor-pointer hover:shadow-md transition"
                  >
                    <div className="aspect-square rounded-md bg-muted mb-4 flex items-center justify-center">
                      {project.cover ? (
                        <img
                          src={project.cover}
                          alt={project.label}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <h4 className="font-semibold truncate">{project.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                    <Button size="sm" className="mt-4 w-full">Open</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
