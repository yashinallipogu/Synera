# Synera

Synera connects people with others who want to learn, study, teach or collaborate. Users can find people nearby to work with based on their interests and skills, and whether they want to find a study partner, get tutoring, swap skills, work on projects or try out a hobby together.

On Synera people can create a profile for themselves and then add their skills and interests. After that, you can find people that share your interests and skills and connect with them. Once you establish that you can work with them, you can schedule a meetup at any of the locations found on the map on our website where you can find a comfortable environment to learn and collaborate.

> Current scope:

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

## AI study helper

The feed includes a Gemini-powered helper for making flashcards, icebreakers, mini-lessons, and other study-swap activities. Copy `.env.example` to `.env` in the project root and set `GEMINI_API_KEY` to a Google AI Studio API key. Keep `.env` local; it is ignored by Git and the key is only read by the server.

Restart `npm run dev` after changing `.env`. For production, run `npm run build` followed by `npm start` (or `npm run preview`); both serve the built app and the `/api/study-helper` endpoint on port 3000 (or the port set in `PORT`).
