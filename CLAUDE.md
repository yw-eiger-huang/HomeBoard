# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HomeBoard is a **3D wooden plank configuration visualizer** — an interactive 2D side-view technical tool for designing a foldable wooden plank system mounted to a ceiling. The plank is hinged at point A on the ceiling, has a main section (2.398m) and a foldable bottom section (0.65m) that pivots at point B.

## Running the App

No build system or dependencies. Open `Code/board_viz.html` directly in a browser.

## Architecture

Single-file HTML5 canvas application (`Code/board_viz.html`) with no frameworks or build tooling. All logic, styles, and markup are embedded in one file.

**Key JavaScript functions:**

- `getGeom()` — Computes all geometric point coordinates (A, B, C, D, E, F, G, H, I, M) from `params.angle`. Fold angle is derived automatically: `foldRad = (5π/6) × (1 − angle/40)`, `foldDir = boardDir − foldRad`.
- `draw()` — Full canvas redraw: room environment → board polygons → dimension annotations → point labels → UI overlays.
- Slider event listeners drive the render loop; there is no animation loop — `draw()` is called on each input event.

**Coordinate system:** Origin at wall-floor intersection. X = distance from wall, Y = height from floor. All units in meters.

**Fixed physical constants** (defined at top of script):
- `MAIN_LEN = 2.398` m (main board length, A→B)
- `FOLD_LEN = 0.65` m (foldable section length, B→D)
- `T = 0.05` m (board thickness)
- `CEIL_H = 2.5` m (room height)
- `AX_W = 3.048 × sin(40°) ≈ 1.9593` m (A point x, fixed)

**Spec:** The latest technical specification is always the **highest-dated file** in `Spec/` (e.g. `Spec/20260328.md`). It is written in Traditional Chinese and covers all point coordinate formulas, fold sync logic, and visual design requirements. Always read the latest spec file — do not rely on older dated files.

## Terminology

- **內側 (inner side)**: 木板靠牆的那一面 (the face of the board facing the wall)

## Deployment

Hosted on **GitHub Pages** at:
**https://yw-eiger-huang.github.io/HomeBoard/**

- GitHub repo: https://github.com/yw-eiger-huang/HomeBoard
- Branch: `main`, served from repo root (`/`)
- `index.html` at the root mirrors `Code/board_viz.html` with CSS/JS paths updated to `Code/board_viz.css` and `Code/board_viz.js`
- To deploy changes: commit and push to `main` — GitHub Pages updates automatically within ~1 minute

## Working Rules

- **Do not commit or push** unless explicitly asked by the user.
- **When committing**, only include files that were modified, added, or deleted during the current session. Do not stage or commit files changed outside of the session.
- **Do not show screenshots** in responses. Do not call `preview_screenshot`.
- **Before committing**, always confirm that the latest spec file in `Spec/` (highest-dated `.md`) has been updated to reflect the current changes. Also ask whether to create a new dated file or update the existing one.
- **Spec file**: Always refer to the highest-dated `.md` file in `Spec/` as the authoritative specification. Do not use an older dated file unless the user explicitly specifies one.
