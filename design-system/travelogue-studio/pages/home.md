# Home Page Override

## Direction

- Use a white and very light-blue base (`#F7FAFF`) with soft sky, lilac, and mint ambient gradients.
- Use dark navy typography (`#172033`) for headings and slate text for supporting copy.
- Use Poppins 800 for display headings and Inter for body and controls.
- The whole home page uses a light 3D visual system, not only the hero.
- The hero is a clean, full-bleed light 3D scene; never restore the book mockup or decorative photo frames.
- Use translucent flowing paper ribbons, liquid-glass folds, fine depth particles, and soft sky/lilac/mint color for creative depth.
- Avoid large empty rectangular background objects; they read like broken photo frames instead of premium 3D.
- Workflow steps, template category rails, template cards, benefits, and the final CTA should use consistent raised surfaces, perspective, inner highlights, and real shadows.
- Keep the center readable with a white radial scrim, subtle grid texture, and restrained ambient lighting.
- Primary actions use `#7C3AED -> #EC4899`; glass is reserved for secondary actions and small controls.

## Product Contract

- Render only templates returned by the admin template store.
- Preserve likes, most-liked sorting, bucket selection, ordered selection state, photo setup, project recovery, login, and blank-book creation.
- Do not promise ordering or delivery until those product flows exist. Use `preview`, `print-ready PDF`, and `export` language.

## Motion

- Hover may lift, scale, and slightly rotate cards in perspective.
- The hero scene uses subtle pointer parallax and slow continuous motion; it must never capture clicks.
- The rest of the page uses restrained 3D card motion only where it clarifies interactivity.
- Respect `prefers-reduced-motion`, pause rendering offscreen, and reduce render density on mobile.

## Responsive

- Desktop: four workflow steps and the complete admin template catalog.
- Tablet: responsive template rails and compact navigation.
- Mobile: one-column workflow and benefits, full-width hero CTAs, and at least 44px touch targets.
