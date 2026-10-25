# Rebound by Bouncer

The website for Rebound, the tab in [Bouncer](https://bouncer-ai.pages.dev) where you make your own bots. Live at **https://rebound.web.app**.

- `public/index.html`: the showcase page (starter bots, a face picker, screenshots, install commands).
- `public/docs.html`: the Rebound docs, served at `/docs`.
- `public/assets/blob.js`: the bot faces. A plain-JS port of Bouncer's avatar code (`packages/core/src/bots/blob.ts` and `ui/bots/BotAvatar.tsx`), so a seed draws the same blob here as in the app.
- `public/assets/style.css`: Bouncer's Graphite & Signal tokens (Obsidian and light) and the bot colors from `packages/ui/src/tokens.ts`. Raw hex only lives in the token blocks at the top.

It is static HTML, CSS and JS with no build step.

## Preview

Any static server works. `/docs` needs clean URLs, so open `docs.html` directly if your server does not add `.html`.

```sh
cd public && python3 -m http.server 5077
```

## Deploy

Firebase Hosting, project `bouncer-af456`, site `rebound` (the `rebound` target in `.firebaserc`).

**Automatic:** `.github/workflows/deploy.yml` deploys every push to `main` to https://rebound.web.app, and gives each pull request a preview URL that expires after 7 days. It needs one repository secret, `FIREBASE_SERVICE_ACCOUNT_BOUNCER_AF456`:

1. In the [Google Cloud console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=bouncer-af456), create a service account with the **Firebase Hosting Admin** and **API Keys Viewer** roles (or run `firebase init hosting:github`, which does this for you).
2. Create a JSON key for it.
3. Add the whole JSON as the secret: `gh secret set FIREBASE_SERVICE_ACCOUNT_BOUNCER_AF456 -R shankar-sachin/rebound < key.json`, then delete the local key file.

Without the secret, the workflow passes with a warning and deploys nothing.

**By hand**, with the Firebase CLI:

```sh
firebase login
firebase deploy --only hosting:rebound
```

## Writing style

Follow Bouncer's design rules: tokens only, light and dark both work, labels lowercase but never ALL CAPS, product names keep their capitals (Bouncer, Rebound, Bouncer Chat).
