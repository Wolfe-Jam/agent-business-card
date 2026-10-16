import { renderBusinessCard, escapeHtml, safeAccent } from "https://cdn.jsdelivr.net/npm/agent-business-card@0.2.0/+esm";
import { parse as parseYaml } from "https://cdn.jsdelivr.net/npm/yaml@2.9.0/+esm";
import { parseRepoInput, fafaSnippet, toHex6, apcaLc, decodeFafaParam, buildFafaCard } from "./reader.js";
import { readRepo } from "./source.js";

// The business card's two faces (agent-business-card's --card), and APCA's floor for short bold text.
const CARD_LIGHT = "#ffffff", CARD_DARK = "#0d0d0d", MIN_LC = 45;

const $ = (id) => document.getElementById(id);
const form = $("paste"), input = $("repo"), status = $("status"), frame = $("card");
const picker = $("accent"), hex = $("hex"), inkBtn = $("ink"), share = $("share"), copyBtn = $("copy"), contrast = $("contrast");
const claimText = $("claim-text"), fafaBox = $("fafa"), fafaCopy = $("copy-fafa");
let current = null; // { ref, card, fafaPath } from a repo, or { card, fafaText } from ?fafa=

const load = (ref) => readRepo(ref, { parseYaml, escapeHtml });


// ?accent=#hex → that colour · ?accent=ink → ink even if the owner declared one · none → the owner's colour, else ink.
function chosenAccent() {
  const a = new URLSearchParams(location.search).get("accent");
  return a === "ink" ? "ink" : safeAccent(a ?? undefined);
}

// ?theme=light|dark (none = follow the viewer) · ?layout=portrait (none = landscape).
const THEMES = ["auto", "light", "dark"], LAYOUTS = ["landscape", "portrait"];
function chosen(name, allowed) {
  const v = new URLSearchParams(location.search).get(name);
  return allowed.includes(v) ? v : allowed[0];
}

function draw() {
  if (!current) return;
  const accent = chosenAccent();
  const card = accent === "ink" ? { ...current.card, accent: undefined } : current.card;
  const theme = chosen("theme", THEMES), layout = chosen("layout", LAYOUTS);
  frame.classList.toggle("portrait", layout === "portrait");
  frame.srcdoc = renderBusinessCard(card, {
    ...(accent && accent !== "ink" ? { accent } : {}),
    ...(theme !== "auto" ? { theme } : {}),
    ...(layout !== "landscape" ? { layout } : {}),
  });
  for (const [id, v] of [["theme-seg", theme], ["layout-seg", layout]])
    for (const b of $(id).querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.v === v));
  frame.hidden = false;
  const shown = accent === "ink" ? undefined : accent ?? safeAccent(current.card.accent);
  picker.value = shown && /^#[0-9a-f]{6}$/i.test(shown) ? shown : "#0a0a0a";
  if (document.activeElement !== hex) { hex.value = shown ? toHex6(shown) ?? "" : ""; hex.removeAttribute("aria-invalid"); }
  inkBtn.disabled = !shown;
  // Only for a colour picked here: the owner's own declared colour is theirs to choose.
  if (accent && accent !== "ink" && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(accent)) {
    // APCA, one curve per polarity: dark text on the light card, light text on the dark one.
    const onLight = Math.abs(apcaLc(accent, CARD_LIGHT)), onDark = Math.abs(apcaLc(accent, CARD_DARK));
    const faint = [onLight < MIN_LC && `a light card (Lc ${Math.round(onLight)})`, onDark < MIN_LC && `a dark card (Lc ${Math.round(onDark)})`].filter(Boolean);
    contrast.textContent = faint.length ? `This colour is faint on ${faint.join(" and on ")}. Lc ${MIN_LC} or more reads well. Text in it may be hard to read there.` : "";
  } else contrast.textContent = "";
  share.value = location.href;
  $("share-note").textContent = current.fafaText
    ? "The link carries the .fafa itself, so the business card prints the same on every visit."
    : "The link prints the business card live from GitHub on every visit, so it never goes stale.";
  $("badge-md").textContent = badgeMarkdown();
  const { ref, card: c, fafaPath, fafaText } = current;
  if (fafaText) {
    claimText.textContent = "Printed from the .fafa in this link. To claim it on GitHub, add this file to your repo at .well-known/fafa.";
    fafaBox.textContent = fafaSnippet({ name: c.name, description: c.description, accent: shown, icon: c.logo });
    fafaBox.hidden = fafaCopy.hidden = false;
  } else if (fafaPath) {
    claimText.textContent = `Claimed. The owner's .fafa is at ${fafaPath} in github.com/${ref.owner}/${ref.repo}.`;
    fafaBox.hidden = fafaCopy.hidden = true;
  } else {
    claimText.textContent = "Is this yours? Add this file to the repo at .well-known/fafa and the business card shows as claimed. Pick a colour above and it goes in the file too.";
    fafaBox.textContent = fafaSnippet({ name: c.name, description: c.description, accent: shown, icon: c.logo });
    fafaBox.hidden = fafaCopy.hidden = false;
  }
  $("keep").hidden = false;
}

function setUrl(params) {
  const q = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(params)) v == null ? q.delete(k) : q.set(k, v);
  history.replaceState(null, "", `${location.pathname}?${q.toString().replace(/%2F/g, "/")}`);
}

async function show(text) {
  const ref = parseRepoInput(text);
  if (!ref) { status.textContent = "Paste owner/repo or a GitHub URL."; return; }
  status.textContent = `Reading github.com/${ref.owner}/${ref.repo}…`;
  try {
    current = { ref, ...(await load(ref)) };
    setUrl({ repo: `${ref.owner}/${ref.repo}` });
    status.textContent = "";
    draw();
  } catch (err) {
    status.textContent = err.message;
  }
}

// ?fafa=: a .fafa carried in the link, for an agent with no repo of its own.
function showFafa(value) {
  const text = decodeFafaParam(value);
  if (text === null) { status.textContent = "This link's .fafa could not be read."; return; }
  let fafa;
  try { fafa = parseYaml(text); } catch { status.textContent = "This link's .fafa is not valid YAML."; return; }
  try {
    current = { card: buildFafaCard(fafa, text, { escapeHtml }), fafaText: text };
    status.textContent = "";
    draw();
  } catch (err) {
    status.textContent = err.message;
  }
}

form.addEventListener("submit", (ev) => { ev.preventDefault(); setUrl({ accent: null, fafa: null }); show(input.value); });
picker.addEventListener("input", () => { setUrl({ accent: picker.value }); draw(); });
hex.addEventListener("input", () => {
  const v = toHex6(hex.value);
  hex.setAttribute("aria-invalid", String(!v && hex.value.trim() !== ""));
  if (v) { setUrl({ accent: v }); draw(); }
});
hex.addEventListener("blur", () => draw());
inkBtn.addEventListener("click", () => { setUrl({ accent: current?.card.accent ? "ink" : null }); draw(); });
copyBtn.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(share.value); copyBtn.textContent = "Copied"; setTimeout(() => (copyBtn.textContent = "Copy link"), 1500); }
  catch { share.select(); }
});
for (const [id, name, dflt] of [["theme-seg", "theme", "auto"], ["layout-seg", "layout", "landscape"]])
  $(id).addEventListener("click", (ev) => {
    const v = ev.target.closest("button")?.dataset.v;
    if (!v) return;
    setUrl({ [name]: v === dflt ? null : v });
    draw();
  });

// The README badge: the ink badge, linking to this business card's share link.
function badgeMarkdown() {
  const base = `${location.origin}${location.pathname}`;
  return `[![Business card · Get yours →](${base}badge.svg)](${share.value})`;
}
$("copy-badge").addEventListener("click", async (ev) => {
  const btn = ev.currentTarget;
  try { await navigator.clipboard.writeText(badgeMarkdown()); btn.textContent = "Copied"; setTimeout(() => (btn.textContent = "Copy badge"), 1500); }
  catch { getSelection().selectAllChildren($("badge-md")); }
});
fafaCopy.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(fafaBox.textContent); fafaCopy.textContent = "Copied"; setTimeout(() => (fafaCopy.textContent = "Copy .fafa"), 1500); }
  catch { getSelection().selectAllChildren(fafaBox); }
});

// The gallery: a snapshot taken by a scheduled Action (scripts/gallery.mjs),
// read from the repo so a new snapshot shows without a redeploy. A click
// prints that business card live.
const GALLERY = "https://raw.githubusercontent.com/Wolfe-Jam/agent-business-card/main/docs/gallery.json";
async function gallery() {
  try {
    const r = await fetch(GALLERY);
    if (!r.ok) return;
    const { updated, cards } = await r.json();
    const tiles = $("tiles");
    for (const { repo, claimed, card } of cards) {
      const a = document.createElement("a");
      a.className = "tile";
      a.href = `?repo=${repo}`;
      const accent = claimed ? safeAccent(card.accent) : undefined;
      if (accent) a.style.setProperty("--tile", accent);
      const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; n.textContent = text; a.append(n); };
      el("b", "", card.name);
      el("span", "r", repo);
      if (card.title) el("span", "t", card.title);
      if (card.oneLiner) el("span", "o", card.oneLiner);
      el("span", "chip", claimed ? "claimed" : "public data");
      tiles.append(a);
    }
    $("gallery-note").textContent = `Printed from each repo's public files, updated ${updated}. Pick one to print it live.`;
    $("gallery").hidden = false;
  } catch { /* no gallery is fine */ }
}
gallery();

const params = new URLSearchParams(location.search);
const start = params.get("repo");
if (start) { input.value = start; show(start); }
else if (params.get("fafa")) showFafa(params.get("fafa"));
