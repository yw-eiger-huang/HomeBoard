import { canvas, params, view } from './state.js';
import { clampAngle } from './geometry.js';
import { draw } from './draw.js';
// cache-bust: v2

// ── Resize ────────────────────────────────────────────────────────────────────
export function resize() {
  const w = canvas.parentElement;
  canvas.width  = w.clientWidth  * devicePixelRatio;
  canvas.height = w.clientHeight * devicePixelRatio;
  canvas.style.width  = w.clientWidth  + 'px';
  canvas.style.height = w.clientHeight + 'px';
  draw();
}

// ── Sliders ───────────────────────────────────────────────────────────────────
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

const gOffsetSlider = document.getElementById('gOffset');
const gOffsetValEl  = document.getElementById('gOffsetVal');
gOffsetSlider.addEventListener('input', () => {
  params.gOffset = parseFloat(gOffsetSlider.value) / 100;
  gOffsetValEl.textContent = gOffsetSlider.value + 'cm';
  draw();
});

const hViewSlider = document.getElementById('hViewAngle');
const hViewValEl  = document.getElementById('hViewAngleVal');
hViewSlider.addEventListener('input', () => {
  params.hViewAngle = parseFloat(hViewSlider.value);
  hViewValEl.textContent = params.hViewAngle.toFixed(0) + '°';
  draw();
});

const borderMarkWidthSlider = document.getElementById('borderMarkWidth');
const borderMarkWidthValEl  = document.getElementById('borderMarkWidthVal');
borderMarkWidthSlider.addEventListener('input', () => {
  params.borderMarkWidth = parseFloat(borderMarkWidthSlider.value) / 100;
  borderMarkWidthValEl.textContent = parseFloat(borderMarkWidthSlider.value).toFixed(1) + 'cm';
  draw();
});

const borderMarkJunctionWidthSlider = document.getElementById('borderMarkJunctionWidth');
const borderMarkJunctionWidthValEl  = document.getElementById('borderMarkJunctionWidthVal');
borderMarkJunctionWidthSlider.addEventListener('input', () => {
  params.borderMarkJunctionWidth = parseFloat(borderMarkJunctionWidthSlider.value) / 100;
  borderMarkJunctionWidthValEl.textContent = parseFloat(borderMarkJunctionWidthSlider.value).toFixed(1) + 'cm';
  draw();
});

let savedHViewAngle = params.hViewAngle;

function setHViewAngle(deg) {
  params.hViewAngle = deg;
  hViewSlider.value = deg;
  hViewValEl.textContent = deg.toFixed(0) + '°';
}

// ── Toggle buttons ────────────────────────────────────────────────────────────
['tog3D','togDims','togFold','togQuarter','togScrewHoles','togBorderMark'].forEach((id,i)=>{
  const keys=['show3D','showDims','showFold','showQuarter','showScrewHoles','showBorderMark'];
  document.getElementById(id).addEventListener('click',function(){
    params[keys[i]]=!params[keys[i]]; this.classList.toggle('on',params[keys[i]]);
    // hide/show hViewAngle row when toggling 3D; save/restore angle
    if(id==='tog3D'){
      document.getElementById('hViewAngle').closest('.param-row').style.display = params.show3D ? '' : 'none';
      if(!params.show3D){ savedHViewAngle = params.hViewAngle; setHViewAngle(0); }
      else               { setHViewAngle(savedHViewAngle); }
    }
    if(id==='togBorderMark'){
      const show = params.showBorderMark;
      document.getElementById('borderMarkWidthRow').style.display         = show ? '' : 'none';
      document.getElementById('borderMarkJunctionWidthRow').style.display = show ? '' : 'none';
    }
    draw();
  });
});

// ── Canvas pan/zoom ───────────────────────────────────────────────────────────
canvas.addEventListener('mousedown',e=>{view.dragging=true;view.lastMX=e.clientX;view.lastMY=e.clientY;});
canvas.addEventListener('mousemove',e=>{
  if(!view.dragging)return;
  view.OX+=(e.clientX-view.lastMX)*devicePixelRatio; view.OY+=(e.clientY-view.lastMY)*devicePixelRatio;
  view.lastMX=e.clientX;view.lastMY=e.clientY;draw();
});
canvas.addEventListener('mouseup',()=>view.dragging=false);
canvas.addEventListener('mouseleave',()=>view.dragging=false);
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  view.scale*=e.deltaY<0?1.1:0.9;
  view.scale=Math.min(Math.max(view.scale,0.15),12);draw();
},{passive:false});

// ── Touch (pan + pinch-zoom) ─────────────────────────────────────────────────
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(e.touches.length===1){
    view.dragging=true; view.lastMX=e.touches[0].clientX; view.lastMY=e.touches[0].clientY;
  } else if(e.touches.length===2){
    view.dragging=false;
    view.lastTouchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
                                  e.touches[0].clientY-e.touches[1].clientY);
  }
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  if(e.touches.length===1&&view.dragging){
    view.OX+=(e.touches[0].clientX-view.lastMX)*devicePixelRatio;
    view.OY+=(e.touches[0].clientY-view.lastMY)*devicePixelRatio;
    view.lastMX=e.touches[0].clientX; view.lastMY=e.touches[0].clientY; draw();
  } else if(e.touches.length===2){
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
                       e.touches[0].clientY-e.touches[1].clientY);
    if(view.lastTouchDist){view.scale*=d/view.lastTouchDist;view.scale=Math.min(Math.max(view.scale,0.15),12);draw();}
    view.lastTouchDist=d;
  }
},{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  if(e.touches.length===0){view.dragging=false;view.lastTouchDist=null;}
  else if(e.touches.length===1){view.lastTouchDist=null;view.lastMX=e.touches[0].clientX;view.lastMY=e.touches[0].clientY;}
},{passive:false});

// ── Window resize ─────────────────────────────────────────────────────────────
window.addEventListener('resize', resize);
