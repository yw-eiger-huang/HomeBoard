export const BOARD_LEN = 3.048, FOLD_LEN = 0.65, MAIN_LEN = BOARD_LEN - FOLD_LEN;
export const CEIL_H = 2.5, T = 0.05, HT = T / 2;
export const BOARD_W = 3.66; // 板寬（Z 軸深度，公尺）
export const HOLE_R_M = 0.006; // 圓孔半徑 0.6 cm（直徑 1.2 cm）
export const SCREW_Z = Array.from({length:17},(_,i)=>0.23+i*0.20); // 17 列 z 位置
export const SCREW_U = Array.from({length:15},(_,i)=>0.10+i*0.20); // 15 行，距 D 端（m）
export const CELL_Z  = Array.from({length:16},(_,i)=>0.33+i*0.20); // 16 格心 z 位置
export const CELL_U  = Array.from({length:14},(_,i)=>0.20+i*0.20); // 14 格心行，距 D 端（m）
export const LABEL_RED = '#ff4d4d';
export const GRAY_DASH = '#8888a0';
export const FS = { label: 15, dim: 13, room: 12, seg: 12 };

// A wall-side edge fixed: bottom of wall-side edge touches wall at 40°
export const AX_W = BOARD_LEN * Math.sin(40 * Math.PI / 180); // 1.9593
export const AY   = CEIL_H; // 2.5

// Fixed reference points
export const HX = 0, HY = CEIL_H;
export const REF_IX = 0, REF_IY = AY - BOARD_LEN * Math.cos(40 * Math.PI / 180);
