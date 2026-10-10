# synera-photon

A [Spectrum](https://photon.codes/docs/spectrum-ts) project. Wired with: imessage.

## Environment

Before running, make sure `.env` contains this project's credentials:

From your project Settings on the [Photon dashboard](https://app.photon.codes):

- `PROJECT_ID`
- `PROJECT_SECRET`

## Run

```powershell
npm.cmd install
npm.cmd run start
```

The start script loads `.env` automatically and starts Synera's authenticated outbound notification bridge on `127.0.0.1:5190`. Keep `.env` private; `.gitignore` excludes it.

## Where to go next

- [Spectrum docs](https://photon.codes/docs/spectrum-ts)
- `src/index.ts` handles iMessage delivery and the local Synera send bridge.
- Add more providers from `spectrum-ts/providers/*`.
