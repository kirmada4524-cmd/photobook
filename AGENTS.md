# Travelogue Studio Agent Notes

## Project
- Photobook editor and preview app named Yaara / Travelogue Studio.
- Stack: TanStack Start, React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Radix UI, lucide-react.
- Photobook logic lives mainly in `src/lib/photobook`.
- Editor, preview, and landing UI live mainly in `src/components`.

## Commands
- Install: `npm install`
- Run dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Format: `npm run format`

## Product Rules
- Preserve existing admin, template, export, preview, and project file behavior unless the task explicitly changes it.
- Use the editable project title consistently in editor, preview, export, and `.wanderbook` flows.
- Automatic filling must not overwrite already-filled frames.
- Excluded photos must stay excluded from automatic fill flows.
- Magic Fill fills empty frames across the whole book; Auto Fill fills the current page.
- Empty locked frames may be unlocked by fill actions only when they are empty.

## UI Rules
- Keep the app fast for photobook creation: upload, choose templates, fill, preview, export.
- Design should feel premium, clean, and mobile-friendly, with compact pages and clear actions.
- Home templates should support bucket selection and direct opening in the editor.
- Selected templates should visibly show checked or ordered state.
- Use lucide-react icons for action buttons when suitable.
- Avoid long marketing sections on the home page; prioritize usable template selection.
- Verify responsive behavior on desktop and narrow mobile widths when changing layout.

## Engineering Rules
- Prefer existing store/actions/components before adding new abstractions.
- Keep saved template IDs and project file compatibility stable.
- Use structured data and existing photobook APIs instead of string parsing.
- Keep changes scoped to the requested behavior.
- Production persistence uses Supabase tables for metadata and ImageKit for media; private keys stay server-only.
- Preserve the existing server API contracts when changing storage providers.
- Do not rewrite published git history; this project is connected to Lovable.

## Git
- Never use destructive git commands without explicit user approval.
- Do not revert user changes.
- Stage and commit only files relevant to the current task when asked.
