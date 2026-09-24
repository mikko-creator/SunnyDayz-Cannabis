# SunnyDayz Cannabis

A platform-free rebuild and redesign of [sunnydayzcannabis.com](https://www.sunnydayzcannabis.com): 250 static
pages, no Treez / Next.js / Prismic runtime, a neumorphic "Sunlit Clay" design with scroll-driven motion and the
client's own hero film. Every word on the pages comes from the live site.

**Preview:** https://mikko-creator.github.io/SunnyDayz-Cannabis/ — a path-rewritten copy of `dist/` on the
`gh-pages` branch, marked `noindex` so it never competes with the live site in search. It is regenerated from
`dist/` by `src/tools/make-pages-preview.mjs` and checked with `src/tools/crawl-preview.mjs`.

## Run it

```bash
node src/tools/serve.mjs --root dist --port 8080     # then open http://localhost:8080
```

`dist/` is the built site and deploys as-is to any static host that serves `/about-us` from `about-us.html`
(Netlify and Cloudflare Pages do by default) — see `docs/DEPLOY.md`.

## Status

- Gate: 26 of 29 checks pass. The three that do not — C07 (16 srcset parse artifacts that are not images),
  C20 (12 claims, every one verbatim from the live site) and C22 (pixel drift, which a redesign causes by
  definition) — were accepted by the operator; `docs/README.md` → Known open items says why for each.
- QA: visual QA round 4, a phone-optimisation pass and two verification rounds, each fix measured against
  the build that had the defect — `docs/QA-LOG.md`, including what the client still has to decide
  (age-gate exit address, ungated legal pages, a few verbatim copy errors on the live site).

## What is in this repository

| path | |
|---|---|
| `dist/` | the built site |
| `src/` | the generator, styles, script, content model and project tools |
| `docs/` | developer README, deployment, brand system, change log (generated) and the QA log |
| `audit/*.json` | inventories, reports and the gate record |
| `facts/client-facts.json` | the only allowed source of claims not on the live site (empty) |

Not included, kept in the project workspace: the harvested source files (`assets/`, about 650 MB — `src/build.mjs`
needs them to rebuild), the raw live-site capture (`audit/raw|screens|capture|rendered`), QA scratch (`tmp/`)
and the handoff zip.
