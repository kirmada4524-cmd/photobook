# Travelogue Studio

Yaara photobook editor and preview app built with TanStack Start, React, TypeScript, and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when testing the production storage integration locally. Without cloud variables, admin templates and assets use local JSON/public-file fallbacks.

## Production storage

- Supabase stores template layouts, categories, sticker folders, sticker metadata, and background metadata.
- ImageKit stores template images, stickers, backgrounds, overlays, and thumbnails.
- Private keys are read only by server functions.

Run `supabase/migrations/202607110001_photobook_storage.sql` once in the Supabase SQL editor before deploying. See `DEPLOYMENT.md` for the complete Vercel setup.
