# Changelog

## [0.2.0] - 2026-10-16 — The Headshot Edition

A business card can now show a picture: give it an https link and it's drawn in the logo spot, with the monogram as a fallback.

- `BusinessCard.logo`: any image, as an `https` link, drawn over the monogram in the round logo spot. A square PNG (256 × 256, transparent background) or an SVG looks best.
- If the picture can't load, it removes itself and the monogram shows.
- `referrerpolicy="no-referrer"`: the picture's host isn't told which page shows it.
- `safeLogo(url)` (exported): `https` only, no user:password, at most 2048 characters. Anything else is ignored.
- README: the `logo` field, and the "One file" note names this one exception.
- 34 tests (3 new). #20.

Earlier releases: [v0.1.1](https://github.com/Wolfe-Jam/agent-business-card/releases/tag/v0.1.1) · [v0.1.0](https://github.com/Wolfe-Jam/agent-business-card/releases/tag/v0.1.0).
