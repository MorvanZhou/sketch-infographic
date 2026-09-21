/**
 * hand-sketch — 零依赖手绘信息图渲染库（Node ESM，只用标准库，直接输出 SVG 字符串）
 *
 * 设计要点：
 * 1. 所有图形先转成折线（polyline），再用带随机抖动的两遍笔触重绘，得到手绘感；
 *    随机数由 seed 决定，因此同样的输入永远得到同样的图，适合进 Git 做 diff。
 * 2. 文字直接用 SVG <text>/<tspan>，按字符宽度估算做自动换行，不依赖浏览器排版。
 * 3. 填充样式对齐 rough.js（hachure / cross-hatch / zigzag / dots / solid 等），
 *    另提供 path / polygon / arc，不引入 rough.js / canvas 等任何依赖。
 */

import { LUCIDE_ICONS, LUCIDE_VERSION } from './lucide-icons.mjs';

/* ------------------------------------------------------------------ 调色板 */

export const INK = '#3A342D';
export const RED = '#C0483C';
export const BLUE = '#3D6EA5';
export const GREEN = '#43795A';
export const VIOLET = '#6A5AA8';
export const GRAY = '#7E766A';
export const YELLOW = '#F0D48A';
export const PAPER = '#FFFDF8';

/**
 * 字体栈：手写风优先，逐级回落到各平台常见字体，最后回到系统无衬线。
 * 覆盖 macOS / Windows / Linux，缺字体时图仍然可读，只是少了手写味道。
 */
export const FONT_HAND = [
  "'Hanzipen SC'", "'HanziPen SC'", "'Hannotate SC'", "'Xingkai SC'", // macOS 中文手写
  "'LXGW WenKai'", "'LXGW WenKai Screen'", "'Zhi Mang Xing'", // 开源中文手写
  "'Kaiti SC'", "'STKaiti'", "'KaiTi'", "'Kaiti TC'", // 楷体回落
  "'Bradley Hand'", "'Segoe Print'", "'Comic Sans MS'", // 西文手写
  "'PingFang SC'", "'Microsoft YaHei'", "'Noto Sans CJK SC'", 'sans-serif',
].join(',');

/** 需要更正式的观感时用这一套 */
export const FONT_SANS = [
  "'PingFang SC'", "'Microsoft YaHei'", "'Noto Sans CJK SC'",
  "'Helvetica Neue'", 'Helvetica', 'Arial', 'sans-serif',
].join(',');

/** 默认字体，保持向后兼容的导出名 */
export const FONT = FONT_HAND;
export const DEFAULT_CANVAS_WIDTH = 1200;
export const DEFAULT_CANVAS_HEIGHT = 675;
export { LUCIDE_VERSION };

const LEGACY_ICON_ALIASES = Object.freeze({
  person: 'user',
  gear: 'settings',
  cursor: 'mouse-pointer-2',
  bulb: 'lightbulb',
  magnifier: 'search',
  checklist: 'list-checks',
  undo: 'undo-2',
  cross: 'x',
});

/* ------------------------------------------------------------------ 工具 */

/** 固定种子的伪随机数（mulberry32），保证每次渲染结果一致 */
function makeRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** 解析 svgGlyph / 自定义图标的 viewBox：数字、字符串或 [minX, minY, w, h] */
function normalizeViewBox(viewBox) {
  if (viewBox == null) return [0, 0, 24, 24];
  if (typeof viewBox === 'number') {
    if (!(viewBox > 0)) throw new Error(`无效 viewBox: ${viewBox}`);
    return [0, 0, viewBox, viewBox];
  }
  if (typeof viewBox === 'string') {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) return parts;
    throw new Error(`无效 viewBox: ${viewBox}`);
  }
  if (Array.isArray(viewBox) && viewBox.length === 4 && viewBox.every((n) => Number.isFinite(Number(n)))) {
    return viewBox.map(Number);
  }
  throw new Error('viewBox 应为数字、"minX minY w h" 或 [minX, minY, w, h]');
}

const round = (n) => Math.round(n * 100) / 100;

/** 估算字符宽度：中文/全角按 1em，其余按 0.55em，够用来做标签换行 */
function charWidth(ch, size) {
  return /[\u2e80-\u9fff\uff00-\uffef\u3000-\u303f]/.test(ch) ? size : size * 0.55;
}

function lineWidth(line, size) {
  let w = 0;
  for (const ch of line) w += charWidth(ch, size);
  return w;
}

function wrapText(text, size, maxWidth) {
  const out = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    let width = 0;
    for (const ch of paragraph) {
      const w = charWidth(ch, size);
      if (maxWidth && width + w > maxWidth && line) {
        out.push(line);
        line = ch;
        width = w;
      } else {
        line += ch;
        width += w;
      }
    }
    out.push(line);
  }
  return out;
}

/* ------------------------------------------------- 手绘笔触（核心算法） */

/**
 * 把一段折线画成手绘笔触：在端点加随机偏移，中间用二次贝塞尔轻微鼓起，
 * 再重复描一遍（两遍笔触是手绘感最主要的来源）。
 */
function sketchPolyline(points, opts, rand) {
  const { roughness = 1.3, bowing = 1.1, passes = 2, closed = false } = opts;
  const pts = closed ? [...points, points[0]] : points;
  const paths = [];

  for (let pass = 0; pass < passes; pass += 1) {
    const seg = [];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      // 偏移量随线段长度增长但有上限，短线不至于抖成毛球
      const off = Math.min(len / 12, 3.2) * roughness;
      const jitter = () => (rand() - 0.5) * 2 * off;
      const sx = x1 + jitter();
      const sy = y1 + jitter();
      const ex = x2 + jitter();
      const ey = y2 + jitter();
      // 控制点沿法线方向偏，制造“手抖鼓起”的弧度
      const nx = -(y2 - y1) / len;
      const ny = (x2 - x1) / len;
      const bow = (rand() - 0.5) * bowing * Math.min(len / 10, 4);
      const cx = (sx + ex) / 2 + nx * bow;
      const cy = (sy + ey) / 2 + ny * bow;
      seg.push(i === 0 ? `M${round(sx)},${round(sy)}` : `L${round(sx)},${round(sy)}`);
      seg.push(`Q${round(cx)},${round(cy)} ${round(ex)},${round(ey)}`);
    }
    paths.push(seg.join(' '));
  }
  return paths;
}

/* ------------------------------------------------- 形状 → 折线 */

function rectPoints(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

function roundRectPoints(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  if (!rr) return rectPoints(x, y, w, h);
  const pts = [];
  const corners = [
    [x + w - rr, y + rr, -90, 0],
    [x + w - rr, y + h - rr, 0, 90],
    [x + rr, y + h - rr, 90, 180],
    [x + rr, y + rr, 180, 270],
  ];
  for (const [cx, cy, a0, a1] of corners) {
    for (let i = 0; i <= 6; i += 1) {
      const a = ((a0 + ((a1 - a0) * i) / 6) * Math.PI) / 180;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  }
  return pts;
}

function ellipsePoints(cx, cy, rx, ry, steps = 28) {
  const pts = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (Math.PI * 2 * i) / steps;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

/** 椭圆弧采样：角度为度，可跨过 0°；closed 时首尾相接成扇形轮廓（不含圆心） */
function arcPoints(cx, cy, rx, ry, startDeg, stopDeg, steps = 24) {
  let sweep = stopDeg - startDeg;
  while (sweep <= 0) sweep += 360;
  while (sweep > 360) sweep -= 360;
  const n = Math.max(2, Math.ceil((steps * sweep) / 360));
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const a = ((startDeg + (sweep * i) / n) * Math.PI) / 180;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

function pointInPoly(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * 斜线填充：把图形旋转到水平方向做扫描线求交，再把交点旋转回去。
 * 旋转法比直接解析求交简单得多，也天然支持圆角、椭圆等采样出来的多边形。
 */
function hachureLines(points, gap, angleDeg) {
  const a = (-angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const rot = ([x, y]) => [x * cos - y * sin, x * sin + y * cos];
  const back = ([x, y]) => [x * cos + y * sin, -x * sin + y * cos];

  const rp = points.map(rot);
  const ys = rp.map((p) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const lines = [];

  for (let y = minY + gap / 2; y < maxY; y += gap) {
    const hits = [];
    for (let i = 0; i < rp.length; i += 1) {
      const [x1, y1] = rp[i];
      const [x2, y2] = rp[(i + 1) % rp.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        hits.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    hits.sort((p, q) => p - q);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      if (hits[i + 1] - hits[i] < 2) continue;
      lines.push([back([hits[i], y]), back([hits[i + 1], y])]);
    }
  }
  return lines;
}

/** 把一条扫描线变成锯齿折线（zigzag / zigzag-line） */
function zigzagAlong(p1, p2, zig, ampScale = 0.45) {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const n = Math.max(2, Math.round(len / Math.max(zig, 2)));
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const amp = zig * ampScale;
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const s = i === 0 || i === n ? 0 : (i % 2 === 0 ? 1 : -1);
    pts.push([x1 + (x2 - x1) * t + nx * amp * s, y1 + (y2 - y1) * t + ny * amp * s]);
  }
  return pts;
}

/**
 * 解析 SVG path 的 d 字符串为折线轮廓。
 * 支持 M/L/H/V/Q/C/S/T/Z（绝对+相对）；A 按椭圆弧中心参数化近似。
 */
function parsePath(d) {
  const tokens = String(d).match(/[a-zA-Z]|[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/g) || [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let lastCx = 0;
  let lastCy = 0;
  let lastWasCurve = false;
  const contours = [];
  let current = [];

  const num = () => {
    if (i >= tokens.length) return 0;
    return Number(tokens[i++]);
  };
  const push = (x, y) => { current.push([x, y]); cx = x; cy = y; };
  const sampleQuad = (x0, y0, x1, y1, x2, y2, steps = 8) => {
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      const mt = 1 - t;
      push(mt * mt * x0 + 2 * mt * t * x1 + t * t * x2, mt * mt * y0 + 2 * mt * t * y1 + t * t * y2);
    }
  };
  const sampleCubic = (x0, y0, x1, y1, x2, y2, x3, y3, steps = 10) => {
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      const mt = 1 - t;
      push(
        mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
        mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3,
      );
    }
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i += 1;
    } else if (!cmd) {
      i += 1;
      continue;
    }

    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    if (C === 'M') {
      if (current.length > 1) contours.push({ points: current, closed: false });
      const x = (rel ? cx : 0) + num();
      const y = (rel ? cy : 0) + num();
      current = [[x, y]];
      cx = x; cy = y; startX = x; startY = y;
      lastWasCurve = false;
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      push((rel ? cx : 0) + num(), (rel ? cy : 0) + num());
      lastWasCurve = false;
    } else if (C === 'H') {
      push((rel ? cx : 0) + num(), cy);
      lastWasCurve = false;
    } else if (C === 'V') {
      push(cx, (rel ? cy : 0) + num());
      lastWasCurve = false;
    } else if (C === 'Z') {
      if (current.length) {
        if (cx !== startX || cy !== startY) current.push([startX, startY]);
        contours.push({ points: current, closed: true });
      }
      current = [];
      cx = startX; cy = startY;
      lastWasCurve = false;
    } else if (C === 'Q') {
      const x0 = cx; const y0 = cy;
      const x1 = (rel ? cx : 0) + num();
      const y1 = (rel ? cy : 0) + num();
      const x2 = (rel ? cx : 0) + num();
      const y2 = (rel ? cy : 0) + num();
      sampleQuad(x0, y0, x1, y1, x2, y2);
      lastCx = x1; lastCy = y1; lastWasCurve = true;
    } else if (C === 'T') {
      const x0 = cx; const y0 = cy;
      const x1 = lastWasCurve ? 2 * cx - lastCx : cx;
      const y1 = lastWasCurve ? 2 * cy - lastCy : cy;
      const x2 = (rel ? cx : 0) + num();
      const y2 = (rel ? cy : 0) + num();
      sampleQuad(x0, y0, x1, y1, x2, y2);
      lastCx = x1; lastCy = y1; lastWasCurve = true;
    } else if (C === 'C') {
      const x0 = cx; const y0 = cy;
      const x1 = (rel ? cx : 0) + num();
      const y1 = (rel ? cy : 0) + num();
      const x2 = (rel ? cx : 0) + num();
      const y2 = (rel ? cy : 0) + num();
      const x3 = (rel ? cx : 0) + num();
      const y3 = (rel ? cy : 0) + num();
      sampleCubic(x0, y0, x1, y1, x2, y2, x3, y3);
      lastCx = x2; lastCy = y2; lastWasCurve = true;
    } else if (C === 'S') {
      const x0 = cx; const y0 = cy;
      const x1 = lastWasCurve ? 2 * cx - lastCx : cx;
      const y1 = lastWasCurve ? 2 * cy - lastCy : cy;
      const x2 = (rel ? cx : 0) + num();
      const y2 = (rel ? cy : 0) + num();
      const x3 = (rel ? cx : 0) + num();
      const y3 = (rel ? cy : 0) + num();
      sampleCubic(x0, y0, x1, y1, x2, y2, x3, y3);
      lastCx = x2; lastCy = y2; lastWasCurve = true;
    } else if (C === 'A') {
      const rx0 = Math.abs(num());
      const ry0 = Math.abs(num());
      const phi = (num() * Math.PI) / 180;
      const large = num();
      const sweep = num();
      const x2 = (rel ? cx : 0) + num();
      const y2 = (rel ? cy : 0) + num();
      const x1 = cx; const y1 = cy;
      // SVG 椭圆弧 → 中心参数化（W3C 实现笔记）
      let rx = rx0 || 1e-6;
      let ry = ry0 || 1e-6;
      const cosφ = Math.cos(phi);
      const sinφ = Math.sin(phi);
      const dx = (x1 - x2) / 2;
      const dy = (y1 - y2) / 2;
      let x1p = cosφ * dx + sinφ * dy;
      let y1p = -sinφ * dx + cosφ * dy;
      let lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
      const sq = Math.max(0, (rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p)
        / (rx * rx * y1p * y1p + ry * ry * x1p * x1p));
      const coef = (large === sweep ? -1 : 1) * Math.sqrt(sq);
      const cxp = coef * (rx * y1p) / ry;
      const cyp = coef * -(ry * x1p) / rx;
      const acx = cosφ * cxp - sinφ * cyp + (x1 + x2) / 2;
      const acy = sinφ * cxp + cosφ * cyp + (y1 + y2) / 2;
      const ang = (ux, uy, vx, vy) => {
        const n = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1;
        let a = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / n)));
        if (ux * vy - uy * vx < 0) a = -a;
        return a;
      };
      const θ1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dθ = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!sweep && dθ > 0) dθ -= Math.PI * 2;
      if (sweep && dθ < 0) dθ += Math.PI * 2;
      const steps = Math.max(2, Math.ceil(Math.abs(dθ) / (Math.PI / 12)));
      for (let s = 1; s <= steps; s += 1) {
        const θ = θ1 + (dθ * s) / steps;
        const x = acx + rx * Math.cos(θ) * cosφ - ry * Math.sin(θ) * sinφ;
        const y = acy + rx * Math.cos(θ) * sinφ + ry * Math.sin(θ) * cosφ;
        push(x, y);
      }
      lastWasCurve = false;
    } else {
      i += 1;
    }
  }
  if (current.length > 1) contours.push({ points: current, closed: false });
  return contours;
}

/* ------------------------------------------------- 连线几何（复杂图稳定用） */

/** 矩形描述；第五个参数可传 id 字符串或 lint 元数据 */
export function R(x, y, w, h, meta = {}) {
  return {
    x, y, w, h,
    ...(typeof meta === 'string' ? { id: meta } : meta),
  };
}

/** 两个矩形是否相交；gap > 0 时同时检查最小安全间距 */
export function boxesOverlap(a, b, gap = 0) {
  return !(
    a.x + a.w + gap <= b.x
    || b.x + b.w + gap <= a.x
    || a.y + a.h + gap <= b.y
    || b.y + b.h + gap <= a.y
  );
}

/**
 * 在渲染前检查一组同级节点是否重叠。
 * 支持 `[name, box]` 或直接传 box；发现碰撞立即抛错，避免靠肉眼兜底。
 */
export function assertNoOverlap(items, gap = 0) {
  const normalized = items.map((item, i) => (
    Array.isArray(item) ? { name: item[0], box: item[1] } : { name: `#${i + 1}`, box: item }
  ));
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const a = normalized[i];
      const b = normalized[j];
      if (boxesOverlap(a.box, b.box, gap)) {
        throw new Error(`布局重叠: ${a.name} ↔ ${b.name}（要求间距 ${gap}px）`);
      }
    }
  }
}

const GEOM_EPS = 1e-6;

function pointInRect([x, y], r, inset = 0) {
  return x > r.x + inset && x < r.x + r.w - inset
    && y > r.y + inset && y < r.y + r.h - inset;
}

function cross2(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

/** 返回 cross / touch / overlap；无交点返回 null */
function segmentIntersection(a, b, c, d) {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const den = cross2(rx, ry, sx, sy);
  const qpx = c[0] - a[0];
  const qpy = c[1] - a[1];

  if (Math.abs(den) < GEOM_EPS) {
    if (Math.abs(cross2(qpx, qpy, rx, ry)) >= GEOM_EPS) return null;
    const axis = Math.abs(rx) >= Math.abs(ry) ? 0 : 1;
    const a0 = Math.min(a[axis], b[axis]);
    const a1 = Math.max(a[axis], b[axis]);
    const b0 = Math.min(c[axis], d[axis]);
    const b1 = Math.max(c[axis], d[axis]);
    const lo = Math.max(a0, b0);
    const hi = Math.min(a1, b1);
    if (hi - lo <= 2) return null;
    return { type: 'overlap', at: [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4] };
  }

  const t = cross2(qpx, qpy, sx, sy) / den;
  const u = cross2(qpx, qpy, rx, ry) / den;
  if (t < -GEOM_EPS || t > 1 + GEOM_EPS || u < -GEOM_EPS || u > 1 + GEOM_EPS) return null;
  const endpoint = t < GEOM_EPS || t > 1 - GEOM_EPS || u < GEOM_EPS || u > 1 - GEOM_EPS;
  return {
    type: endpoint ? 'touch' : 'cross',
    at: [a[0] + t * rx, a[1] + t * ry],
  };
}

function segmentHitsRect(a, b, rect, inset = 2) {
  const r = {
    x: rect.x + inset,
    y: rect.y + inset,
    w: Math.max(0, rect.w - inset * 2),
    h: Math.max(0, rect.h - inset * 2),
  };
  if (pointInRect(a, r) || pointInRect(b, r)) return true;
  const corners = [
    [r.x, r.y], [r.x + r.w, r.y],
    [r.x + r.w, r.y + r.h], [r.x, r.y + r.h],
  ];
  for (let i = 0; i < 4; i += 1) {
    if (segmentIntersection(a, b, corners[i], corners[(i + 1) % 4])) return true;
  }
  return false;
}

function normSide(side) {
  if (side === 'top' || side === 'north') return 'n';
  if (side === 'bottom' || side === 'south') return 's';
  if (side === 'left' || side === 'west') return 'w';
  if (side === 'right' || side === 'east') return 'e';
  return side;
}

/**
 * 取矩形某边中点外侧的端口坐标，避免箭头扎进框心。
 * side: n / s / e / w（或 top/bottom/left/right）
 */
export function portOf(box, side, gap = 6) {
  const { x, y, w, h } = box;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (normSide(side)) {
    case 'n': return [cx, y - gap];
    case 's': return [cx, y + h + gap];
    case 'w': return [x - gap, cy];
    case 'e': return [x + w + gap, cy];
    default: return [cx, cy];
  }
}

/**
 * 折线标签锚点：按路径弧长取几何中点（不要用顶点下标中点——两点直线会落到终点）。
 * 返回 { x, y, horizontal }，horizontal 表示中点所在那段更偏水平。
 */
function polylineLabelAnchor(points) {
  if (!points || points.length === 0) return { x: 0, y: 0, horizontal: true };
  if (points.length === 1) {
    return { x: points[0][0], y: points[0][1], horizontal: true };
  }
  let total = 0;
  const segLens = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.hypot(dx, dy);
    segLens.push(len);
    total += len;
  }
  if (total < 1e-6) {
    return { x: points[0][0], y: points[0][1], horizontal: true };
  }
  let remain = total / 2;
  for (let i = 0; i < segLens.length; i += 1) {
    const len = segLens[i];
    if (remain <= len || i === segLens.length - 1) {
      const t = len < 1e-6 ? 0 : remain / len;
      const x = points[i][0] + (points[i + 1][0] - points[i][0]) * t;
      const y = points[i][1] + (points[i + 1][1] - points[i][1]) * t;
      const horizontal = Math.abs(points[i + 1][1] - points[i][1])
        < Math.abs(points[i + 1][0] - points[i][0]);
      return { x, y, horizontal };
    }
    remain -= len;
  }
  const last = points[points.length - 1];
  return { x: last[0], y: last[1], horizontal: true };
}

/** 正交折线路径：贴边出、贴边入，中间只走水平/竖直 */
function orthoRoute(x1, y1, sideA, x2, y2, sideB) {
  const sa = normSide(sideA);
  const sb = normSide(sideB);
  const near = (a, b) => Math.abs(a - b) < 8;

  if ((sa === 'e' && sb === 'w') || (sa === 'w' && sb === 'e')) {
    if (near(y1, y2)) return [[x1, y1], [x2, y2]];
    const mx = (x1 + x2) / 2;
    return [[x1, y1], [mx, y1], [mx, y2], [x2, y2]];
  }
  if ((sa === 's' && sb === 'n') || (sa === 'n' && sb === 's')) {
    if (near(x1, x2)) return [[x1, y1], [x2, y2]];
    const my = (y1 + y2) / 2;
    return [[x1, y1], [x1, my], [x2, my], [x2, y2]];
  }
  // 一边水平出、一边竖直入：L 形
  if ((sa === 'e' || sa === 'w') && (sb === 'n' || sb === 's')) {
    return [[x1, y1], [x2, y1], [x2, y2]];
  }
  if ((sa === 'n' || sa === 's') && (sb === 'e' || sb === 'w')) {
    return [[x1, y1], [x1, y2], [x2, y2]];
  }
  // 同侧进出（少见）：先外探再折
  if (sa === sb) {
    if (sa === 'e' || sa === 'w') {
      const x = sa === 'e' ? Math.max(x1, x2) + 36 : Math.min(x1, x2) - 36;
      return [[x1, y1], [x, y1], [x, y2], [x2, y2]];
    }
    const y = sa === 's' ? Math.max(y1, y2) + 36 : Math.min(y1, y2) - 36;
    return [[x1, y1], [x1, y], [x2, y], [x2, y2]];
  }
  return [[x1, y1], [x2, y1], [x2, y2]];
}

function bypassRoute(boxA, sideA, boxB, sideB, via, pad) {
  const [x1, y1] = portOf(boxA, sideA);
  const [x2, y2] = portOf(boxB, sideB);
  if (via === 'above' || via === 'n') {
    const y = Math.min(boxA.y, boxB.y) - pad;
    return [[x1, y1], [x1, y], [x2, y], [x2, y2]];
  }
  if (via === 'below' || via === 's') {
    const y = Math.max(boxA.y + boxA.h, boxB.y + boxB.h) + pad;
    return [[x1, y1], [x1, y], [x2, y], [x2, y2]];
  }
  if (via === 'left' || via === 'w') {
    const x = Math.min(boxA.x, boxB.x) - pad;
    return [[x1, y1], [x, y1], [x, y2], [x2, y2]];
  }
  const x = Math.max(boxA.x + boxA.w, boxB.x + boxB.w) + pad;
  return [[x1, y1], [x, y1], [x, y2], [x2, y2]];
}

/* ------------------------------------------------------------------ 画布 */

export function createSketch(
  width = DEFAULT_CANVAS_WIDTH,
  height = DEFAULT_CANVAS_HEIGHT,
  options = {},
) {
  if (width && typeof width === 'object') {
    options = width;
    width = options.width ?? DEFAULT_CANVAS_WIDTH;
    height = options.height ?? DEFAULT_CANVAS_HEIGHT;
  }
  width = Number(width);
  height = Number(height);
  if (!(width > 0) || !(height > 0)) {
    throw new Error(`画布尺寸必须是正数，收到 ${width} × ${height}`);
  }
  const parts = [];
  let rand = makeRandom(options.seed ?? 20260920);
  const font = options.font ?? FONT_HAND;
  const defaults = {
    stroke: INK, sw: 1.8, roughness: 1.3, bowing: 1.1, ...(options.stroke ?? {}),
  };
  const lintNodes = [];
  const lintEdges = [];
  const lintNodeByBox = new WeakMap();
  let lintNodeSeq = 0;
  let lintEdgeSeq = 0;

  function trackNode(box, meta = {}) {
    if (!box || typeof box !== 'object') return null;
    const existing = lintNodeByBox.get(box);
    if (existing) {
      Object.assign(existing, meta);
      return existing;
    }
    lintNodeSeq += 1;
    const node = {
      id: meta.id ?? box.id ?? `node-${lintNodeSeq}`,
      name: meta.name ?? box.name ?? meta.id ?? box.id ?? `节点 ${lintNodeSeq}`,
      kind: meta.kind ?? box.kind ?? 'node',
      parent: meta.parent ?? box.parent ?? null,
      allowOverlap: meta.allowOverlap ?? box.allowOverlap ?? false,
      box,
    };
    lintNodes.push(node);
    lintNodeByBox.set(box, node);
    return node;
  }

  /** 图标按中心+尺寸登记为轴对齐包围盒，供重叠与穿线检查 */
  function trackIcon(name, cx, cy, s, meta = {}) {
    if (meta.lint === false) return null;
    const pad = meta.pad ?? 2;
    const box = {
      x: cx - s / 2 - pad,
      y: cy - s / 2 - pad,
      w: s + pad * 2,
      h: s + pad * 2,
    };
    return trackNode(box, {
      id: meta.id ?? `icon-${name}-${lintNodeSeq + 1}`,
      name: meta.name ?? `图标 ${name}`,
      kind: 'icon',
      parent: meta.parent ?? null,
      allowOverlap: meta.allowOverlap ?? false,
      icon: name,
    });
  }

  function trackEdge(points, fromBox = null, toBox = null, meta = {}) {
    if (meta.lint === false || !points || points.length < 2) return null;
    lintEdgeSeq += 1;
    const from = fromBox ? trackNode(fromBox) : null;
    const to = toBox ? trackNode(toBox) : null;
    const edge = {
      id: meta.id ?? `edge-${lintEdgeSeq}`,
      name: meta.name ?? meta.label ?? meta.id ?? `连线 ${lintEdgeSeq}`,
      points: points.map(([x, y]) => [x, y]),
      from: from?.id ?? null,
      to: to?.id ?? null,
      allowCrossing: meta.allowCrossing ?? false,
      allowOverlap: meta.allowOverlap ?? false,
      allowThrough: new Set(meta.allowThrough ?? []),
    };
    lintEdges.push(edge);
    return edge;
  }

  function lintScene(config = {}) {
    const issues = [];
    const crossingSeverity = config.crossingSeverity ?? 'warning';
    const add = (severity, code, message, at = null, ids = []) => {
      issues.push({ severity, code, message, at, ids });
    };

    const ids = new Map();
    for (const node of lintNodes) {
      if (ids.has(node.id) && ids.get(node.id) !== node) {
        add('error', 'DUPLICATE_NODE_ID', `节点 id 重复: ${node.id}`, null, [node.id]);
      }
      ids.set(node.id, node);
      const b = node.box;
      if (b.x < 0 || b.y < 0 || b.x + b.w > width || b.y + b.h > height) {
        add('error', 'NODE_OUT_OF_BOUNDS', `${node.name} 超出画布`, [b.x, b.y], [node.id]);
      }
    }

    for (let i = 0; i < lintNodes.length; i += 1) {
      for (let j = i + 1; j < lintNodes.length; j += 1) {
        const a = lintNodes[i];
        const b = lintNodes[j];
        if (a.allowOverlap || b.allowOverlap) continue;
        if (a.kind !== b.kind || a.parent !== b.parent) continue;
        if (boxesOverlap(a.box, b.box, config.nodeGap ?? 0)) {
          const code = a.kind === 'icon' ? 'ICON_OVERLAP' : 'NODE_OVERLAP';
          add(
            'error',
            code,
            `${a.name} 与 ${b.name} 区域重叠`,
            [Math.max(a.box.x, b.box.x), Math.max(a.box.y, b.box.y)],
            [a.id, b.id],
          );
        }
      }
    }

    // 图标不得压住普通节点；容器 region 不参与，避免底图误报
    const iconGap = config.iconGap ?? 4;
    for (const icon of lintNodes.filter((n) => n.kind === 'icon')) {
      if (icon.allowOverlap) continue;
      for (const node of lintNodes) {
        if (node.kind !== 'node' || node.allowOverlap) continue;
        if (icon.parent && icon.parent === node.id) continue;
        if (boxesOverlap(icon.box, node.box, iconGap)) {
          add(
            'error',
            'ICON_NODE_OVERLAP',
            `${icon.name} 与 ${node.name} 重叠`,
            [Math.max(icon.box.x, node.box.x), Math.max(icon.box.y, node.box.y)],
            [icon.id, node.id],
          );
        }
      }
    }

    for (const edge of lintEdges) {
      for (const point of edge.points) {
        if (point[0] < 0 || point[1] < 0 || point[0] > width || point[1] > height) {
          add('error', 'EDGE_OUT_OF_BOUNDS', `${edge.name} 超出画布`, point, [edge.id]);
          break;
        }
      }
      for (const node of lintNodes) {
        if (node.kind !== 'node' && node.kind !== 'icon') continue;
        if (node.id === edge.from || node.id === edge.to || edge.allowThrough.has(node.id)) continue;
        let hit = null;
        for (let i = 0; i < edge.points.length - 1; i += 1) {
          if (segmentHitsRect(edge.points[i], edge.points[i + 1], node.box)) {
            hit = edge.points[i];
            break;
          }
        }
        if (hit) {
          add(
            'error',
            node.kind === 'icon' ? 'EDGE_THROUGH_ICON' : 'EDGE_THROUGH_NODE',
            `${edge.name} 穿过 ${node.name}`,
            hit,
            [edge.id, node.id],
          );
        }
      }
    }

    if (crossingSeverity !== 'off') {
      for (let i = 0; i < lintEdges.length; i += 1) {
        for (let j = i + 1; j < lintEdges.length; j += 1) {
          const a = lintEdges[i];
          const b = lintEdges[j];
          if (a.allowCrossing || b.allowCrossing) continue;
          let found = null;
          for (let ai = 0; ai < a.points.length - 1 && !found; ai += 1) {
            for (let bi = 0; bi < b.points.length - 1; bi += 1) {
              const hit = segmentIntersection(
                a.points[ai], a.points[ai + 1], b.points[bi], b.points[bi + 1],
              );
              if (hit && hit.type !== 'touch') {
                found = hit;
                break;
              }
            }
          }
          if (found) {
            if (found.type === 'overlap' && (a.allowOverlap || b.allowOverlap)) continue;
            const code = found.type === 'overlap' ? 'EDGE_OVERLAP' : 'EDGE_CROSS';
            const verb = found.type === 'overlap' ? '重叠共线' : '发生交叉';
            add(
              crossingSeverity,
              code,
              `${a.name} 与 ${b.name} ${verb}`,
              found.at,
              [a.id, b.id],
            );
          }
        }
      }
    }
    return issues;
  }

  function stroke(points, o = {}, closed = false) {
    const cfg = { ...defaults, ...o };
    const paths = sketchPolyline(points, { ...cfg, closed }, rand);
    const dash = cfg.dash ? ` stroke-dasharray="${cfg.dash === true ? '9 7' : cfg.dash}"` : '';
    for (const d of paths) {
      parts.push(`<path d="${d}" fill="none" stroke="${cfg.stroke}" `
        + `stroke-width="${cfg.sw}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`);
    }
  }

  function hatchStroke(p1, p2, o, extra = {}) {
    stroke([p1, p2], {
      stroke: o.fill,
      sw: o.fillWeight ?? 1.4,
      roughness: 0.9,
      bowing: 0.6,
      passes: 1,
      ...extra,
    });
  }

  /**
   * 填充样式对齐 rough.js：
   * hachure（默认）| cross-hatch | zigzag | zigzag-line | dashed | dots | solid
   */
  function fillShape(points, o) {
    if (!o.fill || points.length < 3) return;
    const style = o.fillStyle ?? 'hachure';
    const gap = o.hachureGap ?? (style === 'dots' ? 10 : 8);
    const angle = o.hachureAngle ?? -41;
    const ink = { stroke: o.fill, sw: o.fillWeight ?? 1.4, roughness: 0.9, bowing: 0.6, passes: 1 };

    if (style === 'solid') {
      const paths = sketchPolyline(points, {
        roughness: (o.roughness ?? defaults.roughness) * 0.7,
        bowing: o.bowing ?? defaults.bowing,
        passes: 1,
        closed: true,
      }, rand);
      const opacity = o.fillOpacity ?? 0.55;
      parts.push(`<path d="${paths[0]}" fill="${o.fill}" fill-opacity="${opacity}" stroke="none"/>`);
      return;
    }

    if (style === 'dots') {
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const r = Math.max(1.2, (o.fillWeight ?? 1.4) * 0.85);
      for (let y = minY + gap / 2; y < maxY; y += gap) {
        for (let x = minX + gap / 2; x < maxX; x += gap) {
          const jx = x + (rand() - 0.5) * gap * 0.35;
          const jy = y + (rand() - 0.5) * gap * 0.35;
          if (!pointInPoly(jx, jy, points)) continue;
          stroke(ellipsePoints(jx, jy, r, r, 7), { ...ink, roughness: 0.5, bowing: 0.3 }, true);
        }
      }
      return;
    }

    const drawBand = (bandAngle, zigAmp) => {
      for (const [p1, p2] of hachureLines(points, gap, bandAngle)) {
        if (style === 'zigzag' || style === 'zigzag-line') {
          const zig = o.zigzagOffset ?? gap * (style === 'zigzag-line' ? 0.7 : 1);
          stroke(zigzagAlong(p1, p2, zig, zigAmp), ink);
        } else if (style === 'dashed') {
          hatchStroke(p1, p2, o, { dash: o.fillLineDash ?? '6 6' });
        } else {
          hatchStroke(p1, p2, o);
        }
      }
    };

    if (style === 'cross-hatch') {
      drawBand(angle, 0.45);
      drawBand(angle + 90, 0.45);
      return;
    }

    // hachure / zigzag / zigzag-line / dashed / 未知值回退到 hachure
    drawBand(angle, style === 'zigzag-line' ? 0.28 : 0.45);
  }

  const api = {
    width,
    height,

    /** 显式把矩形加入几何 lint；容器请传 kind:'region' */
    track(box, meta = {}) {
      trackNode(box, meta);
      return box;
    },

    /** 将普通 line/polyline 的几何显式加入 lint（不重复绘制） */
    trackRoute(points, meta = {}) {
      trackEdge(points, meta.from ?? null, meta.to ?? null, meta);
      return points;
    },

    /** 返回结构化诊断：error / warning、错误码、坐标和相关 id */
    lint: (config = {}) => lintScene(config),

    /** 供自定义检查或调试工具读取已登记的场景几何 */
    lintScene: () => ({
      nodes: lintNodes.map((n) => ({ ...n, box: { ...n.box } })),
      edges: lintEdges.map((e) => ({ ...e, points: e.points.map((p) => [...p]) })),
    }),

    /* ---------------- 基础图形 ---------------- */

    line: (x1, y1, x2, y2, o = {}) => stroke([[x1, y1], [x2, y2]], o),

    polyline: (points, o = {}) => stroke(points, o, !!o.closed),

    /** 闭合多边形，可填充 */
    polygon(points, o = {}) {
      if (!points?.length) return;
      fillShape(points, o);
      stroke(points, o, true);
    },

    rect(x, y, w, h, o = {}) {
      const pts = rectPoints(x, y, w, h);
      fillShape(pts, o);
      stroke(pts, o, true);
    },

    /** 圆角矩形，信息图里的“卡片/容器”基本都用它 */
    box(x, y, w, h, o = {}) {
      const pts = roundRectPoints(x, y, w, h, o.r ?? 14);
      fillShape(pts, o);
      stroke(pts, o, true);
    },

    circle(cx, cy, d, o = {}) {
      const pts = ellipsePoints(cx, cy, d / 2, d / 2, o.curveStepCount ?? 28);
      fillShape(pts, o);
      stroke(pts, o, true);
    },

    ellipse(cx, cy, w, h, o = {}) {
      const pts = ellipsePoints(cx, cy, w / 2, h / 2, o.curveStepCount ?? 28);
      fillShape(pts, o);
      stroke(pts, o, true);
    },

    /**
     * 椭圆弧。角度为度；`closed: 'pie'` 连到圆心成扇形，`closed: true` 只闭合弦。
     */
    arc(cx, cy, w, h, start, stop, o = {}) {
      const rx = w / 2;
      const ry = h / 2;
      const rim = arcPoints(cx, cy, rx, ry, start, stop, o.curveStepCount ?? 24);
      if (o.closed === 'pie') {
        const pts = [[cx, cy], ...rim];
        fillShape(pts, o);
        stroke(pts, o, true);
      } else if (o.closed) {
        fillShape(rim, o);
        stroke(rim, o, true);
      } else {
        stroke(rim, o, false);
      }
    },

    /**
     * 手绘化任意 SVG path（d 字符串）。闭合轮廓可填充；开放路径只描边。
     */
    path(d, o = {}) {
      for (const { points, closed } of parsePath(d)) {
        if (points.length < 2) continue;
        if (closed || o.closed) fillShape(points, o);
        stroke(points, o, closed || !!o.closed);
      }
    },

    arrow(x1, y1, x2, y2, o = {}) {
      stroke([[x1, y1], [x2, y2]], o);
      const a = Math.atan2(y2 - y1, x2 - x1);
      const s = o.head ?? 13;
      for (const da of [Math.PI * 0.84, -Math.PI * 0.84]) {
        stroke([[x2, y2], [x2 + s * Math.cos(a + da), y2 + s * Math.sin(a + da)]],
          { ...o, roughness: 0.7, passes: 1, dash: false });
      }
    },

    /** 二次贝塞尔箭头：适合画回流、反馈、跨层级连线 */
    curve(x1, y1, cx, cy, x2, y2, o = {}) {
      const pts = [];
      for (let i = 0; i <= 12; i += 1) {
        const t = i / 12;
        const mt = 1 - t;
        pts.push([
          mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
          mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
        ]);
      }
      stroke(pts, o);
      const [px, py] = pts[11];
      const a = Math.atan2(y2 - py, x2 - px);
      const s = o.head ?? 13;
      for (const da of [Math.PI * 0.84, -Math.PI * 0.84]) {
        stroke([[x2, y2], [x2 + s * Math.cos(a + da), y2 + s * Math.sin(a + da)]],
          { ...o, roughness: 0.7, passes: 1, dash: false });
      }
    },

    /**
     * 沿折线描边，只在终点加箭头。连线默认更干净（passes:1），复杂图更稳。
     */
    polyArrow(points, o = {}) {
      if (!points || points.length < 2) return;
      trackEdge(points, o.from ?? null, o.to ?? null, o);
      const wire = {
        roughness: 0.85, bowing: 0.7, passes: 1, sw: 1.55, ...o,
      };
      stroke(points, wire, false);
      const [ax, ay] = points[points.length - 2];
      const [bx, by] = points[points.length - 1];
      const ang = Math.atan2(by - ay, bx - ax);
      const hs = o.head ?? 12;
      for (const da of [Math.PI * 0.84, -Math.PI * 0.84]) {
        stroke(
          [[bx, by], [bx + hs * Math.cos(ang + da), by + hs * Math.sin(ang + da)]],
          { ...wire, roughness: 0.5, passes: 1, dash: false },
        );
      }
    },

    /**
     * 稳定连线：从 A 的某边中点连到 B 的某边中点（不穿框心）。
     * mode: 'ortho'（默认，直角折线）| 'straight' | 'curve'
     *
     *   s.connect(order, 'e', pay, 'w')
     *   s.connect(a, 's', b, 'n', { dash: true, label: '回调', labelSize: 14 })
     */
    connect(boxA, sideA, boxB, sideB, o = {}) {
      const gap = o.gap ?? 6;
      const [x1, y1] = portOf(boxA, sideA, gap);
      const [x2, y2] = portOf(boxB, sideB, gap);
      const mode = o.mode ?? 'ortho';
      let pts;
      if (mode === 'straight') {
        pts = [[x1, y1], [x2, y2]];
      } else if (mode === 'curve') {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const lift = o.lift ?? 0;
        const curvePoints = [];
        for (let i = 0; i <= 12; i += 1) {
          const t = i / 12;
          const mt = 1 - t;
          curvePoints.push([
            mt * mt * x1 + 2 * mt * t * mx + t * t * x2,
            mt * mt * y1 + 2 * mt * t * (my + lift) + t * t * y2,
          ]);
        }
        trackEdge(curvePoints, boxA, boxB, o);
        api.curve(x1, y1, mx, my + lift, x2, y2, {
          roughness: 0.85, bowing: 0.7, passes: 1, sw: 1.55, ...o,
        });
        if (o.label) {
          api.wireLabel(mx - 70, my + lift - 22, 140, o.label, {
            size: o.labelSize ?? 14, align: 'center', color: o.stroke ?? o.color ?? GRAY,
          });
        }
        return;
      } else {
        pts = orthoRoute(x1, y1, sideA, x2, y2, sideB);
      }
      trackEdge(pts, boxA, boxB, o);
      api.polyArrow(pts, { ...o, lint: false });
      if (o.label) {
        const anchor = polylineLabelAnchor(pts);
        api.wireLabel(
          anchor.x - 70,
          anchor.y + (anchor.horizontal ? -20 : 8),
          140,
          o.label,
          { size: o.labelSize ?? 14, align: 'center', color: o.stroke ?? o.color ?? GRAY },
        );
      }
    },

    /**
     * 外侧绕行：回流 / 跨层虚线走盒子外围通道，避免穿过中间卡片。
     * via: 'above' | 'below' | 'left' | 'right'
     *
     *   s.bypass(pay, 's', order, 's', { via: 'below', pad: 56, dash: true, label: '回调' })
     */
    bypass(boxA, sideA, boxB, sideB, o = {}) {
      const via = o.via ?? 'below';
      const pad = o.pad ?? 48;
      const pts = bypassRoute(boxA, sideA, boxB, sideB, via, pad);
      trackEdge(pts, boxA, boxB, o);
      api.polyArrow(pts, {
        roughness: 0.85, bowing: 0.7, passes: 1, sw: 1.55, ...o, lint: false,
      });
      if (o.label) {
        const anchor = polylineLabelAnchor(pts);
        api.wireLabel(
          anchor.x - 80,
          anchor.y - 20,
          160,
          o.label,
          { size: o.labelSize ?? 14, align: 'center', color: o.stroke ?? o.color ?? GRAY },
        );
      }
    },

    /* ---------------- 文字 ---------------- */

    /**
     * 文本块：x/y 为左上角，w 为换行宽度。
     * align: left | center | right；传 h 时在该高度内垂直居中。
     * fit 默认开启：字号放不下时自动缩小（最小 11px），避免标签溢出卡片。
     */
    text(x, y, w, content, o = {}) {
      const lh = o.lh ?? 1.45;
      const align = o.align ?? 'left';
      const pad = o.pad ?? 0;
      const innerW = Math.max(10, w - pad * 2);
      const fit = o.fit !== false;

      let size = o.size ?? 18;
      let lines = wrapText(content, size, innerW);
      if (fit) {
        // 缩到能塞进宽度（超长单词）与高度（行数过多）为止
        while (size > 11) {
          const tooWide = lines.some((l) => lineWidth(l, size) > innerW + 0.5);
          const tooTall = o.h ? lines.length * size * lh > o.h - pad : false;
          if (!tooWide && !tooTall) break;
          size -= 1;
          lines = wrapText(content, size, innerW);
        }
      }

      const blockH = lines.length * size * lh;
      const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
      const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - pad : x + pad;
      const top = o.h ? y + (o.h - blockH) / 2 : y;
      const weight = o.weight ?? 400;
      const rows = lines.map((line, i) => `<tspan x="${round(tx)}" `
        + `y="${round(top + size * lh * (i + 0.78))}">${escapeXml(line)}</tspan>`).join('');
      const haloColor = o.haloColor
        ?? (options.background && options.background !== 'transparent' ? options.background : PAPER);
      const halo = o.halo
        ? ` stroke="${haloColor}" stroke-width="${o.haloWidth ?? 5}" `
          + 'stroke-linejoin="round" paint-order="stroke"'
        : '';
      parts.push(`<text font-family="${o.font ?? font}" font-size="${size}" font-weight="${weight}" `
        + `fill="${o.color ?? INK}" text-anchor="${anchor}"${halo}>${rows}</text>`);
    },

    /** 估算一行文字的像素宽度：排版前用它判断卡片够不够宽 */
    measure: (content, size = 18) => lineWidth(String(content), size),

    /** 连线标签：用纸色描边形成留白光晕，避免文字与线条/边界融合 */
    wireLabel(x, y, w, content, o = {}) {
      api.text(x, y, w, content, {
        ...o,
        halo: o.halo !== false,
        haloWidth: o.haloWidth ?? 5,
      });
    },

    /** 在矩形区域内居中的文字（框与字共用坐标，不用手算行高） */
    inBox(x, y, w, h, content, o = {}) {
      api.text(x, y, w, content, { ...o, h, align: o.align ?? 'center', pad: o.pad ?? 12 });
    },

    /* ---------------- 常用组合件 ---------------- */

    /** 手绘框 + 居中文字，信息图最常用的单元 */
    card(x, y, w, h, content, o = {}) {
      api.box(x, y, w, h, o);
      api.inBox(x, y, w, h, content, { size: o.size, color: o.color ?? o.stroke, weight: o.weight, lh: o.lh });
    },

    /** 应用窗口：标题栏 + 三个圆点 */
    window(x, y, w, h, o = {}) {
      api.box(x, y, w, h, { r: 10, ...o });
      api.line(x, y + 26, x + w, y + 26, { sw: 1.4, ...o });
      [0, 1, 2].forEach((i) => api.circle(x + 16 + i * 15, y + 13, 8, { sw: 1.2, ...o }));
    },

    /** 若干条潦草横线，用来示意“一段文字/内容” */
    lines(x, y, w, n = 3, gap = 16, o = {}) {
      for (let i = 0; i < n; i += 1) {
        const len = i === n - 1 ? w * 0.55 : w;
        api.line(x, y + i * gap, x + len, y + i * gap, { sw: 1.3, roughness: 2.2, stroke: GRAY, ...o });
      }
    },

    /** 对话气泡 */
    bubble(x, y, w, h, o = {}) {
      api.box(x, y, w, h, { r: 16, ...o });
      api.polyline([[x + 24, y + h], [x + 18, y + h + 16], [x + 44, y + h]], o);
    },

    /** 围栏：表达边界、护栏、安全约束 */
    fence(x, y, w, o = {}) {
      api.line(x, y - 14, x + w, y - 14, { sw: 1.5, ...o });
      api.line(x, y - 30, x + w, y - 30, { sw: 1.5, ...o });
      for (let i = 0; i <= 3; i += 1) api.line(x + (w / 3) * i, y, x + (w / 3) * i, y - 44, { sw: 1.5, ...o });
    },

    /* ---------------- 象形图标：都以 (cx, cy) 为中心、s 为尺寸 ---------------- */

    lucideIconNames: Object.freeze(Object.keys(LUCIDE_ICONS)),

    /**
     * 在指定中心与尺寸下绘制任意 SVG 元素数组（与 Lucide 固化格式相同）。
     * 用于 Lucide 之外的示意形：叶子、细胞、装置剖面、品牌符号等。
     * `viewBox` 默认 `24`（正方形）；也可传 `"0 0 w h"` 或 `[minX, minY, w, h]`。
     * 闭合轮廓支持 `fill` / `fillStyle`；开放路径只描边。
     */
    svgGlyph(cx, cy, s = 40, elements, o = {}) {
      if (!Array.isArray(elements) || elements.length === 0) {
        throw new Error('svgGlyph 需要非空的 SVG 元素数组，例如 [["path", { d: "..." }]]');
      }
      const [minX, minY, vbW, vbH] = normalizeViewBox(o.viewBox);
      if (!(vbW > 0 && vbH > 0)) throw new Error('svgGlyph viewBox 宽高必须为正');
      const glyphName = o.name ?? o.id ?? 'glyph';
      trackIcon(glyphName, cx, cy, s, o);

      const k = s / Math.max(vbW, vbH);
      const midX = minX + vbW / 2;
      const midY = minY + vbH / 2;
      const x = (value) => cx + (Number(value) - midX) * k;
      const y = (value) => cy + (Number(value) - midY) * k;
      const length = (value) => Number(value) * k;
      const cfg = {
        roughness: 0.75, bowing: 0.5, passes: 1, sw: 1.8, ...o,
      };
      delete cfg.viewBox;
      delete cfg.name;
      delete cfg.id;
      delete cfg.parent;
      delete cfg.lint;
      delete cfg.pad;
      delete cfg.allowOverlap;

      const pointList = (value) => {
        const nums = String(value).match(/[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/g)?.map(Number) ?? [];
        const out = [];
        for (let i = 0; i + 1 < nums.length; i += 2) out.push([x(nums[i]), y(nums[i + 1])]);
        return out;
      };

      const drawClosed = (pts) => {
        if (pts.length < 2) return;
        if (cfg.fill) fillShape(pts, cfg);
        stroke(pts, cfg, true);
      };

      for (const entry of elements) {
        const [tag, a = {}] = Array.isArray(entry) ? entry : [entry?.tag, entry];
        if (!tag) continue;
        if (tag === 'path') {
          for (const contour of parsePath(a.d)) {
            const pts = contour.points.map(([px, py]) => [x(px), y(py)]);
            if (pts.length < 2) continue;
            if (contour.closed) drawClosed(pts);
            else stroke(pts, cfg, false);
          }
        } else if (tag === 'circle') {
          drawClosed(ellipsePoints(x(a.cx), y(a.cy), length(a.r), length(a.r), 24));
        } else if (tag === 'ellipse') {
          drawClosed(ellipsePoints(x(a.cx), y(a.cy), length(a.rx), length(a.ry), 24));
        } else if (tag === 'line') {
          stroke([[x(a.x1), y(a.y1)], [x(a.x2), y(a.y2)]], cfg);
        } else if (tag === 'polyline') {
          stroke(pointList(a.points), cfg, false);
        } else if (tag === 'polygon') {
          drawClosed(pointList(a.points));
        } else if (tag === 'rect') {
          const rx = length(a.rx ?? 0);
          const pts = rx > 0
            ? roundRectPoints(x(a.x ?? 0), y(a.y ?? 0), length(a.width), length(a.height), rx)
            : rectPoints(x(a.x ?? 0), y(a.y ?? 0), length(a.width), length(a.height));
          drawClosed(pts);
        } else {
          throw new Error(`svgGlyph 不支持的 SVG 元素: ${tag}`);
        }
      }
      return { name: glyphName };
    },

    /**
     * 按 Lucide 官方图标名绘制任意固化图标，并用当前手绘笔触重新描边。
     * 完整图标集在生成阶段下载；实际渲染不访问网络。
     * 需要 Lucide 之外的自定义形时，改用 `svgGlyph` 或绝对坐标 `path`。
     */
    lucideIcon(name, cx, cy, s = 40, o = {}) {
      const resolved = LUCIDE_ICONS[name] ? name : LEGACY_ICON_ALIASES[name];
      const elements = LUCIDE_ICONS[resolved];
      if (!elements) throw new Error(`未知 Lucide 图标: ${name}`);
      api.svgGlyph(cx, cy, s, elements, {
        viewBox: 24,
        name: resolved,
        ...o,
      });
      return { name: resolved, version: LUCIDE_VERSION };
    },

    person(cx, cy, s = 40, o = {}) {
      api.circle(cx, cy - s * 0.24, s * 0.4, o);
      api.polyline([[cx - s * 0.42, cy + s * 0.46], [cx - s * 0.2, cy + s * 0.04],
        [cx + s * 0.2, cy + s * 0.04], [cx + s * 0.42, cy + s * 0.46]], o);
    },
    bot(cx, cy, s = 40, o = {}) {
      api.box(cx - s * 0.44, cy - s * 0.3, s * 0.88, s * 0.72, { r: s * 0.16, ...o });
      api.circle(cx - s * 0.17, cy + s * 0.02, s * 0.15, o);
      api.circle(cx + s * 0.17, cy + s * 0.02, s * 0.15, o);
      api.line(cx, cy - s * 0.3, cx, cy - s * 0.46, o);
      api.circle(cx, cy - s * 0.52, s * 0.1, o);
    },
    gear(cx, cy, s = 40, o = {}) {
      api.circle(cx, cy, s * 0.8, o);
      api.circle(cx, cy, s * 0.34, o);
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8;
        api.line(cx + Math.cos(a) * s * 0.4, cy + Math.sin(a) * s * 0.4,
          cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55, o);
      }
    },
    cursor(cx, cy, s = 30, o = {}) {
      const k = s / 24;
      api.polyline([[cx - 5 * k, cy - 11 * k], [cx - 5 * k, cy + 10 * k], [cx, cy + 4 * k],
        [cx + 4 * k, cy + 12 * k], [cx + 8 * k, cy + 10 * k], [cx + 3 * k, cy + 2 * k],
        [cx + 9 * k, cy], [cx - 5 * k, cy - 11 * k]], { sw: 1.5, ...o });
    },
    flag(cx, cy, s = 40, o = {}) {
      api.line(cx - s * 0.26, cy + s * 0.44, cx - s * 0.26, cy - s * 0.46, o);
      api.polyline([[cx - s * 0.26, cy - s * 0.44], [cx + s * 0.4, cy - s * 0.22],
        [cx - s * 0.26, cy + s * 0.02]], { ...o, closed: true });
    },
    files(cx, cy, s = 40, o = {}) {
      api.rect(cx - s * 0.42, cy - s * 0.34, s * 0.62, s * 0.74, o);
      api.rect(cx - s * 0.22, cy - s * 0.44, s * 0.62, s * 0.74, o);
      api.lines(cx - s * 0.1, cy - s * 0.18, s * 0.34, 3, s * 0.2, { stroke: o.stroke ?? INK, sw: 1.1 });
    },
    ruler(cx, cy, s = 40, o = {}) {
      api.rect(cx - s * 0.46, cy - s * 0.16, s * 0.92, s * 0.34, o);
      [0.25, 0.5, 0.75].forEach((t) => api.line(cx - s * 0.46 + s * 0.92 * t, cy - s * 0.16,
        cx - s * 0.46 + s * 0.92 * t, cy - s * 0.02, { sw: 1.2, ...o }));
    },
    lock(cx, cy, s = 40, o = {}) {
      api.rect(cx - s * 0.3, cy - s * 0.06, s * 0.6, s * 0.44, o);
      api.polyline([[cx - s * 0.18, cy - s * 0.06], [cx - s * 0.18, cy - s * 0.3],
        [cx, cy - s * 0.42], [cx + s * 0.18, cy - s * 0.3], [cx + s * 0.18, cy - s * 0.06]], o);
    },
    clock(cx, cy, s = 40, o = {}) {
      api.circle(cx, cy, s * 0.82, o);
      api.line(cx, cy, cx, cy - s * 0.26, o);
      api.line(cx, cy, cx + s * 0.22, cy + s * 0.08, o);
    },
    bulb(cx, cy, s = 40, o = {}) {
      api.circle(cx, cy - s * 0.1, s * 0.56, o);
      api.line(cx - s * 0.14, cy + s * 0.22, cx + s * 0.14, cy + s * 0.22, o);
      api.line(cx - s * 0.11, cy + s * 0.36, cx + s * 0.11, cy + s * 0.36, o);
    },
    pencil(cx, cy, s = 40, o = {}) {
      const k = s / 40;
      api.polyline([[cx - 15 * k, cy + 15 * k], [cx - 11 * k, cy + 4 * k], [cx + 12 * k, cy - 18 * k],
        [cx + 18 * k, cy - 12 * k], [cx - 5 * k, cy + 11 * k]], { ...o, closed: true });
      api.line(cx - 15 * k, cy + 15 * k, cx - 5 * k, cy + 11 * k, { sw: 1.3, ...o });
    },
    magnifier(cx, cy, s = 40, o = {}) {
      api.circle(cx - s * 0.08, cy - s * 0.1, s * 0.6, o);
      api.line(cx + s * 0.16, cy + s * 0.16, cx + s * 0.42, cy + s * 0.42, { sw: 2.2, ...o });
    },
    wrench(cx, cy, s = 40, o = {}) {
      const k = s / 40;
      api.line(cx - 14 * k, cy + 14 * k, cx + 8 * k, cy - 8 * k, { sw: 2.2, ...o });
      api.polyline([[cx + 4 * k, cy - 12 * k], [cx + 12 * k, cy - 20 * k],
        [cx + 20 * k, cy - 12 * k], [cx + 12 * k, cy - 4 * k]], { ...o, closed: true });
    },
    checklist(cx, cy, s = 40, o = {}) {
      api.rect(cx - s * 0.34, cy - s * 0.44, s * 0.68, s * 0.88, o);
      [0, 1, 2].forEach((i) => {
        const y = cy - s * 0.26 + i * s * 0.26;
        api.polyline([[cx - s * 0.22, y], [cx - s * 0.12, y + s * 0.06], [cx - s * 0.02, y - s * 0.1]],
          { sw: 1.3, ...o });
        api.line(cx + s * 0.04, y, cx + s * 0.22, y, { sw: 1.1, stroke: GRAY });
      });
    },
    stamp(cx, cy, s = 40, o = {}) {
      api.rect(cx - s * 0.4, cy + s * 0.2, s * 0.8, s * 0.16, o);
      api.polyline([[cx - s * 0.26, cy + s * 0.2], [cx - s * 0.14, cy - s * 0.1],
        [cx + s * 0.14, cy - s * 0.1], [cx + s * 0.26, cy + s * 0.2]], { ...o, closed: true });
      api.rect(cx - s * 0.1, cy - s * 0.42, s * 0.2, s * 0.32, o);
    },
    scale(cx, cy, s = 40, o = {}) {
      api.line(cx, cy - s * 0.38, cx, cy + s * 0.4, o);
      api.line(cx - s * 0.42, cy - s * 0.3, cx + s * 0.42, cy - s * 0.3, o);
      api.polyline([[cx - s * 0.42, cy - s * 0.3], [cx - s * 0.26, cy + s * 0.02], [cx - s * 0.1, cy - s * 0.3]], o);
      api.polyline([[cx + s * 0.1, cy - s * 0.3], [cx + s * 0.26, cy + s * 0.02], [cx + s * 0.42, cy - s * 0.3]], o);
      api.line(cx - s * 0.18, cy + s * 0.4, cx + s * 0.18, cy + s * 0.4, o);
    },
    undo(cx, cy, s = 40, o = {}) {
      const r = s * 0.38;
      const pts = [];
      for (let i = 0; i <= 16; i += 1) {
        const a = Math.PI * 0.75 + (Math.PI * 1.6 * i) / 16;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      api.polyline(pts, o);
      const [hx, hy] = pts[0];
      api.line(hx, hy, hx - s * 0.02, hy - s * 0.2, { sw: 1.5, ...o });
      api.line(hx, hy, hx + s * 0.18, hy - s * 0.06, { sw: 1.5, ...o });
    },
    scissors(cx, cy, s = 34, o = {}) {
      api.line(cx - s * 0.36, cy - s * 0.3, cx + s * 0.34, cy + s * 0.26, o);
      api.line(cx - s * 0.36, cy + s * 0.3, cx + s * 0.34, cy - s * 0.26, o);
      api.circle(cx + s * 0.44, cy + s * 0.34, s * 0.26, o);
      api.circle(cx + s * 0.44, cy - s * 0.34, s * 0.26, o);
    },
    check(cx, cy, s = 40, o = {}) {
      api.polyline([[cx - s * 0.4, cy], [cx - s * 0.08, cy + s * 0.32], [cx + s * 0.42, cy - s * 0.36]],
        { sw: 3, ...o });
    },
    cross(cx, cy, s = 40, o = {}) {
      api.line(cx - s * 0.34, cy - s * 0.34, cx + s * 0.34, cy + s * 0.34, { sw: 3, ...o });
      api.line(cx + s * 0.34, cy - s * 0.34, cx - s * 0.34, cy + s * 0.34, { sw: 3, ...o });
    },

    /** 图标 + 下方短标签 */
    iconLabel(kind, cx, cy, s, label, o = {}) {
      const lucideName = LUCIDE_ICONS[kind] ? kind : LEGACY_ICON_ALIASES[kind];
      if (lucideName) {
        api.lucideIcon(lucideName, cx, cy, s, {
          stroke: o.stroke,
          id: o.id,
          name: o.name ?? label,
          parent: o.parent,
          allowOverlap: o.allowOverlap,
          lint: o.lint,
        });
      } else if (typeof api[kind] === 'function') api[kind](cx, cy, s, { stroke: o.stroke });
      else throw new Error(`未知图标: ${kind}`);
      api.text(cx - 70, cy + s * 0.56, 140, label, { size: o.size ?? 17, align: 'center', color: o.color ?? o.stroke });
    },

    /** 图题：标题（可选副标题）；默认不加编号。仅文章需要「图 N」交叉引用时才传 label */
    header({ label, title, sub }) {
      if (label) api.card(48, 30, 84, 38, label, { size: 20, r: 10, weight: 700 });
      api.text(label ? 150 : 48, 30, width - 200, title, { size: 31, weight: 700 });
      if (sub) api.text(label ? 150 : 48, 76, width - 200, sub, { size: 17, color: GRAY, lh: 1.5 });
      return sub ? 128 : 96;
    },

    /** 底部图注（可选；默认不要用，仅用户明确要求图注时） */
    footer(y, content) {
      api.line(48, y, width - 48, y, { sw: 1.4, roughness: 2.2, stroke: GRAY });
      api.text(48, y + 16, width - 96, content, { size: 18, lh: 1.6 });
    },

    /** 重新设定随机种子：想换一版笔触手感时用 */
    reseed(seed) { rand = makeRandom(seed); },

    /** 导出 SVG 字符串 */
    toSvg() {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `
        + `viewBox="0 0 ${width} ${height}">\n`
        + `<rect width="${width}" height="${height}" fill="${options.background ?? PAPER}"/>\n`
        + `${parts.join('\n')}\n</svg>\n`;
    },
  };

  return api;
}
