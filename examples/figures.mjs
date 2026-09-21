/**
 * 跨领域展示案例：按 SKILL.md 用通用视觉语法组合，不绑定单一行业。
 *
 * 渲染：
 *   node render.mjs figures.mjs --lint-strict --png
 */

import {
  createSketch, R, assertNoOverlap,
  INK, RED, BLUE, GREEN, VIOLET, GRAY, YELLOW,
} from './sketch.mjs';
import { FIGURES as CNN_FIGURES } from './cnn-figures.mjs';

/* ------------------------------------------ 1. 研究框架（学术，高密度） */

function stageCard(s, box, title, bullets, icon, color) {
  s.box(box.x, box.y, box.w, box.h, { stroke: color, r: 12, sw: 1.9 });
  s.lucideIcon(icon, box.x + 26, box.y + 28, 24, {
    stroke: color, id: `icon-${box.id}`, parent: box.id,
  });
  s.text(box.x + 48, box.y + 16, box.w - 60, title, {
    size: 17, weight: 700, color,
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
    s.text(box.x + 14, box.y + 10, 220, title, { size: 15, weight: 700, color });
  });

  const q = R(60, 185, 240, 140, 'question');
  const lit = R(330, 185, 240, 140, 'literature');
  const h = R(600, 185, 240, 140, 'hypothesis');
  const designNote = R(870, 185, 240, 140, 'design');
  const rival = R(1140, 185, 200, 140, 'rival');

  const m = R(60, 430, 260, 140, 'method');
  const data = R(360, 430, 260, 140, 'data');
  const e = R(660, 430, 250, 140, 'evidence');

  const validity = R(1000, 430, 330, 140, 'validity');

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
  s.connect(designNote, 'e', rival, 'w', { id: 'design-rival', stroke: RED, dash: true, label: '对抗' });

  // 设计 → 执行
  s.connect(h, 's', m, 'n', { id: 'h-m', stroke: VIOLET, label: '可操作化' });
  s.connect(m, 'e', data, 'w', { id: 'm-data', stroke: GREEN });
  s.connect(data, 'e', e, 'w', { id: 'data-e', stroke: GREEN });
  s.connect(e, 'e', validity, 'w', { id: 'e-val', stroke: BLUE, label: '质询' });

  // 结论三栏
  const concl = R(60, 640, 1120, 150, 'conclusion');
  s.box(concl.x, concl.y, concl.w, concl.h, {
    stroke: VIOLET, fill: YELLOW, fillStyle: 'hachure', hachureGap: 16, sw: 2.2, r: 14,
  });
  s.track(concl);
  s.text(concl.x + 20, concl.y + 14, 400, '结论：拆成三句话写清楚', {
    size: 18, weight: 700, color: VIOLET,
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
    s.text(box.x + 12, box.y + 10, box.w - 24, title, { size: 15, weight: 700, color });
    s.text(box.x + 12, box.y + 36, box.w - 24, body, { size: 13, color: INK });
  });

  s.connect(e, 's', concl, 'n', { id: 'e-concl', stroke: VIOLET, label: '综合解释' });
  s.connect(validity, 's', concl, 'e', {
    id: 'val-concl', stroke: BLUE, dash: true, allowOverlap: true,
  });

  // 反馈：结论 → 问题
  s.bypass(concl, 'w', q, 'w', {
    id: 'feedback', via: 'left', pad: 28, dash: true, stroke: RED, label: '修正问题',
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

/* ------------------------------------------ 2. 教学概念图（竖版，高密度） */

/** 叶绿体示意：直立叶片轮廓 + 叶脉（viewBox 100×140，非 Lucide） */
const CHLOROPLAST_LEAF = [
  ['path', {
    d: 'M50 6 C72 18 88 40 92 68 C96 96 84 118 50 134 C16 118 4 96 8 68 C12 40 28 18 50 6 Z',
  }],
  ['path', { d: 'M50 22 L50 120' }],
  ['path', { d: 'M50 48 Q68 52 78 42' }],
  ['path', { d: 'M50 48 Q32 52 22 42' }],
  ['path', { d: 'M50 72 Q70 78 82 66' }],
  ['path', { d: 'M50 72 Q30 78 18 66' }],
  ['path', { d: 'M50 96 Q66 102 74 92' }],
  ['path', { d: 'M50 96 Q34 102 26 92' }],
];

function photosynthesisLesson() {
  const s = createSketch({ width: 1100, height: 1320 });
  s.header({
    title: '光合作用：把光能变成可储存的化学能',
    sub: '输入 · 场所分舱 · 能量载体 · 产物 · 总反应式',
  });

  // —— 顶栏输入（不与叶体重叠）——
  const pigment = R(60, 145, 220, 90, 'pigment');
  const sun = R(440, 145, 220, 70, 'sun');
  const leafBadge = R(900, 130, 140, 110, 'leaf-badge');

  s.box(pigment.x, pigment.y, pigment.w, pigment.h, { stroke: YELLOW, r: 10, sw: 1.6 });
  s.lucideIcon('palette', pigment.x + 28, pigment.y + 28, 24, {
    stroke: YELLOW, id: 'icon-pigment', parent: pigment.id,
  });
  s.text(pigment.x + 56, pigment.y + 16, pigment.w - 68, '色素天线', {
    size: 15, weight: 700, color: INK,
  });
  s.text(pigment.x + 14, pigment.y + 48, pigment.w - 28, '叶绿素 a/b · 蓝紫/红光', {
    size: 12, color: INK,
  });

  s.lucideIcon('sun', sun.x + 30, sun.y + sun.h / 2, 28, {
    stroke: YELLOW, id: 'icon-sun', parent: sun.id,
  });
  s.card(sun.x, sun.y, sun.w, sun.h, '光能（光子）', {
    stroke: YELLOW, color: INK, size: 18, weight: 700,
  });

  // 叶片只作角落标识，不再铺满过程区
  s.track(leafBadge);
  s.svgGlyph(leafBadge.x + leafBadge.w / 2, leafBadge.y + leafBadge.h / 2, 100, CHLOROPLAST_LEAF, {
    viewBox: [0, 0, 100, 140],
    stroke: GREEN,
    fill: YELLOW,
    fillStyle: 'dots',
    hachureGap: 10,
    sw: 1.8,
    id: 'glyph-leaf',
    parent: 'leaf-badge',
    lint: false,
  });
  s.text(leafBadge.x, leafBadge.y + leafBadge.h - 2, leafBadge.w, '叶绿体', {
    size: 13, align: 'center', color: GREEN, weight: 700,
  });

  s.connect(pigment, 'e', sun, 'w', { id: 'pigment-sun', stroke: YELLOW, dash: true });
  s.connect(sun, 'e', leafBadge, 'w', { id: 'sun-leaf', stroke: YELLOW, label: '捕光' });

  // —— 过程区：宽敞三栏，叶片不压文字 ——
  const chloro = R(40, 280, 1020, 380, { id: 'chloro', kind: 'region' });
  s.track(chloro);
  s.box(chloro.x, chloro.y, chloro.w, chloro.h, { stroke: GREEN, r: 16, sw: 1.6 });
  s.text(chloro.x + 20, chloro.y + 14, 360, '叶绿体内：光反应 → 能量载体 → 卡尔文循环', {
    size: 16, weight: 700, color: GREEN,
  });

  const water = R(60, 340, 150, 100, 'water');
  const lightRx = R(240, 330, 220, 200, 'light-rx');
  const atp = R(500, 350, 120, 70, 'atp');
  const nadph = R(500, 450, 120, 70, 'nadph');
  const darkRx = R(660, 330, 220, 200, 'dark-rx');
  const co2 = R(910, 380, 130, 100, 'co2');

  assertNoOverlap([
    ['水', water], ['光反应', lightRx], ['ATP', atp],
    ['NADPH', nadph], ['暗反应', darkRx], ['二氧化碳', co2],
  ], 16);

  s.box(water.x, water.y, water.w, water.h, { stroke: BLUE, r: 10, sw: 1.8 });
  s.lucideIcon('droplets', water.x + 26, water.y + 28, 22, {
    stroke: BLUE, id: 'icon-water', parent: water.id,
  });
  s.text(water.x + 52, water.y + 16, water.w - 64, '水 H₂O', {
    size: 15, weight: 700, color: BLUE,
  });
  s.text(water.x + 12, water.y + 48, water.w - 24, '光解：e⁻/H⁺/O₂', {
    size: 12, color: INK,
  });

  s.box(lightRx.x, lightRx.y, lightRx.w, lightRx.h, {
    stroke: YELLOW, r: 12, sw: 1.9, fill: YELLOW, fillStyle: 'solid', fillOpacity: 0.1,
  });
  s.text(lightRx.x + 14, lightRx.y + 16, lightRx.w - 28, '光反应（类囊体膜）', {
    size: 16, weight: 700, color: INK,
  });
  s.text(lightRx.x + 14, lightRx.y + 52, lightRx.w - 28,
    '· 光系统 II / I\n· 电子传递链\n· 水的光解\n· 合成 ATP / NADPH', {
      size: 13, color: INK, lh: 1.55,
    });

  s.card(atp.x, atp.y, atp.w, atp.h, 'ATP', { stroke: RED, size: 17, weight: 700 });
  s.card(nadph.x, nadph.y, nadph.w, nadph.h, 'NADPH', { stroke: VIOLET, size: 16, weight: 700 });
  s.text(atp.x - 8, atp.y - 22, atp.w + 16, '能量载体', {
    size: 13, align: 'center', color: GRAY, weight: 700,
  });

  s.box(darkRx.x, darkRx.y, darkRx.w, darkRx.h, {
    stroke: GREEN, r: 12, sw: 1.9, fill: GREEN, fillStyle: 'solid', fillOpacity: 0.08,
  });
  s.text(darkRx.x + 14, darkRx.y + 16, darkRx.w - 28, '卡尔文循环（基质）', {
    size: 16, weight: 700, color: GREEN,
  });
  s.text(darkRx.x + 14, darkRx.y + 52, darkRx.w - 28,
    '· 不直接需要光照\n· Rubisco 固碳\n· 还原 → 糖\n· RuBP 再生', {
      size: 13, color: INK, lh: 1.55,
    });

  s.box(co2.x, co2.y, co2.w, co2.h, { stroke: BLUE, r: 10, sw: 1.8 });
  s.lucideIcon('wind', co2.x + co2.w / 2, co2.y + 28, 22, {
    stroke: BLUE, id: 'icon-co2', parent: co2.id,
  });
  s.text(co2.x + 8, co2.y + 48, co2.w - 16, 'CO₂\n气孔进入', {
    size: 13, align: 'center', color: BLUE, weight: 700,
  });

  s.connect(sun, 's', lightRx, 'n', { id: 'sun-light', stroke: YELLOW, label: '激发电子' });
  s.connect(water, 'e', lightRx, 'w', { id: 'water-light', stroke: BLUE, label: '光解' });
  s.connect(co2, 'w', darkRx, 'e', { id: 'co2-dark', stroke: BLUE, label: '固碳' });
  s.connect(lightRx, 'e', atp, 'w', { id: 'light-atp', stroke: RED });
  s.connect(lightRx, 'e', nadph, 'w', {
    id: 'light-nadph', stroke: VIOLET, allowOverlap: true,
  });
  s.connect(atp, 'e', darkRx, 'w', { id: 'atp-dark', stroke: RED, dash: true, label: '供能' });
  s.connect(nadph, 'e', darkRx, 'w', {
    id: 'nadph-dark', stroke: VIOLET, dash: true, allowOverlap: true,
  });

  // —— 产物（与过程区拉开）——
  const oxygen = R(200, 720, 280, 100, 'oxygen');
  const sugar = R(620, 720, 300, 100, 'sugar');
  assertNoOverlap([['氧气', oxygen], ['糖', sugar]], 40);

  s.box(oxygen.x, oxygen.y, oxygen.w, oxygen.h, { stroke: GREEN, r: 12, sw: 2 });
  s.lucideIcon('wind', oxygen.x + 30, oxygen.y + 36, 26, {
    stroke: GREEN, id: 'icon-o2', parent: oxygen.id,
  });
  s.text(oxygen.x + 66, oxygen.y + 18, oxygen.w - 80, '氧气 O₂', {
    size: 17, weight: 700, color: GREEN,
  });
  s.text(oxygen.x + 66, oxygen.y + 48, oxygen.w - 80, '水光解副产物 · 气孔释放', {
    size: 13, color: INK,
  });

  s.box(sugar.x, sugar.y, sugar.w, sugar.h, { stroke: VIOLET, r: 12, sw: 2 });
  s.lucideIcon('candy', sugar.x + 30, sugar.y + 36, 26, {
    stroke: VIOLET, id: 'icon-sugar', parent: sugar.id,
  });
  s.text(sugar.x + 66, sugar.y + 18, sugar.w - 80, '糖 / 淀粉', {
    size: 17, weight: 700, color: VIOLET,
  });
  s.text(sugar.x + 66, sugar.y + 48, sugar.w - 80, 'G3P → 葡萄糖 · 可转运或储存', {
    size: 13, color: INK,
  });

  s.connect(lightRx, 's', oxygen, 'n', { id: 'light-o2', stroke: GREEN, label: '释放 O₂' });
  s.connect(darkRx, 's', sugar, 'n', { id: 'dark-sugar', stroke: VIOLET, label: '碳骨架' });

  // —— 总反应与条件 ——
  const eqn = R(80, 890, 940, 90, 'eqn');
  s.box(eqn.x, eqn.y, eqn.w, eqn.h, {
    stroke: INK, r: 12, sw: 1.8, fill: YELLOW, fillStyle: 'hachure', hachureGap: 18,
  });
  s.inBox(eqn.x, eqn.y, eqn.w, eqn.h,
    '6 CO₂ + 6 H₂O  +  光能  →  C₆H₁₂O₆ + 6 O₂', {
      size: 22, weight: 700, color: INK,
    });

  const cond = [
    [80, '必需条件', '光照 · 色素 · 酶\n适宜温度与水分', 'thermometer-sun', YELLOW],
    [400, '限制因素', '光强 / CO₂ / 温度\n常成木桶短板', 'gauge', RED],
    [720, '与呼吸对比', '光合吸 CO₂ 放 O₂\n线粒体反向氧化', 'repeat-2', BLUE],
  ];
  cond.forEach(([x, title, body, icon, color], i) => {
    const box = R(x, 1030, 280, 120, `cond-${i}`);
    s.box(box.x, box.y, box.w, box.h, { stroke: color, r: 12, sw: 1.6 });
    s.lucideIcon(icon, box.x + 28, box.y + 32, 24, {
      stroke: color, id: `icon-cond-${i}`, parent: box.id,
    });
    s.text(box.x + 58, box.y + 18, box.w - 72, title, {
      size: 15, weight: 700, color,
    });
    s.text(box.x + 16, box.y + 56, box.w - 32, body, {
      size: 13, color: INK,
    });
  });

  const steps = R(80, 1200, 940, 70, 'steps');
  s.box(steps.x, steps.y, steps.w, steps.h, { stroke: GRAY, r: 10, sw: 1.3 });
  s.text(steps.x + 20, steps.y + 22, steps.w - 40,
    '阅读顺序：色素捕光 → 光反应造 ATP/NADPH 与 O₂ → 暗反应固碳成糖 → 对照总式与限制因素', {
      size: 14, color: INK,
    });

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
    s.card(box.x, box.y, box.w, box.h, label, { stroke: color, size: 17, weight: 700 });
  });

  s.connect(gov, 's', supply, 'n', {
    id: 'gov-supply', stroke: RED, label: '强制标准', allowOverlap: true,
  });
  s.connect(gov, 'w', shop, 'n', { id: 'gov-shop', stroke: RED, allowOverlap: true });
  s.connect(gov, 'e', user, 'n', { id: 'gov-user', stroke: RED, allowOverlap: true });
  s.connect(supply, 'w', shop, 'e', { id: 'supply-shop', stroke: VIOLET, label: '供货' });
  s.bypass(shop, 'n', user, 'n', {
    id: 'shop-user', via: 'above', pad: 72, stroke: BLUE, label: '价格信号',
    allowCrossing: true, allowOverlap: true,
  });
  s.connect(user, 's', env, 'e', { id: 'user-env', stroke: GREEN });
  s.connect(shop, 's', env, 'w', { id: 'shop-env', stroke: GREEN });
  s.connect(supply, 's', env, 'n', {
    id: 'supply-env', dash: true, stroke: GRAY, label: '材料足迹',
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

  s.card(client.x, client.y, client.w, client.h, '客户端', { stroke: GREEN, size: 17 });
  s.box(gateway.x, gateway.y, gateway.w, gateway.h, {
    stroke: BLUE, fill: YELLOW, fillStyle: 'dots', hachureGap: 10,
  });
  s.inBox(gateway.x, gateway.y, gateway.w, gateway.h, '网关', {
    size: 20, weight: 700, color: BLUE,
  });
  s.box(domain.x, domain.y, domain.w, domain.h, { stroke: VIOLET, r: 16, sw: 2 });
  s.text(domain.x, domain.y + 14, domain.w, '业务域', {
    size: 18, align: 'center', color: VIOLET, weight: 700,
  });

  [
    [order, '订单', VIOLET],
    [pay, '支付', BLUE],
    [stock, '库存', INK],
    [notify, '通知', GREEN],
  ].forEach(([box, label, color]) => {
    s.card(box.x, box.y, box.w, box.h, label, { stroke: color, size: 18, weight: 700 });
  });

  s.connect(client, 'e', gateway, 'w', { id: 'client-gw', stroke: GRAY });
  s.connect(gateway, 'e', order, 'w', { id: 'gw-order', stroke: INK });
  s.connect(order, 'e', pay, 'w', { id: 'order-pay', stroke: INK });
  s.connect(order, 's', stock, 'n', { id: 'order-stock', stroke: INK });
  s.connect(pay, 's', notify, 'n', { id: 'pay-notify', stroke: INK });
  s.bypass(order, 'n', notify, 'e', {
    id: 'pay-event', via: 'above', pad: 34, dash: true, stroke: RED, label: '领域事件总线',
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
    size: 22, align: 'center', color: RED, weight: 700,
  });
  s.text(right.x, right.y + 20, right.w, '新路径：自动编排', {
    size: 22, align: 'center', color: GREEN, weight: 700,
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
      stroke: RED, size: 17,
    });
  });
  ['单一编排入口', '状态可观测', '失败可回放'].forEach((label, i) => {
    s.card(rightItems[i].x, rightItems[i].y, rightItems[i].w, rightItems[i].h, label, {
      stroke: GREEN, size: 17,
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
    s.card(box.x, box.y, box.w, box.h, title, { stroke: color, size: 16, weight: 700 });
    s.lucideIcon(icon, box.x + 65, 190, 28, { stroke: color });
    s.wireLabel(box.x, 340, 130, mood, { size: 15, align: 'center', color });
  });

  const risk = R(560, 430, 280, 80, 'risk');
  s.bubble(risk.x, risk.y, risk.w, risk.h, { stroke: RED });
  s.text(risk.x + 12, risk.y + 22, risk.w - 24, '第 3 天提醒过密\n是主要流失风险', {
    size: 16, align: 'center', color: RED, weight: 700,
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
    s.text(box.x + 12, box.y + 8, box.w - 24, title, { size: 16, weight: 700, color });
  });

  // 5 列管道：同列纵向、邻列横向，避免穿节点
  const web = R(70, 200, 240, 55, 'web');
  const mobile = R(70, 290, 240, 55, 'mobile');
  const partner = R(70, 380, 240, 55, 'partner');
  const gw = R(70, 480, 240, 55, 'gateway');

  const bff = R(400, 200, 200, 55, 'bff');
  const identity = R(640, 200, 200, 55, 'identity');
  const checkout = R(400, 290, 200, 55, 'checkout');
  const billing = R(640, 290, 200, 55, 'billing');
  const risk = R(400, 380, 200, 55, 'risk');
  const catalog = R(640, 380, 200, 55, 'catalog');
  const workflow = R(400, 480, 440, 55, 'workflow');

  const kafka = R(960, 200, 360, 55, 'kafka');
  const redis = R(960, 290, 360, 55, 'redis');
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
    s.card(box.x, box.y, box.w, box.h, label, { stroke: color, size: 15, weight: 700 });
  });

  // 边缘列：纵向汇入网关
  s.connect(web, 's', mobile, 'n', { id: 'web-mobile', stroke: GRAY });
  s.connect(mobile, 's', partner, 'n', { id: 'mobile-partner', stroke: GRAY });
  s.connect(partner, 's', gw, 'n', { id: 'partner-gw', stroke: BLUE, label: '汇入' });

  // 边缘 → 业务：网关到 BFF / 编排（同列对齐）
  s.connect(gw, 'e', workflow, 'w', { id: 'gw-flow', stroke: BLUE, label: '入口' });

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
  s.connect(identity, 'e', kafka, 'w', { id: 'id-kafka', stroke: GRAY, label: '认证事件' });
  s.connect(billing, 'e', redis, 'w', { id: 'billing-redis', stroke: GRAY, label: '缓存' });
  s.connect(catalog, 'e', oltp, 'w', { id: 'catalog-oltp', stroke: GRAY, label: '读写' });
  s.connect(workflow, 'e', lake, 'w', { id: 'flow-lake', stroke: INK, dash: true, label: '编排落库' });

  // 数据列纵向
  s.connect(kafka, 's', redis, 'n', { id: 'kafka-redis', stroke: GRAY, dash: true });
  s.connect(redis, 's', oltp, 'n', { id: 'redis-oltp', stroke: GRAY });
  s.connect(oltp, 's', lake, 'n', { id: 'oltp-lake', stroke: GRAY, dash: true });

  // 控制面内部 + 上到网关（左侧外缘）
  s.connect(deploy, 'e', policy, 'w', { id: 'deploy-policy', stroke: RED });
  s.connect(secrets, 'e', config, 'w', { id: 'secrets-config', stroke: RED });
  s.connect(deploy, 's', secrets, 'n', { id: 'deploy-secrets', stroke: RED, dash: true });
  s.connect(policy, 's', config, 'n', { id: 'policy-config', stroke: RED, dash: true });
  s.bypass(policy, 'n', gw, 's', {
    id: 'policy-gw', via: 'left', pad: 28, dash: true, stroke: RED, label: '配额 / 开关',
  });

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
