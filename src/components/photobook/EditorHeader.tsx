import { useRef, useState } from "react";
import { useBookStore } from "@/lib/photobook/store";
import { useAuthStore } from "@/lib/auth";
import { exportBookPdf } from "@/lib/photobook/exportPdf";
import { Button } from "@/components/ui/button";
import {
  Download,
  Eye,
  Save,
  Undo2,
  Redo2,
  BookOpen,
  FolderOpen,
  FileUp,
  FileDown,
  Trash,
  RefreshCw,
  Sparkles,
  Shield,
  UserRound,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { undo, redo } from "@/lib/photobook/store";
import { FIXED_PAGE_SIZE_ID, type BackgroundTheme } from "@/lib/photobook/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  loadImagesFromDB,
  saveImageToDB,
  loadCustomStickers,
  saveCustomSticker,
  loadCustomBgs,
  saveCustomBg,
} from "@/lib/photobook/db";
import { LoginModal } from "../landing/LoginModal";
import { LogOut, LogIn } from "lucide-react";

export function EditorHeader() {
  const title = useBookStore((s) => s.book.title);
  const setTitle = useBookStore((s) => s.setTitle);
  const { isAdmin, currentUser, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);

  const projectFilePath = useBookStore((s) => s.projectFilePath);
  const setProjectFilePath = useBookStore((s) => s.setProjectFilePath);
  const currentPageId = useBookStore((s) => s.currentPageId);
  const emptyFrameCount = useBookStore((s) =>
    s.book.pages.reduce(
      (sum, p) =>
        sum +
        p.elements.filter(
          (el) =>
            el.type === "photo" && (!el.imageId || !s.library.some((img) => img.id === el.imageId)),
        ).length,
      0,
    ),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayTitle = (title || "").trim() || "Untitled photobook";
  const safeProjectName = displayTitle.replace(/\s+/g, "_") || "wanderbook";

  // Convert a blob to a compressed base64 JPEG data URL.
  // Images are resized to at most maxDim in either dimension and encoded at the given quality.
  // Non-image blobs (stickers, backgrounds) are encoded at original size.
  const compressToBase64 = (
    blob: Blob,
    maxDim = 1800,
    quality = 0.82,
    isImage = true,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!isImage) {
        // For non-photo assets, just encode directly without resizing
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
        return;
      }
      const img = new window.Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        // Scale down if needed
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
        // Free the canvas memory
        canvas.width = 1;
        canvas.height = 1;
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback to raw base64 if image decode fails
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      };
      img.src = url;
    });
  };

  const serializeProject = async (): Promise<string> => {
    toast.loading("Preparing project file…", { id: "serialize" });
    try {
      // Serialize main photo library — sequentially to avoid OOM
      const dbImages = await loadImagesFromDB();
      const imagesData: object[] = [];
      for (const img of dbImages) {
        const base64 = await compressToBase64(img.file, 1800, 0.82, true);
        imagesData.push({
          id: img.id,
          name: img.name,
          favorite: img.favorite,
          excluded: img.excluded,
          createdAt: img.createdAt,
          base64,
        });
      }

      // Serialize custom stickers (keep original quality, smaller files)
      const dbStickers = await loadCustomStickers();
      const stickersData: object[] = [];
      for (const s of dbStickers) {
        const base64 = await compressToBase64(s.file, 800, 0.9, false);
        stickersData.push({ id: s.id, name: s.name, createdAt: s.createdAt, base64 });
      }

      // Serialize custom backgrounds (moderate compression)
      const dbBgs = await loadCustomBgs();
      const bgsData: object[] = [];
      for (const b of dbBgs) {
        const base64 = await compressToBase64(b.file, 1400, 0.85, true);
        bgsData.push({ id: b.id, name: b.name, createdAt: b.createdAt, base64 });
      }

      const projectData = {
        version: 2,
        book: useBookStore.getState().book,
        images: imagesData,
        customStickers: stickersData,
        customBackgrounds: bgsData,
        customTemplates: useBookStore.getState().customTemplates,
      };

      toast.success("Project ready to download!", { id: "serialize" });
      return JSON.stringify(projectData);
    } catch (err) {
      toast.error("Failed to prepare project file.", { id: "serialize" });
      throw err;
    }
  };

  const exportProject = async (titleStr: string) => {
    try {
      const jsonStr = await serializeProject();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${titleStr.trim().replace(/\s+/g, "_") || "wanderbook"}.wanderbook`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export project error:", error);
      throw new Error("Could not export project file");
    }
  };

  const loadProjectFromJson = async (jsonText: string) => {
    const projectData = JSON.parse(jsonText);
    if (!projectData.book || !projectData.images) {
      throw new Error("Invalid project file structure");
    }

    // Reset current book state
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

    // Restore custom stickers
    const customStickersList: { id: string; src: string; name: string }[] = [];
    if (projectData.customStickers) {
      for (const s of projectData.customStickers as {
        id: string;
        name: string;
        createdAt?: number;
        base64: string;
      }[]) {
        const response = await fetch(s.base64);
        const blob = await response.blob();
        await saveCustomSticker(s.id, blob, s.name);
        customStickersList.push({ id: s.id, src: URL.createObjectURL(blob), name: s.name });
      }
    }

    // Restore custom backgrounds
    const customBackgroundsList: { id: string; src: string; name: string }[] = [];
    if (projectData.customBackgrounds) {
      for (const b of projectData.customBackgrounds as {
        id: string;
        name: string;
        createdAt?: number;
        base64: string;
      }[]) {
        const response = await fetch(b.base64);
        const blob = await response.blob();
        await saveCustomBg(b.id, blob, b.name);
        customBackgroundsList.push({ id: b.id, src: URL.createObjectURL(blob), name: b.name });
      }
    }

    // Update Zustand state with all restored data
    useBookStore.setState({
      book: projectData.book,
      library,
      customStickersList,
      customBackgroundsList,
      currentPageId: projectData.book.pages[0]?.id || "",
      selectedElementId: null,
      customTemplates: projectData.customTemplates || [],
    });
  };

  const importProject = async (file: File) => {
    try {
      const text = await file.text();
      await loadProjectFromJson(text);
    } catch (error) {
      console.error("Import project error:", error);
      throw error;
    }
  };

  const handleOpenProjectClick = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.isElectron) {
      try {
        const filePath = await electronAPI.selectOpenPath();
        if (!filePath) return;

        toast.promise(
          async () => {
            const result = await electronAPI.readFile(filePath);
            if (!result.success) {
              throw new Error(result.error);
            }
            await loadProjectFromJson(result.content);
            setProjectFilePath(filePath);
          },
          {
            loading: "Opening project file...",
            success: "Project loaded successfully!",
            error: (err: unknown) => `Failed to load project: ${(err as Error).message || err}`,
          },
        );
      } catch (error) {
        console.error("Failed to trigger electron dialog:", error);
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.promise(importProject(file), {
      loading: "Opening project file...",
      success: "Project loaded successfully!",
      error: (err: unknown) => `Failed to load project: ${(err as Error).message || err}`,
    });
    e.target.value = "";
  };

  const handleNewProject = () => {
    const ok = window.confirm(
      "Are you sure you want to start a new project? This will delete all pages and uploaded photos.",
    );
    if (ok) {
      useBookStore.getState().resetBook();
      toast.success("New project started");
    }
  };

  const handleSaveAsProject = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.isElectron) {
      try {
        const defaultName = `${safeProjectName}.wanderbook`;
        const filePath = await electronAPI.selectSavePath(defaultName);
        if (!filePath) return;

        toast.promise(
          async () => {
            const content = await serializeProject();
            const result = await electronAPI.writeFile(filePath, content);
            if (!result.success) {
              throw new Error(result.error);
            }
            setProjectFilePath(filePath);
          },
          {
            loading: "Saving project...",
            success: "Project saved successfully!",
            error: (err: unknown) => `Save failed: ${(err as Error).message || err}`,
          },
        );
      } catch (error) {
        console.error("Save As failed in electron:", error);
        toast.promise(exportProject(displayTitle), {
          loading: "Preparing project file...",
          success: "Project download started!",
          error: "Export failed",
        });
      }
    } else {
      toast.promise(exportProject(displayTitle), {
        loading: "Preparing project file...",
        success: "Project download started!",
        error: "Export failed",
      });
    }
  };

  const handleSaveProject = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.isElectron) {
      if (projectFilePath) {
        toast.promise(
          async () => {
            const content = await serializeProject();
            const result = await electronAPI.writeFile(projectFilePath, content);
            if (!result.success) {
              throw new Error(result.error);
            }
          },
          {
            loading: "Saving project...",
            success: "Project updated successfully!",
            error: (err: unknown) => `Save failed: ${(err as Error).message || err}`,
          },
        );
      } else {
        await handleSaveAsProject();
      }
    } else {
      toast.promise(exportProject(displayTitle), {
        loading: "Preparing project file...",
        success: "Project download started!",
        error: "Export failed",
      });
    }
  };

  const onExport = async () => {
    const toastId = toast.loading("Preparing print-ready PDF...");
    let timeoutId: number | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () =>
            reject(new Error("PDF export took too long. Please retry with fewer large images.")),
          120_000,
        );
      });
      await Promise.race([exportBookPdf(displayTitle), timeout]);
      toast.success("PDF downloaded", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "PDF export failed", { id: toastId });
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const onMagicFill = () => {
    const result = useBookStore.getState().magicFillAllEmptyFrames();
    if (result.framesFilled > 0) {
      return;
    }
    if (result.skippedReason === "no-available-images") {
      toast.warning("Upload or include photos before using Magic Fill.");
    } else if (result.skippedReason === "no-photo-frames") {
      toast.message("Apply a layout with photo frames first.");
    } else {
      toast.message("All frames already have photos.");
    }
  };

  return (
    <header className="editor-header flex h-[60px] min-h-[60px] w-full shrink-0 flex-nowrap items-center gap-1.5 overflow-hidden border-b px-2 sm:gap-2 sm:px-3">
      <div className="editor-header-brand-wrap flex shrink-0 items-center gap-2">
        <Link
          to="/"
          aria-label="Yaara home"
          className="editor-header-brand group flex items-center gap-2.5"
        >
          <div className="editor-brand-mark grid h-9 w-9 shrink-0 place-items-center rounded-md transition-transform group-hover:scale-105">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="hidden xl:block">
            <span className="font-display block text-base font-semibold leading-none tracking-tight group-hover:text-primary transition-colors">
              Yaara
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              Custom Photobook Studio
            </span>
          </div>
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className="hidden items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 2xl:flex"
          >
            <Shield className="h-3 w-3" />
            Admin
          </Link>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Project menu"
            className="editor-header-project-menu h-9 shrink-0 gap-1.5 px-2 text-xs font-semibold"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden xl:inline">Project</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={handleNewProject} className="gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" /> New Project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSaveProject} className="gap-2">
            <Save className="h-4 w-4 text-muted-foreground" /> Save Project
          </DropdownMenuItem>
          {typeof window !== "undefined" && (window as any).electronAPI?.isElectron && (
            <DropdownMenuItem onClick={handleSaveAsProject} className="gap-2">
              <Save className="h-4 w-4 text-muted-foreground" /> Save Project As...
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenProjectClick} className="gap-2">
            <FileUp className="h-4 w-4 text-muted-foreground" /> Open Project File
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              toast.promise(exportProject(displayTitle), {
                loading: "Exporting project file...",
                success: "Project exported successfully!",
                error: "Export failed",
              });
            }}
            className="gap-2"
          >
            <FileDown className="h-4 w-4 text-muted-foreground" /> Download Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleNewProject}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash className="h-4 w-4" /> Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <label className="editor-project-title group min-w-[82px] max-w-[320px] flex-1 rounded-md border px-2.5 py-1 transition sm:min-w-[140px]">
        <span className="hidden text-[9px] font-bold uppercase text-muted-foreground sm:block">
          Project title
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="font-display h-6 w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60 sm:h-auto sm:text-sm"
          placeholder="Untitled photobook"
        />
      </label>

      <div
        className="editor-toolbar-cluster hidden shrink-0 items-center md:flex"
        aria-label="History"
      >
        <Button variant="ghost" size="icon" onClick={() => undo()} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => redo()} title="Redo (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        asChild
        className="hidden h-9 shrink-0 gap-1.5 px-2 sm:inline-flex"
      >
        <Link to="/preview">
          <Eye className="h-4 w-4" />
          <span className="hidden lg:inline">Preview</span>
        </Link>
      </Button>
      <Button
        size="sm"
        onClick={onMagicFill}
        aria-label="Magic Fill empty frames"
        className="inline-flex h-9 shrink-0 gap-1.5 bg-accent px-2 text-accent-foreground shadow-sm hover:bg-accent/90 sm:px-2.5"
        title={emptyFrameCount ? `${emptyFrameCount} empty frames available` : "Fill empty frames"}
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden xl:inline">Magic Fill</span>
        {emptyFrameCount > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
            {emptyFrameCount}
          </span>
        )}
      </Button>
      {isAdmin ? (
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="sm"
            onClick={() => exportProject(title)}
            variant="outline"
            className="hidden gap-1.5 bg-background shadow-sm 2xl:inline-flex"
          >
            <Download className="h-4 w-4" />
            <span>Project File</span>
          </Button>
          <Button
            size="sm"
            onClick={onExport}
            className="h-9 gap-1.5 bg-primary px-2.5 text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            <span className="hidden xl:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={() => exportProject(title)}
          aria-label="Download project"
          title="Download project"
          className="h-9 shrink-0 gap-1.5 bg-primary px-2.5 text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          <span className="hidden xl:inline">Download</span>
        </Button>
      )}

      {currentUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Account menu"
              className="ml-0 h-9 shrink-0 gap-1.5 px-2 text-xs font-semibold"
            >
              <UserRound className="h-4 w-4" />
              <span className="hidden xl:inline">
                {isAdmin ? "Admin" : "User"} {currentUser.username}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout} className="gap-2 text-destructive">
              <LogOut className="h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="sm"
          aria-label="Sign in"
          className="ml-0 h-9 shrink-0 gap-1.5 px-2"
          onClick={() => setShowLogin(true)}
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden xl:inline">Sign In</span>
        </Button>
      )}

      <LoginModal open={showLogin} onOpenChange={setShowLogin} />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".wanderbook,application/json"
        hidden
      />
    </header>
  );
}
