# Hooks Workout

A personal workout tracker with a real database — synced across every device, no browser storage tricks.

## What this is
- Next.js app, deployed on Vercel (same platform as your screener)
- Data stored in Upstash Redis (Vercel's current recommended key-value store — Vercel KV itself is deprecated)
- A single shared passcode gates the app so it isn't wide open to the internet

## Deploy it (same flow as hooks-screener)

1. **Push to GitHub**
   ```
   cd hooks-workout-app
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<your-username>/hooks-workout.git
   git push -u origin main
   ```

2. **Import into Vercel**
   - vercel.com → Add New → Project → import the `hooks-workout` repo
   - Framework preset: Next.js (auto-detected) — just click Deploy once (first deploy will work, but data storage won't until step 3)

3. **Add a Redis database**
   - In the Vercel project → Storage tab → Create Database (or Marketplace → search "Redis") → choose the Upstash integration
   - This auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into your project's environment variables — you don't need to copy these by hand

4. **Set your passcode**
   - Project → Settings → Environment Variables → add `APP_PASSCODE` = something only you know
   - Redeploy (Settings changes need a redeploy to take effect — Vercel will prompt you)

5. **Use it anywhere**
   - Visit your `*.vercel.app` URL on your phone, enter the passcode once (it's remembered on that device from then on)
   - Do the same on your laptop — same passcode, same data, both read/write the same Redis store

## Local development (optional)
```
npm install
cp .env.local.example .env.local   # fill in the three values
npm run dev
```

## Notes
- This is single-user by design — one passcode, one shared dataset. Don't share the passcode.
- If you ever want a proper multi-device login (instead of one shared passcode), that's a bigger add — happy to help when you're there.
