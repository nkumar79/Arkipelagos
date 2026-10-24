# Arkipelagos

A one-page, zero-dependency static site: a performance table and a holdings allocation ledger. No build step, no framework, no packages.

The site is split in two files:

```text
.
├── index.html          thin shell: fetches the page from jsDelivr and shows it in an iframe
├── og.png              1200×630 social preview (referenced by the OpenGraph/Twitter tags)
└── arkipelagos.html     the site itself: all HTML, CSS and JavaScript in one file
```

Everything you edit day to day is in `arkipelagos.html`. The shell only loads it.

---

## Run locally

Use any static server, then open the address it prints:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

On `localhost` the shell loads `arkipelagos.html` from your disk first (jsDelivr is the fallback), so edits show up on refresh. `?local` forces the same behavior on any host.

You can also open `arkipelagos.html` directly. That is the only way to run the allocation audit (see [Checks](#checks)).

---

## Update the numbers

All content is in the section marked **EDITABLE CONTENT & LEDGER DATA** in `arkipelagos.html`.

### Performance

```html
<li style="--delay-idx: 0;"><span class="name">Net Portfolio IRR</span> <span class="val count-num" data-value="32.1" aria-label="32.1%">32.1%</span></li>
<li style="--delay-idx: 1;"><span class="name">Nasdaq-100 Total Return</span> <span class="val">20.1%</span></li>
```

- The first row counts up on load. Change **all three** of `data-value`, `aria-label` and the visible text, or the animation will end on a different number than the one you typed.
- The other rows are plain text.

### Holdings

```html
<li style="--weight: 50.6%; --delay-idx: 0;"><span class="name">SpaceX</span> <span class="val">50.6%</span></li>
```

- `--weight` sets the bar length and must match the visible percentage.
- `--delay-idx` staggers the bar animation. Number the rows `0, 1, 2, …` from top to bottom.
- Weights should add up to `100.0`.
- Private holdings carry a footnote marker. Add it after the name:

  ```html
  <sup><a href="#footnote-fmv" role="doc-noteref" aria-label="Private valuation note for NAME">*</a></sup>
  ```

### Dates

The footer has two `<time>` elements. Update both the `datetime` attribute and the visible text:

```html
As of <time datetime="2026-08-07">Aug 7, 2026</time> · Inception <time datetime="2010-09-07">Sep 7, 2010</time>
```

The `foundingDate` in the JSON-LD block in `<head>` should match the inception date.

---

## Checks

Opened directly on `localhost` (or with `#debug` on the URL), the page sums the `--weight` values and warns in the console if they don't total `100.0%`:

```text
[Arkipelagos Audit] Rendered holdings allocation sum is 99.9%; expected 100.0%.
```

The audit does **not** run when the page is loaded through the shell, because inside the iframe the page has no hostname. Run it by opening `arkipelagos.html` itself.

---

## Deploy

Host the repo root on any static host (Cloudflare Pages, GitHub Pages, Netlify). There is nothing to build.

1. In `index.html`, set the shell config near the top of the script:

   | Option    | Default                | What it does |
   | --------- | ---------------------- | ------------ |
   | `repo`    | `YOUR_USER/YOUR_REPO`  | GitHub repo the page is fetched from |
   | `ref`     | `main`                 | branch, tag or commit SHA |
   | `dir`     | `pages/`               | folder that holds the page files |
   | `home`    | `index`                | page shown at the bare URL |
   | `fresh`   | `true`                 | ask GitHub for the branch's newest commit so jsDelivr never serves a stale copy |
   | `timeout` | `8000`                 | ms to wait on each source before trying the next |
   | `preload` | `[]`                   | extra pages to load in the background |

2. Push to `main`. With `fresh: true`, visitors get the new page right away.

If GitHub's API is unreachable or rate-limited (60 requests/hour per visitor IP without a token), the shell falls back to the branch name, and jsDelivr can serve a cached copy for a few hours. To clear it by hand:

```text
https://purge.jsdelivr.net/gh/YOUR_USER/YOUR_REPO@main/arkipelagos.html
```

If the CDN is down, the shell loads `arkipelagos.html` from the host itself.

---

## Design notes

- **Theme:** light and dark follow the system setting. Colors are tokens at the top of the `<style>` block (`--bg`, `--fg`, `--line`, …), with OKLCH versions where the browser supports them.
- **Type:** Inter (Google Fonts) with a size-matched fallback to avoid layout shift. Numbers use tabular, lining figures so columns line up.
- **Motion:** bars grow with a staggered GPU-composited animation, and the IRR counts up. Both are skipped with `prefers-reduced-motion`.
- **Accessibility:** skip link, semantic lists and headings, 44px touch targets on footnote markers, visible focus rings, and a forced-colors mode.
- **Print:** a separate black-on-white stylesheet; backgrounds and bars are dropped.

---

## Security and privacy

- A strict Content-Security-Policy is set as a `<meta>` tag in the page. `frame-ancestors` can't be set that way, so add `Content-Security-Policy: frame-ancestors 'none'` as an HTTP header at your host if you want the site unframeable. This applies to the shell, since that's the document your host serves.
- Google Analytics 4 is the only third-party script. Consent defaults to **denied** and ad personalization and Google signals are off. Change the measurement ID in the `gtag/js?id=` URL and the `gtag("config", …)` call in `<head>`.

---

## Known limitation: link previews and SEO

The page's `<title>`, description, canonical URL, OpenGraph/Twitter tags, JSON-LD and robots tag live in `arkipelagos.html`, but the URL people share is the **shell**, which has none of them. Most link-preview scrapers don't run JavaScript or read iframe contents, so they will see the shell's placeholder title instead.

Fix: copy those `<meta>`, `<link rel="canonical">` and JSON-LD tags into the `<head>` of `index.html` as well. The shell's script already replaces the tab title with the page's own, so the title is covered for visitors.