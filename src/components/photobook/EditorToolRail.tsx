import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  Brush,
  Eye,
  Frame,
  Image,
  Images,
  LayoutGrid,
  LayoutTemplate,
  MoreHorizontal,
  Palette,
  Redo2,
  ShieldCheck,
  Sparkles,
  Sticker,
  Type,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth";
import { redo, undo, useBookStore } from "@/lib/photobook/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EditorTool = "pages" | "photos" | "layouts" | "quotes" | "stickers" | "draw" | "frames" | "bg";

const designTools = new Set<EditorTool>(["layouts", "quotes", "stickers", "draw", "frames", "bg"]);

const tools: Array<{ id: EditorTool; label: string; icon: typeof Image }> = [
  { id: "pages", label: "Pages", icon: Images },
  { id: "photos", label: "Photos", icon: Image },
  { id: "layouts", label: "Templates", icon: LayoutTemplate },
  { id: "quotes", label: "Text", icon: Type },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "draw", label: "Draw", icon: Brush },
  { id: "frames", label: "Frames", icon: Frame },
  { id: "bg", label: "Background", icon: Palette },
];

function dispatchPanelEvent(name: string, detail: Record<string, string>) {
  window.setTimeout(() => window.dispatchEvent(new CustomEvent(name, { detail })), 0);
}

export function EditorToolRail() {
  const [activeTool, setActiveTool] = useState<EditorTool>("photos");
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const showLibrarySidebar = useBookStore((state) => state.showLibrarySidebar);
  const showDesignSidebar = useBookStore((state) => state.showDesignSidebar);
  const toggleLibrarySidebar = useBookStore((state) => state.toggleLibrarySidebar);
  const toggleDesignSidebar = useBookStore((state) => state.toggleDesignSidebar);

  const openTool = (tool: EditorTool) => {
    if (designTools.has(tool)) {
      if (activeTool === tool && showDesignSidebar) {
        toggleDesignSidebar();
        return;
      }
      setActiveTool(tool);
      if (showLibrarySidebar) toggleLibrarySidebar();
      if (!showDesignSidebar) toggleDesignSidebar();
      dispatchPanelEvent("photobook:design-tab", { tab: tool });
      return;
    }

    if (activeTool === tool && showLibrarySidebar) {
      toggleLibrarySidebar();
      return;
    }
    setActiveTool(tool);
    if (showDesignSidebar) toggleDesignSidebar();
    if (!showLibrarySidebar) toggleLibrarySidebar();
    dispatchPanelEvent("photobook:library-section", { section: tool });
  };

  const isActive = (tool: EditorTool) =>
    activeTool === tool && (designTools.has(tool) ? showDesignSidebar : showLibrarySidebar);

  const magicFill = () => {
    const result = useBookStore.getState().magicFillAllEmptyFrames();
    if (result.framesFilled > 0) {
      toast.success(
        `Filled ${result.framesFilled} frame(s) across ${result.pagesTouched} page(s).`,
      );
    } else if (result.skippedReason === "no-available-images") {
      toast.warning("Upload or include photos before using Magic Fill.");
    } else if (result.skippedReason === "no-photo-frames") {
      toast.message("Apply a template with photo frames first.");
    } else {
      toast.message("All photo frames are already filled.");
    }
  };

  return (
    <>
      <aside className="editor-tool-rail hidden h-full shrink-0 flex-col items-center border-r md:flex">
        <div className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto py-2">
          {tools.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`editor-rail-button ${isActive(id) ? "is-active" : ""}`}
              onClick={() => openTool(id)}
              title={label}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="w-full border-t p-2">
          {isAdmin ? (
            <Link to="/admin" className="editor-rail-button editor-rail-admin" title="Admin panel">
              <ShieldCheck className="h-[18px] w-[18px]" />
              <span>Admin</span>
            </Link>
          ) : (
            <div className="editor-rail-brand" title="Yaara Photobook Studio">
              <BookOpen className="h-4 w-4" />
            </div>
          )}
        </div>
      </aside>

      <nav className="editor-mobile-rail md:hidden" aria-label="Editor tools">
        <Link to="/preview" className="editor-mobile-tool">
          <Eye className="h-[18px] w-[18px]" />
          <span>Preview</span>
        </Link>
        <button type="button" className="editor-mobile-tool" onClick={() => undo()}>
          <Undo2 className="h-[18px] w-[18px]" />
          <span>Undo</span>
        </button>
        <button type="button" className="editor-mobile-tool" onClick={() => redo()}>
          <Redo2 className="h-[18px] w-[18px]" />
          <span>Redo</span>
        </button>
        <button
          type="button"
          className={`editor-mobile-tool ${isActive("layouts") ? "is-active" : ""}`}
          onClick={() => openTool("layouts")}
        >
          <LayoutTemplate className="h-[18px] w-[18px]" />
          <span>Templates</span>
        </button>
        <button
          type="button"
          className={`editor-mobile-tool ${isActive("photos") ? "is-active" : ""}`}
          onClick={() => openTool("photos")}
        >
          <Image className="h-[18px] w-[18px]" />
          <span>Photos</span>
        </button>
        <button
          type="button"
          className={`editor-mobile-tool ${isActive("quotes") ? "is-active" : ""}`}
          onClick={() => openTool("quotes")}
        >
          <Type className="h-[18px] w-[18px]" />
          <span>Text</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`editor-mobile-tool ${
                ["frames", "stickers", "draw", "bg"].some((tool) => isActive(tool as EditorTool))
                  ? "is-active"
                  : ""
              }`}
              aria-label="More editor tools"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
              <span>More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-52">
            <DropdownMenuItem onSelect={() => openTool("frames")}>
              <Frame className="h-4 w-4" />
              Frames and crop
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openTool("stickers")}>
              <Sticker className="h-4 w-4" />
              Stickers
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openTool("draw")}>
              <Brush className="h-4 w-4" />
              Draw
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openTool("bg")}>
              <Palette className="h-4 w-4" />
              Background
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => window.dispatchEvent(new Event("photobook:open-templates"))}
            >
              <LayoutGrid className="h-4 w-4" />
              Add multiple templates
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={magicFill}>
              <Sparkles className="h-4 w-4" />
              Magic Fill
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </>
  );
}
