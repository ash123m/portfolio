# Easy Guide: Deploy to Vercel + Free Neon Postgres

Your project includes serverless backend APIs (`/api/*`) using standard PostgreSQL (`pg`), so it works with **Neon** (recommended), **Supabase**, or any Postgres provider.

---

## Step 1: Push Latest Files to GitHub
Make sure all files from `C:\Users\ashok\.gemini\antigravity\scratch\poornaprajna-freshers-2026` (including `api/`, `package.json`, `vercel.json`, `admin.html`, `schema.sql`) are pushed to `https://github.com/ash123m/poornaprajna-freshers-2026`.

## Step 2: Create Free Neon Postgres Database (2 Minutes)
1. Go to **[Neon](https://neon.tech/)** (free tier, no credit card, never pauses after 7 days like Supabase free tier) and sign in with GitHub.
2. Create a new project (e.g., `poornaprajna-freshers-2026`).
3. Copy the **Connection String** (`postgres://...sslmode=require`).
4. *(Optional)* Paste `schema.sql` in Neon's SQL Editor and run it—the app also creates the table automatically on the first request.

## Step 3: Deploy on Vercel (2 Minutes)
1. Go to **[Vercel](https://vercel.com/)** → **Add New… → Project** → Import `ash123m/poornaprajna-freshers-2026`.
2. Expand **Environment Variables** and add these 3 keys:
   - `DATABASE_URL` = your Neon `postgres://...` connection string
   - `ADMIN_PIN` = your secret Coordinator PIN (e.g. `482910`)
   - `COOKIE_SECRET` = any random 32+ character string (e.g. `pim-mca-2026-freshers-secret-key-9988`)
3. Click **Deploy** (leave Build Command & Output Directory empty — Vercel detects static files + `/api/*` automatically).
4. Once live (e.g. `https://poornaprajna-freshers-2026.vercel.app/`):
   - Open `https://<your-vercel-url>/` and test checking in with a test Roll No.
   - Open `https://<your-vercel-url>/admin.html` with your `ADMIN_PIN`, verify your test row appears, and delete the test row before the event.
   - Open `https://<your-vercel-url>/qr.html` to download the final **2000px PNG / Vector SVG** QR code pointing to your live Vercel URL for your event posters!
