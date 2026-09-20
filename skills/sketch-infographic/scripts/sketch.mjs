/**
 * hand-sketch — 零依赖手绘信息图渲染库（Node ESM，只用标准库，直接输出 SVG 字符串）
 *
 * 设计要点：
 * 1. 所有图形先转成折线（polyline），再用带随机抖动的两遍笔触重绘，得到手绘感；
 *    随机数由 seed 决定，因此同样的输入永远得到同样的图，适合进 Git 做 diff。
 * 2. 文字直接用 SVG <text>/<tspan>，按字符宽度估算做自动换行，不依赖浏览器排版。
 * 3. 不引入 rough.js / playwright / canvas 等任何依赖，`node render.mjs` 即可出图。
 */

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

/* ------------------------------------------------------------------ 画布 */

export function createSketch(width, height, options = {}) {
  const parts = [];
  let rand = makeRandom(options.seed ?? 20260920);
  const font = options.font ?? FONT_HAND;
  const defaults = {
    stroke: INK, sw: 1.8, roughness: 1.3, bowing: 1.1, ...(options.stroke ?? {}),
  };

  function stroke(points, o = {}, closed = false) {
    const cfg = { ...defaults, ...o };
    const paths = sketchPolyline(points, { ...cfg, closed }, rand);
    const dash = cfg.dash ? ` stroke-dasharray="${cfg.dash === true ? '9 7' : cfg.dash}"` : '';
    for (const d of paths) {
      parts.push(`<path d="${d}" fill="none" stroke="${cfg.stroke}" `
        + `stroke-width="${cfg.sw}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`);
    }
  }

  function fillShape(points, o) {
    if (!o.fill) return;
    const gap = o.hachureGap ?? 8;
    for (const [p1, p2] of hachureLines(points, gap, o.hachureAngle ?? -41)) {
      stroke([p1, p2], { stroke: o.fill, sw: o.fillWeight ?? 1.4, roughness: 0.9, bowing: 0.6, passes: 1 });
    }
  }

  const api = {
    width,
    height,

    /* ---------------- 基础图形 ---------------- */

    line: (x1, y1, x2, y2, o = {}) => stroke([[x1, y1], [x2, y2]], o),

    polyline: (points, o = {}) => stroke(points, o),

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
      const pts = ellipsePoints(cx, cy, d / 2, d / 2);
      fillShape(pts, o);
      stroke(pts, o, true);
    },

    ellipse(cx, cy, w, h, o = {}) {
      const pts = ellipsePoints(cx, cy, w / 2, h / 2);
      fillShape(pts, o);
      stroke(pts, o, true);
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
      parts.push(`<text font-family="${o.font ?? font}" font-size="${size}" font-weight="${weight}" `
        + `fill="${o.color ?? INK}" text-anchor="${anchor}">${rows}</text>`);
    },

    /** 估算一行文字的像素宽度：排版前用它判断卡片够不够宽 */
    measure: (content, size = 18) => lineWidth(String(content), size),

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
      api[kind](cx, cy, s, { stroke: o.stroke });
      api.text(cx - 70, cy + s * 0.56, 140, label, { size: o.size ?? 17, align: 'center', color: o.color ?? o.stroke });
    },

    /** 图题：左上角编号徽章 + 标题（可选副标题），返回正文可用的起始 y */
    header({ label, title, sub }) {
      if (label) api.card(48, 30, 84, 38, label, { size: 20, r: 10, weight: 700 });
      api.text(label ? 150 : 48, 30, width - 200, title, { size: 31, weight: 700 });
      if (sub) api.text(label ? 150 : 48, 76, width - 200, sub, { size: 17, color: GRAY, lh: 1.5 });
      return sub ? 128 : 96;
    },

    /** 底部图注 */
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
