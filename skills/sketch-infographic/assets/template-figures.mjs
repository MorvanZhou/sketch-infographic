/**
 * init 落地用的最小种子 —— 不是图式清单，也不是能力边界。
 * 改标题、节点和连线即可；更多图式见仓库 examples/figures.mjs。
 *
 *   node render.mjs figures.mjs --lint-strict
 *   node render.mjs figures.mjs --png
 */

import {
  createSketch, R, assertNoOverlap,
  INK, GREEN, VIOLET, GRAY, YELLOW,
} from '../scripts/sketch.mjs';

function overview() {
  const s = createSketch({ width: 1200, height: 380 });
  s.header({
    title: '把结论写在标题里',
    sub: '节点用 R，主干用 connect；需要绕行时用 bypass',
  });

  const input = R(80, 220, 200, 80, 'input');
  const core = R(420, 200, 280, 120, 'core');
  const out = R(860, 220, 200, 80, 'out');
  assertNoOverlap([['输入', input], ['核心', core], ['输出', out]], 24);

  s.lucideIcon('inbox', input.x + 28, input.y + input.h / 2, 26, {
    stroke: GREEN, id: 'icon-input', parent: 'input',
  });
  s.card(input.x, input.y, input.w, input.h, '输入', {
    stroke: GREEN, size: 18, weight: 700,
  });

  s.box(core.x, core.y, core.w, core.h, {
    stroke: VIOLET, fill: YELLOW, fillStyle: 'hachure', hachureGap: 16, sw: 2.2,
  });
  s.inBox(core.x, core.y, core.w, core.h, '核心处理', {
    size: 22, weight: 700, color: VIOLET,
  });

  s.lucideIcon('check', out.x + 28, out.y + out.h / 2, 26, {
    stroke: INK, id: 'icon-out', parent: 'out',
  });
  s.card(out.x, out.y, out.w, out.h, '输出', {
    stroke: INK, size: 18, weight: 700,
  });

  s.connect(input, 'e', core, 'w', { id: 'in-core', stroke: GRAY });
  s.connect(core, 'e', out, 'w', { id: 'core-out', stroke: GRAY });

  return s;
}

export const FIGURES = [['overview', overview]];
