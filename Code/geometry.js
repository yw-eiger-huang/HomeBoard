import { MAIN_LEN, BOARD_LEN, FOLD_LEN, AX_W, AY, T_FRAME, HT, REF_IX, REF_IY } from './constants.js';
import { params } from './state.js';

// ── Geometry ─────────────────────────────────────────────────────────────────
// D is fixed at I = (REF_IX, REF_IY) for all angles.
// B.y is determined by the main board angle and ceiling position.
// B.x is solved from |B→I| = FOLD_LEN: B.x = √(FOLD_LEN² − (I.y − B.y)²).
// A stays on ceiling (A.y = CEIL_H) with A.x = B.x + MAIN_LEN·sinθ,
// so A naturally slides toward H=(0,CEIL_H) as θ decreases.
//
// G is at gOffset from A along the board (moves with the board).
// H is fixed at (0, CEIL_H) — the wall-ceiling corner.

export function getGeom() {
  const rad = params.angle * Math.PI / 180;
  const ddx = -Math.sin(rad), ddy = -Math.cos(rad);
  const mnx = Math.cos(rad), mny = -Math.sin(rad);

  // D: always fixed at I
  const Dw = { x: REF_IX, y: REF_IY };

  // B.y from main board angle; B.x from |B→I| = FOLD_LEN constraint
  const Bwy = AY + MAIN_LEN * ddy;
  const dy_BD = Dw.y - Bwy;
  const Bwx = Math.sqrt(Math.max(0, FOLD_LEN * FOLD_LEN - dy_BD * dy_BD));
  const Bw = { x: Bwx, y: Bwy };

  // A: on ceiling, derived from B
  const Aw = { x: Bwx - MAIN_LEN * ddx, y: AY };

  // Outer edge key points (main board)
  const Ao = { x: Aw.x + T_FRAME * mnx, y: Aw.y + T_FRAME * mny };
  const Bo = { x: Bw.x + T_FRAME * mnx, y: Bw.y + T_FRAME * mny };

  // Center line points
  const Ac = { x: Aw.x + HT * mnx, y: Aw.y + HT * mny };
  const Bc = { x: Bw.x + HT * mnx, y: Bw.y + HT * mny };

  const boardDir = Math.atan2(ddy, ddx);

  // Fold: direction B→D (D fixed at I), length always FOLD_LEN
  const fdx = (Dw.x - Bw.x) / FOLD_LEN;
  const fdy = (Dw.y - Bw.y) / FOLD_LEN;
  const foldDir = Math.atan2(fdy, fdx);
  let fnx = -fdy, fny = fdx;

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

  return { Aw,Ao,Ac, Bw,Bo,Bc,Bfo, Dw,Do,
           boardDir, foldDir, fdx,fdy, fnx,fny, ddx,ddy,
           GX,GY, HX,HY, HG,
           refFloorX, projOnBoardY };
}

// ── Clamp logic ──────────────────────────────────────────────────────────────
// angle: 0~40
export function clampAngle(a) { return Math.min(Math.max(a, 0), 40); }
