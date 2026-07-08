import { PAGE_SIZES, type SavedPageTemplate } from "@/lib/photobook/types";

interface TemplatePreviewProps {
  template: SavedPageTemplate;
  className?: string;
}

import { useBookStore } from "@/lib/photobook/store";

export function TemplatePreview({ template, className = "" }: TemplatePreviewProps) {
  const library = useBookStore((s) => s.library);
  const customStickersList = useBookStore((s) => s.customStickersList ?? []);

  // If we have a captured thumbnail, always prefer it because it's exactly what the page looks like
  if (template.thumbnail) {
    return (
      <img
        src={template.thumbnail}
        alt={template.label}
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  // Fallback: render the elements exactly how they look
  const preset = PAGE_SIZES.find((ps) => ps.id === template.sizeId) ?? PAGE_SIZES[0];
  const pw = Math.max(1, preset.width);
  const ph = Math.max(1, preset.height);
  const elements = Array.isArray(template.elements) ? template.elements : [];
  const embeddedAssets = Array.isArray(template.embeddedAssets) ? template.embeddedAssets : [];

  // Render background style
  let bgSrc = typeof template.background === "string" && template.background ? template.background : "#f8f4ea";
  if (!bgSrc.startsWith("#") && embeddedAssets.length > 0) {
    const embeddedBg = embeddedAssets.find((a) => a.id === bgSrc);
    if (embeddedBg) {
      bgSrc = embeddedBg.base64;
    }
  }

  const bgStyle: React.CSSProperties = {
    backgroundColor: bgSrc.startsWith("#") ? bgSrc : undefined,
    backgroundImage: !bgSrc.startsWith("#") ? `url(${bgSrc})` : undefined,
    backgroundSize: template.backgroundMode || "cover",
    backgroundPosition: "center",
  };

  return (
    <div className={`relative w-full h-full overflow-hidden @container bg-background ${className}`} style={bgStyle}>
      <div className="absolute inset-0 opacity-90">
        {elements.map((el, i) => {
          const isPhoto = el.type === "photo";
          const isSticker = el.type === "sticker";
          const isText = el.type === "text" || el.type === "quote";
          const x = Number.isFinite(el.x) ? el.x : 0;
          const y = Number.isFinite(el.y) ? el.y : 0;
          const w = Number.isFinite(el.w) ? Math.max(1, el.w) : pw;
          const h = Number.isFinite(el.h) ? Math.max(1, el.h) : ph;

          let src = "";
          if (isPhoto && "imageId" in el) {
            src = library.find((img) => img.id === el.imageId)?.src || "";
            if (!src && embeddedAssets.length > 0) {
              src = embeddedAssets.find((a) => a.id === el.imageId)?.base64 || "";
            }
          } else if (isSticker && "src" in el) {
            src = el.src || "";
            if (!src && "stickerId" in el) {
              src = customStickersList.find((s) => s.id === el.stickerId)?.src || "";
              if (!src && embeddedAssets.length > 0) {
                src = embeddedAssets.find((a) => a.id === el.stickerId)?.base64 || "";
              }
            }
          }

          return (
            <div
              key={el.id ?? i}
              className={`absolute flex items-center justify-center overflow-hidden ${
                isPhoto && !src ? "bg-muted shadow-sm border border-black/10" : ""
              }`}
              style={{
                left: `${(x / pw) * 100}%`,
                top: `${(y / ph) * 100}%`,
                width: `${(w / pw) * 100}%`,
                height: `${(h / ph) * 100}%`,
                transform: `rotate(${el.rotation || 0}deg)`,
              }}
            >
              {(isPhoto || isSticker) && src ? (
                <img
                  src={src}
                  alt=""
                  className={`w-full h-full pointer-events-none select-none ${
                    isPhoto ? "object-cover" : "object-contain"
                  }`}
                />
              ) : isText && "text" in el ? (
                <div
                  className="w-full h-full flex items-center justify-center text-center overflow-hidden"
                  style={{
                    color: (el as any).color || "inherit",
                    fontWeight: (el as any).fontWeight || "normal",
                  }}
                >
                    <span
                      style={{
                      fontSize: `${Math.max(4, (h / ph) * 100 * 0.4)}cqh`,
                      lineHeight: 1.1,
                    }}
                    className="truncate px-1 drop-shadow-sm"
                  >
                    {(el as any).text}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
