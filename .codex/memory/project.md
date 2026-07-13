# Project Memory

- 2026-07-11: Home page was shortened and redesigned around template selection instead of long marketing sections.
- 2026-07-11: Home templates now support a bucket flow. Clicking a template toggles it in the bucket, selected cards show ordered checked state, and a fixed bottom dock opens selected templates directly in the editor.
- 2026-07-11: Home page now initializes admin templates and falls back to built-in `TEMPLATES` when admin template storage is empty, so users still see usable layouts.
- 2026-07-11: Template start modal also supports bucket-style multi-select and direct editor start.
- 2026-07-11: Local build passed after the latest landing/template bucket changes. Node 20.18.0 showed a Vite engine warning because the project expects Node 22.12.0 or newer.
- 2026-07-11: Production admin templates and asset metadata now use Supabase, while template images, stickers, and backgrounds use ImageKit. Vercel Blob is no longer an app dependency; local JSON/files remain development-only fallbacks.
- 2026-07-12: Applied admin templates now carry page-level protection. Normal users can replace and crop photos but cannot alter template structure/backgrounds; admins can fully edit and replace the original template ID. Built-in layouts remain unlockable and editable.
- 2026-07-13: Mobile editor exposes Undo, Redo, and Templates in the bottom toolbar; Magic Layout is admin-only. Photo gestures support one-finger pan plus two-finger zoom/rotate and unlocked-frame movement. Preview uses one Controls menu, slower mobile flips, and bounded responsive book sizing.
