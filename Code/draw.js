import { BOARD_LEN, FOLD_LEN, MAIN_LEN, CEIL_H, T, BOARD_W, HOLE_R_M, SCREW_Z, SCREW_U, CELL_Z, CELL_U, LABEL_RED, GRAY_DASH, FS, AX_W, AY, HX, HY, REF_IX, REF_IY } from './constants.js';
import { canvas, ctx, params, view } from './state.js';
import { getGeom } from './geometry.js';
import { drawFrontView } from './frontview.js';

// ── Draw ─────────────────────────────────────────────────────────────────────
export function draw() {
  const W=canvas.width, H=canvas.height, dpr=devicePixelRatio;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#0e0f12'; ctx.fillRect(0,0,W,H);

  const g = getGeom();

  const margin = Math.min(90*dpr, Math.min(W,H) * 0.025);
  const OBL_COS = Math.cos(Math.PI / 6) * 0.5;
  const OBL_SIN = Math.sin(Math.PI / 6) * 0.5;
  const cosV = Math.cos(params.hViewAngle * Math.PI / 180);
  const sinV = Math.sin(params.hViewAngle * Math.PI / 180);
  // sceneW uses the 2D formula so φ=0 scale matches the original 2D side view;
  // depth offset is rendered visually but does not shrink the auto-scale.
  const sceneW = AX_W + T + 0.5, sceneH = CEIL_H * 1.22;
  // In 2D mode the canvas is split: left half = side view, right half = front view.
  // Account for the 44*dpr left offset in OX so the side view stays within its half.
  const sideW  = params.show3D ? W - margin*2 : W/2 - margin - 44*dpr;
  // In 2D mode constrain scale so the front view (BOARD_W wide + ~90px dim-line margin) also fits.
  const frontW = W/2 - margin - 90*dpr;
  const autoS  = Math.min(
    sideW / sceneW,
    params.show3D ? Infinity : frontW / BOARD_W,
    (H - margin*2) / sceneH
  );
  const S = autoS * view.scale;
  // Pivot rotation around the horizontal centre of the scene.
  // hcCenter0 is the projected horizontal coordinate of the centre at φ=0;
  // hcCenter is that same coordinate at the current angle.
  // Keeping OX such that (OX + hcCenter·S) is constant makes the scene
  // rotate in-place rather than drifting left/right.
  const cx = (AX_W+T+0.5)/2, cz = BOARD_W/2;
  const hcCenter0 = cx + cz*OBL_COS;
  const hcCenter  = (cx*cosV + cz*sinV) + (-cx*sinV + cz*cosV)*OBL_COS;
  const OX = margin + view.OX + 44*dpr + (hcCenter0 - hcCenter)*S;
  const OY = margin + CEIL_H*S + view.OY;
  const BW = BOARD_W;
  const p = (x, y, z=0) => {
    const h = x*cosV + z*sinV, d = -x*sinV + z*cosV;
    return [OX + h*S + d*S*OBL_COS, OY - y*S - d*S*OBL_SIN];
  };
  const tx = x => p(x,0,0)[0];

  // ── Room surfaces ──
  const roomMaxX = AX_W + 0.6;
  const floorMaxX = AX_W + 0.5;
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.setLineDash([]);

  if(params.show3D){
    // Wall face (x=0 plane, z=0→BW, y=0→CEIL_H)
    ctx.fillStyle = '#2d3548';
    ctx.beginPath();
    ctx.moveTo(...p(0,0,0));
    ctx.lineTo(...p(0,0,BW));
    ctx.lineTo(...p(0,CEIL_H,BW));
    ctx.lineTo(...p(0,CEIL_H,0));
    ctx.closePath(); ctx.fill();
    // Wall grid lines
    ctx.strokeStyle = '#3a4060'; ctx.lineWidth = 0.6*dpr;
    for (let iy = 1; iy < 5; iy++) {
      const wy = iy * CEIL_H / 5;
      ctx.beginPath(); ctx.moveTo(...p(0,wy,0)); ctx.lineTo(...p(0,wy,BW)); ctx.stroke();
    }
    ctx.strokeStyle = '#4a5070'; ctx.lineWidth = 1.2*dpr;
    ctx.beginPath(); ctx.moveTo(...p(0,0,0)); ctx.lineTo(...p(0,CEIL_H,0)); ctx.stroke();
    ctx.strokeStyle = '#3a4060'; ctx.lineWidth = 0.8*dpr;
    ctx.beginPath(); ctx.moveTo(...p(0,0,BW)); ctx.lineTo(...p(0,CEIL_H,BW)); ctx.stroke();

    // Ceiling face
    ctx.fillStyle = '#22263380';
    ctx.beginPath();
    ctx.moveTo(...p(0,CEIL_H,0));
    ctx.lineTo(...p(roomMaxX,CEIL_H,0));
    ctx.lineTo(...p(roomMaxX,CEIL_H,BW));
    ctx.lineTo(...p(0,CEIL_H,BW));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a406088'; ctx.lineWidth = 0.6*dpr;
    const ceilXStep = roomMaxX / 4;
    for (let ix = 0; ix <= 4; ix++) {
      const cx = ix * ceilXStep;
      ctx.beginPath(); ctx.moveTo(...p(cx,CEIL_H,0)); ctx.lineTo(...p(cx,CEIL_H,BW)); ctx.stroke();
    }
    const ceilZStep = BW / 4;
    for (let iz = 0; iz <= 4; iz++) {
      const cz = iz * ceilZStep;
      ctx.beginPath(); ctx.moveTo(...p(0,CEIL_H,cz)); ctx.lineTo(...p(roomMaxX,CEIL_H,cz)); ctx.stroke();
    }
    ctx.strokeStyle = '#3a4070'; ctx.lineWidth = 1*dpr;
    ctx.beginPath(); ctx.moveTo(...p(0,CEIL_H,0));        ctx.lineTo(...p(roomMaxX,CEIL_H,0));  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...p(0,CEIL_H,BW));       ctx.lineTo(...p(roomMaxX,CEIL_H,BW)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...p(0,CEIL_H,0));        ctx.lineTo(...p(0,CEIL_H,BW));        ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...p(roomMaxX,CEIL_H,0)); ctx.lineTo(...p(roomMaxX,CEIL_H,BW)); ctx.stroke();

    // Floor depth line
    ctx.strokeStyle = '#2a2d3866'; ctx.lineWidth = 1*dpr;
    ctx.setLineDash([7*dpr,7*dpr]);
    ctx.beginPath();
    ctx.moveTo(...p(0,0,0)); ctx.lineTo(...p(0,0,BW)); ctx.lineTo(...p(floorMaxX,0,BW));
    ctx.stroke(); ctx.setLineDash([]);

    // Wall-floor vertical corner edge (dashed)
    ctx.strokeStyle = '#3a406055'; ctx.lineWidth = 1*dpr;
    ctx.setLineDash([4*dpr,4*dpr]);
    ctx.beginPath(); ctx.moveTo(...p(0,0,0)); ctx.lineTo(...p(0,CEIL_H,0)); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Floor front edge (always shown)
  ctx.strokeStyle = '#2a2d38'; ctx.lineWidth = 1.5*dpr;
  ctx.setLineDash([7*dpr,7*dpr]);
  ctx.beginPath(); ctx.moveTo(...p(-0.15,0,0)); ctx.lineTo(...p(floorMaxX,0,0)); ctx.stroke();
  ctx.setLineDash([]);

  // ── 3D Boards: depth-sorted painter's algorithm ──
  ctx.lineJoin='round'; ctx.lineCap='round';
  const mb = (pt, z) => ({ x: pt.x, y: pt.y, z });
  const lw3 = 1.2 * dpr;

  // Average depth of a face: d(x,z) = -x·sinV + z·cosV (higher = further from observer)
  const faceDepth = pts => pts.reduce((s,pt) => s + (-pt.x*sinV + pt.z*cosV), 0) / pts.length;

  const boardFaces = [];
  const addFace = (pts, fill, stroke, lw) => boardFaces.push({pts, fill, stroke, lw});

  // Main board: front face always; back/side/cap faces only in 3D mode
  if(params.show3D){
    addFace([mb(g.Aw,BW),mb(g.Bw,BW),mb(g.Bo,BW),mb(g.Ao,BW)],
      'rgba(140,90,40,0.20)','#9a6030',lw3);
    addFace([mb(g.Ao,0),mb(g.Bo,0),mb(g.Bo,BW),mb(g.Ao,BW)],
      'rgba(168,110,55,0.35)','#b07040',lw3);
    addFace([mb(g.Aw,0),mb(g.Bw,0),mb(g.Bw,BW),mb(g.Aw,BW)],
      'rgba(110,65,20,0.22)','#7a4a20',lw3);
    addFace([mb(g.Aw,0),mb(g.Ao,0),mb(g.Ao,BW),mb(g.Aw,BW)],
      'rgba(120,78,35,0.45)','#8a5828',lw3);
    addFace([mb(g.Bw,0),mb(g.Bo,0),mb(g.Bo,BW),mb(g.Bw,BW)],
      'rgba(120,78,35,0.45)','#8a5828',lw3);
  }
  addFace([mb(g.Aw,0),mb(g.Bw,0),mb(g.Bo,0),mb(g.Ao,0)],
    'rgba(196,137,74,0.28)','#c4894a',1.5*dpr);

  // Fold section
  if(params.showFold){
    if(params.show3D){
      addFace([mb(g.Bw,BW),mb(g.Dw,BW),mb(g.Do,BW),mb(g.Bfo,BW)],
        'rgba(60,100,140,0.18)','#3a6488',lw3);
      addFace([mb(g.Bfo,0),mb(g.Do,0),mb(g.Do,BW),mb(g.Bfo,BW)],
        'rgba(80,130,175,0.30)','#508aaf',lw3);
      addFace([mb(g.Bw,0),mb(g.Dw,0),mb(g.Dw,BW),mb(g.Bw,BW)],
        'rgba(35,72,115,0.20)','#23487a',lw3);
      addFace([mb(g.Bw,0),mb(g.Bfo,0),mb(g.Bfo,BW),mb(g.Bw,BW)],
        'rgba(50,90,130,0.40)','#325a82',lw3);
      addFace([mb(g.Dw,0),mb(g.Do,0),mb(g.Do,BW),mb(g.Dw,BW)],
        'rgba(50,90,130,0.40)','#325a82',lw3);
    }
    addFace([mb(g.Bw,0),mb(g.Dw,0),mb(g.Do,0),mb(g.Bfo,0)],
      'rgba(122,184,232,0.22)','#7ab8e8',1.5*dpr);
  }

  // depth of a single 3D point
  const ptDepth = (x, z) => -x*sinV + z*cosV;

  // Drawable list: all depth-sorted elements (board faces, ghost, rods)
  const drawList = boardFaces.map(f => ({
    depth: faceDepth(f.pts),
    drawFn: () => drawFace3D(f.pts, p, f.fill, f.stroke, f.lw)
  }));

  // Center line — same depth as front face of main board
  const centerLineDepth = (ptDepth(g.Ac.x,0) + ptDepth(g.Bc.x,0)) / 2;
  drawList.push({ depth: centerLineDepth, drawFn: () => {
    ctx.strokeStyle='rgba(136,136,160,0.22)'; ctx.lineWidth=1*dpr;
    ctx.setLineDash([4*dpr,4*dpr]);
    ctx.beginPath();ctx.moveTo(...p(g.Ac.x,g.Ac.y));ctx.lineTo(...p(g.Bc.x,g.Bc.y));ctx.stroke();
    ctx.setLineDash([]);
  }});

  // Helper: add a rod segment entry to the draw list
  function addRod(x1,y1,x2,y2,z,thick,bodyColor,shadowColor,hlColor) {
    const depth = (ptDepth(x1,z) + ptDepth(x2,z)) / 2;
    drawList.push({ depth, drawFn: () => {
      const [csx1,csy1]=p(x1,y1,z), [csx2,csy2]=p(x2,y2,z);
      const ang=Math.atan2(csy2-csy1,csx2-csx1);
      const rpx=Math.cos(ang-Math.PI/2), rpy=Math.sin(ang-Math.PI/2);
      const off=1.5*dpr;
      ctx.lineCap='round'; ctx.lineJoin='round'; ctx.setLineDash([]);
      ctx.strokeStyle=shadowColor; ctx.lineWidth=2*dpr;
      ctx.beginPath();ctx.moveTo(csx1+rpx*off,csy1+rpy*off);ctx.lineTo(csx2+rpx*off,csy2+rpy*off);ctx.stroke();
      ctx.strokeStyle=bodyColor; ctx.lineWidth=thick;
      ctx.beginPath();ctx.moveTo(csx1,csy1);ctx.lineTo(csx2,csy2);ctx.stroke();
      ctx.strokeStyle=hlColor; ctx.lineWidth=2.5*dpr;
      ctx.beginPath();ctx.moveTo(csx1-rpx*off,csy1-rpy*off);ctx.lineTo(csx2-rpx*off,csy2-rpy*off);ctx.stroke();
    }});
  }

  // ── Screw holes on visible face (外側面 or 內側面) ──
  if (params.show3D && params.showScrewHoles) {
    // Signed area of projected polygon — determines face winding (visibility)
    const sArea = proj => {
      let a=0;
      for(let i=0;i<proj.length;i++){const[x1,y1]=proj[i],[x2,y2]=proj[(i+1)%proj.length];a+=x1*y2-x2*y1;}
      return a;
    };
    // 3D point on outer (true) or inner (false) board face at u_from_D from D end, z_w along width
    const holePt = (u_from_D, z_w, isOuter) => {
      if (u_from_D < FOLD_LEN) {
        const r = isOuter ? g.Do : g.Dw;
        return { x: r.x - u_from_D*g.fdx, y: r.y - u_from_D*g.fdy, z: z_w };
      } else {
        const u_m = BOARD_LEN - u_from_D;
        const r = isOuter ? g.Ao : g.Aw;
        return { x: r.x + u_m*g.ddx, y: r.y + u_m*g.ddy, z: z_w };
      }
    };
    const r_px = Math.max(HOLE_R_M * S, 1.5*dpr);

    // Main board face
    const mainOF = [mb(g.Ao,0),mb(g.Bo,0),mb(g.Bo,BW),mb(g.Ao,BW)];
    const mainIF = [mb(g.Aw,0),mb(g.Bw,0),mb(g.Bw,BW),mb(g.Aw,BW)];
    const mainIsOuter = sArea(mainOF.map(pt=>p(pt.x,pt.y,pt.z))) < 0;
    const mainVisDepth = faceDepth(mainIsOuter ? mainOF : mainIF);
    drawList.push({ depth: mainVisDepth - 0.001, drawFn: () => {
      ctx.fillStyle = 'rgba(255,255,255,0.80)';
      SCREW_U.filter(u=>u>=FOLD_LEN).forEach(u => SCREW_Z.forEach(z_w => {
        const pt=holePt(u,z_w,mainIsOuter);
        const[cx,cy]=p(pt.x,pt.y,pt.z);
        ctx.beginPath();ctx.arc(cx,cy,r_px,0,Math.PI*2);ctx.fill();
      }));
      CELL_U.filter(u=>u>=FOLD_LEN).forEach(u => CELL_Z.forEach(z_w => {
        const pt=holePt(u,z_w,mainIsOuter);
        const[cx,cy]=p(pt.x,pt.y,pt.z);
        ctx.beginPath();ctx.arc(cx,cy,r_px,0,Math.PI*2);ctx.fill();
      }));
    }});

    // Fold section face (only if fold is shown)
    if (params.showFold) {
      const foldOF = [mb(g.Bfo,0),mb(g.Do,0),mb(g.Do,BW),mb(g.Bfo,BW)];
      const foldIF = [mb(g.Bw,0),mb(g.Dw,0),mb(g.Dw,BW),mb(g.Bw,BW)];
      const foldIsOuter = sArea(foldOF.map(pt=>p(pt.x,pt.y,pt.z))) < 0;
      const foldVisDepth = faceDepth(foldIsOuter ? foldOF : foldIF);
      drawList.push({ depth: foldVisDepth - 0.001, drawFn: () => {
        ctx.fillStyle = 'rgba(255,255,255,0.80)';
        SCREW_U.filter(u=>u<FOLD_LEN).forEach(u => SCREW_Z.forEach(z_w => {
          const pt=holePt(u,z_w,foldIsOuter);
          const[cx,cy]=p(pt.x,pt.y,pt.z);
          ctx.beginPath();ctx.arc(cx,cy,r_px,0,Math.PI*2);ctx.fill();
        }));
        CELL_U.filter(u=>u<FOLD_LEN).forEach(u => CELL_Z.forEach(z_w => {
          const pt=holePt(u,z_w,foldIsOuter);
          const[cx,cy]=p(pt.x,pt.y,pt.z);
          ctx.beginPath();ctx.arc(cx,cy,r_px,0,Math.PI*2);ctx.fill();
        }));
      }});
    }
  }

  // ── Border marks: 5cm darker fill region on each board face ──
  if (params.showBorderMark) {
    const MARGIN  = params.borderMarkWidth;
    const MARG_J  = params.borderMarkJunctionWidth;  // B-junction edge (main↔fold)
    const bClr = 'rgba(0,0,0,0.35)';

    if (params.show3D) {
      // Signed-area helper to determine face winding (visibility)
      const sAreaB = proj => {
        let a=0;
        for(let i=0;i<proj.length;i++){const[x1,y1]=proj[i],[x2,y2]=proj[(i+1)%proj.length];a+=x1*y2-x2*y1;}
        return a;
      };
      // Draw frame region using evenodd fill; topMarg/botMarg = along-board margins at each end
      const drawBoardBorder = (topPt, botPt, dx, dy, topMarg, botMarg) => {
        const outer = [
          [topPt.x, topPt.y, 0],
          [topPt.x, topPt.y, BW],
          [botPt.x, botPt.y, BW],
          [botPt.x, botPt.y, 0],
        ];
        const inner = [
          [topPt.x + topMarg*dx, topPt.y + topMarg*dy, MARGIN],
          [topPt.x + topMarg*dx, topPt.y + topMarg*dy, BW-MARGIN],
          [botPt.x - botMarg*dx, botPt.y - botMarg*dy, BW-MARGIN],
          [botPt.x - botMarg*dx, botPt.y - botMarg*dy, MARGIN],
        ];
        ctx.fillStyle = bClr;
        ctx.beginPath();
        ctx.moveTo(...p(outer[0][0],outer[0][1],outer[0][2]));
        outer.slice(1).forEach(q=>ctx.lineTo(...p(q[0],q[1],q[2])));
        ctx.closePath();
        ctx.moveTo(...p(inner[0][0],inner[0][1],inner[0][2]));
        inner.slice(1).forEach(q=>ctx.lineTo(...p(q[0],q[1],q[2])));
        ctx.closePath();
        ctx.fill('evenodd');
      };
      // Main board: top=A-end (MARGIN), bot=B-junction (MARG_J)
      const mainOF=[mb(g.Ao,0),mb(g.Bo,0),mb(g.Bo,BW),mb(g.Ao,BW)];
      const mainIF=[mb(g.Aw,0),mb(g.Bw,0),mb(g.Bw,BW),mb(g.Aw,BW)];
      const mainOuter = sAreaB(mainOF.map(pt=>p(pt.x,pt.y,pt.z))) < 0;
      const mainFace  = mainOuter ? mainOF : mainIF;
      const [mTop,mBot] = mainOuter ? [g.Ao,g.Bo] : [g.Aw,g.Bw];
      drawList.push({ depth: faceDepth(mainFace) - 0.002,
        drawFn: () => drawBoardBorder(mTop, mBot, g.ddx, g.ddy, MARGIN, MARG_J) });
      // Fold board: top=B-junction (MARG_J), bot=D-end (MARGIN)
      if (params.showFold) {
        const foldOF=[mb(g.Bfo,0),mb(g.Do,0),mb(g.Do,BW),mb(g.Bfo,BW)];
        const foldIF=[mb(g.Bw,0),mb(g.Dw,0),mb(g.Dw,BW),mb(g.Bw,BW)];
        const foldOuter = sAreaB(foldOF.map(pt=>p(pt.x,pt.y,pt.z))) < 0;
        const foldFace  = foldOuter ? foldOF : foldIF;
        const [fTop,fBot] = foldOuter ? [g.Bfo,g.Do] : [g.Bw,g.Dw];
        drawList.push({ depth: faceDepth(foldFace) - 0.002,
          drawFn: () => drawBoardBorder(fTop, fBot, g.fdx, g.fdy, MARG_J, MARGIN) });
      }
    } else {
      // 2D side view: filled quads at each board end
      drawList.push({ depth: 0, drawFn: () => {
        ctx.fillStyle = bClr;
        // A-end band (regular margin)
        ctx.beginPath();
        ctx.moveTo(...p(g.Aw.x,                    g.Aw.y));
        ctx.lineTo(...p(g.Ao.x,                    g.Ao.y));
        ctx.lineTo(...p(g.Ao.x+MARGIN*g.ddx,  g.Ao.y+MARGIN*g.ddy));
        ctx.lineTo(...p(g.Aw.x+MARGIN*g.ddx,  g.Aw.y+MARGIN*g.ddy));
        ctx.closePath(); ctx.fill();
        // B-end band (junction margin)
        ctx.beginPath();
        ctx.moveTo(...p(g.Bw.x,                    g.Bw.y));
        ctx.lineTo(...p(g.Bo.x,                    g.Bo.y));
        ctx.lineTo(...p(g.Bo.x-MARG_J*g.ddx,  g.Bo.y-MARG_J*g.ddy));
        ctx.lineTo(...p(g.Bw.x-MARG_J*g.ddx,  g.Bw.y-MARG_J*g.ddy));
        ctx.closePath(); ctx.fill();
      }});
      if (params.showFold) {
        drawList.push({ depth: 0, drawFn: () => {
          ctx.fillStyle = bClr;
          // B-fold-end band (junction margin)
          ctx.beginPath();
          ctx.moveTo(...p(g.Bw.x,                    g.Bw.y));
          ctx.lineTo(...p(g.Bfo.x,                   g.Bfo.y));
          ctx.lineTo(...p(g.Bfo.x+MARG_J*g.fdx, g.Bfo.y+MARG_J*g.fdy));
          ctx.lineTo(...p(g.Bw.x+MARG_J*g.fdx,  g.Bw.y+MARG_J*g.fdy));
          ctx.closePath(); ctx.fill();
          // D-end band (regular margin)
          ctx.beginPath();
          ctx.moveTo(...p(g.Dw.x,                    g.Dw.y));
          ctx.lineTo(...p(g.Do.x,                    g.Do.y));
          ctx.lineTo(...p(g.Do.x-MARGIN*g.fdx,  g.Do.y-MARGIN*g.fdy));
          ctx.lineTo(...p(g.Dw.x-MARGIN*g.fdx,  g.Dw.y-MARGIN*g.fdy));
          ctx.closePath(); ctx.fill();
        }});
      }
    }
  }

  // Ghost C extension (dashed) — depth: front face of main board
  const ghostDepth = (ptDepth(g.Bw.x,0) + ptDepth(g.Cw.x,0)) / 2;
  drawList.push({ depth: ghostDepth, drawFn: () => {
    ctx.setLineDash([5*dpr,5*dpr]); ctx.lineWidth=1*dpr;
    ctx.strokeStyle='rgba(136,136,160,0.35)';
    ctx.beginPath();ctx.moveTo(...p(g.Bw.x,g.Bw.y));ctx.lineTo(...p(g.Cw.x,g.Cw.y));ctx.stroke();
    ctx.strokeStyle='rgba(136,136,160,0.2)';
    ctx.beginPath();ctx.moveTo(...p(g.Bo.x,g.Bo.y));ctx.lineTo(...p(g.Co.x,g.Co.y));ctx.stroke();
    ctx.setLineDash([]);
  }});

  // ── H→G dashed distance ──
  if(params.showQuarter){
    ctx.strokeStyle=GRAY_DASH+'66'; ctx.lineWidth=1.5*dpr;
    ctx.setLineDash([6*dpr,5*dpr]);
    ctx.beginPath();ctx.moveTo(...p(HX,HY));ctx.lineTo(...p(g.GX,g.GY));ctx.stroke();
    ctx.setLineDash([]);

    // cosV≥0: z=BW is farther; cosV<0: z=0 is farther
    const rodZFar  = cosV >= 0 ? BW : 0;
    const rodZNear = cosV >= 0 ? 0  : BW;

    if(params.show3D){
      // Depth connector lines
      ctx.strokeStyle='#90d8c055'; ctx.lineWidth=1.5*dpr; ctx.lineCap='round';
      [[HX,HY],[g.MX,g.MY],[g.GX,g.GY]].forEach(([x,y])=>{
        ctx.beginPath();ctx.moveTo(...p(x,y,0));ctx.lineTo(...p(x,y,BW));ctx.stroke();
      });
      addRod(HX,HY,g.MX,g.MY,      rodZFar,  6*dpr,'#6aac9a','#3a6d5a','#8ecfbc');
      addRod(g.MX,g.MY,g.GX,g.GY,  rodZFar,  6*dpr,'#6aac9a','#3a6d5a','#8ecfbc');
    }
    addRod(HX,HY,g.MX,g.MY,      rodZNear, 8*dpr,'#90d8c0','#508070','#c0f0e8');
    addRod(g.MX,g.MY,g.GX,g.GY,  rodZNear, 8*dpr,'#90d8c0','#508070','#c0f0e8');

    // ── Execute depth-sorted draw (boards + ghost + rods all together) ──
    drawList.sort((a,b) => b.depth - a.depth);
    drawList.forEach(e => e.drawFn());

    // Length labels on front (z=0) H-M and M-G
    {
      const lfs = FS.dim * dpr;
      ctx.font = `${lfs}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      const rigLbl = (g.LEN_HM * 100).toFixed(0) + 'cm';
      // H-M midpoint (labels on the near/front rod set)
      const [hm_mx, hm_my] = p((HX + g.MX) / 2, (HY + g.MY) / 2, rodZNear);
      const tw_hm = ctx.measureText(rigLbl).width + 8 * dpr;
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(hm_mx - tw_hm/2, hm_my - lfs*0.85, tw_hm, lfs*1.3);
      ctx.fillStyle = '#90d8c0'; ctx.fillText(rigLbl, hm_mx, hm_my + lfs*0.35);
      // M-G midpoint (labels on the near/front rod set)
      const [mg_mx, mg_my] = p((g.MX + g.GX) / 2, (g.MY + g.GY) / 2, rodZNear);
      const tw_mg = ctx.measureText(rigLbl).width + 8 * dpr;
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(mg_mx - tw_mg/2, mg_my - lfs*0.85, tw_mg, lfs*1.3);
      ctx.fillStyle = '#90d8c0'; ctx.fillText(rigLbl, mg_mx, mg_my + lfs*0.35);
    }

    ctx.setLineDash([]);
    const mx=(HX+g.GX)/2, my=(HY+g.GY)/2;
    const fs=FS.dim*dpr;
    ctx.font=`${fs}px 'JetBrains Mono', monospace`;
    const lbl=(g.HG*100).toFixed(0)+'cm';
    const tw=ctx.measureText(lbl).width+8*dpr;
    ctx.textAlign='center';
    const [hglx,hgly]=p(mx,my);
    ctx.fillStyle='#0e0f12'; ctx.fillRect(hglx-tw/2,hgly-fs*0.85,tw,fs*1.3);
    ctx.fillStyle=GRAY_DASH; ctx.fillText(lbl,hglx,hgly+fs*0.35);

    // ── G-H midpoint M → A dashed distance ──
    function dashedDistLine(x1,y1,x2,y2,lbl,color){
      ctx.strokeStyle=color; ctx.lineWidth=1.2*dpr;
      ctx.setLineDash([5*dpr,4*dpr]);
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      ctx.setLineDash([]);
      const mx2=(x1+x2)/2, my2=(y1+y2)/2;
      const tw2=ctx.measureText(lbl).width+8*dpr;
      ctx.textAlign='center';
      ctx.fillStyle='#0e0f12'; ctx.fillRect(mx2-tw2/2,my2-fs*0.85,tw2,fs*1.3);
      ctx.fillStyle=color; ctx.fillText(lbl,mx2,my2+fs*0.35);
    }
    ctx.font=`${fs}px 'JetBrains Mono', monospace`;
    dashedDistLine(...p(g.MX,g.MY), ...p(g.Aw.x,g.Aw.y),
                   (g.MA*100).toFixed(0)+'cm', GRAY_DASH);
  } else {
    // No rods — still need to sort+draw boards, ghost, center line
    drawList.sort((a,b) => b.depth - a.depth);
    drawList.forEach(e => e.drawFn());
  }

  // ── Anchor points H, I ──
  drawDiamond(...p(HX,HY),'#7ae8b0','H',dpr);
  drawDiamond(...p(REF_IX,REF_IY),'#e8a87a','I',dpr);

  // ── G point and M ──
  if(params.showQuarter){
    drawQuarterPt(...p(g.GX,g.GY),'G',dpr);
    // A→G distance label near G
    const agLbl = (params.gOffset * 100).toFixed(0) + 'cm';
    ctx.font = `${FS.dim*dpr}px 'JetBrains Mono', monospace`;
    const [agx,agy]=p(g.GX,g.GY);
    ctx.fillStyle = '#c4894acc';
    ctx.textAlign = 'left';
    ctx.fillText('AG:' + agLbl, agx + 12*dpr, agy + 18*dpr);
    drawMidPt(...p(g.MX,g.MY),'M',dpr);
  }

  // ── Key points A B C D ──
  drawKeyPt(...p(g.Aw.x,g.Aw.y), '#e8c87a','A', 16,-16,dpr);
  drawKeyPt(...p(g.Bw.x,g.Bw.y), '#7ab8e8','B', 16,  4,dpr);
  drawKeyPt(...p(g.Cw.x,g.Cw.y), '#e87a7a','C', 16,  4,dpr);
  if(params.showFold)
    drawKeyPt(...p(g.Dw.x,g.Dw.y),'#b07ae8','D', 16,  4,dpr);

  // ── Dimension lines ──
  if(params.showDims){
    const fs=FS.dim*dpr;
    ctx.font=`${fs}px 'JetBrains Mono', monospace`;

    function dim(x1,y1,x2,y2,lbl,_color,off,horiz){
      ctx.strokeStyle=GRAY_DASH+'88'; ctx.fillStyle=GRAY_DASH; ctx.lineWidth=1*dpr;
      ctx.setLineDash([4*dpr,4*dpr]);
      const nx=horiz?0:1, ny=horiz?1:0;
      [[x1,y1],[x2,y2]].forEach(([x,y])=>{
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+nx*off,y+ny*off);ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(x1+nx*off,y1+ny*off);ctx.lineTo(x2+nx*off,y2+ny*off);ctx.stroke();
      const ang=Math.atan2(y2+ny*off-(y1+ny*off),x2+nx*off-(x1+nx*off));
      [[x1+nx*off,y1+ny*off,ang+Math.PI],[x2+nx*off,y2+ny*off,ang]].forEach(([ax,ay,a])=>{
        ctx.beginPath();ctx.moveTo(ax,ay);
        ctx.lineTo(ax+Math.cos(a+0.3)*8*dpr,ay+Math.sin(a+0.3)*8*dpr);
        ctx.lineTo(ax+Math.cos(a-0.3)*8*dpr,ay+Math.sin(a-0.3)*8*dpr);
        ctx.closePath();ctx.fill();
      });
      const mx2=(x1+nx*off+x2+nx*off)/2, my2=(y1+ny*off+y2+ny*off)/2;
      const tw=ctx.measureText(lbl).width+8*dpr;
      ctx.textAlign='center';
      ctx.fillStyle='#0e0f12'; ctx.fillRect(mx2-tw/2,my2-fs*0.75,tw,fs*1.2);
      ctx.fillStyle=GRAY_DASH; ctx.fillText(lbl,mx2,my2+fs*0.35);
    }

    const o=32*dpr;

    // ── Projection dashed lines ──
    ctx.lineWidth=1*dpr; ctx.setLineDash([3*dpr,4*dpr]);
    ctx.strokeStyle=GRAY_DASH+'44';
    ctx.beginPath();ctx.moveTo(...p(g.Aw.x,g.Aw.y));ctx.lineTo(...p(g.Aw.x,0));ctx.stroke();
    ctx.beginPath();ctx.moveTo(...p(g.Bw.x,g.Bw.y));ctx.lineTo(...p(g.Bw.x,0));ctx.stroke();
    ctx.beginPath();ctx.moveTo(...p(0,g.Bw.y));ctx.lineTo(...p(g.Bw.x,g.Bw.y));ctx.stroke();
    ctx.setLineDash([]);

    // ── H→B dashed distance ──
    {
      const HB = Math.hypot(g.Bw.x - HX, g.Bw.y - HY);
      ctx.strokeStyle = GRAY_DASH + '88'; ctx.lineWidth = 1.2*dpr;
      ctx.setLineDash([5*dpr, 4*dpr]);
      ctx.beginPath(); ctx.moveTo(...p(HX,HY)); ctx.lineTo(...p(g.Bw.x,g.Bw.y)); ctx.stroke();
      ctx.setLineDash([]);
      const [hbx1,hby1]=p(HX,HY), [hbx2,hby2]=p(g.Bw.x,g.Bw.y);
      const hb_mx = (hbx1+hbx2)/2, hb_my = (hby1+hby2)/2;
      const hbLbl = (HB*100).toFixed(0)+'cm';
      const hb_tw = ctx.measureText(hbLbl).width + 8*dpr;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(hb_mx - hb_tw/2, hb_my - fs*0.85, hb_tw, fs*1.3);
      ctx.fillStyle = GRAY_DASH; ctx.fillText(hbLbl, hb_mx, hb_my + fs*0.35);
    }

    // ── A→B 段對地面投影 & B 對牆面投影高度 ──
    dim(...p(g.Bw.x,0), ...p(g.Aw.x,0), ((g.Aw.x-g.Bw.x)*100).toFixed(0)+'cm','#c4894a', o, true);
    dim(...p(0,0), ...p(0,g.Bw.y), (g.Bw.y*100).toFixed(0)+'cm','#7ab8e8',-o*2, false);

    dim(...p(0,0), ...p(0,CEIL_H), CEIL_H.toFixed(2)+'m','#7ab8e8',-o,false);
    dim(...p(0,CEIL_H+0.1), ...p(g.Aw.x,CEIL_H+0.1), g.Aw.x.toFixed(3)+'m','#e8c87a',-o,true);
    if(g.Cw.y>0.002)
      dim(...p(g.Cw.x-0.1,0), ...p(g.Cw.x-0.1,g.Cw.y), (g.Cw.y*100).toFixed(0)+'cm','#e87a7a',-o*0.75,false);

    // ── 地面外側端往內縮 → 主板外側面投影高度 ──
    if (g.projOnBoardY !== null) {
      const rx = g.refFloorX, py = g.projOnBoardY;
      ctx.font = `${fs}px 'JetBrains Mono', monospace`;

      // 地面內縮距離標示（水平 dim 線，位於地面下方）
      dim(...p(rx,0), ...p(g.Ao.x,0),
          (params.inwardOffset * 100).toFixed(0) + 'cm', GRAY_DASH, 26*dpr, true);

      // 垂直虛線：地面參考點 → 主板外側面交點
      ctx.strokeStyle = GRAY_DASH + '88'; ctx.lineWidth = 1.2*dpr;
      ctx.setLineDash([4*dpr, 4*dpr]);
      ctx.beginPath(); ctx.moveTo(...p(rx,0)); ctx.lineTo(...p(rx,py)); ctx.stroke();
      ctx.setLineDash([]);

      // 交點標記
      const [rxPx,rxPy0]=p(rx,0), [,rxPyp]=p(rx,py);
      ctx.fillStyle = GRAY_DASH;
      ctx.beginPath(); ctx.arc(rxPx, rxPyp, 4*dpr, 0, Math.PI*2); ctx.fill();

      // 高度標籤（置中於垂直線，顯示在線右側）
      const heightLbl = (py * 100).toFixed(0) + 'cm';
      const vlMidY = (rxPy0 + rxPyp) / 2;
      const tw2 = ctx.measureText(heightLbl).width + 8*dpr;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(rxPx + 4*dpr, vlMidY - fs*0.85, tw2, fs*1.3);
      ctx.fillStyle = GRAY_DASH; ctx.fillText(heightLbl, rxPx + 8*dpr, vlMidY + fs*0.35);
    }

    // Angle arc at A (canvas-space directions, correct for any hViewAngle)
    const arcR=44*dpr;
    const [ax,ay]=p(g.Aw.x,g.Aw.y,0);
    const [ax2,ay2]=p(g.Aw.x,0,0);
    const wallDownDir=Math.atan2(ay2-ay,ax2-ax);
    const [bx,by]=p(g.Bw.x,g.Bw.y,0);
    const bDirCanvas=Math.atan2(by-ay,bx-ax);
    ctx.strokeStyle='#e8c87a88'; ctx.lineWidth=1.5*dpr; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(ax,ay,arcR,Math.min(wallDownDir,bDirCanvas),Math.max(wallDownDir,bDirCanvas));
    ctx.stroke();
    const midA=(wallDownDir+bDirCanvas)/2;
    ctx.font=`${fs}px 'JetBrains Mono', monospace`;
    ctx.fillStyle='#e8c87a'; ctx.textAlign='center';
    ctx.fillText(params.angle+'°', ax+Math.cos(midA)*(arcR+16*dpr), ay+Math.sin(midA)*(arcR+16*dpr));

    // Thickness annotation at B
    ctx.strokeStyle=GRAY_DASH+'44'; ctx.lineWidth=1*dpr;
    ctx.beginPath();ctx.moveTo(...p(g.Bw.x,g.Bw.y));ctx.lineTo(...p(g.Bo.x,g.Bo.y));ctx.stroke();
    const [tbwx,tbwy]=p(g.Bw.x,g.Bw.y), [tbox,tboy]=p(g.Bo.x,g.Bo.y);
    const tmx=(tbwx+tbox)/2, tmy=(tbwy+tboy)/2;
    ctx.font=`${(FS.dim-1)*dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle=GRAY_DASH+'88'; ctx.textAlign='left';
    ctx.fillText('5cm', tmx+8*dpr, tmy+4*dpr);
  }

  // Room labels
  ctx.font=`${FS.room*dpr}px 'JetBrains Mono', monospace`;
  ctx.fillStyle='#5a5d6e'; ctx.textAlign='left';
  if(params.show3D){
    const [rlwx,rlwy]=p(0,CEIL_H*0.5,BW*0.45);
    ctx.fillText('牆面',  rlwx+4*dpr, rlwy);
    const [rlcx,rlcy]=p(0.04,CEIL_H,BW*0.5);
    ctx.fillText('天花板',rlcx, rlcy-6*dpr);
  }
  const [rlfx,rlfy]=p(0.04,-0.04);
  ctx.fillText('地面',  rlfx, rlfy+14*dpr);

  ctx.font=`${FS.seg*dpr}px 'JetBrains Mono', monospace`;
  ctx.textAlign='center';
  ctx.fillStyle='#c4894a99';
  const [sxAB,syAB]=p((g.Ac.x+g.Bc.x)/2,(g.Ac.y+g.Bc.y)/2);
  ctx.fillText('A→B '+MAIN_LEN.toFixed(2)+'m', sxAB+20*dpr, syAB-8*dpr);
  if(params.showFold){
    ctx.fillStyle='#7ab8e899';
    const [sxBD,syBD]=p((g.Bw.x+g.Dw.x)/2,(g.Bw.y+g.Dw.y)/2);
    ctx.fillText('B→D '+FOLD_LEN+'m', sxBD+20*dpr, syBD-8*dpr);
  }

  // ── 2D split: divider + front view ──
  if (!params.show3D) {
    ctx.strokeStyle='#3a4060'; ctx.lineWidth=1*dpr; ctx.setLineDash([6*dpr,4*dpr]);
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.setLineDash([]);
    ctx.font=`${FS.room*dpr}px 'JetBrains Mono', monospace`; ctx.fillStyle='#5a5d6e';
    ctx.textAlign='center';
    ctx.fillText('側視圖', W*0.25, H-16*dpr);
    drawFrontView(W, H, margin, dpr, S);
  }
}

// Draw a polygon face in 3D oblique projection.
// pts: array of {x, y, z} world coords; pFn: unified projection function p(x,y,z)→[cx,cy]
function drawFace3D(pts, pFn, fillStyle, strokeStyle, lw) {
  ctx.beginPath();
  ctx.moveTo(...pFn(pts[0].x, pts[0].y, pts[0].z));
  for (let i = 1; i < pts.length; i++)
    ctx.lineTo(...pFn(pts[i].x, pts[i].y, pts[i].z));
  ctx.closePath();
  if (fillStyle)   { ctx.fillStyle   = fillStyle;  ctx.fill(); }
  if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lw; ctx.stroke(); }
}

function drawKeyPt(px,py,color,label,lox,loy,dpr){
  const r=8*dpr;
  ctx.strokeStyle=color; ctx.lineWidth=2.5*dpr;
  ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=color+'44';
  ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color;
  ctx.beginPath();ctx.arc(px,py,3.5*dpr,0,Math.PI*2);ctx.fill();
  ctx.font=`700 ${FS.label*dpr}px 'JetBrains Mono', monospace`;
  ctx.fillStyle=LABEL_RED; ctx.textAlign='center';
  ctx.fillText(label,px+lox*dpr,py+loy*dpr);
}

function drawDiamond(px,py,color,label,dpr){
  const r=7*dpr;
  ctx.save();ctx.translate(px,py);ctx.rotate(Math.PI/4);
  ctx.strokeStyle=color; ctx.lineWidth=2*dpr;
  ctx.fillStyle=color+'33';
  ctx.beginPath();ctx.rect(-r,-r,r*2,r*2);ctx.fill();ctx.stroke();
  ctx.restore();
  ctx.font=`700 ${FS.label*dpr}px 'JetBrains Mono', monospace`;
  ctx.fillStyle=LABEL_RED; ctx.textAlign='left';
  ctx.fillText(label,px+12*dpr,py+5*dpr);
}

function drawMidPt(px,py,label,dpr){
  const r=5*dpr;
  ctx.strokeStyle='#ffffff99'; ctx.lineWidth=2*dpr;
  ctx.fillStyle='#ffffff22';
  ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();ctx.stroke();
  // crosshair
  ctx.strokeStyle='#ffffff66'; ctx.lineWidth=1*dpr;
  ctx.beginPath();ctx.moveTo(px-7*dpr,py);ctx.lineTo(px+7*dpr,py);ctx.stroke();
  ctx.beginPath();ctx.moveTo(px,py-7*dpr);ctx.lineTo(px,py+7*dpr);ctx.stroke();
  ctx.font=`700 ${FS.label*dpr}px 'JetBrains Mono', monospace`;
  ctx.fillStyle=LABEL_RED; ctx.textAlign='left';
  ctx.fillText(label,px+10*dpr,py-6*dpr);
}

function drawQuarterPt(px,py,label,dpr){
  const r=5*dpr;
  ctx.strokeStyle='#c4894a'; ctx.lineWidth=2*dpr;
  ctx.fillStyle='#c4894a33';
  ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#c4894a88'; ctx.lineWidth=1*dpr;
  ctx.beginPath();ctx.moveTo(px-6*dpr,py);ctx.lineTo(px+6*dpr,py);ctx.stroke();
  ctx.beginPath();ctx.moveTo(px,py-6*dpr);ctx.lineTo(px,py+6*dpr);ctx.stroke();
  ctx.font=`700 ${FS.label*dpr}px 'JetBrains Mono', monospace`;
  ctx.fillStyle=LABEL_RED; ctx.textAlign='left';
  ctx.fillText(label,px+10*dpr,py-6*dpr);
}
