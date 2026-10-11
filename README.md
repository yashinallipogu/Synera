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

Students can browse matches from registered accounts, start match-only in-app chats, and propose meetups in a chat. Meetup proposals must be accepted by the other participant. Accepted meetups receive a one-hour reminder when both participants have opted in.

Phone numbers are private to their owners. iMessage alerts are off by default; students must verify their number with a one-time code and explicitly opt in. Chat contents stay in Synera; iMessage alerts only say that a new chat message or meetup event is waiting.

For a production build, run `npm.cmd run build` followed by `npm.cmd run preview`. Production login requires HTTPS so the session cookie can be marked secure.

## Vercel

Vercel serves the Vite build and rewrites `/api/*` to the shared Node handler in `api/dispatcher.js`. The account database uses SQLite in `/tmp`, which is temporary serverless storage; accounts and sessions may reset when Vercel recycles the function. Configure a persistent hosted database before using Vercel for real accounts.

## Photon messaging

Synera connects to a separate Spectrum iMessage service using the [stable Spectrum SDK](https://photon.codes/docs/spectrum-ts/getting-started) and [iMessage provider](https://photon.codes/docs/spectrum-ts/providers/imessage). Photon exposes a project-secret-protected send endpoint on localhost port 5190; Synera calls it from its server, never from browser code.

The Photon service lives in the `synera-photon` folder in this repository. Copy `synera-photon/.env.example` to `synera-photon/.env` and fill in the project ID and secret from your Photon dashboard. Both `PROJECT_ID` / `PROJECT_SECRET` and `SPECTRUM_PROJECT_ID` / `SPECTRUM_PROJECT_SECRET` are accepted. Synera loads credentials from this file at startup. Keep `.env` private; it is ignored by Git.

Start Synera and Photon in separate PowerShell windows:

```powershell
Set-Location .
npm.cmd run dev
```

```powershell
Set-Location .\synera-photon
npm.cmd install
npm.cmd run start
```

Each opted-in recipient's verified number must also be added to Photon **Users** before delivery. The shared line only reaches added iMessage users; it is not general SMS. A dedicated line is a Photon plan feature.

The reminder worker runs in the Synera server and checks for accepted meetups within one hour of their start. Keep both services running for chat alerts and reminders to work. Never expose Photon credentials in browser code.

## AI study helper

The feed includes a Gemini-powered helper for making flashcards, icebreakers, mini-lessons, and other study-swap activities. Copy `.env.example` to `.env` in the project root and set `GEMINI_API_KEY` to a Google AI Studio API key. Keep `.env` local; it is ignored by Git and the key is only read by the server.

Restart `npm run dev` after changing `.env`. For production, run `npm run build` followed by `npm start` (or `npm run preview`); both serve the built app and the `/api/study-helper` endpoint. The server uses port 5173 by default, or the port set in `PORT`.
