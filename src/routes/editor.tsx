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
  const [isMobile, setIsMobile] = useState(false);
  const showLibrarySidebar = useBookStore((state) => state.showLibrarySidebar);
  const showDesignSidebar = useBookStore((state) => state.showDesignSidebar);
  const selectedPhotoId = useBookStore((state) => {
    if (!state.selectedElementId) return null;
    const selected = state.book.pages
      .flatMap((page) => page.elements)
      .find((element) => element.id === state.selectedElementId);
    return selected?.type === "photo" ? selected.id : null;
  });

  useEffect(() => {
    const state = useBookStore.getState();
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) {
      if (state.showLibrarySidebar) state.toggleLibrarySidebar();
      if (state.showDesignSidebar) state.toggleDesignSidebar();
    } else if (state.showLibrarySidebar && state.showDesignSidebar) {
      state.toggleDesignSidebar();
    }
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    setMounted(true);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!selectedPhotoId) return;
    const state = useBookStore.getState();
    if (state.showLibrarySidebar) state.toggleLibrarySidebar();
    if (!state.showDesignSidebar) state.toggleDesignSidebar();
    window.setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("photobook:design-tab", { detail: { tab: "frames" } }),
        ),
      0,
    );
  }, [selectedPhotoId]);

  if (!mounted) {
    return (
      <div
        className="editor-loading-shell h-[100dvh] w-full bg-background"
        aria-label="Loading editor"
      >
        <div className="editor-loading-header">
          <div className="editor-loading-block h-9 w-9" />
          <div className="editor-loading-block h-8 w-24" />
          <div className="editor-loading-block h-9 min-w-0 flex-1 sm:max-w-72" />
          <div className="editor-loading-block h-9 w-20" />
        </div>
        <div className="editor-loading-body">
          <div className="editor-loading-rail hidden md:block" />
          <div className="editor-loading-panel hidden md:block" />
          <div className="editor-loading-workspace">
            <div className="editor-loading-toolbar" />
            <div className="editor-loading-page" />
          </div>
          <div className="editor-loading-panel hidden lg:block" />
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

        {!isMobile && (
          <div className="editor-panel-enter-left hidden h-full shrink-0 md:flex">
            {showLibrarySidebar && <LibrarySidebar />}
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Canvas />
        </div>

        {!isMobile && (
          <div className="editor-panel-enter-right hidden h-full shrink-0 md:flex">
            {showDesignSidebar && (
              <SidebarErrorBoundary>
                <DesignSidebar />
              </SidebarErrorBoundary>
            )}
          </div>
        )}
      </div>

      {isMobile && panelOpen && (
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
