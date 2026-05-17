# CMP V3 — Privacy Button & Link test site

Manual test site for the CMP Privacy Trigger (Privacy Button / Privacy Link) on the
US framework, with **"Show CMP on page load" disabled**.

## Pages

| Page | Case |
| --- | --- |
| `privacy-button-us.html` | Privacy Button — Show on all pages |
| `privacy/index.html` | Show on specific pages — path matches |
| `account/index.html` | Show on specific pages — path does not match |

## Loader

Every page has a **Loader** panel. The Usercentrics loader is injected by the test
kit — paste a loader URL, set the `settingsId` and the `data-sandbox` flag, then click
**Apply & reload**: the page reloads and re-attaches the CMP with the new script.
Settings persist in `localStorage`; **Reset to default** restores them.

Defaults: loader `https://web.cmp.usercentrics-sandbox.eu/ui/loader.js`,
settingsId `cqNAsnaCNNTg5s`, `data-sandbox="1"`.

## Run

Hosted via GitHub Pages, or locally from the repo root:

```bash
python3 -m http.server 8090
```

Open `/privacy-button-us.html`, `/privacy/` and `/account/`.

## Setup

In the Admin Interface use a **US framework** configuration:

- Privacy Trigger → Layout = **Privacy Button**, Position Bottom Right.
- Disable **"Show CMP on page load"**.
- For the specific-pages cases, add page path **`/privacy`**.

## What to verify

- **All-pages & matching page** — the floating Privacy Button appears bottom-right,
  the first-layer banner does not auto-open, clicking the button opens the layer.
- **Non-matching page** — the Privacy Button stays hidden.
- Use the **Automated checks** toolbar on each page for pass/fail verdicts.
