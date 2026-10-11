# Synera

Synera helps students find campus skill-swap partners. Create an account, complete your profile, and browse ranked matches.

## Run locally

Requires Node.js 24 or newer.

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. The dev command runs the app and its account API together.

## Accounts

Usernames are 3-24 characters and may contain letters, numbers, dots, dashes, and underscores. Passwords must be at least 10 characters. Password hashes and profile data are stored in `.synera/accounts.sqlite` on this machine; they are not shared across deployments. Passwords are never stored in plaintext.

Google sign-in is available when `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` are configured server-side. For local development, register `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI in Google Cloud. Set the production redirect URI and the same server-only variables in the hosting provider's environment settings, then redeploy.
Students can browse matches from registered accounts, start match-only in-app chats, and propose meetups in a chat. Meetup proposals must be accepted by the other participant. Chat messages and meetup updates are available in Synera.

For a production build, run `npm.cmd run build` followed by `npm.cmd run preview`. Production login requires HTTPS so the session cookie can be marked secure.

## Vercel

Vercel serves the Vite build and rewrites `/api/*` to the shared Node handler in `api/dispatcher.js`. The account database uses SQLite in `/tmp`, which is temporary serverless storage; accounts and sessions may reset when Vercel recycles the function. Configure a persistent hosted database before using Vercel for real accounts.

