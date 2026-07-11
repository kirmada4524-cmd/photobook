# Deployment

## Vercel

1. Push this project to GitHub, GitLab, or Bitbucket.
2. Import the repo in Vercel.
3. Keep the framework preset as `TanStack Start`.
4. Use the default build command: `npm run build`.
5. Use Node `22.12.0` or newer. The project declares this in `package.json`.

## Cloud Storage

Admin templates, global sticker folders, global stickers, and global backgrounds need persistent storage in production.

Travelogue Studio uses Supabase for structured data and ImageKit for media files.

### Supabase

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/migrations/202607110001_photobook_storage.sql`.
4. Copy the project URL and service-role key from the Supabase project settings.

### ImageKit

1. Create an ImageKit account and Media Library.
2. Copy the URL endpoint, public key, and private key from Developer Options.
3. Keep the private key server-only.

### Vercel environment variables

Add these values for Production, Preview, and Development:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
IMAGEKIT_URL_ENDPOINT
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_PRIVATE_KEY
```

Do not prefix `SUPABASE_SERVICE_ROLE_KEY` or `IMAGEKIT_PRIVATE_KEY` with `VITE_`. The app accesses both through TanStack server functions and never sends them to the browser.

After adding or changing environment variables, redeploy the Vercel project.

Local files such as `admin-assets.json`, `admin-templates.json`, and `public/admin-assets/` are only development fallbacks and are ignored for deployment.
