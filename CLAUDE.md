# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HomeBoard is a **3D wooden plank configuration visualizer** — an interactive 2D side-view technical tool for designing a foldable wooden plank system mounted to a ceiling. The plank is hinged at point A on the ceiling, has a main section (2.398m) and a foldable bottom section (0.65m) that pivots at point B.

## Running the App

No build system or dependencies. Open `Code/board_viz.html` directly in a browser.

## Architecture

Single-file HTML5 canvas application (`Code/board_viz.html`) with no frameworks or build tooling. All logic, styles, and markup are embedded in one file.

**Key JavaScript functions:**

- `getGeom(angle, foldAngle)` — Computes all geometric point coordinates (A, B, C, D, E, F, G, H, I) from the two slider angles using 2D rotation math.
- `computeFoldLimits(angle)` — Returns `[min, max]` fold angle bounds to keep point D within room boundaries (x≥0, y∈[0, 2.5m]).
- `draw()` — Full canvas redraw: room environment → board polygons → dimension annotations → point labels → UI overlays.
- Slider event listeners drive the render loop; there is no animation loop — `draw()` is called on each input event.

**Coordinate system:** Origin at wall-floor intersection. X = distance from wall, Y = height from floor. All units in meters.

**Fixed physical constants** (defined at top of script):
- `L1 = 2.398` m (main board length)
- `L2 = 0.65` m (foldable section length)
- `THICKNESS = 0.05` m (board thickness)
- `CEILING = 2.5` m (room height)

**Spec:** `Spec/20260325.md` contains the full technical specification in Traditional Chinese, including formulas for all point coordinates and visual design requirements.
