import { Component, type ReactNode, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EditorHeader } from "@/components/photobook/EditorHeader";
import { LibrarySidebar } from "@/components/photobook/LibrarySidebar";
import { DesignSidebar } from "@/components/photobook/DesignSidebar";
import { Canvas } from "@/components/photobook/Canvas";
import { EditorToolRail } from "@/components/photobook/EditorToolRail";
import { Toaster } from "@/components/ui/sonner";
import { useBookStore } from "@/lib/photobook/store";
import { Button } from "@/components/ui/button";

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
  const showLibrarySidebar = useBookStore((state) => state.showLibrarySidebar);
  const showDesignSidebar = useBookStore((state) => state.showDesignSidebar);

  useEffect(() => {
    if (window.innerWidth < 768) {
      const state = useBookStore.getState();
      if (state.showLibrarySidebar) state.toggleLibrarySidebar();
      if (state.showDesignSidebar) state.toggleDesignSidebar();
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="animate-pulse text-sm font-medium text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  const panelOpen = showLibrarySidebar || showDesignSidebar;

  return (
    <div className="editor-shell flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <EditorHeader />

      <div className="editor-body flex min-h-0 flex-1 overflow-hidden flex-col md:flex-row">
        <EditorToolRail />

        <div className="hidden h-full shrink-0 md:flex">
          {showLibrarySidebar && <LibrarySidebar />}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Canvas />
        </div>

        <div className="hidden h-full shrink-0 md:flex">
          {showDesignSidebar && (
            <SidebarErrorBoundary>
              <DesignSidebar />
            </SidebarErrorBoundary>
          )}
        </div>
      </div>

      {panelOpen && (
        <div className="editor-mobile-panel shrink-0 overflow-hidden border-t bg-background md:hidden">
          <div className="editor-mobile-panel-handle" aria-hidden="true" />
          {showLibrarySidebar && (
            <div className="h-full w-full overflow-y-auto">
              <LibrarySidebar />
            </div>
          )}
          {showDesignSidebar && !showLibrarySidebar && (
            <div className="h-full w-full overflow-y-auto">
              <SidebarErrorBoundary>
                <DesignSidebar />
              </SidebarErrorBoundary>
            </div>
          )}
        </div>
      )}

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
