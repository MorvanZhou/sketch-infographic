/**
 * 图形定义模板 —— 复制一份就能开始改。
 *
 * 渲染：
 *   node render.mjs figures.mjs --png
 *   node render.mjs figures.mjs --png --only 01-flow
 *
 * 每张图 = 一个函数 + 一个 id，最后放进 FIGURES 导出。
 * 写图前先想清楚：这张图的唯一结论是什么？标题就写那句结论。
 */

import {
  createSketch, INK, RED, BLUE, GREEN, VIOLET, GRAY, YELLOW,
} from '../scripts/sketch.mjs';

/* ------------------------------------------------------------ 网格辅助 */

const W = 1200;   // 画布宽度统一，一组图排进文档大小才一致
const M = 48;     // 页边距
const GUT = 24;   // 元素间距

/** n 等分列：返回第 i 列的 x 与列宽 */
function cols(n, left = M, right = M, gutter = GUT) {
  const w = (W - left - right - gutter * (n - 1)) / n;
  return { w, x: (i) => left + i * (w + gutter) };
}

/* ------------------------------------------------------------ 图 1：横向流程 */

function flow() {
  const s = createSketch(W, 460);
  s.header({ label: '图 1', title: '把结论写在标题里，而不是写「流程示意图」' });

  const steps = [
    ['收集输入', GRAY],
    ['处理加工', VIOLET],
    ['校验检查', BLUE],
    ['交付上线', GREEN],
  ];
  const { w, x } = cols(steps.length);

  steps.forEach(([label, color], i) => {
    s.card(x(i), 190, w, 72, label, { stroke: color, sw: i === 1 ? 2.2 : 1.8 });
    if (i < steps.length - 1) s.arrow(x(i) + w + 2, 226, x(i + 1) - 4, 226, { stroke: GRAY });
  });

  // 返工路径用虚线，和主干区分开
  s.curve(x(2) + w / 2, 268, (x(1) + x(2)) / 2 + w / 2, 350, x(1) + w / 2, 268,
    { stroke: RED, dash: true, sw: 1.8 });
  s.text(x(1) + w / 2, 352, 200, '不通过则返工', { size: 17, color: RED, align: 'center' });

  return s;
}

/* ------------------------------------------------------------ 图 2：左右对比 */

function compare() {
  const s = createSketch(W, 620);
  s.header({ label: '图 2', title: '变化的是什么', sub: '左右同构，只让差异处变色' });

  const mid = W / 2;
  s.line(mid, 130, mid, 540, { dash: true, stroke: GRAY, sw: 1.5 });

  const side = (x0, title, color, items) => {
    s.text(x0, 148, 460, title, { size: 24, weight: 700, color, align: 'center' });
    items.forEach((label, i) => {
      const y = 210 + i * 86;
      s.card(x0 + 60, y, 340, 58, label, { stroke: color });
      if (i < items.length - 1) s.arrow(x0 + 230, y + 62, x0 + 230, y + 82, { stroke: color });
    });
  };

  side(M, '过去', GRAY, ['人工接力', '逐个实现', '结果难复用']);
  side(mid + 20, '现在', VIOLET, ['自助生产', '系统执行', '沉淀成资产']);

  return s;
}

/* ------------------------------------------------------------ 图 3：纵向分层 */

function layers() {
  const s = createSketch(W, 620);
  s.header({ label: '图 3', title: '系统分成了哪几层，各自负责什么' });

  const layer = (y, h, title, items, color, highlight = false) => {
    s.box(M, y, W - M * 2, h, {
      stroke: color, sw: highlight ? 2.3 : 1.8,
      ...(highlight ? { fill: YELLOW, hachureGap: 20 } : {}),
    });
    s.text(M, y + 14, W - M * 2, title, { size: 22, weight: 700, align: 'center', color });
    const iw = 180;
    const startX = (W - items.length * iw - (items.length - 1) * 14) / 2;
    items.forEach((label, i) => {
      s.card(startX + i * (iw + 14), y + 62, iw, 44, label, { r: 8, stroke: color, size: 16 });
    });
  };

  layer(140, 124, '使用层', ['提出目标', '提供材料', '确认结果'], GREEN);
  s.arrow(W / 2, 268, W / 2, 292, { stroke: VIOLET });
  layer(300, 124, '能力层', ['理解上下文', '执行动作', '反馈结果'], VIOLET, true);
  s.arrow(W / 2, 428, W / 2, 452, { stroke: BLUE });
  layer(460, 124, '底座层', ['数据', '规则', '权限'], BLUE);

  return s;
}

/* ------------------------------------------------------------ 图 4：并列分工 */

function roles() {
  const s = createSketch(W, 580);
  s.header({ label: '图 4', title: '三方各自负责什么' });

  const defs = [
    ['程序', INK, 'gear', [['ruler', '校验'], ['lock', '权限'], ['files', '结构'], ['undo', '备份']]],
    ['系统', VIOLET, 'bot', [['bulb', '方案'], ['pencil', '修改'], ['magnifier', '定位'], ['wrench', '修复']]],
    ['人', GREEN, 'person', [['flag', '目标'], ['scale', '取舍'], ['stamp', '发布'], ['undo', '回滚']]],
  ];
  const { w, x } = cols(defs.length, M, M, 36);

  defs.forEach(([title, color, bigIcon, items], c) => {
    const x0 = x(c);
    s.box(x0, 120, w, 390, { r: 18, stroke: color, sw: 2 });
    s[bigIcon](x0 + w / 2, 180, 70, { stroke: color });
    s.text(x0, 224, w, title, { size: 26, weight: 700, align: 'center', color });
    items.forEach(([kind, label], i) => {
      s.iconLabel(kind, x0 + (i % 2 === 0 ? w * 0.28 : w * 0.72), i < 2 ? 322 : 434, 50, label,
        { stroke: color, color });
    });
  });

  return s;
}

export const FIGURES = [
  ['01-flow', flow],
  ['02-compare', compare],
  ['03-layers', layers],
  ['04-roles', roles],
];
