# Travelogue Studio Design System

## 1. Purpose

Travelogue Studio, also presented as Yaara, is a visual photobook creation application. Its design should help users move quickly through four main tasks:

1. Discover and select templates.
2. Upload and arrange photos.
3. Customize pages without damaging admin-created designs.
4. Preview and export a convincing physical photobook.

The product combines a warm, memory-focused visual identity with a compact professional editor. The Home page can feel expressive and inviting, while the Editor and Admin Panel should feel systematic, efficient, and familiar to users of Canva, PowerPoint, or Word.

## 2. Design Principles

### Memory first

Photos and book pages are the main visual content. Interface decoration should support them, not compete with them.

### Fast creation

The shortest useful workflow is:

`Choose templates -> Open in editor -> Upload photos -> Edit -> Preview -> Export`

Primary actions must be visible, clearly named, and placed close to the content they affect.

### Compact and systematic

Editor controls should use space efficiently. Toolbars, sidebars, tabs, and inspectors should be organized by task instead of appearing as unrelated floating controls.

### Real book experience

Preview mode is not another editor. It is an immersive, read-only book presentation with realistic page proportions, depth, shadows, page turns, covers, and restrained controls.

### Safe templates

Admin-created templates are finished designs. Normal users may replace photos and edit only the properties explicitly allowed by the template. Layout-created pages and blank pages remain more flexible.

### Responsive by design

Desktop and mobile use the same project data and actions, but controls may move or collapse to fit the available space. Mobile should never lose essential actions such as templates, undo, redo, preview, crop, and navigation.

## 3. Visual Foundation

The global design tokens are defined in `src/styles.css` and exposed through Tailwind CSS 4.

### Color system

| Token | Current role |
| --- | --- |
| `--cream` | Warm paper and memory-book surfaces |
| `--charcoal` | Strong editorial text and dark controls |
| `--gold` | Premium highlights and book-inspired details |
| `--editor-surface` | Cool neutral editor workspace |
| `--editor-panel` | Sidebars, toolbars, and inspector surfaces |
| `--editor-accent` | Selection, active tools, and primary editor actions |
| `--editor-accent-soft` | Hover, selected tab, and upload states |
| `--background` / `--foreground` | Application background and default text |
| `--primary` / `--secondary` | Main and supporting actions |
| `--muted` | Secondary text and low-priority surfaces |
| `--destructive` | Delete, clear, and irreversible actions |
| `--border`, `--input`, `--ring` | Structure, form controls, and focus feedback |

The palette intentionally combines warm paper colors with cool editor neutrals. This separates the emotional photobook content from the functional editing interface.

Dark-mode tokens also exist in `src/styles.css`. New shared components should use semantic tokens rather than hard-coded colors so they remain compatible with both themes.

### Typography

The project uses three typographic voices:

- **Inter**: interface labels, buttons, forms, metadata, and editor controls.
- **Playfair Display**: page titles, editorial headings, template text, and premium brand moments.
- **Permanent Marker**: handwritten accents used sparingly in scrapbook-style content.

Body text uses the sans-serif stack. Display typography should be reserved for content and major headings, not dense tool panels.

Recommended interface hierarchy:

| Use | Typical size | Treatment |
| --- | --- | --- |
| Page or section title | 20-32px | Display or semibold sans |
| Panel title | 14-18px | Semibold |
| Button and tab | 12-14px | Medium or semibold |
| Inspector label | 10-12px | Medium, concise |
| Metadata | 10-12px | Muted |

Letter spacing should remain `0`. Text must wrap or truncate intentionally and must not overflow buttons, cards, tabs, or mobile toolbars.

### Shape, borders, and depth

- The global radius is `0.75rem`.
- Compact editor controls generally use 6-8px radii.
- Cards are used for repeated templates, projects, and assets, not as containers for entire page sections.
- Thin neutral borders organize editor surfaces.
- Shadows are restrained in the editor and stronger only where physical depth is meaningful, especially in Preview.
- Selected objects use a clear accent outline and visible handles.

## 4. Application Structure

### Home

The Home page is a template-first starting experience. It should remain short and useful rather than becoming a long marketing page.

Its main structure is:

1. A concise opening area with the animated photobook as the primary visual.
2. Project actions such as creating, opening, or continuing a project.
3. Template categories displayed as horizontal rows.
4. A persistent template bucket showing selected templates and their order.
5. A direct action to open the selected bucket in the Editor.

Template cards should:

- Use a stable `1:1` preview area.
- Show the actual template artwork without extra labels over the image.
- Use `object-fit` behavior that preserves the complete square design.
- Show a check mark or order number when selected.
- Make the full card clickable.
- Keep selection visible when the user moves between categories.

Categories are separate horizontal sections, not one mixed grid. Current product categories include Friendship Mag, Journal Mag, Textual Mag, Couple Mag, Anniversary Mag, General Mag, Birthday Mag, Elegant Mag, Fiction, Pinteresty, and LOML Mag.

### Editor

The Editor is a three-part workspace:

```text
Top header
Left library | Center canvas and page controls | Right design inspector
```

The visual language is compact, cool-neutral, and work-focused. The canvas remains the strongest object on screen.

### Preview

Preview is a distraction-free book viewer. Only the book, previous/next navigation, and a compact controller should be visible by default. Project editing controls and decorative headings do not belong here.

### Admin Panel

The Admin Panel is an operational workspace for managing templates, categories, backgrounds, stickers, and other global assets. It should use dense tables, filters, tabs, previews, and explicit save/replace actions rather than promotional layouts.

## 5. Editor Design

### Header

`EditorHeader` is a compact single-row command bar. It contains:

- Brand or book navigation.
- Editable project title.
- Library and design-panel toggles.
- Undo and redo.
- Preview.
- Export or download.
- Account and project actions where applicable.

The title field should look editable while remaining visually quiet. The same title is used in editor, preview metadata where needed, export, and `.wanderbook` project flows.

On narrow screens, secondary labels may collapse to icons, but essential actions must remain reachable through the header or a clearly labeled overflow menu.

### Left library

The library separates Pages and Photos into tabs.

Photo mode contains:

- Upload zone.
- Search and library controls.
- Photo thumbnails.
- Favorite or excluded states where supported.

Desktop uses a compact thumbnail grid. Mobile uses a horizontal strip or drawer so the page canvas keeps most of the viewport.

### Center workspace

The center contains the square photobook page and page-level actions. Its background is a subtle cool-neutral surface that visually separates the paper from the application chrome.

The page toolbar contains only actions that affect the current page or selected content, including page navigation, Add Page, duplicate, delete, Multiple Templates, Crop, and Remove Background when relevant.

Admin-only actions such as Magic Layout must not appear for normal users.

### Right design inspector

The right sidebar groups tools into concise tabs:

- Layout
- Frame
- Border
- Stick
- Text
- Draw
- BG

Controls appear according to the active tab and current selection. Panels use short labels, compact inputs, sliders for continuous values, icon buttons for familiar actions, and segmented controls for small option sets.

The Text tab contains the complete text editor rather than a separate ideas section. It supports content, font, size, color, line height, letter spacing, alignment, emphasis, transformations, and curve styles such as None, Arc up, Arc down, and Wave.

Text input must preserve user formatting. Spaces, repeated spaces where supported, and line breaks should render consistently on the page.

## 6. Pages, Frames, and Images

### Artboard

Photobook pages use a fixed square 5.5 x 5.5 format. The internal page coordinate system remains stable while the rendered page scales to fit the available viewport.

Zoom changes the visual scale of the workspace, not the stored size or position of page elements. Small changes such as 100% to 95% must produce proportional visual changes.

### Page backgrounds

The project includes multiple paper and theme treatments, including cream, linen, vintage, minimal, dark, passport, map, kraft, blueprint, terrazzo, and cover-focused styles. These are content styles, not application backgrounds.

The normal user's BG panel should show only global backgrounds published through the Admin Panel. Images embedded in saved templates must not automatically appear in the global background library.

### Frames

Frames define photo masks and layout positions. The project supports simple, editorial, decorative, travel, scrapbook, and premium frame styles such as polaroid, filmstrip, postcard, stamp, lace, elegant, gold, double, and shadow treatments.

Frame rules:

- A photo dropped on an empty frame fills that frame.
- Moving a photo inside a frame changes the photo crop, not the frame geometry.
- Mobile single-finger gestures move or adjust the image inside the frame.
- Frame movement requires an explicit allowed state or multi-touch gesture.
- Admin-template frame positions remain locked for normal users.
- Layout-generated or user-created frames may be unlocked when the design permits it.

### Free images

A photo dropped onto empty canvas space is a free image object, not a new frame. It must retain its own bounds and support:

- Move, resize, and rotate.
- Crop without resizing the outer object unintentionally.
- Remove Background.
- Layer ordering.
- Delete and duplicate.

Crop mode should clearly separate the visible crop window from movement of the source image. Confirm and cancel actions must be available and must restore the normal selection mode.

### Remove Background

Background removal is an image action available from the page toolbar or image context actions. While processing:

- Keep the original image visible.
- Show an inline processing overlay or animation on the image.
- Prevent repeated submissions for the same object.
- Do not leave a persistent progress toast after completion.
- Replace the source only after a successful result.
- Restore the original state and show a concise error if processing fails.

## 7. Templates and Bucket Selection

Templates are complete square page designs containing backgrounds, frames, text, stickers, and other elements.

### Home template discovery

- Templates are grouped by their admin-assigned category.
- Every category uses a horizontally scrollable row.
- All valid templates must be discoverable, including categories with many items.
- Empty categories may be hidden from the user-facing Home page.
- Preview loading must have a deliberate skeleton or fallback, not a broken-image icon.

### Bucket behavior

The bucket is the user's temporary template selection before entering the Editor.

- Clicking a template adds or removes it from the bucket.
- Selected cards show a check or selection order.
- The bucket remains visible without consuming excessive page height.
- Users can review, reorder, or remove selected templates.
- The main bucket action creates pages in the selected order and opens the Editor directly.

### Template permissions

Admin templates are protected compositions. Normal users can replace photos and edit only permitted content. They cannot delete locked frames, change protected backgrounds, or reposition protected template elements.

Admins can open an existing template in edit mode, change its background, frames, text, stickers, and design, then save it as a replacement while preserving its stable template ID.

## 8. Preview Design

Preview should immediately read as a physical photobook.

### Book composition

- Front cover appears as a single closed-book view.
- Interior pages appear as a centered two-page spread on desktop and mobile.
- Back cover appears as a single closed-book view.
- Page content stays clipped inside each page.
- The gutter is narrow and realistic, without a thick vertical decorative strip.
- Shadows belong directly beneath the book and pages, not as a carpet-like platform.
- Covers may be slightly thicker than interior pages.
- Page turn animation should show believable depth, curvature, and easing.

The complete book must fit inside the viewport with a small safe margin in normal and fullscreen modes. It should never require users to inspect a cropped oversized book.

### Controls

Preview uses one controller trigger that opens the available tools. The controller adapts to unused space:

- Use a horizontal toolbar when a clear horizontal strip is available.
- Use a vertical toolbar when side space is available.
- Never overlay the book when another safe placement exists.
- Preserve the same placement logic in fullscreen.

Previous and next controls remain easy to reach. Scene, orbit, move, fullscreen, and atmosphere options live inside the controller instead of appearing as several independent panels.

### Atmosphere and motion

Atmosphere presets such as cozy, studio, nordic, sunset, library, gallery, and midnight may alter the surrounding scene, but they must not reduce page readability.

Animations should use natural easing and respect `prefers-reduced-motion`. Mobile page turns should be slightly slower and more controlled than a quick swipe transition.

The preview guide character may follow the cursor, but it must remain above the scene and controls without blocking interaction or covering important book content for long periods.

## 9. Admin Design

The Admin Panel manages global content and publishing rules.

Primary areas include:

- Template categories.
- Templates and previews.
- Global backgrounds.
- Global stickers and sticker folders.
- Frames and other reusable assets.
- Template editing, replacement, and publishing.

Admin screens should prioritize scanning and repeated actions:

- Use tabs or a left navigation for sections.
- Use search and category filters near the content list.
- Keep Save, Replace, Publish, and Delete visually distinct.
- Show status, category, preview, and last-updated information together.
- Use confirmation for destructive actions.
- Keep previews square and consistent with the Home page.

User-uploaded backgrounds and stickers are project-local. They must not be saved as global admin assets unless an admin explicitly publishes them.

## 10. Responsive Behavior

### Desktop

- Show left library, center canvas, and right inspector together when space allows.
- Keep the canvas centered and automatically fitted.
- Use hover tooltips for unfamiliar icon-only controls.
- Preserve enough space around the page for selection handles and context menus.

### Tablet

- Allow either sidebar to collapse.
- Keep the page canvas as the dominant area.
- Move low-priority commands into a compact overflow menu.

### Mobile

- Use drawers, bottom sheets, or compact horizontal rails for libraries and inspectors.
- Keep undo, redo, templates, preview, and page navigation available.
- Fit the complete page or two-page Preview spread inside the viewport.
- Ensure touch targets are at least 40-44px where practical.
- Avoid simultaneous movement of both frame and image during a single-finger gesture.
- Support pinch or two-finger gestures only where they have a clear, predictable purpose.
- Account for safe-area insets in fixed bottom controls.

## 11. Motion and Feedback

Motion communicates state and physical behavior rather than decorating every surface.

Use motion for:

- Template selection and bucket updates.
- Panel and mobile drawer transitions.
- Drag-over states.
- Page turns and cover transitions.
- Processing states such as background removal.
- Selection, success, and error feedback.

Recommended timing:

- Hover and press: 120-180ms.
- Tabs, panels, and drawers: 180-260ms.
- Template selection: 180-240ms.
- Book page turn: 650-1000ms depending on input and device.

Avoid layout shifts, continuous decorative motion in work areas, and animation that delays a common editing action.

## 12. Component Conventions

- Use `lucide-react` icons when an appropriate icon exists.
- Use icon buttons for familiar commands such as undo, redo, delete, duplicate, zoom, close, and navigation.
- Add tooltips to unfamiliar icon-only actions.
- Use sliders for opacity, zoom, radius, rotation, and similar continuous values.
- Use segmented controls for small mode groups.
- Use menus for longer option lists.
- Use tabs for distinct tool views.
- Use toggles or checkboxes for binary settings.
- Use text buttons only for explicit commands such as Add Page, Apply, Save, Export, or Open in Editor.
- Keep control dimensions stable so loading text, labels, and icons do not shift the surrounding layout.

## 13. Accessibility

- Every icon-only button requires an accessible name through `aria-label` or visible text.
- Use `aria-expanded` on controller, drawer, and menu triggers.
- Preserve visible keyboard focus using the semantic ring token.
- Maintain sufficient text and control contrast against editor and page backgrounds.
- Do not rely on color alone for template selection, locked state, errors, or processing.
- Provide keyboard access to dialogs, menus, and important editor commands.
- Respect `prefers-reduced-motion` in page turns, cursor effects, and panel animation.
- Decorative images use empty alt text; meaningful template previews use useful names.

## 14. Main Implementation Locations

| Area | Main files |
| --- | --- |
| Global tokens and visual styles | `src/styles.css` |
| Home and template discovery | `src/routes/index.tsx`, `src/components/landing/TemplateStartModal.tsx` |
| Editor route | `src/routes/editor.tsx` |
| Editor header | `src/components/photobook/EditorHeader.tsx` |
| Photo and page library | `src/components/photobook/LibrarySidebar.tsx` |
| Canvas and page toolbar | `src/components/photobook/Canvas.tsx` |
| Design inspector | `src/components/photobook/DesignSidebar.tsx` |
| Multiple template selection | `src/components/photobook/AddTemplatesModal.tsx` |
| Template thumbnails | `src/components/photobook/TemplatePreview.tsx` |
| Preview route and presentation | `src/routes/preview.tsx`, preview classes in `src/styles.css` |
| Admin tools | `src/components/admin/AdminPanel.tsx` |
| Photobook state and behavior | `src/lib/photobook` |

## 15. Design Review Checklist

Before completing a UI change, verify:

- The primary task is immediately clear.
- The change follows existing tokens and component patterns.
- Photos and pages remain the strongest visual content.
- Important actions are reachable on desktop and mobile.
- No text, controls, page numbers, frames, or previews overlap.
- Template previews remain square and load correctly.
- Admin and normal-user permissions remain visually and behaviorally distinct.
- Crop, image movement, and frame movement do not conflict.
- Preview shows front cover, interior spreads, and back cover correctly.
- Preview controls do not cover the book in normal or fullscreen mode.
- Loading, empty, success, error, locked, and disabled states are designed.
- Motion respects reduced-motion preferences.
- Existing saved projects and template IDs remain compatible.

This document describes the current Travelogue Studio design direction and should be updated whenever a shared visual rule, major workflow, or interaction pattern changes.
