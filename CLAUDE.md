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

**Spec:** Technical specifications are in `Spec/` as dated `.md` files (e.g. `Spec/20260328.md`), written in Traditional Chinese, covering point coordinate formulas, fold sync logic, and visual design requirements.

## Terminology

- **內側 (inner side)**: 木板靠牆的那一面 (the face of the board facing the wall)

## Deployment

Hosted on **GitHub Pages** at:
**https://yw-eiger-huang.github.io/HomeBoard/**

- GitHub repo: https://github.com/yw-eiger-huang/HomeBoard
- Branch: `main`, served from repo root (`/`)
- `index.html` at the root mirrors `Code/board_viz.html` with CSS/JS paths updated to `Code/board_viz.css` and `Code/board_viz.js`
- To deploy changes: commit and push to `main` — GitHub Pages updates automatically within ~1 minute
- **Deployment is only allowed from the `main` branch.** Never push to or deploy from any other branch.

## Working Rules

- **Do not commit or push** unless explicitly asked by the user.
- **Do not create or switch branches** when there are untracked files or modified-but-not-staged files.
- **When modifying `CLAUDE.md`**, review each change and consider whether it would be better enforced as a hook in `.claude/settings.json` rather than as a behavioral instruction.
- **Always end every response** with: `==============================`
- **When committing**, only include files that were modified, added, or deleted during the current session. Do not stage or commit files changed outside of the session.
- **Before committing**, always confirm that the latest spec file in `Spec/` (highest-dated `.md`) has been updated to reflect the current changes. A hook will block any `git commit` that stages `Code/` files without a `Spec/` file.
- **When updating the spec**, ask the user whether to create a new dated file or update the existing highest-dated file. Do not create a new `Spec/YYYYMMDD.md` without asking — a hook will block the attempt anyway.
- **Spec file**: Always refer to the highest-dated `.md` file in `Spec/` as the authoritative specification. Do not use an older dated file unless the user explicitly specifies one.
- **When creating a new spec file**, write the content in a polished and compacted style: use `|·|` notation for distances, merge subsections that share the same structure, avoid repeating formulas already stated elsewhere (cross-reference instead), and remove verbose CSS/implementation detail in favor of concise prose or tables.
