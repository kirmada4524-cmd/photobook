import { useRef, useState } from "react";
import { useBookStore } from "@/lib/photobook/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Heart, Trash2, Search, ImagePlus, Check, X } from "lucide-react";
import { toast } from "sonner";

export function LibrarySidebar() {
  const library = useBookStore((s) => s.library);
  const addImagesFromFiles = useBookStore((s) => s.addImagesFromFiles);
  const removeImage = useBookStore((s) => s.removeImage);
  const toggleFavorite = useBookStore((s) => s.toggleFavorite);
  const toggleExclude = useBookStore((s) => s.toggleExclude);
  const addPhotoToCurrentPage = useBookStore((s) => s.addPhotoToCurrentPage);
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    try {
      await addImagesFromFiles(arr);
      toast.success(`Added ${arr.length} photo${arr.length > 1 ? "s" : ""}`);
    } catch (error) {
      console.error("Failed to add images", error);
      toast.error("Failed to add images");
    }
  };

  const filtered = library.filter((i) =>
    q ? i.name.toLowerCase().includes(q.toLowerCase()) : true,
  );
  const favorites = filtered.filter((i) => i.favorite);
  const rest = filtered.filter((i) => !i.favorite);

  const width = useBookStore((s) => s.librarySidebarWidth ?? 288);
  const setWidth = useBookStore((s) => s.setLibrarySidebarWidth);
  const isResizing = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    setWidth(e.clientX);
  };

  const stopResize = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  };

  return (
    <aside 
      style={typeof window !== "undefined" && window.innerWidth < 768 ? undefined : { width }} 
      className="editor-sidebar relative flex h-full shrink-0 flex-col md:border-r w-full md:w-auto bg-background"
    >
      <div className="editor-sidebar-header hidden md:flex items-center justify-between p-4">
        <div>
          <h2 className="font-display text-base font-semibold">Photo Library</h2>
          <p className="text-[11px] text-muted-foreground">{library.length} images uploaded</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={useBookStore((s) => s.toggleLibrarySidebar)}
          title="Hide sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 p-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`editor-upload-zone flex cursor-pointer flex-row md:flex-col items-center justify-center gap-2 md:gap-1.5 rounded-lg md:rounded-xl p-2 md:p-5 text-center text-sm ${
            drag ? "is-dragging" : ""
          }`}
        >
          <div className="grid h-8 w-8 md:h-10 md:w-10 place-items-center rounded-full bg-accent/10 text-accent shrink-0">
            <Upload className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div className="font-semibold text-foreground text-xs md:text-sm">Upload photos</div>
          <div className="hidden md:block text-[11px] text-muted-foreground">JPG, PNG, WebP · drag or click</div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        {library.length === 0 && (
          <div className="grid place-items-center py-10 text-center text-xs text-muted-foreground">
            <ImagePlus className="mb-2 h-8 w-8 opacity-50" />
            Upload photos to get started.
          </div>
        )}

        {favorites.length > 0 && (
          <>
            <div className="mb-2 mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Favorites
            </div>
            <Grid
              items={favorites}
              onAdd={addPhotoToCurrentPage}
              onFav={toggleFavorite}
              onDel={removeImage}
              onExclude={toggleExclude}
            />
          </>
        )}
        {rest.length > 0 && (
          <>
            {favorites.length > 0 && (
              <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                All photos
              </div>
            )}
            <Grid
              items={rest}
              onAdd={addPhotoToCurrentPage}
              onFav={toggleFavorite}
              onDel={removeImage}
              onExclude={toggleExclude}
            />
          </>
        )}
      </div>
      {/* Resizer Handle */}
      <div
        onMouseDown={startResize}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 active:bg-accent transition z-50"
      />
    </aside>
  );
}

function Grid({
  items,
  onAdd,
  onFav,
  onDel,
  onExclude,
}: {
  items: { id: string; src: string; name: string; favorite?: boolean; excluded?: boolean }[];
  onAdd: (id: string) => void;
  onFav: (id: string) => void;
  onDel: (id: string) => void;
  onExclude: (id: string) => void;
}) {
  return (
    <div className="grid grid-flow-col auto-cols-[120px] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 snap-x touch-pan-x">
      {items.map((img) => (
        <div
          key={img.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/photobook-image", img.id);
            e.dataTransfer.setData("text/plain", img.id);
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => {
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              onAdd(img.id);
            }
          }}
          onDoubleClick={() => onAdd(img.id)}
          className="group relative aspect-square overflow-hidden rounded-lg border border-border/80 bg-muted shadow-sm transition hover:border-accent/40 hover:shadow-md snap-start"
        >
          {/* Tick option to exclude from random selections */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExclude(img.id);
            }}
            className={`absolute left-1.5 top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded border bg-white/95 text-charcoal shadow-sm transition hover:scale-105 ${
              img.excluded
                ? "border-accent bg-accent text-accent-foreground"
                : "border-muted-foreground/30 opacity-0 group-hover:opacity-100"
            }`}
            title={img.excluded ? "Excluded from random autofill" : "Include in random autofill"}
          >
            {img.excluded ? (
              <Check className="h-3 w-3 stroke-[3.5]" />
            ) : (
              <Check className="h-3 w-3 opacity-30" />
            )}
          </button>

          <img
            src={img.src}
            alt={img.name}
            className={`h-full w-full object-cover transition duration-300 ${
              img.excluded ? "opacity-40 grayscale-[40%]" : ""
            }`}
          />
          <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 via-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onFav(img.id);
              }}
            >
              <Heart className={`h-3.5 w-3.5 ${img.favorite ? "fill-current" : ""}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white hover:bg-destructive/70"
              onClick={(e) => {
                e.stopPropagation();
                onDel(img.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
