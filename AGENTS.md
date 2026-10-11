# AGENTS.md

## What this is

`agent-business-card` renders a business card and prints it to screen (front
and back, flip, light/dark, landscape/portrait) as one self-contained HTML
page. One file: `src/index.ts`. It has no runtime dependencies and no Node
APIs, so it must keep running in the browser.

## Commands

- `npm run typecheck`
- `npm run build` (emits `dist/`)
- `npm test` (node:test via tsx)
- `npm run test:coverage` (the CI gate: 90% lines)

## Rules

- **The page stays self-contained.** No external scripts, styles, fonts or
  images. Tests check this.
- **Never import from `node:*`.** The renderer runs in browsers.
- **Escape every text field.** Only `tabs[].html` and `about` are trusted
  markup.
- **Nothing is guessed.** No colour means ink. A field that isn't given isn't
  printed.
- **Flip, tabs and toggles stay CSS-only.** The inline script is an
  enhancement, never required.
- Node 22 or newer for development (`engines`).
