/**
 * 跨领域展示案例：按 SKILL.md 用通用视觉语法组合，不绑定单一行业。
 *
 * 渲染：
 *   node render.mjs figures.mjs --lint-strict --png
 */

import {
  createSketch, R, assertNoOverlap,
  INK, RED, BLUE, GREEN, VIOLET, GRAY, YELLOW, PAPER,
} from './sketch.mjs';
import { FIGURES as CNN_FIGURES } from './cnn-figures.mjs';

/* ------------------------------------------ 1. 研究框架（学术，高密度） */

function stageCard(s, box, title, bullets, icon, color) {
  s.box(box.x, box.y, box.w, box.h, { stroke: color, r: 12, sw: 1.9 });
  s.lucideIcon(icon, box.x + 26, box.y + 28, 24, {
    stroke: color, id: `icon-${box.id}`, parent: box.id,
  });
  s.text(box.x + 48, box.y + 16, box.w - 60, title, {
    size: 18, weight: 700, color, fit: false,
  });
  bullets.forEach((line, i) => {
    s.text(box.x + 16, box.y + 52 + i * 22, box.w - 28, `· ${line}`, {
      size: 13, color: INK,
    });
  });
}

function researchFramework() {
  const s = createSketch({ width: 1400, height: 850 });
  s.header({
    title: '研究从问题走到结论，中间靠可检验的证据链',
    sub: '设计 → 执行 → 解释；每一步都能被追问“凭什么成立”',
  });

  // 三层泳道
  const design = R(40, 145, 1320, 210, { id: 'lane-design', kind: 'region' });
  const execute = R(40, 375, 900, 220, { id: 'lane-execute', kind: 'region' });
  const interpret = R(970, 375, 390, 220, { id: 'lane-interpret', kind: 'region' });
  [design, execute, interpret].forEach((box) => s.track(box));
  [
    [design, '① 研究设计', VIOLET],
    [execute, '② 执行与证据', GREEN],
    [interpret, '③ 解释与边界', BLUE],
  ].forEach(([box, title, color]) => {
    s.box(box.x, box.y, box.w, box.h, { stroke: color, r: 14, sw: 1.5 });
    s.text(box.x + 14, box.y + 10, 280, title, { size: 21, weight: 700, color, fit: false });
  });

  const q = R(60, 200, 240, 140, 'question');
  const lit = R(330, 200, 240, 140, 'literature');
  const h = R(600, 200, 240, 140, 'hypothesis');
  const designNote = R(870, 200, 240, 140, 'design');
  const rival = R(1140, 200, 200, 140, 'rival');

  const m = R(60, 440, 260, 140, 'method');
  const data = R(360, 440, 260, 140, 'data');
  const e = R(660, 440, 250, 140, 'evidence');

  const validity = R(1000, 440, 330, 140, 'validity');

  assertNoOverlap([
    ['问题', q], ['文献', lit], ['假设', h], ['设计', designNote], ['竞争', rival],
  ], 12);
  assertNoOverlap([['方法', m], ['数据', data], ['证据', e]], 12);

  stageCard(s, q, '研究问题', ['可观察、可争论', '明确单位与边界', '为何此刻值得问'], 'microscope', VIOLET);
  stageCard(s, lit, '既有知识', ['理论缺口', '方法先例', '关键概念操作化'], 'book-open', BLUE);
  stageCard(s, h, '可检验假设', ['预期方向 / 零假设', '可被证伪', '效应量预期'], 'flask-conical', BLUE);
  stageCard(s, designNote, '识别策略', ['对照 / 工具变量', '抽样与功效', '预注册要点'], 'clipboard-list', INK);
  stageCard(s, rival, '竞争解释', ['混淆因素', '反向因果', '选择偏差'], 'git-compare', RED);

  stageCard(s, m, '数据采集', ['测量与编码', '缺失与噪声', '伦理与可复现'], 'table', GREEN);
  stageCard(s, data, '分析与稳健性', ['主分析路径', '安慰剂 / 子集', '敏感性检查'], 'sigma', GREEN);
  stageCard(s, e, '证据与不确定度', ['效应 + 区间', '证据强度分级', '失败模式记录'], 'chart-column', INK);

  stageCard(s, validity, '效度清单', ['内/外/构念效度', '统计结论效度', '推广条件'], 'shield-check', BLUE);

  // 设计层横向
  s.connect(q, 'e', lit, 'w', { id: 'q-lit', stroke: GRAY });
  s.connect(lit, 'e', h, 'w', { id: 'lit-h', stroke: GRAY });
  s.connect(h, 'e', designNote, 'w', { id: 'h-design', stroke: GRAY });
  s.connect(designNote, 'e', rival, 'w', {
    id: 'design-rival', stroke: RED, dash: true, label: '对抗', labelSize: 13,
  });

  // 设计 → 执行
  s.connect(h, 's', m, 'n', {
    id: 'h-m', stroke: VIOLET, label: '可操作化', labelSize: 13,
  });
  s.connect(m, 'e', data, 'w', { id: 'm-data', stroke: GREEN });
  s.connect(data, 'e', e, 'w', { id: 'data-e', stroke: GREEN });
  s.connect(e, 'e', validity, 'w', {
    id: 'e-val', stroke: BLUE, label: '质询', labelSize: 13,
  });

  // 结论三栏
  const concl = R(60, 640, 1120, 150, 'conclusion');
  s.box(concl.x, concl.y, concl.w, concl.h, {
    stroke: VIOLET, fill: YELLOW, fillStyle: 'hachure', hachureGap: 16, sw: 2.2, r: 14,
  });
  s.track(concl);
  s.text(concl.x + 20, concl.y + 14, 480, '结论：拆成三句话写清楚', {
    size: 21, weight: 700, color: VIOLET, fit: false,
  });

  const c1 = R(90, 690, 320, 70, 'c-support');
  const c2 = R(450, 690, 320, 70, 'c-limit');
  const c3 = R(810, 690, 320, 70, 'c-next');
  [
    [c1, '支持什么', '与假设一致的发现', GREEN],
    [c2, '不支持 / 边界', '失败案例与外推限制', RED],
    [c3, '下一步', '新问题、新设计、开放数据', BLUE],
  ].forEach(([box, title, body, color]) => {
    s.box(box.x, box.y, box.w, box.h, { stroke: color, r: 10, sw: 1.6 });
    s.text(box.x + 12, box.y + 10, box.w - 24, title, {
      size: 17, weight: 700, color, fit: false,
    });
    s.text(box.x + 12, box.y + 36, box.w - 24, body, { size: 13, color: INK });
  });

  s.connect(e, 's', concl, 'n', {
    id: 'e-concl', stroke: VIOLET, label: '综合解释', labelSize: 13,
  });
  s.connect(validity, 's', concl, 'e', {
    id: 'val-concl', stroke: BLUE, dash: true, allowOverlap: true,
  });

  // 反馈：结论 → 问题
  s.bypass(concl, 'w', q, 'w', {
    id: 'feedback', via: 'left', pad: 28, dash: true, stroke: RED,
    label: '修正问题', labelSize: 13,
  });

  // 侧注
  const tip = R(1210, 640, 150, 150, 'tip');
  s.box(tip.x, tip.y, tip.w, tip.h, { stroke: GRAY, r: 12, sw: 1.4 });
  s.lucideIcon('circle-question-mark', tip.x + tip.w / 2, tip.y + 36, 28, {
    stroke: GRAY, id: 'icon-tip', parent: tip.id,
  });
  s.text(tip.x + 10, tip.y + 64, tip.w - 20, '读者追问：\n证据链哪一环\n最脆弱？', {
    size: 13, align: 'center', color: INK,
  });

  return s;
}

/* ------------------------------------------ 2. 教学形态图（叶片当主体） */

/**
 * 形态当主体时的标准做法：先写一个几何函数，叶形、叶脉、气孔、叶绿体
 * 的位置全部从它推导，而不是手写一堆贝塞尔控制点。
 * 改叶子胖瘦只要动 LEAF_A / LEAF_B，内部构件会跟着走，不会戳出轮廓。
 */
const LEAF = { cx: 620, tipY: 196, len: 476, maxHalf: 206 };
const LEAF_A = 1.15; // 越大叶尖越尖
const LEAF_B = 1.0;  // 越大叶基越尖

const leafRaw = (t) => (t <= 0 || t >= 1 ? 0 : t ** LEAF_A * (1 - t) ** LEAF_B);
const LEAF_PEAK = (() => {
  let m = 0;
  for (let i = 0; i <= 400; i += 1) m = Math.max(m, leafRaw(i / 400));
  return m;
})();

/** t=0 叶尖、t=1 叶基 */
const leafY = (t) => LEAF.tipY + t * LEAF.len;
/** 该高度的半宽 */
const leafHalf = (t) => (LEAF.maxHalf * leafRaw(t)) / LEAF_PEAK;
/** 叶缘上的点 */
const leafEdge = (t, side) => [LEAF.cx + side * leafHalf(t), leafY(t)];
/** 叶肉内的点：按该高度半宽的比例取，保证落在叶片里 */
const leafInner = (t, frac) => [LEAF.cx + frac * leafHalf(t), leafY(t)];

/** 采样点连成平滑 path，省得手写控制点 */
function smoothPath(pts, close = false) {
  const f = (n) => n.toFixed(1);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q ${f(x)} ${f(y)}, ${f((x + nx) / 2)} ${f((y + ny) / 2)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${f(last[0])} ${f(last[1])}`;
  return close ? `${d} Z` : d;
}

const PETIOLE = { t: 0.955, y2: 766, half: 31 };

function drawLeafBody(s) {
  const steps = 30;
  const right = [];
  const left = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    right.push(leafEdge(t, 1));
    left.push(leafEdge(t, -1));
  }
  s.path(smoothPath([...right, ...left.reverse()], true), {
    stroke: GREEN, sw: 2.4, roughness: 0.8,
    fill: GREEN, fillStyle: 'solid', fillOpacity: 0.09,
  });

  s.path(`M ${LEAF.cx} ${LEAF.tipY + 20} Q ${LEAF.cx + 5} ${leafY(0.55)}, ${LEAF.cx} ${leafY(0.985)}`, {
    stroke: GREEN, sw: 2, roughness: 0.9,
  });

  // 侧脉朝叶尖斜出去。终点半宽按「终点那个高度」算，收窄处才不会戳出叶缘
  for (const t of [0.24, 0.4, 0.56, 0.72, 0.87]) {
    const rise = 34;
    const endT = Math.max(t - rise / LEAF.len, 0.02);
    const reach = Math.min(leafHalf(t), leafHalf(endT)) * 0.8;
    for (const side of [1, -1]) {
      s.path(
        `M ${LEAF.cx} ${leafY(t)}`
        + ` Q ${LEAF.cx + side * reach * 0.55} ${leafY(t) - rise * 0.3},`
        + ` ${LEAF.cx + side * reach} ${leafY(endT)}`,
        { stroke: GREEN, sw: 1.2, roughness: 0.95 },
      );
    }
  }

  // 叶柄：接在叶基，宽度和该处叶宽对上
  for (const side of [1, -1]) {
    s.line(
      LEAF.cx + side * PETIOLE.half, leafY(PETIOLE.t),
      LEAF.cx + side * PETIOLE.half * 0.8, PETIOLE.y2,
      { stroke: GREEN, sw: 2.1, roughness: 0.8 },
    );
  }
}

/** 气孔：两片保卫细胞夹出梭形，中间是真正的孔 */
function drawStoma(s, t, side, color) {
  const [ix, iy] = leafInner(t, side * 0.84);
  const w = 52;
  const h = 15;
  for (const s2 of [1, -1]) {
    s.path(`M ${ix - w / 2} ${iy} Q ${ix} ${iy + s2 * h * 2}, ${ix + w / 2} ${iy}`, {
      stroke: color, sw: 2, roughness: 0.7,
      fill: color, fillStyle: 'solid', fillOpacity: 0.12,
    });
  }
  s.ellipse(ix, iy, 22, 9, {
    stroke: color, sw: 1.4, roughness: 0.65,
    fill: color, fillStyle: 'solid', fillOpacity: 0.55,
  });
  return [ix, iy];
}

/** 叶绿体：外膜 + 基粒叠层，层数和间距都按 scale 算 */
function drawChloroplast(s, cx, cy, scale, detailed = false) {
  const w = 236 * scale;
  const h = 146 * scale;

  // 先盖掉底下的叶脉，补回叶肉底色，再画外膜
  s.ellipse(cx, cy, w, h, {
    stroke: PAPER, sw: 1, roughness: 0.6,
    fill: PAPER, fillStyle: 'solid', fillOpacity: 1,
  });
  s.ellipse(cx, cy, w, h, {
    stroke: PAPER, sw: 1, roughness: 0.6,
    fill: GREEN, fillStyle: 'solid', fillOpacity: 0.09,
  });
  s.ellipse(cx, cy, w, h, {
    stroke: GREEN, sw: 2.1 * Math.max(scale, 0.6), roughness: 0.85,
  });

  const stacks = detailed ? 3 : 2;
  const layers = detailed ? 4 : 3;
  for (let g = 0; g < stacks; g += 1) {
    const gx = cx + (g - (stacks - 1) / 2) * 72 * scale;
    for (let i = 0; i < layers; i += 1) {
      s.ellipse(
        gx, cy - (layers - 1) * 7.5 * scale + i * 15 * scale,
        48 * scale, 11.5 * scale,
        {
          stroke: GREEN, sw: 1.3 * Math.max(scale, 0.55), roughness: 0.75,
          fill: GREEN, fillStyle: 'solid', fillOpacity: 0.26,
        },
      );
    }
    if (detailed && g < stacks - 1) {
      s.path(
        `M ${gx + 23 * scale} ${cy + 28 * scale}`
        + ` Q ${gx + 36 * scale} ${cy + 41 * scale}, ${gx + 49 * scale} ${cy + 28 * scale}`,
        { stroke: GREEN, sw: 1.1, roughness: 0.85 },
      );
    }
  }
}

function photosynthesisLesson() {
  const s = createSketch(1320, 820, { stroke: { roughness: 1 } });
  s.header({
    title: '光合作用：叶子把光能变成糖',
    sub: '光落在叶面，气体走气孔，水和糖在同一条叶脉里反向走',
  });

  drawLeafBody(s);

  // 叶肉里到处是叶绿体，中间这颗放大到能看见基粒
  drawChloroplast(s, ...leafInner(0.5, 0), 1, true);
  drawChloroplast(s, ...leafInner(0.22, -0.46), 0.3);
  drawChloroplast(s, ...leafInner(0.28, 0.5), 0.24);
  drawChloroplast(s, ...leafInner(0.78, -0.5), 0.27);
  drawChloroplast(s, ...leafInner(0.85, 0.42), 0.21);

  // —— 左上：光 ——
  const sun = R(92, 190, 140, 140, 'sun');
  s.circle(162, 260, 86, {
    stroke: YELLOW, sw: 2.8, fill: YELLOW, fillStyle: 'solid', fillOpacity: 0.55,
  });
  for (let i = 0; i < 8; i += 1) {
    const a = (i * 45 * Math.PI) / 180;
    s.line(
      162 + Math.cos(a) * 53, 260 + Math.sin(a) * 53,
      162 + Math.cos(a) * 68, 260 + Math.sin(a) * 68,
      { stroke: YELLOW, sw: 2.3 },
    );
  }
  s.track(sun);

  const sunTxt = R(66, 348, 196, 58, 'sun-txt');
  s.text(sunTxt.x, sunTxt.y, sunTxt.w, '光能', { size: 20, weight: 700, align: 'center' });
  s.text(sunTxt.x, sunTxt.y + 29, sunTxt.w, '叶绿素负责接住', {
    size: 14, color: GRAY, align: 'center',
  });
  s.track(sunTxt);

  // 三束光斜打在叶面左上，箭头停在叶缘上
  [0.22, 0.34, 0.47].forEach((t, i) => {
    const [ex, ey] = leafEdge(t, -1);
    s.arrow(248, 222 + i * 44, ex - 5, ey - 4, { stroke: YELLOW, sw: 2.5, head: 13 });
  });

  // —— 左下：二氧化碳进气孔 ——
  const [inX, inY] = drawStoma(s, 0.66, -1, BLUE);
  s.wireLabel(inX - 176, inY + 24, 140, '气孔', { size: 13, color: GRAY, align: 'right' });

  const co2 = R(62, 486, 224, 62, 'co2');
  s.text(co2.x, co2.y, co2.w, '二氧化碳 CO₂', { size: 19, weight: 700, color: BLUE });
  s.text(co2.x, co2.y + 29, co2.w, '从气孔进来', { size: 14, color: GRAY });
  s.track(co2);
  s.arrow(296, 512, inX - 36, inY - 2, { stroke: BLUE, sw: 2.5, head: 13 });
  s.trackRoute([[296, 512], [inX - 36, inY - 2]], { id: 'co2-in', from: co2 });

  // —— 右下：氧气出气孔 ——
  const [outX, outY] = drawStoma(s, 0.6, 1, VIOLET);

  const oxygen = R(952, 476, 252, 62, 'oxygen');
  s.text(oxygen.x, oxygen.y, oxygen.w, '氧气 O₂', { size: 19, weight: 700, color: VIOLET });
  s.text(oxygen.x, oxygen.y + 29, oxygen.w, '水被拆开时放出来', { size: 14, color: GRAY });
  s.track(oxygen);
  s.arrow(outX + 36, outY - 2, 942, 496, { stroke: VIOLET, sw: 2.5, head: 13 });
  s.trackRoute([[outX + 36, outY - 2], [942, 496]], { id: 'o2-out', to: oxygen });

  // —— 右中：叶绿体注解 ——
  const chl = R(952, 306, 284, 88, 'chl');
  s.text(chl.x, chl.y, chl.w, '叶绿体', { size: 19, weight: 700, color: GREEN });
  s.text(chl.x, chl.y + 29, chl.w, '一叠一叠的基粒，\n光反应就在这些膜上', {
    size: 14, color: GRAY,
  });
  s.track(chl);
  s.path(`M 942 342 Q 872 348, ${LEAF.cx + 126} ${leafY(0.5) - 36}`, {
    stroke: GRAY, sw: 1.4, dash: '5 5', roughness: 0.7,
  });

  // —— 右上：总反应式 ——
  const eqn = R(952, 160, 284, 92, 'eqn');
  s.box(eqn.x, eqn.y, eqn.w, eqn.h, { stroke: INK, sw: 1.6, r: 10, roughness: 0.8 });
  s.text(eqn.x + 14, eqn.y + 20, eqn.w - 28, '6 CO₂ + 6 H₂O + 光能', { size: 16, align: 'center' });
  s.text(eqn.x + 14, eqn.y + 48, eqn.w - 28, '→ C₆H₁₂O₆ + 6 O₂', { size: 16, align: 'center' });
  s.track(eqn);

  // —— 底：同一条叶脉，水上行、糖下行 ——
  s.arrow(LEAF.cx - 16, PETIOLE.y2 - 12, LEAF.cx - 16, leafY(PETIOLE.t) - 40, {
    stroke: BLUE, sw: 2.8, head: 13,
  });
  s.arrow(LEAF.cx + 16, leafY(PETIOLE.t) - 40, LEAF.cx + 16, PETIOLE.y2 - 12, {
    stroke: VIOLET, sw: 2.8, head: 13,
  });

  const water = R(300, 690, 268, 62, 'water');
  s.text(water.x, water.y, water.w, '水 H₂O 往上走', {
    size: 19, weight: 700, color: BLUE, align: 'right',
  });
  s.text(water.x, water.y + 29, water.w, '根吸的水沿木质部上来', {
    size: 14, color: GRAY, align: 'right',
  });
  s.track(water);
  s.arrow(578, 716, LEAF.cx - PETIOLE.half - 12, 722, { stroke: BLUE, sw: 1.8, head: 10 });

  const sugar = R(676, 690, 276, 62, 'sugar');
  s.text(sugar.x, sugar.y, sugar.w, '糖往下走', { size: 19, weight: 700, color: VIOLET });
  s.text(sugar.x, sugar.y + 29, sugar.w, '沿韧皮部送去别的器官', { size: 14, color: GRAY });
  s.track(sugar);
  s.arrow(666, 716, LEAF.cx + PETIOLE.half + 12, 722, { stroke: VIOLET, sw: 1.8, head: 10 });

  assertNoOverlap([
    ['太阳', sun], ['光能', sunTxt], ['二氧化碳', co2], ['氧气', oxygen],
    ['叶绿体', chl], ['总反应式', eqn], ['水', water], ['糖', sugar],
  ], 16);

  return s;
}

/* ------------------------------------------ 3. 政策影响路径 */

function policyStakeholders() {
  const s = createSketch({ width: 1200, height: 730 });
  s.header({
    title: '限塑政策如何改写各方行为',
    sub: '政府规则 → 商家与供应链调整 → 消费者选择 → 环境影响',
  });

  const gov = R(480, 160, 240, 80, 'gov');
  const shop = R(120, 360, 220, 90, 'shop');
  const supply = R(480, 360, 240, 90, 'supply');
  const user = R(860, 360, 220, 90, 'user');
  const env = R(480, 580, 240, 90, 'env');
  assertNoOverlap([['商家', shop], ['供应链', supply], ['消费者', user]], 40);

  [
    [gov, '政策与标准', 'landmark', RED],
    [shop, '商家\n定价 / 替代品', 'store', BLUE],
    [supply, '供应商\n材料切换', 'truck', VIOLET],
    [user, '消费者\n习惯变化', 'users', GREEN],
    [env, '环境结果\n废弃物下降', 'leaf', GREEN],
  ].forEach(([box, label, icon, color]) => {
    s.lucideIcon(icon, box.x + 28, box.y + box.h / 2, 26, {
      stroke: color, id: `icon-${box.id}`, parent: box.id,
    });
    s.card(box.x, box.y, box.w, box.h, label, {
      stroke: color, size: 17, weight: 700, fit: false,
    });
  });

  s.connect(gov, 's', supply, 'n', {
    id: 'gov-supply', stroke: RED, label: '强制标准', labelSize: 13, allowOverlap: true,
  });
  s.connect(gov, 'w', shop, 'n', { id: 'gov-shop', stroke: RED, allowOverlap: true });
  s.connect(gov, 'e', user, 'n', { id: 'gov-user', stroke: RED, allowOverlap: true });
  s.connect(supply, 'w', shop, 'e', {
    id: 'supply-shop', stroke: VIOLET, label: '供货', labelSize: 13,
  });
  s.bypass(shop, 'n', user, 'n', {
    id: 'shop-user', via: 'above', pad: 72, stroke: BLUE, label: '价格信号', labelSize: 13,
    allowCrossing: true, allowOverlap: true,
  });
  s.connect(user, 's', env, 'e', { id: 'user-env', stroke: GREEN });
  s.connect(shop, 's', env, 'w', { id: 'shop-env', stroke: GREEN });
  s.connect(supply, 's', env, 'n', {
    id: 'supply-env', dash: true, stroke: GRAY, label: '材料足迹', labelSize: 13,
  });

  return s;
}

/* ------------------------------------------ 4. 系统拓扑 */

function serviceTopology() {
  const s = createSketch({ width: 1200, height: 590 });
  s.header({
    title: '同步请求贴边走，异步事件走外侧通道',
    sub: '通用拓扑语法：边界、节点、主干连接、回流绕行',
  });

  const client = R(70, 220, 150, 70, 'client');
  const gateway = R(280, 205, 160, 100, 'gateway');
  const domain = R(500, 150, 620, 380, { id: 'domain', kind: 'region' });
  const order = R(540, 230, 150, 70, 'order');
  const pay = R(760, 230, 150, 70, 'pay');
  const stock = R(540, 390, 150, 70, 'stock');
  const notify = R(760, 390, 150, 70, 'notify');
  s.track(domain);

  s.card(client.x, client.y, client.w, client.h, '客户端', {
    stroke: GREEN, size: 17, weight: 700, fit: false,
  });
  s.box(gateway.x, gateway.y, gateway.w, gateway.h, {
    stroke: BLUE, fill: YELLOW, fillStyle: 'dots', hachureGap: 10,
  });
  s.inBox(gateway.x, gateway.y, gateway.w, gateway.h, '网关', {
    size: 20, weight: 700, color: BLUE, fit: false,
  });
  s.box(domain.x, domain.y, domain.w, domain.h, { stroke: VIOLET, r: 16, sw: 2 });
  s.text(domain.x, domain.y + 14, domain.w, '业务域', {
    size: 21, align: 'center', color: VIOLET, weight: 700, fit: false,
  });

  [
    [order, '订单', VIOLET],
    [pay, '支付', BLUE],
    [stock, '库存', INK],
    [notify, '通知', GREEN],
  ].forEach(([box, label, color]) => {
    s.card(box.x, box.y, box.w, box.h, label, {
      stroke: color, size: 18, weight: 700, fit: false,
    });
  });

  s.connect(client, 'e', gateway, 'w', { id: 'client-gw', stroke: GRAY });
  s.connect(gateway, 'e', order, 'w', { id: 'gw-order', stroke: INK });
  s.connect(order, 'e', pay, 'w', { id: 'order-pay', stroke: INK });
  s.connect(order, 's', stock, 'n', { id: 'order-stock', stroke: INK });
  s.connect(pay, 's', notify, 'n', { id: 'pay-notify', stroke: INK });
  s.bypass(order, 'n', notify, 'e', {
    id: 'pay-event', via: 'above', pad: 34, dash: true, stroke: RED,
    label: '领域事件总线', labelSize: 13,
  });

  return s;
}

/* ------------------------------------------ 5. 左右对比 */

function approachCompare() {
  const s = createSketch({ width: 1200, height: 590 });
  s.header({
    title: '同一目标，两条路径的关键差别',
    sub: '左右同构，只让差异变色',
  });

  const left = R(70, 170, 480, 360, { id: 'left', kind: 'region' });
  const right = R(650, 170, 480, 360, { id: 'right', kind: 'region' });
  s.track(left);
  s.track(right);

  s.box(left.x, left.y, left.w, left.h, { stroke: RED, r: 16 });
  s.box(right.x, right.y, right.w, right.h, { stroke: GREEN, r: 16 });
  s.text(left.x, left.y + 20, left.w, '旧路径：人工串联', {
    size: 22, align: 'center', color: RED, weight: 700, fit: false,
  });
  s.text(right.x, right.y + 20, right.w, '新路径：自动编排', {
    size: 22, align: 'center', color: GREEN, weight: 700, fit: false,
  });

  const leftItems = [
    R(110, 250, 400, 56, 'l1'),
    R(110, 330, 400, 56, 'l2'),
    R(110, 410, 400, 56, 'l3'),
  ];
  const rightItems = [
    R(690, 250, 400, 56, 'r1'),
    R(690, 330, 400, 56, 'r2'),
    R(690, 410, 400, 56, 'r3'),
  ];
  ['多人交接', '状态靠聊天同步', '出错后难追溯'].forEach((label, i) => {
    s.card(leftItems[i].x, leftItems[i].y, leftItems[i].w, leftItems[i].h, label, {
      stroke: RED, size: 17, fit: false,
    });
  });
  ['单一编排入口', '状态可观测', '失败可回放'].forEach((label, i) => {
    s.card(rightItems[i].x, rightItems[i].y, rightItems[i].w, rightItems[i].h, label, {
      stroke: GREEN, size: 17, fit: false,
    });
  });

  s.line(600, 190, 600, 510, { stroke: GRAY, dash: true, sw: 1.4 });
  s.lucideIcon('x', 310, 520, 28, { stroke: RED });
  s.lucideIcon('check', 890, 520, 28, { stroke: GREEN });
  return s;
}

/* ------------------------------------------ 6. 时间线旅程 */

function onboardingJourney() {
  const s = createSketch({ width: 1200, height: 580 });
  s.header({
    title: '新用户七天：从好奇到习惯，或流失',
    sub: '时间轴 + 情绪变化 + 风险点',
  });

  s.arrow(80, 320, 1120, 320, { stroke: GRAY, sw: 1.6 });

  const steps = [
    [120, '下载', '好奇', GREEN, 'download'],
    [280, '注册', '犹豫', BLUE, 'user-round-plus'],
    [440, '首个任务', '成就', VIOLET, 'flag'],
    [600, '提醒', '打扰?', RED, 'bell'],
    [760, '回归', '习惯', GREEN, 'refresh-cw'],
    [920, '分享', '扩散', BLUE, 'share-2'],
  ].map(([x, title, mood, color, icon], i) => ({
    box: R(x, 220, 130, 70, `step-${i}`),
    title, mood, color, icon,
  }));

  steps.forEach(({ box, title, mood, color, icon }) => {
    s.line(box.x + 65, 300, box.x + 65, 320, { stroke: color, sw: 1.4 });
    s.card(box.x, box.y, box.w, box.h, title, {
      stroke: color, size: 17, weight: 700, fit: false,
    });
    s.lucideIcon(icon, box.x + 65, 190, 28, { stroke: color });
    s.wireLabel(box.x, 340, 130, mood, { size: 13, align: 'center', color });
  });

  const risk = R(560, 430, 280, 80, 'risk');
  s.bubble(risk.x, risk.y, risk.w, risk.h, { stroke: RED });
  s.text(risk.x + 12, risk.y + 22, risk.w - 24, '第 3 天提醒过密\n是主要流失风险', {
    size: 15, align: 'center', color: RED, weight: 700,
  });
  s.connect(steps[3].box, 's', risk, 'n', {
    id: 'risk-callout', stroke: RED, dash: true,
  });

  return s;
}


/* ------------------------------------------ 7. 复杂平台架构 */

function platformArchitecture() {
  const s = createSketch({ width: 1400, height: 950 });
  s.header({
    title: '多租户平台：边缘接入 · 业务域 · 数据面 · 控制与观测',
    sub: '信息密度靠分区和分列；连线只走邻接槽，跨区旁路占用画布外缘',
  });

  const edge = R(40, 145, 300, 430, { id: 'edge', kind: 'region' });
  const domain = R(370, 145, 520, 430, { id: 'domain', kind: 'region' });
  const data = R(920, 145, 440, 430, { id: 'data', kind: 'region' });
  const control = R(40, 610, 420, 280, { id: 'control', kind: 'region' });
  const obs = R(490, 610, 870, 280, { id: 'obs', kind: 'region' });
  [edge, domain, data, control, obs].forEach((box) => s.track(box));

  [
    [edge, '边缘接入', BLUE],
    [domain, '业务域', VIOLET],
    [data, '数据面', INK],
    [control, '控制面', RED],
    [obs, '可观测性', GREEN],
  ].forEach(([box, title, color]) => {
    s.box(box.x, box.y, box.w, box.h, { stroke: color, r: 14, sw: 1.8 });
    s.text(box.x + 12, box.y + 10, box.w - 24, title, {
      size: 21, weight: 700, color, fit: false,
    });
  });

  // 5 列管道：同列纵向、邻列横向，避免穿节点
  const web = R(70, 210, 240, 55, 'web');
  const mobile = R(70, 295, 240, 55, 'mobile');
  const partner = R(70, 380, 240, 55, 'partner');
  const gw = R(70, 480, 240, 55, 'gateway');

  const bff = R(400, 210, 200, 55, 'bff');
  const identity = R(640, 210, 200, 55, 'identity');
  const checkout = R(400, 295, 200, 55, 'checkout');
  const billing = R(640, 295, 200, 55, 'billing');
  const risk = R(400, 380, 200, 55, 'risk');
  const catalog = R(640, 380, 200, 55, 'catalog');
  const workflow = R(400, 480, 440, 55, 'workflow');

  const kafka = R(960, 210, 360, 55, 'kafka');
  const redis = R(960, 295, 360, 55, 'redis');
  const oltp = R(960, 380, 360, 55, 'oltp');
  const lake = R(960, 480, 360, 55, 'lake');

  const deploy = R(70, 680, 160, 70, 'deploy');
  const policy = R(260, 680, 160, 70, 'policy');
  const secrets = R(70, 780, 160, 70, 'secrets');
  const config = R(260, 780, 160, 70, 'config');

  const metrics = R(530, 680, 180, 70, 'metrics');
  const logs = R(740, 680, 180, 70, 'logs');
  const traces = R(950, 680, 180, 70, 'traces');
  const audit = R(1160, 680, 160, 70, 'audit');
  const alert = R(740, 780, 180, 70, 'alert');
  const slo = R(950, 780, 180, 70, 'slo');

  const cards = [
    [web, 'Web 门户', 'monitor', BLUE],
    [mobile, '移动 App', 'smartphone', BLUE],
    [partner, '伙伴 API', 'handshake', BLUE],
    [gw, 'API 网关', 'shield', BLUE],
    [bff, 'BFF', 'layers', VIOLET],
    [identity, '身份', 'key-round', VIOLET],
    [checkout, '交易', 'shopping-cart', VIOLET],
    [billing, '计费', 'wallet', VIOLET],
    [risk, '风控', 'scan-search', RED],
    [catalog, '目录', 'book-open', VIOLET],
    [workflow, '编排引擎', 'workflow', INK],
    [kafka, '事件总线', 'cable', INK],
    [redis, '缓存', 'zap', INK],
    [oltp, 'OLTP', 'database', INK],
    [lake, '分析湖仓', 'hard-drive', INK],
    [deploy, '发布', 'rocket', RED],
    [policy, '策略', 'scale', RED],
    [secrets, '密钥', 'key', RED],
    [config, '配置', 'settings', RED],
    [metrics, '指标', 'activity', GREEN],
    [logs, '日志', 'scroll-text', GREEN],
    [traces, '链路', 'git-branch', GREEN],
    [audit, '审计', 'file-check', GREEN],
    [alert, '告警', 'bell', GREEN],
    [slo, 'SLO', 'gauge', GREEN],
  ];
  assertNoOverlap(cards.map(([box, label]) => [label, box]), 12);
  cards.forEach(([box, label, icon, color]) => {
    s.lucideIcon(icon, box.x + 22, box.y + box.h / 2, 20, {
      stroke: color, id: `icon-${box.id}`, parent: box.id,
    });
    s.card(box.x, box.y, box.w, box.h, label, {
      stroke: color, size: 16, weight: 700, fit: false,
    });
  });

  // 边缘列：纵向汇入网关
  s.connect(web, 's', mobile, 'n', { id: 'web-mobile', stroke: GRAY });
  s.connect(mobile, 's', partner, 'n', { id: 'mobile-partner', stroke: GRAY });
  s.connect(partner, 's', gw, 'n', {
    id: 'partner-gw', stroke: BLUE, label: '汇入', labelSize: 13,
  });

  // 边缘 → 业务：网关到 BFF / 编排（同列对齐）
  s.connect(gw, 'e', workflow, 'w', {
    id: 'gw-flow', stroke: BLUE, label: '入口', labelSize: 13,
  });

  // 业务域网格（只连邻居）
  s.connect(bff, 'e', identity, 'w', { id: 'bff-id', stroke: VIOLET });
  s.connect(bff, 's', checkout, 'n', { id: 'bff-checkout', stroke: VIOLET });
  s.connect(identity, 's', billing, 'n', { id: 'id-billing', stroke: VIOLET });
  s.connect(checkout, 'e', billing, 'w', { id: 'checkout-billing', stroke: VIOLET });
  s.connect(checkout, 's', risk, 'n', { id: 'checkout-risk', stroke: RED });
  s.connect(billing, 's', catalog, 'n', { id: 'billing-catalog', stroke: VIOLET });
  s.connect(risk, 'e', catalog, 'w', { id: 'risk-catalog', stroke: VIOLET });
  s.connect(risk, 's', workflow, 'n', { id: 'risk-flow', stroke: INK });
  s.connect(catalog, 's', workflow, 'n', {
    id: 'catalog-flow', stroke: INK, allowOverlap: true,
  });

  // 业务 → 数据（同行邻接）
  s.connect(identity, 'e', kafka, 'w', {
    id: 'id-kafka', stroke: GRAY, label: '认证事件', labelSize: 13,
  });
  s.connect(billing, 'e', redis, 'w', {
    id: 'billing-redis', stroke: GRAY, label: '缓存', labelSize: 13,
  });
  s.connect(catalog, 'e', oltp, 'w', {
    id: 'catalog-oltp', stroke: GRAY, label: '读写', labelSize: 13,
  });
  s.connect(workflow, 'e', lake, 'w', {
    id: 'flow-lake', stroke: INK, dash: true, label: '编排落库', labelSize: 13,
  });

  // 数据列纵向
  s.connect(kafka, 's', redis, 'n', { id: 'kafka-redis', stroke: GRAY, dash: true });
  s.connect(redis, 's', oltp, 'n', { id: 'redis-oltp', stroke: GRAY });
  s.connect(oltp, 's', lake, 'n', { id: 'oltp-lake', stroke: GRAY, dash: true });

  // 控制面内部 + 上到网关（左侧外缘）
  s.connect(deploy, 'e', policy, 'w', { id: 'deploy-policy', stroke: RED });
  s.connect(secrets, 'e', config, 'w', { id: 'secrets-config', stroke: RED });
  s.connect(deploy, 's', secrets, 'n', { id: 'deploy-secrets', stroke: RED, dash: true });
  s.connect(policy, 's', config, 'n', { id: 'policy-config', stroke: RED, dash: true });
  // 控制面 → 网关：走边缘区与控制面之间的夹缝，避免左绕大弯
  {
    const [x1, y1] = [policy.x + policy.w / 2, policy.y - 6];
    const [x2, y2] = [gw.x + gw.w / 2, gw.y + gw.h + 6];
    const laneY = 588; // edge 底 575 与 control 顶 610 之间
    const pts = [[x1, y1], [x1, laneY], [x2, laneY], [x2, y2]];
    s.polyArrow(pts, {
      id: 'policy-gw', from: policy, to: gw, dash: true, stroke: RED,
    });
    s.wireLabel(x2 - 20, laneY - 22, 140, '配额 / 开关', {
      size: 13, align: 'center', color: RED,
    });
  }

  // 可观测性：与上方列对齐的短连接 + 底行串联
  s.connect(workflow, 's', logs, 'n', { id: 'flow-logs', stroke: GREEN, dash: true });
  s.connect(lake, 's', traces, 'n', { id: 'lake-traces', stroke: GREEN, dash: true });
  s.connect(metrics, 'e', logs, 'w', { id: 'metrics-logs', stroke: GREEN });
  s.connect(logs, 'e', traces, 'w', { id: 'logs-traces', stroke: GREEN });
  s.connect(traces, 'e', audit, 'w', { id: 'traces-audit', stroke: GREEN });
  s.connect(logs, 's', alert, 'n', { id: 'logs-alert', stroke: GREEN });
  s.connect(traces, 's', slo, 'n', { id: 'traces-slo', stroke: GREEN });
  s.connect(alert, 'e', slo, 'w', { id: 'alert-slo', stroke: GREEN, dash: true });

  return s;
}

export const FIGURES = [
  ['01-research-framework', researchFramework],
  ['02-photosynthesis', photosynthesisLesson],
  ['03-policy-path', policyStakeholders],
  ['04-service-topology', serviceTopology],
  ['05-approach-compare', approachCompare],
  ['06-onboarding-journey', onboardingJourney],
  ['07-platform-architecture', platformArchitecture],
  ...CNN_FIGURES,
];
