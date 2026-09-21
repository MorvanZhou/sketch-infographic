/**
 * CNN 图形化示意：特征图叠层变深变窄 + 全连接神经元扇入，不是方框标题流水线。
 * 已并入 examples/figures.mjs 的 FIGURES，也可单独渲染：
 *
 *   node render.mjs cnn-figures.mjs --lint-strict --png
 *   node render.mjs figures.mjs --only 08-cnn-structure --lint-strict --png
 */

import {
  createSketch, R, assertNoOverlap,
  INK, RED, BLUE, GREEN, VIOLET, GRAY, YELLOW,
} from './sketch.mjs';

/** 叠层特征图：空间变窄、通道变「厚」 */
function featureStack(s, cx, cy, w, h, depth, color, id) {
  const box = R(cx - w / 2, cy - h / 2, w, h, id);
  for (let i = depth - 1; i >= 0; i -= 1) {
    const ox = i * 5;
    const oy = -i * 4;
    s.rect(box.x + ox, box.y + oy, w, h, {
      stroke: color,
      sw: i === 0 ? 2 : 1.15,
      fill: i === 0 ? color : undefined,
      fillStyle: i === 0 ? 'hachure' : undefined,
      hachureGap: 11,
      hachureAngle: -48 + i * 6,
      roughness: 1.15,
      lint: false,
    });
  }
  s.track(box);
  return box;
}

/** 全连接一列小圆 */
function neuronColumn(s, x, y0, n, gap, d, color, idPrefix) {
  const nodes = [];
  for (let i = 0; i < n; i += 1) {
    const cy = y0 + i * gap;
    const box = R(x - d / 2, cy - d / 2, d, d, `${idPrefix}-${i}`);
    s.circle(x, cy, d, {
      stroke: color, sw: 1.6, fill: YELLOW, fillStyle: 'dots', fillWeight: 1.1, hachureGap: 6,
    });
    s.track(box);
    nodes.push(box);
  }
  return nodes;
}

function cnnStructure() {
  const s = createSketch({ width: 1400, height: 700, stroke: { roughness: 1.35, bowing: 1.15 } });
  s.header({
    title: 'CNN：特征图在变窄变厚，全连接再汇成类别',
    sub: '图形化示意体积变换，而不是一排标题卡片',
  });

  // —— 输入图像（带简易涂鸦）——
  const input = R(50, 250, 150, 150, 'input');
  s.rect(input.x, input.y, input.w, input.h, {
    stroke: BLUE, sw: 2.1, fill: BLUE, fillStyle: 'solid', fillOpacity: 0.08,
  });
  // 简易「风景」示意
  s.path(`M${input.x + 18} ${input.y + 100} Q ${input.x + 50} ${input.y + 60} ${input.x + 80} ${input.y + 95}
    T ${input.x + 130} ${input.y + 100}`, { stroke: GREEN, sw: 1.6, lint: false });
  s.circle(input.x + 108, input.y + 48, 28, {
    stroke: YELLOW, sw: 1.5, fill: YELLOW, fillStyle: 'solid', fillOpacity: 0.35, lint: false,
  });
  // 像素网格暗示
  for (let i = 1; i < 4; i += 1) {
    const gx = input.x + (input.w * i) / 4;
    const gy = input.y + (input.h * i) / 4;
    s.line(gx, input.y + 8, gx, input.y + input.h - 8, { stroke: GRAY, sw: 0.9, roughness: 0.6, lint: false });
    s.line(input.x + 8, gy, input.x + input.w - 8, gy, { stroke: GRAY, sw: 0.9, roughness: 0.6, lint: false });
  }
  s.track(input);
  s.text(input.x, input.y + input.h + 14, input.w, '输入 H×W×3', {
    size: 14, align: 'center', color: BLUE, weight: 700,
  });

  // 卷积核窗口滑过输入
  const kernel = R(input.x + 18, input.y + 22, 42, 42, 'kernel');
  s.rect(kernel.x, kernel.y, kernel.w, kernel.h, {
    stroke: RED, sw: 2, dash: true, roughness: 0.9,
  });
  s.track(kernel, { allowOverlap: true }); // 刻意叠在输入图上示意滑窗
  s.wireLabel(kernel.x - 10, kernel.y - 28, 120, '卷积核', {
    size: 13, color: RED, align: 'center',
  });

  // —— 特征图叠层：越往后越窄越高（通道）——
  const c1 = featureStack(s, 320, 320, 100, 110, 4, VIOLET, 'conv1');
  const p1 = featureStack(s, 470, 330, 78, 88, 4, BLUE, 'pool1');
  const c2 = featureStack(s, 620, 310, 70, 130, 6, VIOLET, 'conv2');
  const p2 = featureStack(s, 760, 325, 54, 100, 6, BLUE, 'pool2');

  assertNoOverlap([
    ['输入', input],
    ['C1', c1], ['P1', p1], ['C2', c2], ['P2', p2],
  ], 8);

  [
    [c1, 'Conv+ReLU\n↓空间 ↑C'],
    [p1, 'Pool\n减半'],
    [c2, '更深 Conv\n更大感受野'],
    [p2, 'Pool'],
  ].forEach(([box, label]) => {
    s.text(box.x - 10, box.y + box.h + 18, box.w + 30, label, {
      size: 13, align: 'center', color: INK,
    });
  });

  // 主干箭头（弧长中点标签）
  s.connect(input, 'e', c1, 'w', { id: 'in-c1', stroke: GRAY });
  s.connect(c1, 'e', p1, 'w', { id: 'c1-p1', stroke: VIOLET, label: '局部滤波' });
  s.connect(p1, 'e', c2, 'w', { id: 'p1-c2', stroke: GRAY });
  s.connect(c2, 'e', p2, 'w', { id: 'c2-p2', stroke: VIOLET, label: '组合' });

  // 核 → 第一层特征：示意「扫描生成」
  s.curve(
    kernel.x + kernel.w, kernel.y + kernel.h / 2,
    (kernel.x + kernel.w + c1.x) / 2, kernel.y - 40,
    c1.x, c1.y + 20,
    { stroke: RED, dash: true, sw: 1.4, id: 'kernel-to-c1', from: kernel, to: c1 },
  );

  // —— 展平暗示：小竖条 ——
  const flat = R(840, 290, 28, 120, 'flat');
  s.rect(flat.x, flat.y, flat.w, flat.h, {
    stroke: INK, sw: 1.8, fill: INK, fillStyle: 'solid', fillOpacity: 0.12,
  });
  for (let i = 0; i < 8; i += 1) {
    s.line(flat.x + 4, flat.y + 10 + i * 13, flat.x + flat.w - 4, flat.y + 10 + i * 13, {
      stroke: INK, sw: 1.1, roughness: 0.7, lint: false,
    });
  }
  s.track(flat);
  s.text(flat.x - 20, flat.y + flat.h + 18, flat.w + 40, '展平', {
    size: 13, align: 'center', color: INK,
  });
  s.connect(p2, 'e', flat, 'w', { id: 'p2-flat', stroke: GRAY });

  // —— 全连接：两列神经元 + 输出 ——
  const hidden = neuronColumn(s, 980, 250, 5, 42, 22, GREEN, 'h');
  const out = neuronColumn(s, 1140, 290, 3, 52, 26, RED, 'o');

  // 扇入曲线（抽稀，避免蛛网）
  const sampleH = [hidden[0], hidden[2], hidden[4]];
  sampleH.forEach((hNode, i) => {
    s.curve(
      flat.x + flat.w, flat.y + flat.h / 2,
      flat.x + flat.w + 40, hNode.y + hNode.h / 2,
      hNode.x, hNode.y + hNode.h / 2,
      {
        stroke: GREEN, sw: 1.2, roughness: 0.9, head: 9,
        id: `flat-h-${i}`, from: flat, to: hNode, allowOverlap: true,
      },
    );
  });
  sampleH.forEach((hNode, i) => {
    out.forEach((oNode, j) => {
      if ((i + j) % 2 === 0) return; // 抽稀
      s.curve(
        hNode.x + hNode.w, hNode.y + hNode.h / 2,
        (hNode.x + oNode.x) / 2, (hNode.y + oNode.y) / 2,
        oNode.x, oNode.y + oNode.h / 2,
        {
          stroke: GRAY, sw: 1.05, roughness: 0.85, head: 8,
          id: `h-o-${i}-${j}`, from: hNode, to: oNode, allowCrossing: true, allowOverlap: true,
        },
      );
    });
  });

  s.text(940, 470, 100, '隐层', { size: 13, align: 'center', color: GREEN, weight: 700 });
  s.text(1100, 470, 100, '类别', { size: 13, align: 'center', color: RED, weight: 700 });

  // Softmax 示意：小柱
  const bars = R(1240, 280, 90, 140, 'bars');
  s.track(bars);
  const heights = [0.45, 0.85, 0.35];
  heights.forEach((t, i) => {
    const bh = 30 + t * 70;
    const bx = bars.x + 12 + i * 26;
    const by = bars.y + bars.h - bh - 10;
    s.rect(bx, by, 18, bh, {
      stroke: RED, sw: 1.3, fill: RED, fillStyle: 'hachure', hachureGap: 5, lint: false,
    });
  });
  s.text(bars.x, bars.y + bars.h + 18, bars.w, 'Softmax', {
    size: 13, align: 'center', color: RED, weight: 700,
  });
  s.curve(
    out[1].x + out[1].w, out[1].y + out[1].h / 2,
    bars.x - 10, out[1].y + out[1].h / 2,
    bars.x, bars.y + bars.h / 2,
    { stroke: RED, sw: 1.4, id: 'o-bars', from: out[1], to: bars },
  );

  // 底部注解
  const notes = [
    [70, '局部感受野', '核只看邻域窗口', 'focus', VIOLET],
    [480, '权重共享', '同一核滑过整图', 'repeat', BLUE],
    [890, '层次抽象', '边缘 → 部件 → 物体', 'git-branch', GREEN],
  ];
  notes.forEach(([x, title, desc, icon, color], i) => {
    const box = R(x, 560, 360, 88, `note-${i}`);
    s.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w, box.h, {
      stroke: color, sw: 1.5,
    });
    s.track(box);
    s.lucideIcon(icon, box.x + 48, box.y + box.h / 2, 26, {
      stroke: color, id: `icon-note-${i}`, parent: box.id,
    });
    s.text(box.x + 80, box.y + 22, box.w - 110, title, {
      size: 17, weight: 700, color,
    });
    s.text(box.x + 80, box.y + 50, box.w - 110, desc, {
      size: 14, color: INK,
    });
  });

  return s;
}

export const FIGURES = [
  ['08-cnn-structure', cnnStructure],
];
