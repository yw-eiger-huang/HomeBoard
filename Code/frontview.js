import { CEIL_H, MAIN_LEN, FOLD_LEN, BOARD_LEN, BOARD_W, SCREW_U, SCREW_Z, CELL_U, CELL_Z, HOLE_R_M, GRAY_DASH, FS, LABEL_RED } from './constants.js';
import { ctx, params, view } from './state.js';

// ── 正面視圖 (front view, rendered in right half when 2D mode) ────────────────
// Orthographic projection onto the Y-Z plane (looking along +X toward the wall).
// Horizontal axis = Z (board width 0→BOARD_W); vertical axis = Y (height from floor).
// Uses the same scale S as the side view so both views share the same pixels-per-metre.
export function drawFrontView(W, H, margin, dpr, S) {
  const rad     = params.angle * Math.PI / 180;
  const foldRad = (2 * Math.PI / 3) * (1 - params.angle / 40);

  // World-space Y of key edges (front view projects 3-D points onto Y-Z plane)
  //   Board wall-side direction: (ddx, ddy) = (-sin(θ), -cos(θ))
  //   Fold direction fdy-component: sin(foldDir) = -cos(θ + foldRad)
  const AY_w = CEIL_H;                                      // A at ceiling
  const BY_w = AY_w - MAIN_LEN * Math.cos(rad);             // B fold joint
  const fdy  = -Math.cos(rad + foldRad);                    // Y-component of fold direction
  const DY_w = BY_w + FOLD_LEN * fdy;                       // D fold end

  // Canvas coordinate functions — same scale and Y-origin as side view so A aligns.
  //   Side view: OY = margin + CEIL_H*S + viewOY  →  cvY(y) = OY - y*S
  const fvAvailW = W / 2 - margin;
  const boardWpx = BOARD_W * S;
  const fvOX     = W / 2 + (fvAvailW - boardWpx) / 2;
  const cvX = z => fvOX + z * S;
  const cvY = y => margin + view.OY + (CEIL_H - y) * S;

  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.setLineDash([]);

  // ── Main board ──
  ctx.fillStyle   = 'rgba(196,137,74,0.28)';
  ctx.strokeStyle = '#c4894a'; ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(cvX(0),        cvY(AY_w));
  ctx.lineTo(cvX(BOARD_W),  cvY(AY_w));
  ctx.lineTo(cvX(BOARD_W),  cvY(BY_w));
  ctx.lineTo(cvX(0),        cvY(BY_w));
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // ── Fold section ──
  if (params.showFold) {
    ctx.fillStyle   = 'rgba(122,184,232,0.22)';
    ctx.strokeStyle = '#7ab8e8'; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(cvX(0),        cvY(DY_w));
    ctx.lineTo(cvX(BOARD_W),  cvY(DY_w));
    ctx.lineTo(cvX(BOARD_W),  cvY(BY_w));
    ctx.lineTo(cvX(0),        cvY(BY_w));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // ── Border marks: 5cm darker fill region on each board face ──
  if (params.showBorderMark) {
    const MARGIN = params.borderMarkWidth;
    const MARG_J = params.borderMarkJunctionWidth;  // B-junction edge
    const cos_r  = Math.cos(rad);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    // Main board: A-end uses MARGIN, B-junction uses MARG_J
    const mT = AY_w - MARGIN*cos_r;
    const mB = BY_w + MARG_J*cos_r;
    ctx.beginPath();
    ctx.moveTo(cvX(0),              cvY(AY_w)); ctx.lineTo(cvX(BOARD_W),        cvY(AY_w));
    ctx.lineTo(cvX(BOARD_W),        cvY(BY_w)); ctx.lineTo(cvX(0),              cvY(BY_w));
    ctx.closePath();
    ctx.moveTo(cvX(MARGIN),         cvY(mT));   ctx.lineTo(cvX(BOARD_W-MARGIN), cvY(mT));
    ctx.lineTo(cvX(BOARD_W-MARGIN), cvY(mB));   ctx.lineTo(cvX(MARGIN),         cvY(mB));
    ctx.closePath();
    ctx.fill('evenodd');
    // Fold board: B-junction uses MARG_J, D-end uses MARGIN
    if (params.showFold) {
      const fT = BY_w + MARG_J*fdy;
      const fB = DY_w - MARGIN*fdy;
      ctx.beginPath();
      ctx.moveTo(cvX(0),              cvY(BY_w)); ctx.lineTo(cvX(BOARD_W),        cvY(BY_w));
      ctx.lineTo(cvX(BOARD_W),        cvY(DY_w)); ctx.lineTo(cvX(0),              cvY(DY_w));
      ctx.closePath();
      ctx.moveTo(cvX(MARGIN),         cvY(fT));   ctx.lineTo(cvX(BOARD_W-MARGIN), cvY(fT));
      ctx.lineTo(cvX(BOARD_W-MARGIN), cvY(fB));   ctx.lineTo(cvX(MARGIN),         cvY(fB));
      ctx.closePath();
      ctx.fill('evenodd');
    }
  }

  // ── Screw holes & grid cells ──
  if (params.showScrewHoles) {
    const rPx = Math.max(HOLE_R_M * S, 1.5 * dpr);
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    // Main board: hole at u maps to y = AY_w - (BOARD_LEN - u)*cos(θ)
    SCREW_U.filter(u => u >= FOLD_LEN).forEach(u => {
      const hy = AY_w - (BOARD_LEN - u) * Math.cos(rad);
      SCREW_Z.forEach(z => { ctx.beginPath(); ctx.arc(cvX(z), cvY(hy), rPx, 0, Math.PI*2); ctx.fill(); });
    });
    CELL_U.filter(u => u >= FOLD_LEN).forEach(u => {
      const hy = AY_w - (BOARD_LEN - u) * Math.cos(rad);
      CELL_Z.forEach(z => { ctx.beginPath(); ctx.arc(cvX(z), cvY(hy), rPx, 0, Math.PI*2); ctx.fill(); });
    });
    if (params.showFold) {
      // Fold: hole at u maps to y = BY_w + (FOLD_LEN - u)*fdy  (u=0 at D, u=FOLD_LEN at B)
      SCREW_U.filter(u => u < FOLD_LEN).forEach(u => {
        const hy = BY_w + (FOLD_LEN - u) * fdy;
        SCREW_Z.forEach(z => { ctx.beginPath(); ctx.arc(cvX(z), cvY(hy), rPx, 0, Math.PI*2); ctx.fill(); });
      });
      CELL_U.filter(u => u < FOLD_LEN).forEach(u => {
        const hy = BY_w + (FOLD_LEN - u) * fdy;
        CELL_Z.forEach(z => { ctx.beginPath(); ctx.arc(cvX(z), cvY(hy), rPx, 0, Math.PI*2); ctx.fill(); });
      });
    }
  }

  // ── Vertical division lines & width labels (main + fold panels) ──
  {
    const divLines = (widths, yTop, yBot, color) => {
      const divZ = widths.slice(0,-1).reduce((acc,w) => [...acc, acc[acc.length-1]+w], [0]).slice(1);

      // Border bands centered on each division line
      if (params.showBorderMark) {
        const halfW = params.borderMarkWidth * S / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (const z of divZ) {
          ctx.fillRect(cvX(z) - halfW, yTop, halfW * 2, yBot - yTop);
        }
      }

      ctx.strokeStyle = color; ctx.lineWidth = 1*dpr;
      ctx.setLineDash([5*dpr, 4*dpr]);
      for (const z of divZ) {
        ctx.beginPath(); ctx.moveTo(cvX(z), yTop); ctx.lineTo(cvX(z), yBot); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.font = `${FS.dim*dpr}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = color; ctx.textAlign = 'center';
      let z0 = 0;
      for (const w of widths) {
        ctx.fillText(w.toFixed(2) + 'm', cvX(z0 + w/2), yTop + FS.dim*dpr + 6*dpr);
        z0 += w;
      }
    };

    divLines([0.58, 0.80, 0.90, 0.80, 0.58], cvY(AY_w), cvY(BY_w), 'rgba(196,137,74,0.45)');
    if (params.showFold)
      divLines([1.18, 1.30, 1.18], cvY(BY_w), cvY(DY_w), 'rgba(122,184,232,0.45)');
  }

  // ── Section labels ──
  ctx.font = `${FS.seg*dpr}px 'JetBrains Mono', monospace`; ctx.textAlign = 'center';
  ctx.fillStyle = '#c4894a99';
  ctx.fillText('A→B ' + MAIN_LEN.toFixed(2) + 'm', cvX(BOARD_W/2), (cvY(AY_w) + cvY(BY_w)) / 2);
  if (params.showFold) {
    ctx.fillStyle = '#7ab8e899';
    ctx.fillText('B→D ' + FOLD_LEN + 'm', cvX(BOARD_W/2), (cvY(BY_w) + cvY(DY_w)) / 2);
  }

  // ── Point labels ──
  ctx.font = `700 ${FS.label*dpr}px 'JetBrains Mono', monospace`; ctx.fillStyle = LABEL_RED;
  ctx.textAlign = 'center'; ctx.fillText('A', cvX(BOARD_W/2), cvY(AY_w) - 10*dpr);
  ctx.textAlign = 'right';  ctx.fillText('B', cvX(0) - 6*dpr,  cvY(BY_w) + 5*dpr);
  if (params.showFold) {
    ctx.textAlign = 'center'; ctx.fillText('D', cvX(BOARD_W/2), cvY(DY_w) + 16*dpr);
  }

  // ── Dimension lines ──
  if (params.showDims) {
    const fs     = FS.dim * dpr;
    const dimOff = 28 * dpr;
    ctx.font = `${fs}px 'JetBrains Mono', monospace`;

    // Width below the lowest board edge
    const lowestY  = params.showFold ? Math.min(BY_w, DY_w) : BY_w;
    fvDimH(cvX(0), cvX(BOARD_W), cvY(lowestY) + dimOff, BOARD_W.toFixed(2) + 'm', dpr, fs);

    // Main board height on right (label shows actual length MAIN_LEN)
    fvDimV(cvX(BOARD_W) + dimOff, cvY(AY_w), cvY(BY_w), MAIN_LEN.toFixed(3) + 'm', dpr, fs);

    // Fold height on right — only when fold has visible projected extent
    if (params.showFold && Math.abs(cvY(BY_w) - cvY(DY_w)) > 5 * dpr) {
      const yTop = Math.min(cvY(BY_w), cvY(DY_w));
      const yBot = Math.max(cvY(BY_w), cvY(DY_w));
      fvDimV(cvX(BOARD_W) + dimOff*2, yTop, yBot, FOLD_LEN + 'm', dpr, fs);
    }
  }

  // ── Title ──
  ctx.font = `${FS.room*dpr}px 'JetBrains Mono', monospace`; ctx.fillStyle = '#5a5d6e';
  ctx.textAlign = 'center';
  ctx.fillText('正面視圖', cvX(BOARD_W / 2), H - 16*dpr);
}

// Horizontal dimension line at canvas y=ly, spanning x1→x2
function fvDimH(x1, x2, ly, label, dpr, fs) {
  const off = 7*dpr, aw = 6*dpr;
  ctx.strokeStyle = GRAY_DASH+'88'; ctx.fillStyle = GRAY_DASH;
  ctx.lineWidth = 1*dpr; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x1,ly-off); ctx.lineTo(x1,ly+off); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2,ly-off); ctx.lineTo(x2,ly+off); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1,ly); ctx.lineTo(x2,ly); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1,ly); ctx.lineTo(x1+aw,ly-aw*0.4); ctx.lineTo(x1+aw,ly+aw*0.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x2,ly); ctx.lineTo(x2-aw,ly-aw*0.4); ctx.lineTo(x2-aw,ly+aw*0.4); ctx.closePath(); ctx.fill();
  const mx=(x1+x2)/2, tw=ctx.measureText(label).width+8*dpr;
  ctx.textAlign='center';
  ctx.fillStyle='#0e0f12'; ctx.fillRect(mx-tw/2,ly-fs*0.85,tw,fs*1.3);
  ctx.fillStyle=GRAY_DASH; ctx.fillText(label,mx,ly+fs*0.35);
}

// Vertical dimension line at canvas x=lx, from y1 (top) to y2 (bottom)
function fvDimV(lx, y1, y2, label, dpr, fs) {
  const off = 7*dpr, aw = 6*dpr;
  ctx.strokeStyle = GRAY_DASH+'88'; ctx.fillStyle = GRAY_DASH;
  ctx.lineWidth = 1*dpr; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(lx-off,y1); ctx.lineTo(lx+off,y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx-off,y2); ctx.lineTo(lx+off,y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx,y1); ctx.lineTo(lx,y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx,y1); ctx.lineTo(lx-aw*0.4,y1+aw); ctx.lineTo(lx+aw*0.4,y1+aw); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(lx,y2); ctx.lineTo(lx-aw*0.4,y2-aw); ctx.lineTo(lx+aw*0.4,y2-aw); ctx.closePath(); ctx.fill();
  const my=(y1+y2)/2, tw=ctx.measureText(label).width+8*dpr;
  ctx.textAlign='center';
  ctx.fillStyle='#0e0f12'; ctx.fillRect(lx-tw/2,my-fs*0.85,tw,fs*1.3);
  ctx.fillStyle=GRAY_DASH; ctx.fillText(label,lx,my+fs*0.35);
}
