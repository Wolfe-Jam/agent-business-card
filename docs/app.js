import { renderBusinessCard, escapeHtml, safeAccent } from "https://cdn.jsdelivr.net/npm/agent-business-card@0.1.1/+esm";
import { parse as parseYaml } from "https://cdn.jsdelivr.net/npm/yaml@2.9.0/+esm";
import { parseRepoInput, buildCard, fafaSnippet, toHex6, apcaLc } from "./reader.js";

// The business card's two faces (agent-business-card's --card), and APCA's floor for short bold text.
const CARD_LIGHT = "#ffffff", CARD_DARK = "#0d0d0d", MIN_LC = 45;

const $ = (id) => document.getElementById(id);
const form = $("paste"), input = $("repo"), status = $("status"), frame = $("card");
const picker = $("accent"), hex = $("hex"), inkBtn = $("ink"), share = $("share"), copyBtn = $("copy"), contrast = $("contrast");
const claimText = $("claim-text"), fafaBox = $("fafa"), fafaCopy = $("copy-fafa");
let current = null; // { ref, card, fafaPath }

async function json(url) {
  const r = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (r.status === 404) return undefined;
  if (r.status === 403 || r.status === 429) throw new Error("GitHub's hourly limit for this browser is used up. Try again in a while.");
  if (!r.ok) throw new Error(`GitHub answered ${r.status}.`);
  return r.json();
}
async function raw(ref, branch, path) {
  const r = await fetch(`https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}/${path}`);
  return r.ok ? r.text() : undefined;
}
const tryParse = (fn, text) => { try { return text === undefined ? undefined : fn(text); } catch { return undefined; } };

async function load(ref) {
  const gh = await json(`https://api.github.com/repos/${ref.owner}/${ref.repo}`);
  if (!gh) throw new Error(`No public repo at github.com/${ref.owner}/${ref.repo}.`);
  const branch = gh.default_branch || "main";
  const [rel, wk, af, sj, pk] = await Promise.all([
    json(`https://api.github.com/repos/${ref.owner}/${ref.repo}/releases/latest`).catch(() => undefined),
    raw(ref, branch, ".well-known/fafa"),
    raw(ref, branch, "agent.fafa"),
    raw(ref, branch, "server.json"),
    raw(ref, branch, "package.json"),
  ]);
  const fafaText = wk ?? af;
  const fafa = tryParse(parseYaml, fafaText);
  const fafaPath = wk !== undefined ? ".well-known/fafa" : af !== undefined ? "agent.fafa" : undefined;
  const card = buildCard(
    {
      ref: { owner: gh.owner?.login ?? ref.owner, repo: gh.name ?? ref.repo },
      gh,
      release: rel?.tag_name,
      fafa: fafa && typeof fafa === "object" ? fafa : undefined,
      fafaPath,
      serverJson: tryParse(JSON.parse, sj),
      pkg: tryParse(JSON.parse, pk),
    },
    { escapeHtml },
  );
  return { card, fafaPath: fafa && typeof fafa === "object" ? fafaPath : undefined };
}


// ?accent=#hex → that colour · ?accent=ink → ink even if the owner declared one · none → the owner's colour, else ink.
function chosenAccent() {
  const a = new URLSearchParams(location.search).get("accent");
  return a === "ink" ? "ink" : safeAccent(a ?? undefined);
}

function draw() {
  if (!current) return;
  const accent = chosenAccent();
  const card = accent === "ink" ? { ...current.card, accent: undefined } : current.card;
  frame.srcdoc = renderBusinessCard(card, accent && accent !== "ink" ? { accent } : {});
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
  const { ref, card: c, fafaPath } = current;
  if (fafaPath) {
    claimText.textContent = `Claimed. The owner's .fafa is at ${fafaPath} in github.com/${ref.owner}/${ref.repo}.`;
    fafaBox.hidden = fafaCopy.hidden = true;
  } else {
    claimText.textContent = "Is this yours? Add this file to the repo at .well-known/fafa and the business card shows as claimed. Pick a colour above and it goes in the file too.";
    fafaBox.textContent = fafaSnippet({ name: c.name, description: c.description, accent: shown });
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

form.addEventListener("submit", (ev) => { ev.preventDefault(); setUrl({ accent: null }); show(input.value); });
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
fafaCopy.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(fafaBox.textContent); fafaCopy.textContent = "Copied"; setTimeout(() => (fafaCopy.textContent = "Copy .fafa"), 1500); }
  catch { getSelection().selectAllChildren(fafaBox); }
});

const start = new URLSearchParams(location.search).get("repo");
if (start) { input.value = start; show(start); }
