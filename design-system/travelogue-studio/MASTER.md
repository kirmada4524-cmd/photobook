# Travelogue Studio Design System

This file is the implementation source of truth for the Yaara redesign. It is adapted from `deep-research-report (2).md` and the existing product rules in `design.md`.

## Product Promise

Yaara moves a first-time creator through one understandable path:

`Templates -> Photos -> First draft -> Edit -> Preview -> Export`

Reveal that path before advanced controls. Keep the product template-first, compact, and focused on making a print-ready photobook.

## Visual Direction

- Home page: cinematic dark canvas, Poppins display type, and restrained violet-pink accents without decorative photo frames.
- Other public pages: warm paper, editorial typography, memory-led imagery unless a page override says otherwise.
- Editor: cool neutral workspace, white panels, restrained depth, strong canvas focus.
- Preview: immersive book viewer with controls behind one trigger.
- Admin: dense operational UI with explicit filters, status, save, replace, and publish actions.

Do not let violet dominate every surface, add decorative blob elements, turn full sections into floating cards, or use motion that competes with the user's photos.

## Tokens

| Role           | Value     |
| -------------- | --------- |
| Brand          | `#5B3A29` |
| Brand hover    | `#4A2F21` |
| Action accent  | `#5C62D6` |
| Accent soft    | `#EEF0FF` |
| Background     | `#FFFDF8` |
| Surface        | `#FFFFFF` |
| Editor surface | `#F2F4F7` |
| Border         | `#E6E0D8` |
| Text           | `#1F1B18` |
| Muted text     | `#6C645E` |
| Success        | `#14805E` |
| Warning        | `#B5690A` |
| Danger         | `#B42318` |

Use Inter for interface text, Playfair Display for editorial headings, and Permanent Marker only inside scrapbook content. Letter spacing remains `0` except short uppercase metadata.

## Layout Rules

- Use a 4px base and 8px spacing rhythm.
- Compact control heights: 40px desktop and at least 44px mobile.
- Keep editor control radii at 6-8px; cards stay at 8px or less.
- Do not place cards inside cards or turn full page sections into floating cards.
- Keep the canvas as the strongest editor object.
- Reserve dimensions for page previews and image lists to prevent layout shift.

## Interaction Rules

- Every icon action has an accessible name and visible keyboard focus.
- Mobile touch targets are at least 44px with at least 8px between unrelated controls.
- Motion lasts 150-300ms, explains state or spatial change, and respects reduced motion.
- Prefer inline status for persistent state and toasts for short completion or errors.
- Preserve browser back behavior and avoid conflicting horizontal gestures.
- Loading, empty, disabled, success, and error states must be intentional.

## Page Contracts

### Home

Use a clean photo-memory hero with one dominant `Create Your Album` CTA, a compact workflow section, horizontal admin-template categories, the selected-pages tray, and recent-project recovery. Do not repeat template categories in a separate style gallery, and do not use decorative photo frames, a book mockup, or an AI badge in the hero.

### Photo Setup

Show selected page count, photo-slot count, bulk upload, preview thumbnails, and one action: `Create my first draft`.

### Editor

Desktop uses header + tool rail + library + canvas + contextual inspector. Mobile uses five anchors: Pages, Photos, Text, Style, Preview. Undo and redo remain reachable from the header. Distinguish book, page, and selected-object actions.

### Preview

Center the book with previous/next navigation. Advanced scene, share, fullscreen, and novelty options live behind one controller and never overlap the book.

## Verification

Before delivery, test at 375px, 768px, 1024px, and 1440px; verify keyboard focus, reduced motion, no horizontal overflow, no content hidden behind fixed controls, and 4.5:1 body-text contrast.
