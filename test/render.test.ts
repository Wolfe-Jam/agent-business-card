import { test } from "node:test";
import assert from "node:assert/strict";
import { cardInitials, escapeHtml, renderBusinessCard, safeAccent, type BusinessCard } from "../src/index.js";

const card = (over: Partial<BusinessCard> = {}): BusinessCard => ({
  name: "weather-agent",
  title: "A2A agent · v0.3.0",
  oneLiner: "Forecasts on request.",
  domain: "example.com",
  chips: [{ text: "published", accent: true }, { text: "MIT" }],
  tabs: [
    { key: "about", label: "About", heading: "About", html: "<p>Answers weather questions.</p>" },
    { key: "skills", label: "Skills", heading: "Skills", html: "<p>forecast</p>" },
  ],
  about: "<p>A business card for an agent.</p>",
  ...over,
});

test("a complete, self-contained HTML document", () => {
  const html = renderBusinessCard(card());
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>weather-agent — business card<\/title>/);
  assert.ok(!/<script[^>]+\bsrc=/.test(html), "no external script");
  assert.ok(!/\bhref="https?:|@import|<link\b/.test(html), "no external stylesheet/link");
  assert.ok(!/<img\b|\bsrc="https?:/.test(html), "no external image");
});

test("front: logo, name, title, one-liner, domain, chips", () => {
  const html = renderBusinessCard(card());
  assert.match(html, /<div class="logo" aria-hidden="true">W<\/div>/);
  assert.match(html, /<p class="title">A2A agent · v0\.3\.0<\/p>/);
  assert.match(html, /Forecasts on request\./);
  assert.match(html, /example\.com/);
  assert.match(html, /published/);
});

test("back: tabs follow the card's own tabs; keys are cleaned to [a-z0-9-]", () => {
  const html = renderBusinessCard(card({
    tabs: [
      { key: "about", label: "About", heading: "About", html: "<p>First program.</p>" },
      { key: "Work!", label: "Work", heading: "Work", html: "<p>Note G.</p>" },
    ],
  }));
  assert.match(html, /id="t-work"/);
  assert.match(html, /#t-work:checked~\.panes \.p-work\{display:block\}/);
  assert.doesNotMatch(html, /t-skills/);
});

test("text fields are escaped; tab and about markup is trusted as given", () => {
  const html = renderBusinessCard(card({ name: "<x> & \"y\"", title: "<b>t</b>", oneLiner: "<script>1</script>" }));
  assert.ok(!html.includes("<x>"));
  assert.ok(html.includes("&lt;x&gt; &amp; &quot;y&quot;"));
  assert.ok(!html.includes("<script>1</script>"));
  assert.equal(escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

test("logo: the first letter, a second only when obvious", () => {
  assert.equal(cardInitials("mcp-context-card"), "C");
  assert.equal(cardInitials("github-mcp-server"), "GH");
  assert.equal(cardInitials("typescript-sdk"), "TS");
  assert.equal(cardInitials("GitHub Copilot"), "GH");
  assert.equal(cardInitials("playwright-mcp"), "P");
  assert.equal(cardInitials("Weather Agent"), "W");
  assert.equal(cardInitials("A2A"), "A");
  assert.equal(cardInitials("@scope/pkg_name"), "S");
  assert.equal(cardInitials("élan vital"), "É");
  assert.equal(cardInitials("mcp"), "M");
  assert.equal(cardInitials(""), "");
});

test("safeAccent: a hex passes, anything else is dropped", () => {
  assert.equal(safeAccent("#0A7"), "#0A7");
  assert.equal(safeAccent("#0066cc"), "#0066cc");
  assert.equal(safeAccent("#12345678"), "#12345678");
  assert.equal(safeAccent("red"), undefined);
  assert.equal(safeAccent("#fff</style><script>"), undefined);
  assert.equal(safeAccent(undefined), undefined);
});

test("colour: none = ink; the card's own colour; a passed colour wins; a bad one falls back to ink", () => {
  const ink = renderBusinessCard(card());
  assert.deepEqual([...new Set(ink.match(/--accent:#[0-9a-f]+/gi))], ["--accent:#0a0a0a", "--accent:#fafafa"]);
  assert.match(ink, /\.bcard\{--accent:var\(--fg\)\}/);
  assert.match(ink, /\.logo\{color:var\(--card\)\}/);

  const own = renderBusinessCard(card({ accent: "#0066cc" }));
  assert.match(own, /--accent:#0066cc;/);
  assert.ok(!own.includes(".bcard{--accent:var(--fg)}"));
  assert.match(renderBusinessCard(card({ accent: "#0066cc" }), { accent: "#0A7" }), /--accent:#0A7;/);

  const bad = renderBusinessCard(card({ accent: "red;}</style>" }), { accent: "x" });
  assert.ok(!bad.includes("red;}"));
  assert.match(bad, /\.bcard\{--accent:var\(--fg\)\}/);
});

test("theme and layout: data-theme only when set; portrait starts portrait", () => {
  assert.doesNotMatch(renderBusinessCard(card()), /<body data-theme=/);
  assert.match(renderBusinessCard(card(), { theme: "dark" }), /<body data-theme="dark">/);
  assert.match(renderBusinessCard(card(), { layout: "portrait" }), /id="portrait"[^>]*checked/);
});

test("expanded: both faces flat, for print and screenshots", () => {
  const html = renderBusinessCard(card(), { expanded: true });
  assert.match(html, /class="[^"]*\bflat\b/);
});
