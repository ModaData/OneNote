# OneNote Blog (Next.js 14)

OneNote-style blog with admin-only editing, TipTap rich text, and drag-to-reorder.

## Quick Start
```bash
npm install
npm run dev
# Public: http://localhost:3000
# Admin:  http://localhost:3000/admin  (prompts for Basic Auth)
```

## Deploy on Vercel
1. Push to GitHub and connect on Vercel.
2. Set Environment Variables:
   - `ADMIN_USER` (e.g. `admin`)
   - `ADMIN_PASSWORD` (choose a strong one)
3. Deploy.

## Tech
- Next.js 14 (app router)
- Tailwind CSS + @tailwindcss/typography
- TipTap editor (StarterKit, TaskList, TaskItem, Placeholder)
- dnd-kit for drag sorting
- Basic Auth via `middleware.ts` (protects `/admin`)

## Notes
- This build stores content in `localStorage`. You can later replace with DB APIs.
- To change look and feel, edit Tailwind classes in `components/OneNoteBlog.tsx`.

## Troubleshooting
- If Tailwind utilities don't appear, check `tailwind.config.js` `content` globs.
- If TypeScript errors appear on Vercel, run `npm run typecheck` locally and push fixes.
- If `/admin` doesn't prompt for login on some browsers, clear site data and retry.
