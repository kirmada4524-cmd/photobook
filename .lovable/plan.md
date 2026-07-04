# Travel Photobook Web App — Build Plan

A premium, browser-based photobook editor in the warm cream + charcoal aesthetic, with Playfair Display + Inter. Single-app scope, persisted locally, with client-side PDF export. We can layer on cloud accounts and 3D flip preview later.

## Scope (first version)

In:

- Image library with drag/drop upload, search, favorite, delete, reorder
- Page-based editor: add / duplicate / delete / reorder, page numbers, zoom
- Drag photos from library onto pages; move, resize, rotate, rounded corners, captions
- 8 layout templates (full, 2-split, 3-collage, 4-grid, polaroid, filmstrip, magazine, scrapbook)
- Frames (white, black, gold, polaroid, postcard, vintage), background themes (cream, linen, vintage, dark luxury, minimal, sunset)
- Travel stickers + quote cards
- Editable book title, theme selector, preview mode (flat spreads, not 3D), PDF export
- Undo/redo, autosave to localStorage, keyboard shortcuts (Del, Ctrl+Z/Y, Ctrl+D)

Out of v1 (clearly noted, easy follow-ups):

- Accounts / cloud sync, true 3D page-flip, crop tool, server-rendered print PDFs, JPG/PNG per-page export

## Design direction

Warm cream (#FBF7F0) + charcoal (#1F1B16) + muted gold accent. Playfair Display for titles, Inter for UI. 20px radius, soft glass surfaces, subtle layered shadows. Loaded via `<link>` in `__root.tsx` head (not CSS @import), tokens in `src/styles.css` `@theme`.

## Layout

```text
┌─ Header: title (editable) · theme · preview · save · export PDF ─┐
│ Library  │           Canvas (page spreads)            │  Design   │
│ sidebar  │       zoom, page tabs, +page              │  sidebar  │
│ (photos) │                                            │ (layouts, │
│          │                                            │  frames,  │
│          │                                            │  stickers,│
│          │                                            │  quotes,  │
│          │                                            │  bg)      │
└──────────────────────────────────────────────────────────────────┘
```

## Routes

- `/` — editor (single screen, the app)
- `/preview` — fullscreen book preview with flat spread transitions

## Technical details

State: Zustand store (`useBookStore`) holding `book: { title, theme, pages: Page[] }` and `library: LibraryImage[]`. Each page has `background`, `elements: (PhotoEl | StickerEl | QuoteEl | FrameEl)[]` with `{x,y,w,h,rotation,radius,zIndex}`. Undo/redo via `zundo` middleware.

Persistence: `zustand/middleware/persist` to localStorage. Images stored as base64 data URLs (capped ~30 photos, warn on size). Autosave is implicit via persist.

Drag/drop:

- Uploads: native HTML5 drop on library
- Library → canvas: HTML5 drag with `dataTransfer`
- On-canvas move/resize/rotate: `react-rnd` (already lightweight, works with rotation handle via custom)

PDF export: `html2canvas-pro` + `jspdf`. Iterate pages, render each at A4-landscape proportions to canvas, append. Run client-side.

Templates: Each template is a function `(photoIds: string[]) => PhotoEl[]` producing positioned elements. Applying a template replaces page photo elements with computed positions.

Frames: rendered as CSS classes/wrappers around photo elements (border, box-shadow, rotation for polaroid stacks).

Stickers + quotes: small JSON catalogs; click to insert as draggable element at page center.

Files:

- `src/routes/index.tsx` — editor shell
- `src/routes/preview.tsx` — preview mode
- `src/components/editor/Header.tsx`
- `src/components/editor/LibrarySidebar.tsx`
- `src/components/editor/DesignSidebar.tsx` (tabs: Layouts, Frames, Stickers, Quotes, Backgrounds)
- `src/components/editor/Canvas.tsx` + `Page.tsx` + element renderers
- `src/components/editor/PageThumbnails.tsx`
- `src/lib/store.ts` (Zustand + persist + zundo)
- `src/lib/templates.ts`, `frames.ts`, `stickers.ts`, `quotes.ts`, `themes.ts`
- `src/lib/exportPdf.ts`
- `src/styles.css` — theme tokens, paper/linen textures via CSS gradients

Dependencies to add: `zustand`, `zundo`, `react-rnd`, `jspdf`, `html2canvas-pro`, `@dnd-kit/core` + `@dnd-kit/sortable` (page + library reorder), `lucide-react` (already in shadcn stack).

## What I'll deliver this turn

A working editor at `/` with: upload, library management, 4 starter templates, drag photos onto pages, move/resize/rotate, frames, stickers, quotes, backgrounds, page management, undo/redo, autosave, preview route, and PDF export. Remaining templates/frames/effects added in follow-ups so quality stays high.
