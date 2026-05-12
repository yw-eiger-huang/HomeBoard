import { MAIN_LEN, BOARD_LEN, FOLD_LEN, AX_W, AY, T_FRAME, HT } from './constants.js';
import { params } from './state.js';

// ── Geometry ─────────────────────────────────────────────────────────────────
// A slides along ceiling: A.x = BOARD_LEN·sinθ, A.y = CEIL_H.
// This keeps the bottom wall-side edge (C) at x=0 for all angles.
// At θ=40°: A.x = BOARD_LEN·sin40° = AX_W (matches baseline exactly).
//
// G is at gOffset from A along the board (moves with the board).
// H is fixed at (0, CEIL_H) — the wall-ceiling corner.

export function getGeom() {
  const rad = params.angle * Math.PI / 180;
  const ddx = -Math.sin(rad), ddy = -Math.cos(rad);
  const mnx = Math.cos(rad), mny = -Math.sin(rad);

  // A: slides on ceiling as angle changes
  const Aw = { x: BOARD_LEN * Math.sin(rad), y: AY };
  const Bw = { x: Aw.x + MAIN_LEN * ddx,  y: Aw.y + MAIN_LEN * ddy };
  const Cw = { x: Aw.x + BOARD_LEN * ddx, y: Aw.y + BOARD_LEN * ddy }; // Cw.x = 0 always

  // Outer edge key points (main board)
  const Ao = { x: Aw.x + T_FRAME * mnx, y: Aw.y + T_FRAME * mny };
  const Bo = { x: Bw.x + T_FRAME * mnx, y: Bw.y + T_FRAME * mny };
  const Co = { x: Cw.x + T_FRAME * mnx, y: Cw.y + T_FRAME * mny };

  // Center line points
  const Ac = { x: Aw.x + HT * mnx, y: Aw.y + HT * mny };
  const Bc = { x: Bw.x + HT * mnx, y: Bw.y + HT * mny };

  const boardDir = Math.atan2(ddy, ddx);

  // Fold: rigid rectangle around B_w — synced with wall angle
  const foldRad = Math.PI * (40 - params.angle) / 35;
  const foldDir = boardDir - foldRad;
  const fdx = Math.cos(foldDir), fdy = Math.sin(foldDir);
  let fnx = -fdy, fny = fdx;

  const Dw  = { x: Bw.x + FOLD_LEN * fdx, y: Bw.y + FOLD_LEN * fdy };
  const Do  = { x: Dw.x + T_FRAME * fnx,  y: Dw.y + T_FRAME * fny };
  const Bfo = { x: Bw.x + T_FRAME * fnx,  y: Bw.y + T_FRAME * fny };

  // G: on board at gOffset from A (moves with board)
  const GX = Aw.x + params.gOffset * ddx;
  const GY = Aw.y + params.gOffset * ddy;

  // H: fixed wall-ceiling corner
  const HX = 0, HY = AY;
  const HG = Math.hypot(HX - GX, HY - GY);

  // ── 地面外側端往內縮 1M 之投影 ──
  const refFloorX = Ao.x - params.inwardOffset;
  const t_proj = (Ao.x - Bo.x) > 0.001 ? (refFloorX - Bo.x) / (Ao.x - Bo.x) : -1;
  const projOnBoardY = (t_proj >= 0 && t_proj <= 1) ? Bo.y + t_proj * (Ao.y - Bo.y) : null;

  return { Aw,Ao,Ac, Bw,Bo,Bc,Bfo, Cw,Co, Dw,Do,
           boardDir, foldDir, fdx,fdy, fnx,fny, ddx,ddy,
           GX,GY, HX,HY, HG,
           refFloorX, projOnBoardY };
}

// ── Clamp logic ──────────────────────────────────────────────────────────────
// angle: 0~40 (no further constraints needed — at 0° board is vertical against wall)
export function clampAngle(a) { return Math.min(Math.max(a, 5), 40); }
