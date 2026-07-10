import { useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { useBookStore } from "@/lib/photobook/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, FolderOpen, Trash2, Upload } from "lucide-react";
import { FIXED_PAGE_SIZE_ID, PAGE_SIZES } from "@/lib/photobook/types";
import {
  loadImagesFromDB,
  saveImageToDB,
  loadCustomStickers,
  saveCustomSticker,
  loadCustomBgs,
  saveCustomBg,
} from "@/lib/photobook/db";
import { toast } from "sonner";

interface ProjectSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "recent" | "open";
}

export function ProjectSelectionModal({ open, onOpenChange, mode }: ProjectSelectionModalProps) {
  const router = useRouter();
  const recentProjects = useBookStore((s) => s.recentProjects ?? []);
  const clearRecentProjects = useBookStore((s) => s.clearRecentProjects);
  const addRecentProject = useBookStore((s) => s.addRecentProject);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSizeLabel = () => PAGE_SIZES[0].label;

  const loadProjectFromJson = async (jsonText: string) => {
    const projectData = JSON.parse(jsonText);
    if (!projectData.book || !projectData.images) {
      throw new Error("Invalid project file structure");
    }

    useBookStore.getState().resetBook();

    if (projectData.book && Array.isArray(projectData.book.pages)) {
      projectData.book = {
        ...projectData.book,
        pageSizeId: FIXED_PAGE_SIZE_ID,
        pages: projectData.book.pages.map((p: any) => ({
          ...p,
          elements: p.elements || [],
        })),
      };
    }

    const library = [];
    for (const img of projectData.images) {
      const response = await fetch(img.base64);
      const blob = await response.blob();
      await saveImageToDB(img.id, blob, img.name, img.favorite, img.excluded);
      library.push({
        id: img.id,
        src: URL.createObjectURL(blob),
        name: img.name,
        favorite: img.favorite || false,
        excluded: img.excluded || false,
        createdAt: img.createdAt || Date.now(),
      });
    }

    if (projectData.customStickers) {
      await Promise.all(
        projectData.customStickers.map(
          async (stk: { id: string; name: string; base64: string }) => {
            const response = await fetch(stk.base64);
            const blob = await response.blob();
            await saveCustomSticker(stk.id, blob, stk.name);
          },
        ),
      );
    }
    if (projectData.customBackgrounds) {
      await Promise.all(
        projectData.customBackgrounds.map(
          async (bg: { id: string; name: string; base64: string }) => {
            const response = await fetch(bg.base64);
            const blob = await response.blob();
            await saveCustomBg(bg.id, blob, bg.name);
          },
        ),
      );
    }

    await useBookStore.getState().initCustomAssets();

    useBookStore.setState({
      book: projectData.book,
      library,
      currentPageId: projectData.book.pages[0]?.id || "",
      selectedElementId: null,
      customTemplates: projectData.customTemplates || [],
    });

    // Add to recent
    const book = projectData.book;
    addRecentProject(`proj_${Date.now()}`, book.title || "Untitled", FIXED_PAGE_SIZE_ID);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.promise(
      (async () => {
        const text = await file.text();
        await loadProjectFromJson(text);
        onOpenChange(false);
        router.navigate({ to: "/editor" });
      })(),
      {
        loading: "Opening project...",
        success: "Project loaded!",
        error: (err: unknown) => `Failed: ${(err as Error).message || err}`,
      },
    );
    e.target.value = "";
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleOpenRecent = (proj: { id: string; title: string; sizeId?: string }) => {
    // For recent projects, we just navigate to editor — the last state is persisted
    // A more complete implementation would store the project file reference
    toast.info("Loading your last session from browser storage...");
    onOpenChange(false);
    router.navigate({ to: "/editor" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "recent" ? (
              <>
                <Clock className="h-5 w-5 text-blue-500" /> Recently Used Projects
              </>
            ) : (
              <>
                <FolderOpen className="h-5 w-5 text-green-600" /> Open My Projects
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "recent"
              ? "Pick up where you left off."
              : "Open a saved .wanderbook project file from your device."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Open file button always shown */}
          <Button
            variant="outline"
            className="w-full gap-2 h-12 border-dashed"
            onClick={handleOpenFile}
          >
            <Upload className="h-4 w-4" />
            Open .wanderbook File from Device
          </Button>

          {/* Recent projects list */}
          {mode === "recent" && (
            <div className="space-y-2">
              {recentProjects.length === 0 ? (
                <div className="rounded-lg bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  No recent projects yet. Create one to get started!
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {recentProjects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => handleOpenRecent(proj)}
                        className="w-full flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {proj.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{proj.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getSizeLabel()} · {new Date(proj.savedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={clearRecentProjects}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear History
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".wanderbook,application/json"
          onChange={handleFileChange}
          hidden
        />
      </DialogContent>
    </Dialog>
  );
}
