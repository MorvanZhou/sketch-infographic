/**
 * README 里的 demo 图 —— 六种图式各一张，内容讲的就是这个 skill 自己。
 *
 * 渲染：
 *   node render.mjs figures.mjs --png
 *   node render.mjs figures.mjs --png --only 01-flow
 */

import {
  createSketch, INK, RED, BLUE, GREEN, VIOLET, GRAY, YELLOW,
} from './sketch.mjs';

/* ------------------------------------------------------------ 网格辅助 */

const W = 1200;   // 画布宽度统一，一组图排进文档大小才一致
const M = 48;     // 页边距
const GUT = 24;   // 元素间距
const RAD = Math.PI / 180;

/** n 等分列：返回列宽与第 i 列的 x */
function cols(n, left = M, right = M, gutter = GUT) {
  const w = (W - left - right - gutter * (n - 1)) / n;
  return { w, x: (i) => left + i * (w + gutter) };
}

/* ------------------------------------------------------------ 图 1：横向流程 */

function flow() {
  const s = createSketch(W, 412);
  s.header({ label: '图 1', title: '出一张图分五步，最后一步最容易被跳过' });

  const steps = [
    ['定结论', VIOLET],
    ['选图式', BLUE],
    ['写坐标', INK],
    ['渲染出图', GRAY],
    ['看图核对', GREEN],
  ];
  const { w, x } = cols(steps.length);
  const y = 186;
  const h = 72;

  steps.forEach(([label, color], i) => {
    const last = i === steps.length - 1;
    s.card(x(i), y, w, h, label, {
      stroke: color,
      sw: last ? 2.3 : 1.8,
      ...(last ? { fill: YELLOW, hachureGap: 16 } : {}),
    });
    if (!last) s.arrow(x(i) + w + 2, y + h / 2, x(i + 1) - 4, y + h / 2, { stroke: GRAY });
  });

  // 返工路径走下方，用虚线和主干区分
  s.curve(x(4) + w / 2, y + h + 4, (x(2) + x(4)) / 2 + w / 2, y + h + 108,
    x(2) + w / 2, y + h + 4, { stroke: RED, dash: true, sw: 1.8 });
  s.text(x(3) - 30, y + h + 78, 280, '有重叠就回去调坐标', { size: 18, color: RED, align: 'center' });

  return s;
}

/* ------------------------------------------------------------ 图 2：左右对比 */

function compare() {
  const s = createSketch(W, 520);
  s.header({ label: '图 2', title: '图能进版本库，才跟得上文档的改动', sub: '同一份内容，两种生产方式' });

  s.line(W / 2, 140, W / 2, 470, { dash: true, stroke: GRAY, sw: 1.5 });

  const side = (cx, title, color, items) => {
    s.text(cx - 220, 158, 440, title, { size: 25, weight: 700, color, align: 'center' });
    items.forEach((label, i) => {
      const y = 218 + i * 86;
      s.card(cx - 200, y, 400, 58, label, { stroke: color });
      if (i < items.length - 1) s.arrow(cx, y + 62, cx, y + 80, { stroke: color });
    });
  };

  side(320, '截图与 AI 生图', GRAY, ['改一个字要重做', '二进制进不了 diff', '每张风格都在漂']);
  side(880, '代码画图', VIOLET, ['改一行重渲染', '纯文本可 diff', '同一套调色板']);

  return s;
}

/* ------------------------------------------------------------ 图 3：纵向分层 */

function layers() {
  const s = createSketch(W, 636);
  s.header({ label: '图 3', title: '三层各管一件事，你只需要动最上面一层' });

  const layer = (y, title, items, color, highlight = false) => {
    const h = 124;
    s.box(M, y, W - M * 2, h, { stroke: color, sw: highlight ? 2.4 : 1.8 });
    s.text(M, y + 14, W - M * 2, title, { size: 22, weight: 700, align: 'center', color });
    const iw = 180;
    const x0 = (W - items.length * iw - (items.length - 1) * 14) / 2;
    items.forEach((label, i) => {
      // 强调落在小卡片上，整层铺满填充会压住文字
      s.card(x0 + i * (iw + 14), y + 62, iw, 44, label, {
        r: 8, stroke: color, size: 16,
        ...(highlight ? { fill: YELLOW, hachureGap: 12 } : {}),
      });
    });
  };

  layer(140, '图形定义  figures.mjs', ['摆坐标', '选颜色', '写标签'], GREEN, true);
  s.arrow(W / 2, 268, W / 2, 294, { stroke: GRAY });
  layer(300, '渲染 CLI  render.mjs', ['批量出图', '导出 PNG', '只重渲一张'], VIOLET);
  s.arrow(W / 2, 428, W / 2, 454, { stroke: GRAY });
  layer(460, '渲染库  sketch.mjs', ['手绘笔触', '斜线填充', '文字排版'], BLUE);

  return s;
}

/* ------------------------------------------------------------ 图 4：并列分工 */

function roles() {
  const s = createSketch(W, 560);
  s.header({ label: '图 4', title: '人定结论，Agent 写坐标，脚本负责画' });

  const defs = [
    ['人', GREEN, 'person', [['flag', '定结论'], ['scale', '做取舍'], ['magnifier', '看图'], ['stamp', '拍板']]],
    ['Agent', VIOLET, 'bot', [['bulb', '选图式'], ['pencil', '写坐标'], ['wrench', '修重叠'], ['undo', '重渲染']]],
    ['脚本', INK, 'gear', [['ruler', '笔触'], ['files', '填充'], ['checklist', '排版'], ['lock', '可复现']]],
  ];
  const { w, x } = cols(defs.length, M, M, 36);

  defs.forEach(([title, color, bigIcon, items], c) => {
    const x0 = x(c);
    s.box(x0, 126, w, 372, { r: 18, stroke: color, sw: 2 });
    s[bigIcon](x0 + w / 2, 182, 66, { stroke: color });
    s.text(x0, 222, w, title, { size: 25, weight: 700, align: 'center', color });
    items.forEach(([kind, label], i) => {
      s.iconLabel(kind, x0 + (i % 2 === 0 ? w * 0.28 : w * 0.72), i < 2 ? 314 : 420, 48, label,
        { stroke: color, color });
    });
  });

  return s;
}

/* ------------------------------------------------------------ 图 5：闭环 */

function loop() {
  const s = createSketch(W, 562);
  s.header({ label: '图 5', title: '前两轮需要调坐标是正常的，这个循环很便宜' });

  const node = (cx, cy, label, color, highlight = false) => {
    s.card(cx - 100, cy - 30, 200, 60, label, {
      stroke: color,
      sw: highlight ? 2.3 : 1.8,
      ...(highlight ? { fill: YELLOW, hachureGap: 15 } : {}),
    });
  };

  node(600, 200, '写坐标', INK);
  node(940, 340, '渲染出图', VIOLET);
  node(600, 480, '打开图看', GREEN, true);
  node(260, 340, '改坐标', BLUE);

  const o = { stroke: GRAY, sw: 1.7 };
  s.curve(706, 218, 830, 232, 905, 302, o);
  s.curve(935, 376, 862, 468, 708, 490, o);
  s.curve(494, 490, 340, 468, 265, 376, o);
  s.curve(260, 302, 336, 210, 492, 186, o);

  s.undo(600, 312, 76, { stroke: GRAY });
  s.text(450, 358, 300, '一轮几秒钟\n发现问题就再跑一轮', { size: 18, align: 'center', color: GRAY });

  return s;
}

/* ------------------------------------------------------------ 图 6：时间线 */

function timeline() {
  const s = createSketch(W, 448);
  s.header({ label: '图 6', title: '时间主要花在想结论和看图上，不是画图上' });

  const axisY = 258;
  s.arrow(70, axisY, 1138, axisY, { stroke: INK, sw: 2 });

  // 图标尺寸就是权重，大的那两步才是真正吃时间的
  const stages = [
    ['bulb', '想清结论', '一句话能说完', VIOLET, 68],
    ['scale', '选图式', '一张图一种', GRAY, 26],
    ['pencil', '写坐标', '从网格推导', INK, 44],
    ['gear', '渲染', 'node render.mjs', GRAY, 22],
    ['magnifier', '看图调整', '通常要两轮', GREEN, 68],
    ['stamp', '定稿', 'SVG 进仓库', GRAY, 30],
  ];

  stages.forEach(([kind, name, note, color, size], i) => {
    const cx = 150 + i * 180;
    s.line(cx, axisY - 9, cx, axisY + 9, { stroke: INK, sw: 1.6 });
    s[kind](cx, axisY - 62, size, { stroke: color });
    s.text(cx - 85, axisY + 22, 170, name, { size: 20, weight: 700, align: 'center', color });
    s.text(cx - 85, axisY + 52, 170, note, { size: 15, align: 'center', color: GRAY });
  });

  s.footer(370, '图标越大，这一步越费时间；脚本负责的那一步反而最快。');

  return s;
}

export const FIGURES = [
  ['01-flow', flow],
  ['02-compare', compare],
  ['03-layers', layers],
  ['04-roles', roles],
  ['05-loop', loop],
  ['06-timeline', timeline],
];
