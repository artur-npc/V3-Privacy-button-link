# CMP V3 — Privacy Button & Link test site

Manual test site for the CMP Privacy Trigger (Privacy Button / Privacy Link) on the
US framework, with **"Show CMP on page load" disabled**.

## Pages

| Page | Case |
| --- | --- |
| `privacy-button-us.html` | Privacy Button — Show on all pages |
| `privacy/index.html` | Show on specific pages — path matches |
| `account/index.html` | Show on specific pages — path does not match |

## Setup

1. Create a **US framework** configuration in the Admin Interface:
   - Privacy Trigger → Layout = **Privacy Button**, Position Bottom Right.
   - Disable **"Show CMP on page load"**.
   - For the specific-pages cases, add page path **`/privacy`**.
2. Replace `YOUR_US_SETTINGS_ID` in every `.html` file with that settingsId.

## Run

Hosted via GitHub Pages, or locally from the repo root:

```bash
python3 -m http.server 8090
```

Open `/privacy-button-us.html`, `/privacy/` and `/account/`.

## What to verify

- **All-pages & matching page** — the floating Privacy Button appears bottom-right,
  the first-layer banner does not auto-open, clicking the button opens the layer.
- **Non-matching page** — the Privacy Button stays hidden.
- Use the **Automated checks** toolbar on each page for pass/fail verdicts.
