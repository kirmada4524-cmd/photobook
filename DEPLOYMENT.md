# Deployment

## Vercel

1. Push this project to GitHub, GitLab, or Bitbucket.
2. Import the repo in Vercel.
3. Keep the framework preset as `TanStack Start`.
4. Use the default build command: `npm run build`.
5. Use Node `22.12.0` or newer. The project declares this in `package.json`.

## Admin Asset Storage

Admin templates, global sticker folders, global stickers, and global backgrounds need persistent storage in production.

For Vercel:

1. Open the Vercel project.
2. Go to Storage.
3. Create a Blob store.
4. Make it public, because sticker and background image URLs are rendered directly in the browser.
5. Connect the Blob store to this project.

For persistent admin templates, stickers, and backgrounds, add `BLOB_READ_WRITE_TOKEN` in the Vercel project environment variables for Production and Preview. `BLOB_STORE_ID` alone is not enough for this app's admin writes.

Local files such as `admin-assets.json`, `admin-templates.json`, and `public/admin-assets/` are only development fallbacks and are ignored for deployment.
