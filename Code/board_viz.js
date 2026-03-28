const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const BOARD_LEN = 3.048, FOLD_LEN = 0.65, MAIN_LEN = BOARD_LEN - FOLD_LEN;
const CEIL_H = 2.5, T = 0.05, HT = T / 2;
const LABEL_RED = '#ff4d4d';
const GRAY_DASH = '#8888a0';
const FS = { label: 15, dim: 13, room: 12, seg: 12 };

// A wall-side edge fixed: bottom of wall-side edge touches wall at 40°
const AX_W = BOARD_LEN * Math.sin(40 * Math.PI / 180); // 1.9593
const AY   = CEIL_H; // 2.5

// Fixed reference points
const HX = 0, HY = CEIL_H;
const REF_IX = 0, REF_IY = AY - BOARD_LEN * Math.cos(40 * Math.PI / 180);

// Rigid bar lengths from H→M and M→G, computed at angle=0
// At angle=0: ddx=0, ddy=-1 → G0 = (AX_W, AY - (3/4)*MAIN_LEN)
const G0_RIG_X = AX_W;
const G0_RIG_Y = AY - (3 / 4) * MAIN_LEN;
const LEN_HM_RIG = Math.hypot((HX + G0_RIG_X) / 2 - HX, (HY + G0_RIG_Y) / 2 - HY);
const LEN_MG_RIG = LEN_HM_RIG; // M0 is midpoint → equal lengths

let params = { angle: 40, inwardOffset: 1.0, showDims: true, showFold: true, showQuarter: true };

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

function getGeom() {
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

  // Quarter points on wall-side edge
  const quarters = [1,2,3].map(i => ({
    x: Aw.x + (i/4) * MAIN_LEN * ddx,
    y: Aw.y + (i/4) * MAIN_LEN * ddy,
    label: ['E','F','G'][i-1]
  }));
  const GX = quarters[2].x, GY = quarters[2].y;
  const HG = Math.hypot(HX - GX, HY - GY);

  // Rigid junction M: two bars (H→M, M→G) with fixed lengths from angle=0
  // Solved via two-circle intersection; bends toward A when angle > 0
  let MX, MY;
  const dHG = Math.hypot(GX - HX, GY - HY);
  if (dHG < 0.0001) {
    MX = HX; MY = HY;
  } else {
    const a_rig = (LEN_HM_RIG * LEN_HM_RIG - LEN_MG_RIG * LEN_MG_RIG + dHG * dHG) / (2 * dHG);
    const h_rig = Math.sqrt(Math.max(0, LEN_HM_RIG * LEN_HM_RIG - a_rig * a_rig));
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
  const ME = Math.hypot(quarters[0].x - MX, quarters[0].y - MY);

  // ── 地面外側端往內縮 1M 之投影 ──
  // 外側端 = 主板外側頂角 Ao；地面投影 = (Ao.x, 0)；往內縮 1M = (Ao.x − 1.0, 0)
  const refFloorX = Ao.x - params.inwardOffset;
  const t_proj = (Ao.x - Bo.x) > 0.001 ? (refFloorX - Bo.x) / (Ao.x - Bo.x) : -1;
  const projOnBoardY = (t_proj >= 0 && t_proj <= 1) ? Bo.y + t_proj * (Ao.y - Bo.y) : null;

  return { Aw,Ao,Ac, Bw,Bo,Bc,Bfo, Cw,Co, Dw,Do,
           boardDir, foldDir, fdx,fdy, fnx,fny,
           quarters, GX,GY, HG, MX,MY,MA,ME,
           refFloorX, projOnBoardY };
}

// ── Clamp logic ──────────────────────────────────────────────────────────────
// angle: 0~40 (no further constraints needed — at 0° board is vertical against wall)
function clampAngle(a) { return Math.min(Math.max(a, 0), 40); }

// ── Sliders ──────────────────────────────────────────────────────────────────
let viewOX = 0, viewOY = 0, viewScale = 1;
let dragging = false, lastMX = 0, lastMY = 0;

function resize() {
  const w = canvas.parentElement;
  canvas.width  = w.clientWidth  * devicePixelRatio;
  canvas.height = w.clientHeight * devicePixelRatio;
  canvas.style.width  = w.clientWidth  + 'px';
  canvas.style.height = w.clientHeight + 'px';
  draw();
}

const angleSlider = document.getElementById('angle');
const angleValEl  = document.getElementById('angleVal');

angleSlider.addEventListener('input', () => {
  params.angle = clampAngle(parseFloat(angleSlider.value));
  angleSlider.value = params.angle;
  angleValEl.textContent = params.angle.toFixed(1) + '°';
  draw();
});
angleValEl.textContent = '40°';

const inwardSlider = document.getElementById('inward');
const inwardValEl  = document.getElementById('inwardVal');
inwardSlider.addEventListener('input', () => {
  params.inwardOffset = parseFloat(inwardSlider.value) / 100;
  inwardValEl.textContent = inwardSlider.value + 'cm';
  draw();
});

['togDims','togFold','togQuarter'].forEach((id,i)=>{
  const keys=['showDims','showFold','showQuarter'];
  document.getElementById(id).addEventListener('click',function(){
    params[keys[i]]=!params[keys[i]]; this.classList.toggle('on',params[keys[i]]); draw();
  });
});

canvas.addEventListener('mousedown',e=>{dragging=true;lastMX=e.clientX;lastMY=e.clientY;});
canvas.addEventListener('mousemove',e=>{
  if(!dragging)return;
  viewOX+=(e.clientX-lastMX)*devicePixelRatio; viewOY+=(e.clientY-lastMY)*devicePixelRatio;
  lastMX=e.clientX;lastMY=e.clientY;draw();
});
canvas.addEventListener('mouseup',()=>dragging=false);
canvas.addEventListener('mouseleave',()=>dragging=false);
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  viewScale*=e.deltaY<0?1.1:0.9;
  viewScale=Math.min(Math.max(viewScale,0.15),12);draw();
},{passive:false});


// ── Draw ─────────────────────────────────────────────────────────────────────
function draw() {
  const W=canvas.width, H=canvas.height, dpr=devicePixelRatio;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#0e0f12'; ctx.fillRect(0,0,W,H);

  const g = getGeom();

  const margin = 90*dpr;
  const sceneW = AX_W + T + 0.5, sceneH = CEIL_H * 1.22;
  const autoS  = Math.min((W-margin*2)/sceneW, (H-margin*2)/sceneH);
  const S = autoS * viewScale;
  const OX = margin + viewOX + 44*dpr;
  const OY = H - margin - 44*dpr + viewOY;
  const tx = x => OX + x*S;
  const ty = y => OY - y*S;

  // Room
  const wt=20*dpr, ct=20*dpr;
  ctx.fillStyle='#2d3548';
  ctx.fillRect(tx(0)-wt, ty(CEIL_H)-ct, wt, CEIL_H*S+ct);
  ctx.fillStyle='#252938';
  ctx.fillRect(tx(0)-wt, ty(CEIL_H)-ct, (AX_W+0.6)*S+wt, ct);
  ctx.strokeStyle='#3a4060'; ctx.lineWidth=0.8*dpr;
  for(let i=0;i<14;i++){
    const o=i*13*dpr;
    ctx.beginPath();ctx.moveTo(tx(0)-wt,ty(0)-o);ctx.lineTo(tx(0)-wt-9*dpr,ty(0)-o-9*dpr);ctx.stroke();
    ctx.beginPath();ctx.moveTo(tx(0)+o,ty(CEIL_H)-ct);ctx.lineTo(tx(0)+o+9*dpr,ty(CEIL_H)-ct-9*dpr);ctx.stroke();
  }
  // Floor
  ctx.strokeStyle='#2a2d38'; ctx.lineWidth=1.5*dpr;
  ctx.setLineDash([7*dpr,7*dpr]);
  ctx.beginPath();ctx.moveTo(tx(-0.15),ty(0));ctx.lineTo(tx(AX_W+0.5),ty(0));ctx.stroke();
  ctx.setLineDash([]);
  // Wall ref
  ctx.strokeStyle='#3a406055'; ctx.lineWidth=1*dpr;
  ctx.setLineDash([4*dpr,4*dpr]);
  ctx.beginPath();ctx.moveTo(tx(0),ty(0));ctx.lineTo(tx(0),ty(CEIL_H));ctx.stroke();
  ctx.setLineDash([]);

// ── Main board polygon: Aw→Bw→Bo→Ao ──
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(tx(g.Aw.x),ty(g.Aw.y));
  ctx.lineTo(tx(g.Bw.x),ty(g.Bw.y));
  ctx.lineTo(tx(g.Bo.x),ty(g.Bo.y));
  ctx.lineTo(tx(g.Ao.x),ty(g.Ao.y));
  ctx.closePath();
  ctx.fillStyle='rgba(196,137,74,0.28)'; ctx.fill();
  ctx.strokeStyle='#c4894a'; ctx.lineWidth=1.5*dpr; ctx.stroke();

  // Ghost C extension (dashed)
  ctx.setLineDash([5*dpr,5*dpr]); ctx.lineWidth=1*dpr;
  ctx.strokeStyle='rgba(136,136,160,0.35)';
  ctx.beginPath();ctx.moveTo(tx(g.Bw.x),ty(g.Bw.y));ctx.lineTo(tx(g.Cw.x),ty(g.Cw.y));ctx.stroke();
  ctx.strokeStyle='rgba(136,136,160,0.2)';
  ctx.beginPath();ctx.moveTo(tx(g.Bo.x),ty(g.Bo.y));ctx.lineTo(tx(g.Co.x),ty(g.Co.y));ctx.stroke();
  ctx.setLineDash([]);

  // ── Fold section: rigid rectangle Bw→Dw→Do→Bfo ──
  if(params.showFold){
    ctx.beginPath();
    ctx.moveTo(tx(g.Bw.x), ty(g.Bw.y));
    ctx.lineTo(tx(g.Dw.x), ty(g.Dw.y));
    ctx.lineTo(tx(g.Do.x), ty(g.Do.y));
    ctx.lineTo(tx(g.Bfo.x),ty(g.Bfo.y));
    ctx.closePath();
    ctx.fillStyle='rgba(122,184,232,0.22)'; ctx.fill();
    ctx.strokeStyle='#7ab8e8'; ctx.lineWidth=1.5*dpr; ctx.stroke();
  }

  // Center line (dashed, main board only)
  ctx.strokeStyle='rgba(136,136,160,0.22)'; ctx.lineWidth=1*dpr;
  ctx.setLineDash([4*dpr,4*dpr]);
  ctx.beginPath();ctx.moveTo(tx(g.Ac.x),ty(g.Ac.y));ctx.lineTo(tx(g.Bc.x),ty(g.Bc.y));ctx.stroke();
  ctx.setLineDash([]);

  // ── H→G dashed distance ──
  if(params.showQuarter){
    ctx.strokeStyle=GRAY_DASH+'66'; ctx.lineWidth=1.5*dpr;
    ctx.setLineDash([6*dpr,5*dpr]);
    ctx.beginPath();ctx.moveTo(tx(HX),ty(HY));ctx.lineTo(tx(g.GX),ty(g.GY));ctx.stroke();
    // ── H→M and M→G rigid bars (solid lines) ──
    ctx.strokeStyle = '#90d8c0';
    ctx.lineWidth = 2.5 * dpr;
    ctx.setLineDash([]);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(tx(HX),    ty(HY));
    ctx.lineTo(tx(g.MX),  ty(g.MY));
    ctx.lineTo(tx(g.GX),  ty(g.GY));
    ctx.stroke();

    // Length labels on H-M and M-G
    {
      const lfs = FS.dim * dpr;
      ctx.font = `${lfs}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      const rigLbl = (LEN_HM_RIG * 100).toFixed(0) + 'cm';
      // H-M midpoint
      const hm_mx = tx((HX + g.MX) / 2), hm_my = ty((HY + g.MY) / 2);
      const tw_hm = ctx.measureText(rigLbl).width + 8 * dpr;
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(hm_mx - tw_hm/2, hm_my - lfs*0.85, tw_hm, lfs*1.3);
      ctx.fillStyle = '#90d8c0'; ctx.fillText(rigLbl, hm_mx, hm_my + lfs*0.35);
      // M-G midpoint
      const mg_mx = tx((g.MX + g.GX) / 2), mg_my = ty((g.MY + g.GY) / 2);
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
    ctx.fillStyle='#0e0f12'; ctx.fillRect(tx(mx)-tw/2,ty(my)-fs*0.85,tw,fs*1.3);
    ctx.fillStyle=GRAY_DASH; ctx.fillText(lbl,tx(mx),ty(my)+fs*0.35);

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
    dashedDistLine(tx(g.MX),ty(g.MY), tx(g.Aw.x),ty(g.Aw.y),
                   (g.MA*100).toFixed(0)+'cm', GRAY_DASH);
    dashedDistLine(tx(g.MX),ty(g.MY), tx(g.quarters[0].x),ty(g.quarters[0].y),
                   (g.ME*100).toFixed(0)+'cm', GRAY_DASH);
  }

  // ── Anchor points H, I ──
  drawDiamond(tx(HX),ty(HY),'#7ae8b0','H',dpr);
  drawDiamond(tx(REF_IX),ty(REF_IY),'#e8a87a','I',dpr);

  // ── Quarter points E F G ──
  if(params.showQuarter){
    g.quarters.forEach(q=>drawQuarterPt(tx(q.x),ty(q.y),q.label,dpr));
    drawMidPt(tx(g.MX),ty(g.MY),'M',dpr);
  }

  // ── Key points A B C D ──
  drawKeyPt(tx(g.Aw.x),ty(g.Aw.y), '#e8c87a','A', 16,-16,dpr);
  drawKeyPt(tx(g.Bw.x),ty(g.Bw.y), '#7ab8e8','B', 16,  4,dpr);
  drawKeyPt(tx(g.Cw.x),ty(g.Cw.y), '#e87a7a','C', 16,  4,dpr);
  if(params.showFold)
    drawKeyPt(tx(g.Dw.x),ty(g.Dw.y),'#b07ae8','D', 16,  4,dpr);

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
    ctx.beginPath();ctx.moveTo(tx(g.Aw.x),ty(g.Aw.y));ctx.lineTo(tx(g.Aw.x),ty(0));ctx.stroke();
    ctx.beginPath();ctx.moveTo(tx(g.Bw.x),ty(g.Bw.y));ctx.lineTo(tx(g.Bw.x),ty(0));ctx.stroke();
    ctx.beginPath();ctx.moveTo(tx(0),ty(g.Bw.y));ctx.lineTo(tx(g.Bw.x),ty(g.Bw.y));ctx.stroke();
    ctx.setLineDash([]);

    // ── H→B dashed distance ──
    {
      const HB = Math.hypot(g.Bw.x - HX, g.Bw.y - HY);
      ctx.strokeStyle = GRAY_DASH + '88'; ctx.lineWidth = 1.2*dpr;
      ctx.setLineDash([5*dpr, 4*dpr]);
      ctx.beginPath(); ctx.moveTo(tx(HX), ty(HY)); ctx.lineTo(tx(g.Bw.x), ty(g.Bw.y)); ctx.stroke();
      ctx.setLineDash([]);
      const hb_mx = (tx(HX)+tx(g.Bw.x))/2, hb_my = (ty(HY)+ty(g.Bw.y))/2;
      const hbLbl = (HB*100).toFixed(0)+'cm';
      const hb_tw = ctx.measureText(hbLbl).width + 8*dpr;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(hb_mx - hb_tw/2, hb_my - fs*0.85, hb_tw, fs*1.3);
      ctx.fillStyle = GRAY_DASH; ctx.fillText(hbLbl, hb_mx, hb_my + fs*0.35);
    }

    // ── A→B 段對地面投影 & B 對牆面投影高度 ──
    dim(tx(g.Bw.x),ty(0), tx(g.Aw.x),ty(0), ((g.Aw.x-g.Bw.x)*100).toFixed(0)+'cm','#c4894a', o, true);
    dim(tx(0),ty(0), tx(0),ty(g.Bw.y), (g.Bw.y*100).toFixed(0)+'cm','#7ab8e8',-o*2, false);

    dim(tx(0),ty(0), tx(0),ty(CEIL_H), CEIL_H.toFixed(2)+'m','#7ab8e8',-o,false);
    dim(tx(0),ty(CEIL_H+0.1), tx(g.Aw.x),ty(CEIL_H+0.1), g.Aw.x.toFixed(3)+'m','#e8c87a',-o,true);
    if(g.Cw.y>0.002)
      dim(tx(g.Cw.x-0.1),ty(0), tx(g.Cw.x-0.1),ty(g.Cw.y), (g.Cw.y*100).toFixed(0)+'cm','#e87a7a',-o*0.75,false);

    // ── 地面外側端往內縮 → 主板外側面投影高度 ──
    if (g.projOnBoardY !== null) {
      const rx = g.refFloorX, py = g.projOnBoardY;
      ctx.font = `${fs}px 'JetBrains Mono', monospace`;

      // 地面內縮距離標示（水平 dim 線，位於地面下方）
      dim(tx(rx), ty(0), tx(g.Ao.x), ty(0),
          (params.inwardOffset * 100).toFixed(0) + 'cm', GRAY_DASH, 26*dpr, true);

      // 垂直虛線：地面參考點 → 主板外側面交點
      ctx.strokeStyle = GRAY_DASH + '88'; ctx.lineWidth = 1.2*dpr;
      ctx.setLineDash([4*dpr, 4*dpr]);
      ctx.beginPath(); ctx.moveTo(tx(rx), ty(0)); ctx.lineTo(tx(rx), ty(py)); ctx.stroke();
      ctx.setLineDash([]);

      // 交點標記
      ctx.fillStyle = GRAY_DASH;
      ctx.beginPath(); ctx.arc(tx(rx), ty(py), 4*dpr, 0, Math.PI*2); ctx.fill();

      // 高度標籤（置中於垂直線，顯示在線右側）
      const heightLbl = (py * 100).toFixed(0) + 'cm';
      const vlMidY = (ty(0) + ty(py)) / 2;
      const tw2 = ctx.measureText(heightLbl).width + 8*dpr;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(tx(rx) + 4*dpr, vlMidY - fs*0.85, tw2, fs*1.3);
      ctx.fillStyle = GRAY_DASH; ctx.fillText(heightLbl, tx(rx) + 8*dpr, vlMidY + fs*0.35);
    }

    // Angle arc at A
    const arcR=44*dpr, wallDown=-Math.PI/2, bDir=g.boardDir;
    ctx.strokeStyle='#e8c87a88'; ctx.lineWidth=1.5*dpr; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(tx(g.Aw.x),ty(g.Aw.y),arcR,Math.min(wallDown,bDir),Math.max(wallDown,bDir));
    ctx.stroke();
    const midA=(wallDown+bDir)/2;
    ctx.font=`${fs}px 'JetBrains Mono', monospace`;
    ctx.fillStyle='#e8c87a'; ctx.textAlign='center';
    ctx.fillText(params.angle+'°',
      tx(g.Aw.x)+Math.cos(midA)*(arcR+16*dpr),
      ty(g.Aw.y)+Math.sin(midA)*(arcR+16*dpr));

    // Thickness annotation at B
    ctx.strokeStyle=GRAY_DASH+'44'; ctx.lineWidth=1*dpr;
    ctx.beginPath();ctx.moveTo(tx(g.Bw.x),ty(g.Bw.y));ctx.lineTo(tx(g.Bo.x),ty(g.Bo.y));ctx.stroke();
    const tmx=(tx(g.Bw.x)+tx(g.Bo.x))/2, tmy=(ty(g.Bw.y)+ty(g.Bo.y))/2;
    ctx.font=`${(FS.dim-1)*dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle=GRAY_DASH+'88'; ctx.textAlign='left';
    ctx.fillText('5cm', tmx+8*dpr, tmy+4*dpr);
  }

  // Room labels
  ctx.font=`${FS.room*dpr}px 'JetBrains Mono', monospace`;
  ctx.fillStyle='#5a5d6e'; ctx.textAlign='left';
  ctx.fillText('牆面',  tx(0)-wt-4*dpr, ty(CEIL_H*0.5));
  ctx.fillText('天花板',tx(0.04),        ty(CEIL_H+0.08));
  ctx.fillText('地面',  tx(0.04),        ty(-0.04)+14*dpr);

  ctx.font=`${FS.seg*dpr}px 'JetBrains Mono', monospace`;
  ctx.textAlign='center';
  ctx.fillStyle='#c4894a99';
  ctx.fillText('A→B '+MAIN_LEN.toFixed(2)+'m',
    tx((g.Ac.x+g.Bc.x)/2)+20*dpr, ty((g.Ac.y+g.Bc.y)/2)-8*dpr);
  if(params.showFold){
    ctx.fillStyle='#7ab8e899';
    ctx.fillText('B→D '+FOLD_LEN+'m',
      tx((g.Bw.x+g.Dw.x)/2)+20*dpr, ty((g.Bw.y+g.Dw.y)/2)-8*dpr);
  }
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

window.addEventListener('resize',resize);
resize();
