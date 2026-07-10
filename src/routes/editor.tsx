import { Component, type ReactNode, useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EditorHeader } from "@/components/photobook/EditorHeader";
import { LibrarySidebar } from "@/components/photobook/LibrarySidebar";
import { DesignSidebar } from "@/components/photobook/DesignSidebar";
import { Canvas } from "@/components/photobook/Canvas";
import { Toaster } from "@/components/ui/sonner";
import { useBookStore } from "@/lib/photobook/store";
import { Button } from "@/components/ui/button";
import { Eye, Image as ImageIcon, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Yaara - Photobook Editor" },
      {
        name: "description",
        content:
          "Design a beautiful custom photobook with photos, templates, stickers, backgrounds, and print-ready PDF export.",
      },
      { property: "og:title", content: "Yaara - Photobook Editor" },
      {
        property: "og:description",
        content:
          "Design a beautiful custom photobook with photos, templates, stickers, backgrounds, and print-ready PDF export.",
      },
    ],
  }),
  component: EditorPage,
});

/** Height constants for mobile layout */
const MOBILE_TOOLBAR_H = 56; // h-14 = 56px
const MOBILE_PANEL_H = 300; // sidebar panel height

class SidebarErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Editor sidebar crashed", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
        <div>
          <p className="text-sm font-semibold">Design tools need a refresh.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The editor is still safe. Reopen the panel to continue.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false })}>
          Reload tools
        </Button>
      </div>
    );
  }
}

function EditorPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const showLibrarySidebar = useBookStore((s) => s.showLibrarySidebar);
  const showDesignSidebar = useBookStore((s) => s.showDesignSidebar);
  const toggleLibrarySidebar = useBookStore((s) => s.toggleLibrarySidebar);
  const toggleDesignSidebar = useBookStore((s) => s.toggleDesignSidebar);

  if (!mounted) {
    return (
      <div className="flex h-[100dvh] w-full flex-col bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">
            Loading editor...
          </p>
        </div>
      </div>
    );
  }

  const panelOpen = showLibrarySidebar || showDesignSidebar;

  return (
    /*
     * MOBILE LAYOUT (< md):
     *  ┌─────────────────────┐  ← EditorHeader (shrink-0)
     *  │      Canvas         │  ← flex-1, exact px height set via inline style
     *  │                     │
     *  ├─────────────────────┤
     *  │  Photo / Design     │  ← fixed 300px panel (shrink-0), shown conditionally
     *  │  sidebar panel      │
     *  ├─────────────────────┤
     *  │  Bottom Toolbar     │  ← shrink-0  56px
     *  └─────────────────────┘
     *
     * DESKTOP LAYOUT (≥ md):
     *  ┌───────────────────────────────────────────────────┐  EditorHeader
     *  │ LeftSidebar │       Canvas        │ RightSidebar  │  flex-1 flex-row
     *  └───────────────────────────────────────────────────┘
     */
    <div className="editor-shell flex h-[100dvh] w-full flex-col bg-background overflow-hidden">
      {/* ── Header ── */}
      <EditorHeader />

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden flex-col md:flex-row">
        {/* DESKTOP: Left sidebar */}
        <div className="hidden md:flex h-full shrink-0">
          {showLibrarySidebar && <LibrarySidebar />}
        </div>

        {/* Canvas — fills remaining column height on mobile */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Canvas />
        </div>

        {/* DESKTOP: Right sidebar */}
        <div className="hidden md:flex h-full shrink-0">
          {showDesignSidebar && (
            <SidebarErrorBoundary>
              <DesignSidebar />
            </SidebarErrorBoundary>
          )}
        </div>
      </div>

      {/* ── MOBILE: sidebar panel (BELOW canvas, ABOVE toolbar) ── */}
      {panelOpen && (
        <div
          className="md:hidden shrink-0 border-t bg-background overflow-hidden"
          style={{ height: MOBILE_PANEL_H }}
        >
          {showLibrarySidebar && (
            <div className="w-full h-full overflow-y-auto">
              <LibrarySidebar />
            </div>
          )}
          {showDesignSidebar && !showLibrarySidebar && (
            <div className="w-full h-full overflow-y-auto">
              <SidebarErrorBoundary>
                <DesignSidebar />
              </SidebarErrorBoundary>
            </div>
          )}
        </div>
      )}

      {/* ── MOBILE: bottom toolbar ── */}
      <div
        className="md:hidden shrink-0 flex border-t bg-card items-center justify-around z-40"
        style={{ height: MOBILE_TOOLBAR_H }}
      >
        <Button
          variant="ghost"
          asChild
          className="flex flex-col gap-1 h-full flex-1 rounded-none text-primary"
        >
          <Link to="/preview">
            <Eye className="h-5 w-5" />
            <span className="text-[10px]">Preview</span>
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={`flex flex-col gap-1 h-full flex-1 rounded-none ${showLibrarySidebar ? "bg-accent/10 text-accent" : ""}`}
          onClick={() => {
            if (showDesignSidebar) toggleDesignSidebar();
            toggleLibrarySidebar();
          }}
        >
          <ImageIcon className="h-5 w-5" />
          <span className="text-[10px]">Photos</span>
        </Button>

        <Button
          variant="ghost"
          className="flex flex-col gap-1 h-full flex-1 rounded-none text-accent"
          onClick={() => {
            const result = useBookStore.getState().autofillAllEmptyFrames();
            if (result.framesFilled > 0) {
              toast.success(`Filled ${result.framesFilled} frame(s).`);
            } else if (result.skippedReason === "no-available-images") {
              toast.warning("Upload or include photos before using Magic Fill.");
            } else if (result.skippedReason === "no-photo-frames") {
              toast.message("Apply a layout with photo frames first.");
            } else {
              toast.message("All frames already have photos.");
            }
          }}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px]">Magic Fill</span>
        </Button>

        <Button
          variant="ghost"
          className={`flex flex-col gap-1 h-full flex-1 rounded-none ${showDesignSidebar ? "bg-accent/10 text-accent" : ""}`}
          onClick={() => {
            if (showLibrarySidebar) toggleLibrarySidebar();
            toggleDesignSidebar();
          }}
        >
          <Palette className="h-5 w-5" />
          <span className="text-[10px]">Design</span>
        </Button>
      </div>

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
