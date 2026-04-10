import { MAIN_LEN, BOARD_LEN, FOLD_LEN, AX_W, AY, HX, HY, T, HT } from './constants.js';
import { params } from './state.js';

// ── Geometry ─────────────────────────────────────────────────────────────────
// Board direction (wall-side edge, from A downward toward wall):
//   ddx = -sin(θ), ddy = -cos(θ)   (θ = angle from wall)
// Outward normal (away from wall, perpendicular to board, pointing +x side):
//   nx = cos(θ), ny = -sin(θ)
//
// Wall-side edge points:
//   A_w = (AX_W, AY)
//   B_w = A_w + MAIN_LEN * (ddx, ddy)
//   C_w = A_w + BOARD_LEN * (ddx, ddy)
//
// Outer edge = wall-side + T*(nx,ny)
//
// Fold: rigid rectangle rotates around B_w.
//   Fold direction (wall-side edge): boardDir + foldAngle
//   The rectangle has:
//     - wall-side edge: B_w → D_w  (length FOLD_LEN, direction foldDir)
//     - outer edge:     B_w + T*(fnx,fny) → D_w + T*(fnx,fny)
//   where (fnx,fny) is the outward normal of the fold rectangle.
//   The fold outward normal is perpendicular to foldDir, pointing away from wall (+x component).

export function getGeom() {
  const rad = params.angle * Math.PI / 180;
  const ddx = -Math.sin(rad), ddy = -Math.cos(rad);
  // outward normal of main board
  const mnx = Math.cos(rad), mny = -Math.sin(rad);

  // Wall-side key points
  const Aw = { x: AX_W,                      y: AY };
  const Bw = { x: AX_W + MAIN_LEN * ddx,     y: AY + MAIN_LEN * ddy };
  const Cw = { x: AX_W + BOARD_LEN * ddx,    y: AY + BOARD_LEN * ddy };

  // Outer edge key points (main board)
  const Ao = { x: Aw.x + T * mnx, y: Aw.y + T * mny };
  const Bo = { x: Bw.x + T * mnx, y: Bw.y + T * mny };
  const Co = { x: Cw.x + T * mnx, y: Cw.y + T * mny };

  // Center line points
  const Ac = { x: Aw.x + HT * mnx, y: Aw.y + HT * mny };
  const Bc = { x: Bw.x + HT * mnx, y: Bw.y + HT * mny };

  // Board direction angle
  const boardDir = Math.atan2(ddy, ddx);

  // Fold: rigid rectangle around B_w — synced with wall angle, folds toward inner side (wall)
  // foldRad: 2π/3 (120°) at angle=0 → 0 at angle=40 (straight, D=C)
  const foldRad = (2 * Math.PI / 3) * (1 - params.angle / 40);
  const foldDir = boardDir - foldRad;
  const fdx = Math.cos(foldDir), fdy = Math.sin(foldDir);

  // Fold outward normal: rotate foldDir by +90° → (-fdy, fdx)
  // Ensure it points away from wall (positive x component preferred)
  let fnx = -fdy, fny = fdx;
  // At foldAngle=0, fold continues board direction; normal should match board normal
  // Check: at foldAngle=0, fdx=ddx, fdy=ddy → fnx=-ddy=cos(rad)✓, fny=ddx=-sin(rad)✓
  // So this is always correct (same convention as board).

  const Dw = { x: Bw.x + FOLD_LEN * fdx,         y: Bw.y + FOLD_LEN * fdy };
  const Do = { x: Dw.x + T * fnx,                 y: Dw.y + T * fny };
  // B outer for fold = B_w + T*(fnx,fny) — same as Bo when foldAngle=0
  const Bfo = { x: Bw.x + T * fnx, y: Bw.y + T * fny };

  // G point: user-controlled distance from A along board wall-side edge
  const GX = Aw.x + params.gOffset * ddx;
  const GY = Aw.y + params.gOffset * ddy;
  const HG = Math.hypot(HX - GX, HY - GY);

  // Rigid bar lengths (H-M = M-G), computed from G position at angle=0:
  // At θ=0: G0=(AX_W, AY-gOffset), M0=midpoint(H,G0) → LEN_HM = 0.5*hypot(AX_W, gOffset)
  const LEN_HM = 0.5 * Math.hypot(AX_W, params.gOffset);

  // Rigid junction M: two equal bars (H→M, M→G)
  // Solved via two-circle intersection; bends toward A when angle > 0
  let MX, MY;
  const dHG = Math.hypot(GX - HX, GY - HY);
  if (dHG < 0.0001) {
    MX = HX; MY = HY;
  } else {
    const a_rig = dHG / 2; // equal lengths → midpoint on H-G line
    const h_rig = Math.sqrt(Math.max(0, LEN_HM * LEN_HM - a_rig * a_rig));
    const pmx = HX + a_rig * (GX - HX) / dHG;
    const pmy = HY + a_rig * (GY - HY) / dHG;
    const perpX = -(GY - HY) / dHG;
    const perpY =  (GX - HX) / dHG;
    // Pick the side toward A: sign of (G-H) × (A-H)
    const crossA = (GX - HX) * (AY - HY) - (GY - HY) * (AX_W - HX);
    MX = crossA >= 0 ? pmx + h_rig * perpX : pmx - h_rig * perpX;
    MY = crossA >= 0 ? pmy + h_rig * perpY : pmy - h_rig * perpY;
  }
  const MA = Math.hypot(Aw.x - MX, Aw.y - MY);

  // ── 地面外側端往內縮 1M 之投影 ──
  // 外側端 = 主板外側頂角 Ao；地面投影 = (Ao.x, 0)；往內縮 1M = (Ao.x − 1.0, 0)
  const refFloorX = Ao.x - params.inwardOffset;
  const t_proj = (Ao.x - Bo.x) > 0.001 ? (refFloorX - Bo.x) / (Ao.x - Bo.x) : -1;
  const projOnBoardY = (t_proj >= 0 && t_proj <= 1) ? Bo.y + t_proj * (Ao.y - Bo.y) : null;

  return { Aw,Ao,Ac, Bw,Bo,Bc,Bfo, Cw,Co, Dw,Do,
           boardDir, foldDir, fdx,fdy, fnx,fny, ddx,ddy,
           GX,GY, HG, LEN_HM, MX,MY,MA,
           refFloorX, projOnBoardY };
}

// ── Clamp logic ──────────────────────────────────────────────────────────────
// angle: 0~40 (no further constraints needed — at 0° board is vertical against wall)
export function clampAngle(a) { return Math.min(Math.max(a, 0), 40); }
