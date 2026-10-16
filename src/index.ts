/**
 * agent-business-card - draw a business card as one self-contained HTML page.
 *
 * Front: a monogram logo, the name, a title and a one-liner. Flip it for the
 * back's tabs. Light / dark / auto, landscape / portrait, a colour or ink.
 * Flip, tabs and toggles are CSS (checkbox and radio inputs); the one inline
 * script is a progressive enhancement. No external fonts, styles or images
 * (the one exception: a card's own `logo` picture link, if it has one), no
 * Node APIs: it runs in Node and in the browser alike.
 *
 * The card is data (`BusinessCard`); where its facts come from is the
 * reader's job: a project's files, an A2A Agent Card, an MCP Server Card,
 * a person's details.
 */

export type Theme = "light" | "dark" | "auto";

/** How to draw a card. */
export interface RenderOptions {
  /** The card's colour scheme. Default `auto`: follow the viewer's OS. */
  theme?: Theme;
  /**
   * CSS hex colour for the accent. Validated; invalid is ignored. Wins over
   * the card's own `accent`; with neither, the card is drawn in ink (black
   * or white).
   */
  accent?: string;
  /** Business-card view. Default `landscape`; the reader can switch it too. */
  layout?: "landscape" | "portrait";
  /** Both faces flat and every section open: the print / screenshot view. */
  expanded?: boolean;
}

/** HTML-escape text (&, <, >, "). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ACCENT_OK = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?$/;

/** A valid hex colour, or undefined. Nothing else ever reaches the stylesheet. */
export function safeAccent(a?: string): string | undefined {
  return a && ACCENT_OK.test(a) ? a : undefined;
}

/**
 * A picture link the card can show: https only, no user:password, at most
 * 2048 characters. Anything else is ignored and the card keeps its letter.
 */
export function safeLogo(url?: string): string | undefined {
  if (!url || url.length > 2048) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : undefined;
  } catch {
    return undefined;
  }
}

/*
 * No colour = ink. A card's colour is the owner's to declare (or the reader's
 * to pass); nothing is guessed. Without one the accent is the card's own ink:
 * black on a light card, white on a dark one, and the monogram's letter takes
 * the card colour so it stays readable.
 */
const INK_CSS = `
:root{--accent:#0a0a0a}
@media (prefers-color-scheme:dark){:root{--accent:#fafafa}}
.bcard{--accent:var(--fg)}
.logo{color:var(--card)}
`;

const CSS = (accent: string | undefined) => `
/* The page and the card are themed independently. The page follows the
   viewer's OS. The card is the owner's choice: body[data-theme] (light | dark;
   none = follow the OS), and the reader can switch it with the ◐ toggle (#ink). */
:root{
  ${accent ? `--accent:${accent};` : ""}
  --page-bg:#f4f4f5;--page-muted:#6b6b70;--page-line:rgba(0,0,0,.09);--page-chip:rgba(0,0,0,.05);
}
@media (prefers-color-scheme:dark){
  :root{--page-bg:#000;--page-muted:#9a9aa0;--page-line:rgba(255,255,255,.13);--page-chip:rgba(255,255,255,.07)}
}
.bcard{--card:#fff;--fg:#0a0a0a;--muted:#6b6b70;--line:rgba(0,0,0,.09);--chip:rgba(0,0,0,.05);--card-shadow:0 1px 3px rgba(0,0,0,.06),0 12px 32px rgba(0,0,0,.10)}
body[data-theme="dark"] .bcard,
body[data-theme="light"] #ink:checked~.stage .bcard{--card:#0d0d0d;--fg:#fafafa;--muted:#9a9aa0;--line:rgba(255,255,255,.13);--chip:rgba(255,255,255,.07);--card-shadow:0 0 0 1px rgba(255,255,255,.16),0 8px 40px color-mix(in srgb,var(--accent) 20%,transparent)}
body[data-theme="dark"] #ink:checked~.stage .bcard{--card:#fff;--fg:#0a0a0a;--muted:#6b6b70;--line:rgba(0,0,0,.09);--chip:rgba(0,0,0,.05);--card-shadow:0 1px 3px rgba(0,0,0,.06),0 12px 32px rgba(0,0,0,.10)}
@media (prefers-color-scheme:dark){
  body:not([data-theme]) .bcard{--card:#0d0d0d;--fg:#fafafa;--muted:#9a9aa0;--line:rgba(255,255,255,.13);--chip:rgba(255,255,255,.07);--card-shadow:0 0 0 1px rgba(255,255,255,.16),0 8px 40px color-mix(in srgb,var(--accent) 20%,transparent)}
  body:not([data-theme]) #ink:checked~.stage .bcard{--card:#fff;--fg:#0a0a0a;--muted:#6b6b70;--line:rgba(0,0,0,.09);--chip:rgba(0,0,0,.05);--card-shadow:0 1px 3px rgba(0,0,0,.06),0 12px 32px rgba(0,0,0,.10)}
}
@media (prefers-color-scheme:light){
  body:not([data-theme]) #ink:checked~.stage .bcard{--card:#0d0d0d;--fg:#fafafa;--muted:#9a9aa0;--line:rgba(255,255,255,.13);--chip:rgba(255,255,255,.07);--card-shadow:0 0 0 1px rgba(255,255,255,.16),0 8px 40px color-mix(in srgb,var(--accent) 20%,transparent)}
}
.bcard{color:var(--fg)}
/* Links take the card's ink, underlined in the accent, so they read on light
   and dark alike (the browser default blue vanishes on a dark card). */
.bcard a{color:var(--fg);text-decoration-color:var(--accent);text-underline-offset:2px}
*{box-sizing:border-box}
body{margin:0;background:var(--page-bg);color:var(--page-muted);
  font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  padding:40px 16px}
/* ── the business card: two faces, flip, two views ─────────────────── */
.sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.stage{max-width:760px;margin:0 auto}
.views{display:flex;justify-content:flex-end;margin:0 0 10px}
.view,.hint label{cursor:pointer}
.view{font-size:.78rem;font-weight:600;padding:3px 11px;border-radius:20px;border:1px solid var(--page-line);
  background:var(--page-chip);color:var(--page-muted);letter-spacing:.2em}
.views{gap:8px}
.view:hover,.hint label:hover{color:var(--accent);border-color:var(--accent)}
.bcard{margin:0 auto;width:100%;aspect-ratio:7/4;perspective:1600px}
#portrait:checked~.stage{max-width:480px}
#portrait:checked~.stage .bcard{aspect-ratio:4/7}
.faces{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .6s ease}
#flip:checked~.stage .faces{transform:rotateY(180deg)}
.face{position:absolute;inset:0;background:var(--card);border:1px solid var(--line);border-radius:16px;
  box-shadow:var(--card-shadow);backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
.back{transform:rotateY(180deg) translateZ(1px);display:flex;flex-direction:column}
/* The face turned away takes no pointer or wheel events, so the visible face
   scrolls (a hidden backface can still win hit-testing, notably in Chrome/Safari on macOS). */
#flip:checked~.stage .front,#flip:not(:checked)~.stage .back{pointer-events:none;visibility:hidden;transition:visibility 0s .3s}
#flip:checked~.stage .back,#flip:not(:checked)~.stage .front{visibility:visible;transition:visibility 0s .3s}
.panes{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.front{display:flex;flex-direction:column;justify-content:center;padding:34px 44px;
  border-top:5px solid var(--accent);
  background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,var(--card)) 0%,var(--card) 55%)}
.front .id{max-width:34em}
h1{margin:0;font-size:2.1rem;line-height:1.15;letter-spacing:-.025em}
.title{margin:8px 0 0;font-size:.82rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.oneliner{margin:16px 0 0;font-size:1.05rem;color:var(--muted);line-height:1.5}
.foot-front{position:absolute;left:44px;right:130px;bottom:22px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.domain{font:.8rem ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
.corner{position:absolute;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;
  cursor:pointer;font-weight:700;font-size:.9rem;color:var(--muted);background:var(--chip);border:1px solid var(--line);z-index:4}
.corner:hover{color:var(--accent);border-color:var(--accent)}
.corner.tr{top:16px;right:16px;font-family:Georgia,serif;font-style:italic}
.logo{position:absolute;top:34px;left:44px;width:84px;height:84px;border-radius:50%;display:grid;place-items:center;
  color:#fff;font-weight:800;font-size:2rem;letter-spacing:-.02em;line-height:1;
  background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--accent) 80%,#fff),var(--accent) 45%,color-mix(in srgb,var(--accent) 50%,#000));
  box-shadow:0 0 0 3px var(--card),0 0 0 4px color-mix(in srgb,var(--accent) 45%,transparent),0 6px 20px color-mix(in srgb,var(--accent) 30%,transparent)}
.logo.pic{color:transparent;background:var(--card)}
.logo img{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover}
.front .id{margin-top:70px}
.corner.br{bottom:16px;right:16px}
.flipbtn{position:absolute;right:18px;bottom:16px;z-index:4;cursor:pointer;width:42px;height:42px;border-radius:50%;
  display:grid;place-items:center;color:var(--fg);background:transparent;box-shadow:inset 0 0 0 2px var(--fg);
  transition:transform .2s ease}
.flipbtn span{font-size:1.3rem;line-height:1;font-weight:700}

/* the back's button: same spot and outline as the front's; ↺ instead of ↻. Over
   scrolling text it takes the card's colour, so the arrow stays readable. */
.flipbtn.back-btn{background:var(--card)}
/* fast tooltip: shows at once on hover or keyboard focus (a title tooltip waits ~1 s) */
.flipbtn[data-tip]::after{content:attr(data-tip);position:absolute;right:0;bottom:calc(100% + 8px);white-space:nowrap;
  font:600 .74rem/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;letter-spacing:0;padding:6px 9px;border-radius:7px;
  color:var(--card);background:var(--fg);opacity:0;transform:translateY(3px);pointer-events:none;transition:opacity .08s,transform .08s}
.flipbtn[data-tip]:hover::after,#flip:focus-visible~.stage .flipbtn[data-tip]::after{opacity:1;transform:none}
.flipbtn:hover{transform:none}.flipbtn:hover span{transform:rotate(-25deg)}.flipbtn span{transition:transform .2s ease}
.whatis{position:absolute;top:16px;right:16px;z-index:5}
.whatis>summary{position:static;list-style:none}
.whatis>summary::-webkit-details-marker{display:none}
.whatis[open]>summary{color:var(--accent);border-color:var(--accent)}
.whatis-panel{position:absolute;right:0;top:38px;width:min(320px,70vw);padding:14px 16px;border-radius:12px;
  background:var(--card);border:1px solid var(--line);box-shadow:var(--card-shadow);font-size:.84rem;line-height:1.5}
.whatis-panel p{margin:0 0 8px}.whatis-head{font-weight:800;color:var(--accent);letter-spacing:-.01em;font-size:.95rem}
.whatis-foot{color:var(--muted);margin:0!important}.whatis-panel code{font:.86em ui-monospace,SFMono-Regular,Menlo,monospace}
.tabbar{display:flex;flex-wrap:wrap;gap:4px;padding:14px 60px 0 18px;border-bottom:1px solid var(--line);border-top:5px solid var(--accent)}
.tabbar label{cursor:pointer;font-size:.8rem;font-weight:600;color:var(--muted);padding:6px 11px;border-radius:8px 8px 0 0}
.tabbar label:hover{color:var(--fg)}
.panes{flex:1;overflow:auto;padding:20px 26px 72px}
.pane{display:none}
.lead{margin:0 0 14px;font-size:1rem;line-height:1.6}
.kv{border-collapse:collapse;font-size:.86rem;width:100%}
.kv th{text-align:left;font-weight:600;color:var(--muted);padding:6px 14px 6px 0;white-space:nowrap;vertical-align:top}
.kv td{padding:6px 0;border-bottom:1px solid var(--line)}
.kv code,.lead code{font:.86em ui-monospace,SFMono-Regular,Menlo,monospace}
.hint{text-align:center;color:var(--page-muted);font-size:.78rem;margin:14px 0 0}
.hint label{color:var(--accent)}
#flip:focus-visible~.stage .flipbtn,#portrait:focus-visible~.stage .view[for=portrait],#ink:focus-visible~.stage .view[for=ink]{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:640px){
  .bcard,#portrait:checked~.stage .bcard{aspect-ratio:auto;height:min(78vh,720px)}
  .front{padding:28px 26px}.foot-front{left:26px}
  .logo{top:24px;left:26px;width:64px;height:64px;font-size:1.5rem}.front .id{margin-top:56px}
  h1{font-size:1.7rem}
}
/* flat: expanded render and print — both faces, every tab, no flip */
.flat .faces,.flat .face{position:static;transform:none!important;height:auto}
.flat .bcard{aspect-ratio:auto;perspective:none}
.flat .face{margin:0 0 18px}.flat .front{min-height:260px;position:relative}
.flat .pane{display:block;margin:0 0 22px}.flat .bcard{color:var(--fg)}.flat .tabbar,.flat .views,.flat .hint,.flat .corner,.flat .flipbtn,.flat .whatis{display:none}
.flat .panes{overflow:visible}
@media print{
  .faces,.face{position:static!important;transform:none!important;height:auto!important}
  .bcard{aspect-ratio:auto!important}.face{margin:0 0 18px;box-shadow:none}
  .pane{display:block!important;margin:0 0 22px}.tabbar,.views,.hint,.corner,.flipbtn,.whatis{display:none!important}
  .panes{overflow:visible}
}
.pills{display:flex;flex-wrap:wrap;gap:6px}
.pill{font-size:.74rem;font-weight:600;padding:3px 9px;border-radius:20px;background:var(--chip);color:var(--muted)}
.pill.accent{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}
.label{font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--accent);margin:0 0 14px}
.toc{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0;padding:0;list-style:none}
.toc a{font-size:.82rem;color:var(--muted);text-decoration:none}
.toc a:hover{color:var(--accent)}
/* ── collapsible context ─────────────────────────────────────────── */
.ctx-nav{position:sticky;top:-20px;z-index:3;background:var(--card);
  margin:0 -26px 16px;padding:11px 26px;border-bottom:1px solid var(--line);
  display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px 16px}
.xall{margin-left:auto;flex:none;font:inherit;font-size:.76rem;font-weight:600;
  white-space:nowrap;padding:3px 11px;border-radius:20px;border:1px solid var(--line);
  background:var(--chip);color:var(--muted);cursor:pointer}
.xall:hover{color:var(--accent);border-color:var(--accent)}
.ctx-preamble{padding-bottom:4px}
details.ctx-section{border-top:1px solid var(--line)}
details.ctx-section>summary{cursor:pointer;list-style:none;padding:11px 0;
  font-weight:600;font-size:1rem;letter-spacing:-.01em;display:flex;gap:9px}
details.ctx-section>summary::-webkit-details-marker{display:none}
details.ctx-section>summary::before{content:"›";color:var(--accent);font-weight:700;
  transition:transform .15s ease}
details.ctx-section[open]>summary::before{transform:rotate(90deg)}
details.ctx-section>.md{padding:0 0 16px}
@media print{
  .ctx-nav{display:none}
  details.ctx-section:not([open])>.md{display:block!important}
  details.ctx-section>summary::before{content:""}
}
.md h1,.md h2,.md h3,.md h4{margin:22px 0 8px;font-size:1rem;letter-spacing:-.01em}
.md h1{font-size:1.15rem}
.md p{margin:8px 0}
.md ul,.md ol{margin:8px 0;padding-left:22px}
.md li{margin:3px 0}
.md code{background:var(--chip);padding:1px 5px;border-radius:5px;
  font:.86em ui-monospace,SFMono-Regular,Menlo,monospace}
.md pre{background:var(--chip);padding:14px 16px;border-radius:9px;overflow:auto}
.md pre code{background:none;padding:0}
.md table{border-collapse:collapse;width:100%;margin:12px 0;font-size:.88rem;display:block;overflow:auto}
.md th,.md td{border:1px solid var(--line);padding:6px 10px;text-align:left}
.md blockquote{margin:10px 0;padding-left:14px;border-left:3px solid var(--line);color:var(--muted)}
.md a{color:var(--accent)}
.fact{padding:12px 0;border-bottom:1px solid var(--line)}
.fact:last-child{border-bottom:0}
.fact p{margin:0 0 7px}
.meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.tag{font-size:.72rem;padding:2px 8px;border-radius:5px;background:var(--chip);color:var(--muted)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--accent);display:inline-block}
.dot.pending{background:var(--muted)}
.disc{width:100%;border-collapse:collapse;font-size:.84rem}
.disc th,.disc td{text-align:left;padding:6px 10px;border-bottom:1px solid var(--line)}
.disc th{color:var(--muted);font-weight:600}
.disc code{font:.86em ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
.fetch{margin:14px 0 0;font-size:.82rem;color:var(--muted)}
.fetch code{background:var(--chip);padding:1px 5px;border-radius:5px}
.none{color:var(--muted);font-style:italic}
`;

const htmlAttr = (theme: Theme) =>
  theme === "auto" ? "" : ` data-theme="${theme}"`;

/** Words that say what kind of thing it is, not whose: never the logo ("mcp-context-card" → C, not M). */
const GENERIC_WORDS = new Set(["mcp", "server", "servers", "sdk", "agent", "agents", "api", "cli", "app", "tool", "tools", "plugin", "core", "the"]);
/** Names whose two-letter mark is obvious. */
const OBVIOUS_MARKS: Record<string, string> = { github: "GH", gitlab: "GL", typescript: "TS", javascript: "JS" };

/**
 * The front's logo: the first letter of the name's first meaningful word
 * (generic words like "mcp", "server", "sdk" skipped), plus a second letter
 * only when it's obvious: a known name (github → GH, typescript → TS) or a
 * word written with two capitals (GitHub, TypeScript). Never more than two.
 */
export function cardInitials(name: string): string {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const first = words.find((w) => !GENERIC_WORDS.has(w.toLowerCase())) ?? words[0] ?? "";
  const known = OBVIOUS_MARKS[first.toLowerCase()];
  if (known) return known;
  const capitals = first.match(/\p{Lu}/gu) ?? [];
  if (capitals.length === 2 && /^\p{Lu}/u.test(first) && /\p{Ll}/u.test(first)) return capitals.join("");
  return (Array.from(first)[0] ?? "").toUpperCase();
}

/**
 * A business card, independent of where its facts came from: everything the
 * renderer draws. A reader builds one (from a project's files, an A2A Agent
 * Card, an MCP Server Card, a person's details) and `renderBusinessCard`
 * draws any of them the same way.
 */
export interface BusinessCard {
  name: string;
  /** What it is (and its version): "MCP server · v1.5.0", or a person's role. */
  title?: string;
  oneLiner?: string;
  /** Shown bottom-left on the front, e.g. the publisher domain. */
  domain?: string;
  /** Footer chips; `accent` highlights one (e.g. the status). Plain text. */
  chips: { text: string; accent?: boolean }[];
  /** The back's tabs, in order. `key` is [a-z0-9-]; `html` is already-safe markup. */
  tabs: { key: string; label: string; heading: string; html: string }[];
  /** The (i) panel, as already-safe markup. */
  about: string;
  /** The owner's colour, a hex. None = ink (black or white). */
  accent?: string;
  /**
   * A picture for the front's logo, as an https link (a square PNG or SVG,
   * 256px). Drawn as an image over the letter; if it can't load, the letter
   * shows. Not https = ignored.
   */
  logo?: string;
}

/**
 * The front's logo: the letter, with the picture over it when there is one.
 * The picture host is not told which page shows it (no referrer). If it fails
 * to load, the image removes itself and the letter shows again.
 */
function logoHtml(name: string, logo: string | undefined): string {
  const letter = escapeHtml(cardInitials(name));
  if (!logo) return `<div class="logo" aria-hidden="true">${letter}</div>`;
  return `<div class="logo pic" aria-hidden="true">${letter}<img src="${escapeHtml(logo)}" alt="" referrerpolicy="no-referrer" decoding="async" onerror="this.parentNode.classList.remove('pic');this.remove()"></div>`;
}

/** Draw any business card as one self-contained HTML page. */
export function renderBusinessCard(card: BusinessCard, opts: RenderOptions = {}): string {
  const theme: Theme = opts.theme ?? "auto";
  const accent = safeAccent(opts.accent) ?? safeAccent(card.accent);
  const portrait = opts.layout === "portrait";
  const flat = !!opts.expanded;
  const { name, title, oneLiner, domain } = card;
  const tabs = card.tabs.map((t) => ({ ...t, key: t.key.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "tab" }));

  const pills = card.chips
    .map((c) => `<span class="pill${c.accent ? " accent" : ""}">${escapeHtml(c.text)}</span>`)
    .join("");
  const radios = tabs
    .map((t, i) => `<input type="radio" name="tab" id="t-${t.key}" class="sr"${i === 0 ? " checked" : ""}>`)
    .join("");
  const tabbar = tabs.map((t) => `<label for="t-${t.key}">${escapeHtml(t.label)}</label>`).join("");
  const panes = tabs
    .map((t) => `<div class="pane p-${t.key}"><p class="label">${escapeHtml(t.heading)}</p>${t.html}</div>`)
    .join("");
  // One CSS rule pair per tab: its pane shows, its label lights, when its radio is checked.
  const tabCss = tabs
    .map(
      (t) =>
        `#t-${t.key}:checked~.panes .p-${t.key}{display:block}#t-${t.key}:checked~.tabbar label[for=t-${t.key}]{color:var(--accent);background:var(--chip)}`,
    )
    .join("");

  // The (i) panel: the same control, in the same spot, on both faces.
  const WHATIS = `<details class="whatis">
          <summary class="corner tr" title="About this card" aria-label="About this card">i</summary>
          <div class="whatis-panel">
            ${card.about}
          </div>
        </details>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(name)} — business card</title>
<style>${CSS(accent)}${accent ? "" : INK_CSS}${tabCss}</style>
</head>
<body${flat ? ` class="flat"` : ""}${htmlAttr(theme)}>
<input type="checkbox" id="flip" class="sr" aria-label="Flip the card">
<input type="checkbox" id="ink" class="sr" aria-label="Switch the card between light and dark">
<input type="checkbox" id="portrait" class="sr" aria-label="Portrait view"${portrait ? " checked" : ""}>
<div class="stage">
  <div class="views"><label for="ink" class="view" title="Card: light or dark">◐</label><label for="portrait" class="view" title="Landscape or portrait">▭ ▯</label></div>
  <main class="bcard">
    <div class="faces">
      <section class="face front">
        ${logoHtml(name, safeLogo(card.logo))}
        ${WHATIS}
        <div class="id">
          <h1>${escapeHtml(name)}</h1>
          ${title ? `<p class="title">${escapeHtml(title)}</p>` : ""}
          ${oneLiner ? `<p class="oneliner">${escapeHtml(oneLiner)}</p>` : ""}
        </div>
        <div class="foot-front">${domain ? `<span class="domain">${escapeHtml(domain)}</span>` : ""}${pills ? `<div class="pills">${pills}</div>` : ""}</div>
        <label for="flip" class="flipbtn" data-tip="Flip the card" aria-label="Flip the card"><span aria-hidden="true">↻</span></label>
      </section>
      <section class="face back">
        ${radios}
        ${WHATIS}
        <div class="tabbar">${tabbar}</div>
        <div class="panes">${panes}</div>
        <label for="flip" class="flipbtn back-btn" data-tip="Flip back" aria-label="Flip back"><span aria-hidden="true">↺</span></label>
      </section>
    </div>
  </main>
  <p class="hint">${escapeHtml(name)} · business card · <label for="flip">flip it over</label></p>
</div>
${CARD_SCRIPT}
</body>
</html>
`;
}

/**
 * The card's only script — a progressive enhancement. Flip, tabs and the view
 * toggle are CSS (checkbox and radio inputs) and work without it. It adds:
 * Expand all / Collapse all for the context sections, opening the section a
 * `#hash` names (flipping to the back and its Context tab first), and opening
 * every section for printing (browsers disagree on printing a closed
 * `<details>`).
 */
const CARD_SCRIPT = `<script>
(function(){
  var secs=[].slice.call(document.querySelectorAll("details.ctx-section"));
  var btn=document.querySelector(".xall");
  var sync=function(){if(btn)btn.textContent=secs.every(function(d){return d.open})?"Collapse all":"Expand all"};
  if(btn&&secs.length){
    btn.hidden=false;
    btn.addEventListener("click",function(){var open=!secs.every(function(d){return d.open});secs.forEach(function(d){d.open=open});sync()});
    secs.forEach(function(d){d.addEventListener("toggle",sync)});
  }
  var openHash=function(){
    var d=document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if(!d||d.tagName!=="DETAILS")return;
    var f=document.getElementById("flip"),t=document.getElementById("t-context");
    if(f)f.checked=true;if(t)t.checked=true;d.open=true;sync();
    setTimeout(function(){d.scrollIntoView({block:"nearest"})},620);
  };
  addEventListener("hashchange",openHash);openHash();
  var pre=[];
  addEventListener("beforeprint",function(){pre=secs.map(function(d){return d.open});secs.forEach(function(d){d.open=true})});
  addEventListener("afterprint",function(){secs.forEach(function(d,i){d.open=pre[i]});sync()});
  sync();
})();
</script>`;

