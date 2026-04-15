export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');

export const params = {
  angle: 40, inwardOffset: 1.0, gOffset: 1.80,
  hViewAngle: 0, show3D: true, showDims: true,
  showFold: true, showQuarter: true, showScrewHoles: true,
  showBorderMark: true, borderMarkWidth: 0.05, borderMarkJunctionWidth: 0.03
};
// gOffset range: 1.75 ~ 2.15 m

// View/interaction state — grouped as an object so mutations are visible across modules
export const view = {
  OX: 0, OY: 0, scale: 1,
  dragging: false, lastMX: 0, lastMY: 0, lastTouchDist: null
};
