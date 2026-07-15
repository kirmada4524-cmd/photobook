# Travelogue Studio Motion Specification

## Purpose

Motion in Travelogue Studio explains state, hierarchy, and physical book behavior. It should make editing easier to understand without delaying common actions or distracting from the photobook page.

The shared CSS tokens live in `src/styles.css`. React animation code should use `src/design/motion.ts` instead of raw durations and easing arrays.

## Motion Tokens

| Token      | Duration | Use                                                   |
| ---------- | -------: | ----------------------------------------------------- |
| `instant`  |    120ms | Press feedback and tiny state changes                 |
| `fast`     |    160ms | Hover, focus, tool selection, and icon feedback       |
| `base`     |    220ms | Panels, sheets, tab content, and small layout changes |
| `slow`     |    320ms | Larger surface entrances and meaningful transitions   |
| `book`     |    580ms | Cover arrival and physical book presentation          |
| `pageTurn` |    850ms | Full photobook page-turn movement                     |

Use `standard` easing for most product UI, `emphasized` easing for promoted surfaces, and `page` easing for physical book movement.

## Required Patterns

### Buttons and tools

- Hover may change color, elevation, or move up by at most 1px.
- Press may scale to approximately `0.98` or return the hover offset to zero.
- Focus must remain visible and cannot depend on animation.
- Disabled controls do not animate.

### Panels and mobile sheets

- Enter with a short fade and directional movement using the `base` duration.
- Exit should be equal to or faster than entry.
- Keep the canvas stable while panels open or close.
- Do not animate panel dimensions continuously while the user is resizing them.

### Templates and page thumbnails

- Use border, check/order state, and subtle elevation for selection.
- Reordering should preserve the user's visual context.
- Loading should use a square structural placeholder so the grid does not shift.

### Processing

- Keep the affected image visible during crop or background removal.
- Show progress directly on the affected object when possible.
- Avoid permanent progress toasts and indeterminate animation for operations that finish immediately.

### Book preview

- Covers and page turns may use slower physical motion tokens.
- Navigation and controller UI still use fast product UI tokens.
- The book must not resize or jump when controls open.

## Reduced Motion

All non-essential movement must respect `prefers-reduced-motion: reduce`.

- Replace movement and scale with immediate state changes or opacity only.
- Disable decorative loops and cursor-following effects.
- Keep navigation, selection, progress, and completion feedback visible.
- Page turns may become a short crossfade or immediate page change.

## Performance Rules

- Prefer `transform` and `opacity` for animation.
- Avoid animating layout-heavy properties on large page trees.
- Do not add GSAP, Lottie, or 3D to the editor work surface.
- Lazy-load any future cinematic animation used on Home or Preview.
- Never run multiple animation engines for the same interaction.

## Review Checklist

- Does the motion explain a state change?
- Is the duration selected from the shared tokens?
- Does focus remain visible without motion?
- Does reduced-motion mode remain fully usable?
- Does opening the control preserve page position and size?
- Is the interaction responsive on a low-power mobile device?
