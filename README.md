# agent-business-card

[![Business card · Get yours →](https://wolfe-jam.github.io/agent-business-card/badge.svg)](https://wolfe-jam.github.io/agent-business-card/?repo=Wolfe-Jam/agent-business-card)

Render a business card for an AI agent, an MCP server or a person, and print
it to screen as one self-contained HTML page.

The front has a logo, a name, a title and a one-liner. Flip it over for the
detail, in tabs you choose. It comes in light, dark or auto, landscape or
portrait, and in your colour or plain ink.

- **One file.** Inline CSS, no external fonts, styles or images. Open it,
  screenshot it, attach it to a PR.
- **Works without JavaScript.** The flip, the tabs and the toggles are CSS. The
  one small inline script only adds conveniences (expand all, print).
- **Runs anywhere.** No Node APIs and no dependencies, so it renders in Node and
  in the browser alike.
- **Claims nothing it isn't given.** The business card prints only the fields you pass,
  and every text field is escaped.

## Print one now

Paste any GitHub repo at **[wolfe-jam.github.io/agent-business-card](https://wolfe-jam.github.io/agent-business-card/)** and its business card prints in your browser, from the repo's own public files. A repo with a `.fafa` at `.well-known/fafa` shows as claimed, in its owner's colour. The page is in [`docs/`](docs/).

## Install

```
npm install agent-business-card
```

## Use

```ts
import { renderBusinessCard } from "agent-business-card";

const html = renderBusinessCard({
  name: "weather-agent",
  title: "A2A agent · v0.3.0",
  oneLiner: "Forecasts on request.",
  domain: "example.com",
  chips: [{ text: "published", accent: true }, { text: "MIT" }],
  tabs: [
    { key: "about", label: "About", heading: "About", html: "<p>Answers weather questions.</p>" },
    { key: "skills", label: "Skills", heading: "Skills", html: "<p>forecast</p>" },
  ],
  about: "<p>The public business card of an AI agent.</p>",
  accent: "#0066cc", // optional
});
```

`html` is a complete page, starting with `<!doctype html>`.

### The business card

| Field | What it is |
|---|---|
| `name` | The name on the front. Its first letter is the logo, with a second letter only when it's obvious (`github` → GH, `TypeScript` → TS). Words like "mcp", "server" or "agent" are skipped. |
| `title` | What it is: "MCP server · v1.2.0", "A2A agent", a person's role. Optional. |
| `oneLiner` | One sentence about it. Optional. |
| `domain` | Shown bottom-left on the front, such as the publisher's domain. Optional. |
| `chips` | Small labels on the front. `accent: true` highlights one. |
| `tabs` | The back, in order. `key` is cleaned to `[a-z0-9-]`, and `html` is markup you've already made safe. |
| `about` | The (i) panel, as markup you've already made safe. |
| `accent` | The owner's colour, as a hex. Optional. |

Text fields are escaped. `tabs[].html` and `about` are inserted as given, so
build them from trusted or escaped content. `escapeHtml` is exported for that.

### Options

`renderBusinessCard(card, { theme, accent, layout, expanded })`

| Option | Default | |
|---|---|---|
| `theme` | `auto` | `light`, `dark`, or `auto` (follow the viewer's OS) |
| `accent` | none | A hex colour. It wins over `card.accent`. |
| `layout` | `landscape` | or `portrait`. The reader can switch it on the page too. |
| `expanded` | `false` | Both faces flat and every section open, for print and screenshots |

### Colour

A business card's colour belongs to its owner, and nothing is guessed. Pass
one as `card.accent` or the `accent` option. With neither, it prints in ink:
black on a light card, white on a dark one. A value that isn't a hex colour is
dropped, and the business card falls back to ink.

## Also exported

- `cardInitials(name)`: the logo letters.
- `safeAccent(value)`: a valid hex colour, or `undefined`.
- `escapeHtml(text)`.
- Types `BusinessCard`, `RenderOptions` and `Theme`.

## How it fits

agent-business-card only prints. It reads nothing and claims nothing it isn't
given, so each reader decides where the fields come from:

| Reader | Runs in | Reads |
|---|---|---|
| [mcp-context-card](https://github.com/Wolfe-Jam/mcp-context-card) (an MCP server) | Node | a project's `AGENTS.md`, memory and identity files |
| [the page](https://wolfe-jam.github.io/agent-business-card/) ([`docs/`](docs/)) | the browser | a GitHub repo's `.fafa`, `server.json`, `package.json` and GitHub data |
| yours | either | whatever holds your fields |

To change what a business card says, change its reader. To change how every
business card looks, change this package.

## License

MIT
