import { buildCard } from "./reader.js";

/**
 * Read a GitHub repo's public files and build its business card. Shared by
 * the page (in the browser) and the gallery snapshot (in a GitHub Action).
 * `token` is optional: the Action passes one; the page never does.
 */
export async function readRepo(ref, { parseYaml, escapeHtml, token, fetch: get = globalThis.fetch }) {
  const json = async (url) => {
    const headers = { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const r = await get(url, { headers });
    if (r.status === 404) return undefined;
    if (r.status === 403 || r.status === 429) throw new Error("GitHub's hourly limit for this browser is used up. Try again in a while.");
    if (!r.ok) throw new Error(`GitHub answered ${r.status}.`);
    return r.json();
  };
  const raw = async (branch, path) => {
    const r = await get(`https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}/${path}`);
    return r.ok ? r.text() : undefined;
  };
  const tryParse = (fn, text) => { try { return text === undefined ? undefined : fn(text); } catch { return undefined; } };

  const gh = await json(`https://api.github.com/repos/${ref.owner}/${ref.repo}`);
  if (!gh) throw new Error(`No public repo at github.com/${ref.owner}/${ref.repo}.`);
  const branch = gh.default_branch || "main";
  const [rel, wk, af, sj, pk] = await Promise.all([
    json(`https://api.github.com/repos/${ref.owner}/${ref.repo}/releases/latest`).catch(() => undefined),
    raw(branch, ".well-known/fafa"),
    raw(branch, "agent.fafa"),
    raw(branch, "server.json"),
    raw(branch, "package.json"),
  ]);
  const parsed = tryParse(parseYaml, wk ?? af);
  const fafa = parsed && typeof parsed === "object" ? parsed : undefined;
  const fafaPath = fafa ? (wk !== undefined ? ".well-known/fafa" : "agent.fafa") : undefined;
  const canonical = { owner: gh.owner?.login ?? ref.owner, repo: gh.name ?? ref.repo };
  const card = buildCard(
    { ref: canonical, gh, release: rel?.tag_name, fafa, fafaPath, serverJson: tryParse(JSON.parse, sj), pkg: tryParse(JSON.parse, pk) },
    { escapeHtml },
  );
  return { ref: canonical, card, fafaPath };
}
