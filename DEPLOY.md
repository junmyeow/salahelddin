# Deploying for free

The site is fully static (HTML + CSS + JS, no server, no database), so every
static host will serve it on a free plan — no time limit, no credit card.

**Recommendation: Vercel.** No base-path setting, no workflow file, and it
redeploys on every `git push`. GitHub Pages is covered after it and is equally free.

---

## 0) First, whichever host: get the project onto GitHub

A local git repository has already been created and committed for you. Verify it:

```bash
cd "c:/Users/junmy/Desktop/salahelddin"
git log --oneline
```

Create an empty repository at <https://github.com/new> — **do not** add a README,
.gitignore, or licence — then:

```bash
git remote add origin https://github.com/USERNAME/salahelddin.git
git push -u origin main
```

`node_modules/`, `dist/`, and `temporary screenshots/` are excluded by `.gitignore`
and will not be uploaded.

> **Before pushing:** set `repoUrl` in `src/data/site.ts` to your real repository URL.

### Faster: the GitHub CLI

If you install the GitHub CLI, the repo creation and push become one command:

```bash
winget install --id GitHub.cli -e     # then reopen the terminal
gh auth login                          # browser login, one time
gh repo create salahelddin --public --source=. --remote=origin --push
```

---

## A) Vercel — the easiest path

1. Go to <https://vercel.com/signup> and choose **Continue with GitHub**.
2. **Add New… → Project**, then **Import** next to the `salahelddin` repository.
3. Vercel detects Astro automatically. Leave every field at its default:
   - Framework Preset: `Astro`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Click **Deploy** and wait about a minute.

The site goes live at `https://salahelddin-xxxx.vercel.app`.

5. Put the real URL into `astro.config.mjs` — it is needed for the canonical link
   and the social tags — and leave `base` commented out:

```js
export default defineConfig({
  site: 'https://salahelddin-xxxx.vercel.app',
  // base: '/salahelddin',   ← stays commented out on Vercel
  ...
});
```

```bash
git add astro.config.mjs && git commit -m "Set site URL" && git push
```

**From then on:** every push to `main` redeploys automatically, and every branch or
pull request gets its own preview URL before you merge.

**Free-plan limit:** 100 GB of bandwidth per month — far beyond what a site like
this needs (roughly 450 KB per page including images).

---

## B) GitHub Pages — also free, one extra step

The only difference: unless the repository is named `USERNAME.github.io`, the site
is served from a sub-path `/salahelddin`, and Astro has to be told via `base`.

### 1) Configure `astro.config.mjs`

```js
export default defineConfig({
  site: 'https://USERNAME.github.io',
  base: '/salahelddin',        // ← uncomment, and match the repo name exactly
  ...
});
```

Every internal link already goes through `withBase()` in
[src/lib/url.ts](src/lib/url.ts), so no link needs editing by hand.

### 2) Enable Pages

In the repository: **Settings → Pages → Build and deployment → Source**, and pick
**GitHub Actions** (not "Deploy from a branch").

### 3) The workflow is already written

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) is in the project and
builds and publishes on every push to `main`.

```bash
git add -A && git commit -m "Deploy to GitHub Pages" && git push
```

Watch progress in the **Actions** tab. On success the site is at:
`https://USERNAME.github.io/salahelddin/`

### Base-path warning

If the site loads unstyled or with missing images, the cause is always a `base`
that does not match the repository name. Check it character for character, and make
sure the slash is only at the start (`'/salahelddin'`, not `'salahelddin/'`).

---

## C) Custom domain (optional)

Hosting is free either way, but the domain itself (something like
`salahuddin-archive.com`) is bought yearly from a registrar, roughly $10–15/year.
There is no genuinely free `.com`.

- **Vercel:** Project → Settings → Domains → Add, then follow the DNS records shown.
- **Pages:** Settings → Pages → Custom domain, and add a `public/CNAME` file
  containing the domain. At that point **remove `base`**, since the site is now
  served from the root.

HTTPS certificates are free and auto-renew on both platforms.

---

## D) Turning on the suggestion form

The form is built but disabled until you supply an ID. Without one it shows a setup
notice and sends nothing.

1. Sign up at <https://formspree.io> (free plan: **50 submissions per month**).
2. **+ New Form**, using the email address where you want suggestions to arrive.
3. Copy the form ID out of its URL: `formspree.io/f/**xyzabcd**` → `xyzabcd`.
4. Put it in [src/data/site.ts](src/data/site.ts):

```ts
formspreeId: 'xyzabcd',
```

5. Push the change. The first submission triggers a confirmation email to you, after
   which the form is live.

If you expect more than 50 suggestions a month, unlimited free alternatives are
**Tally**, **Google Forms**, or **GitHub Issue Forms** (see README).

---

## E) Post-deployment checklist

```bash
npm run check:links     # probe every external link
```

- [ ] `site` in `astro.config.mjs` matches the real URL
- [ ] `base` set for Pages / removed for Vercel and custom domains
- [ ] `repoUrl` in `src/data/site.ts` is correct
- [ ] `formspreeId` is set, and the form has been tested once for real
- [ ] `pending-review` links replaced with verified ones and flipped to `live`
- [ ] Page opens on a phone with no horizontal scrolling
- [ ] Dark mode looks right
- [ ] "اختيار اليوم" shows a real item

---

## F) Running costs

| Item | Cost |
|---|---|
| Hosting (Vercel or Pages) | **Zero** |
| `*.vercel.app` / `*.github.io` subdomain | **Zero** |
| HTTPS | **Zero** |
| Formspree form (50/month) | **Zero** |
| Custom domain (optional) | ~$10–15/year |

No servers, no database, no cloud functions — so there is no bill that grows with
traffic.
