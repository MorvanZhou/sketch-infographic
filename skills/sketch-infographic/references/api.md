# sketch-infographic API 参考

所有绘图方法都挂在 `createSketch()` 返回的对象上。坐标系原点在左上角，单位为像素。

## 目录

- [创建画布](#创建画布)
- [通用样式参数](#通用样式参数)
- [基础图形](#基础图形)
- [文字](#文字)
- [组合件](#组合件)
- [象形图标](#象形图标)
- [图题与图注](#图题与图注)
- [导出与渲染约定](#导出与渲染约定)
- [调色板与字体](#调色板与字体)
- [环境要求](#环境要求)

## 创建画布

```js
const s = createSketch(width, height, options?);
const defaultCanvas = createSketch(); // 默认 1200 × 675
const square = createSketch({ width: 1080, height: 1080 });
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `width` / `height` | `1200 × 675` | 可传任意正数，支持横版、竖版、正方形等宽高比 |
| `options.seed` | `20260920` | 手绘抖动的随机种子；同一 seed 输出完全一致，适合进 Git |
| `options.background` | `PAPER` | 背景色；传 `'transparent'` 出透明底 |
| `options.font` | `FONT_HAND` | 字体栈；传 `FONT_SANS` 可换成更正式的观感 |
| `options.stroke` | 无 | 覆盖全图默认线条样式，如 `{ sw: 2, roughness: 1 }` |

## 通用样式参数

除文字外，几乎所有方法的最后一个参数都是样式对象：

| 字段 | 默认 | 说明 |
|------|------|------|
| `stroke` | `INK` | 线条颜色 |
| `sw` | `1.8` | 线宽；主块 `2`～`2.4`，辅助线 `1.2`～`1.4` |
| `roughness` | `1.3` | 抖动强度；越大越潦草，`0.7` 接近直线 |
| `bowing` | `1.1` | 线段弯曲程度 |
| `passes` | `2` | 描边遍数；`1` 更干净，`2` 手绘感更强 |
| `dash` | 无 | `true` 为 `9 7` 虚线，也可传 `'4 4'` |
| `r` | `14` | 仅 `box`：圆角半径 |
| `fill` | 无 | 填充颜色，常用 `YELLOW` |
| `fillStyle` | `'hachure'` | 填充样式，见下表（对齐 rough.js） |
| `hachureGap` | `8`（`dots` 默认 `10`） | 填充线/点间距；大面积块用 `16`～`20` 更透气 |
| `hachureAngle` | `-41` | 填充角度（`hachure` / `cross-hatch` / `zigzag*` / `dashed`） |
| `fillWeight` | `1.4` | 填充线宽或点大小 |
| `fillOpacity` | `0.55` | 仅 `solid`：实心透明度 |
| `zigzagOffset` | ≈ `hachureGap` | 仅 `zigzag*`：锯齿波长 |
| `fillLineDash` | `'6 6'` | 仅 `dashed`：填充虚线样式 |
| `curveStepCount` | `28`（弧默认 `24`） | 圆/椭圆/弧的采样段数 |
| `head` | `13` | 仅箭头：箭头大小 |

### 填充样式 `fillStyle`

| 值 | 效果 |
|----|------|
| `hachure` | 斜线（默认，和以前行为一致） |
| `cross-hatch` | 两组垂直斜线交叉 |
| `zigzag` | 沿扫描线画锯齿 |
| `zigzag-line` | 更小振幅的锯齿线 |
| `dashed` | 斜向虚线填充 |
| `dots` | 点阵/蜡笔点 |
| `solid` | 半透明实心（带轻微手绘边界） |

```js
s.box(x, y, w, h, { fill: YELLOW, fillStyle: 'cross-hatch', hachureGap: 10 });
s.circle(cx, cy, 80, { fill: BLUE, fillStyle: 'dots' });
s.rect(x, y, w, h, { fill: GREEN, fillStyle: 'solid', fillOpacity: 0.4 });
```

## 基础图形

这些原语是能力基础，不是图式白名单。没有现成组件时，组合基础图形、任意 SVG `path`、
文字、填充、Lucide 图标或 `svgGlyph` 自定义形构造新图式；可复用需求再抽象成与具体领域无关的组合件。

不要默认把所有图收成等宽 `card` 流水线。需要表达形态、体积、缩放、包含时，优先用圆、
椭圆、叠层矩形、扇形和 `path`（见 `examples/cnn-figures.mjs`）。

| 方法 | 说明 |
|------|------|
| `line(x1, y1, x2, y2, o?)` | 直线 |
| `polyline(points, o?)` | 折线；`points` 为 `[[x, y], ...]`，`o.closed = true` 闭合 |
| `polygon(points, o?)` | 闭合多边形，可填充 |
| `rect(x, y, w, h, o?)` | 直角矩形 |
| `box(x, y, w, h, o?)` | 圆角矩形，信息图的主力容器 |
| `circle(cx, cy, d, o?)` | 圆，`d` 为直径 |
| `ellipse(cx, cy, w, h, o?)` | 椭圆 |
| `arc(cx, cy, w, h, start, stop, o?)` | 椭圆弧，角度为度；`closed: true` 闭弦，`closed: 'pie'` 扇形 |
| `path(d, o?)` | 手绘化 SVG path（`d` 字符串）；闭合轮廓可填充 |
| `arrow(x1, y1, x2, y2, o?)` | 直线箭头 |
| `curve(x1, y1, cx, cy, x2, y2, o?)` | 二次贝塞尔箭头，用于回流、跨层连线 |
| `polyArrow(points, o?)` | 折线箭头（只在终点加箭头） |
| `connect(a, sideA, b, sideB, o?)` | **稳定连线**：从矩形边中点到边中点；默认正交折线 |
| `bypass(a, sideA, b, sideB, o?)` | **外侧绕行**：回流/跨层走通道，不穿中间卡片 |

### 稳定连线（复杂图推荐）

先把节点写成矩形 `R(x, y, w, h)`，再用 `connect` / `bypass`，不要手写框心坐标：

```js
import {
  createSketch, R, assertNoOverlap, RED, GRAY,
} from './sketch.mjs';

const order = R(540, 220, 140, 70, '订单');
const pay = R(760, 220, 140, 70, '支付');
const mkt = R(980, 220, 140, 70, '营销');

s.card(order.x, order.y, order.w, order.h, '订单');
s.card(pay.x, pay.y, pay.w, pay.h, '支付');
s.card(mkt.x, mkt.y, mkt.w, mkt.h, '营销');

assertNoOverlap([['订单', order], ['支付', pay], ['营销', mkt]], 24);
s.connect(order, 'e', pay, 'w', { stroke: GRAY });
s.bypass(order, 'n', mkt, 'n', {
  via: 'above', pad: 36, dash: true, stroke: RED, label: '优惠核销事件',
});
```

| 参数 | 说明 |
|------|------|
| `side` | `n/s/e/w` 或 `top/bottom/left/right` |
| `mode` | 仅 `connect`：`ortho`（默认）/ `straight` / `curve` |
| `via` | 仅 `bypass`：`above` / `below` / `left` / `right` |
| `pad` | 绕行通道离节点的距离，默认 48 |
| `gap` | 端口离边框的间隙，默认 6 |
| `label` | 线旁短标签；按折线弧长几何中点落字（不是顶点下标中点） |
| `lift` | 仅 `mode: 'curve'`：控制点上下偏移 |

也可单独算端口：`portOf(box, 'e', 6)` → `[x, y]`。

几何工具：

| 方法 | 说明 |
|------|------|
| `R(x, y, w, h, meta?)` | 创建矩形节点；`meta` 可传 id 字符串或 `{ id, kind, parent }` |
| `boxesOverlap(a, b, gap?)` | 判断两个矩形是否相交或未满足安全间距 |
| `assertNoOverlap(items, gap?)` | 批量检查同级节点；碰撞时直接抛错终止渲染 |

### 几何 lint

`connect` 和 `bypass` 会自动把节点、折线路径登记到当前画布。其他几何可显式登记：

```js
const region = R(40, 180, 500, 300, { id: '测试区', kind: 'region' });
s.track(region);

s.polyArrow(points, {
  id: '订单到支付',
  from: order,
  to: pay,
});

s.line(100, 300, 500, 300);
s.trackRoute([[100, 300], [500, 300]], { id: '共享总线' });

const issues = s.lint();
```

| 方法 / 参数 | 说明 |
|------|------|
| `s.track(box, meta?)` | 登记独立节点或区域；区域用 `kind: 'region'` |
| `s.trackRoute(points, meta?)` | 只登记已有线段，不重复绘制 |
| `s.lint(config?)` | 返回 `{ severity, code, message, at, ids }[]` |
| `s.lintScene()` | 返回已登记的节点和边，供自定义工具读取 |
| `id` / `from` / `to` | 给诊断稳定命名，并声明边的合法起终点 |
| `allowThrough: ['node-id']` | 允许该边穿过指定节点 |
| `allowOverlap: true` | 允许共享总线共线 |
| `allowCrossing: true` | 允许已人工确认的交叉 |

错误码：`NODE_OVERLAP`、`ICON_OVERLAP`、`ICON_NODE_OVERLAP`、
`EDGE_THROUGH_NODE`、`EDGE_THROUGH_ICON`、`EDGE_CROSS`、`EDGE_OVERLAP`、
`NODE_OUT_OF_BOUNDS`、`EDGE_OUT_OF_BOUNDS`、`DUPLICATE_NODE_ID`。
线线交叉默认是 warning，其余结构错误为 error。

图标：`lucideIcon` / `iconLabel` 会按中心与尺寸登记轴对齐包围盒。卡片内图标传
`parent: '<card-id>'` 可跳过与该卡片的 `ICON_NODE_OVERLAP`；`allowThrough` /
`allowOverlap` 对图标节点同样生效。

CLI：

```bash
node render.mjs figures.mjs --lint         # error 时退出码 1
node render.mjs figures.mjs --lint-strict  # warning 也令退出码为 1
```

CLI 会在语义几何 lint 后继续检查最终 SVG：非法数值、根尺寸与 viewBox 不一致、
最终手绘 path 越界、文字基线越界。产物层诊断使用 `svg:` 前缀，语义层使用
`semantic:` 前缀。


`path` 支持 `M/L/H/V/Q/C/S/T/A/Z`（绝对与相对坐标）。复杂装饰形、从别处拷来的 path，用它比手工拆折线方便：

```js
s.path('M10 80 Q 95 10 180 80', { stroke: GREEN, sw: 2 });
s.path('M0 0 H100 V80 H0 Z', { stroke: INK, fill: YELLOW, fillStyle: 'zigzag' });
s.arc(200, 120, 120, 80, -30, 210, { stroke: BLUE, closed: 'pie', fill: YELLOW });
```

## 文字

```js
s.text(x, y, w, content, o?)
s.wireLabel(x, y, w, content, o?)
s.inBox(x, y, w, h, content, o?)
s.measure(content, size?)
```

| 字段 | 默认 | 说明 |
|------|------|------|
| `size` | `18` | 字号 |
| `weight` | `400` | 字重，标题用 `700` |
| `color` | `INK` | 文字颜色 |
| `align` | `left` | `left` / `center` / `right` |
| `lh` | `1.45` | 行高倍数 |
| `pad` | `0`（`inBox` 为 `12`） | 内边距 |
| `h` | 无 | 传入后在该高度内垂直居中 |
| `fit` | `true` | 放不下时自动缩小字号（最小 11px），关掉用 `fit: false` |
| `font` | 画布字体 | 单独给这段文字换字体 |
| `halo` | `false` | 用背景色描边形成文字留白光晕 |
| `haloWidth` | `5` | 光晕宽度；泳道消息推荐 `7` |
| `haloColor` | 画布背景色 | 自定义光晕颜色 |

要点：

- `content` 支持 `\n` 手动换行，超宽会自动折行（中文按 1em、西文按 0.55em 估算）。
- `measure(content, size)` 返回估算像素宽度。排卡片前先量一下就能避免自动缩字：
  卡片宽度建议 ≥ `measure(label, size) + 24`。
- `wireLabel` 等价于默认开启 `halo` 的 `text`，用于连线、生命线和区域边界附近的标签。

## 组合件

| 方法 | 说明 |
|------|------|
| `card(x, y, w, h, content, o?)` | 圆角框 + 居中文字，最常用的单元 |
| `window(x, y, w, h, o?)` | 应用窗口：标题栏 + 三个圆点 |
| `lines(x, y, w, n?, gap?, o?)` | 若干潦草横线，示意「一段内容」 |
| `bubble(x, y, w, h, o?)` | 对话气泡 |
| `fence(x, y, w, o?)` | 围栏，表达边界、护栏、约束 |
| `iconLabel(kind, cx, cy, s, label, o?)` | 图标 + 下方短标签，`kind` 为下表任一图标名 |

## 象形图标与自定义形

内置 Lucide `0.547.0` 的完整 1639 个图标，不按业务场景删减。图标数据已经固化到
`lucide-icons.mjs`，渲染时不访问 CDN，也不需要 npm 包。

```js
s.lucideIcon('atom', 120, 120, 56, { stroke: VIOLET });
s.lucideIcon('server-cog', 240, 120, 56, { stroke: BLUE });
s.iconLabel('telescope', 360, 120, 56, '探索', { stroke: GREEN });

console.log(s.lucideIconNames); // 当前固定版本的全部官方名称
```

统一签名为 `lucideIcon(name, cx, cy, s, o?)`；`name` 使用 Lucide 官方 kebab-case
名称，`cx/cy` 为中心，`s` 为尺寸。`iconLabel()` 同样接受任意官方图标名。

### 自定义 SVG 形（`svgGlyph`）

Lucide 只是线宽统一的 UI 图标集。教学解剖、自然物、装置剖面等需要**更大、可填充**的
示意轮廓时，用 `svgGlyph` 传入与 Lucide 固化格式相同的元素数组；坐标系由 `viewBox`
映射到 `(cx, cy, s)`，闭合轮廓可填色：

```js
const LEAF = [
  ['path', { d: 'M50 6 C72 18 88 40 92 68 C96 96 84 118 50 134 C16 118 4 96 8 68 C12 40 28 18 50 6 Z' }],
  ['path', { d: 'M50 22 L50 120' }],
  ['path', { d: 'M50 48 Q68 52 78 42' }],
  ['path', { d: 'M50 48 Q32 52 22 42' }],
];

s.svgGlyph(450, 470, 220, LEAF, {
  viewBox: [0, 0, 100, 140],
  stroke: GREEN,
  fill: YELLOW,
  fillStyle: 'dots',
  hachureGap: 12,
  sw: 2,
  lint: false, // 若只是某 region 的视觉外形，可关掉图标 lint
});
```

| 参数 | 说明 |
|------|------|
| `elements` | `[["path"\|"circle"\|"ellipse"\|"line"\|"polyline"\|"polygon"\|"rect", attrs], ...]` |
| `viewBox` | 默认 `24`；也可 `"0 0 w h"` 或 `[minX, minY, w, h]` |
| `fill` / `fillStyle` | 仅作用于闭合轮廓；开放 path（叶脉等）只描边 |
| `lint` | 默认按图标包围盒登记；装饰底图可设 `false` |

`lucideIcon` 内部就是对固化数据调用 `svgGlyph`。画布绝对坐标的自由曲线仍用
`path` / `polygon`；需要按中心缩放复用同一轮廓时用 `svgGlyph`。

常用选项：`stroke`、`sw`、`id`、`parent`（所属卡片 id，避免 `ICON_NODE_OVERLAP`
误报）、`allowOverlap`、`lint: false`（跳过登记）。卡片内图标建议放在左侧内边，
不要压在顶边中点（北向 `connect` 端口）。

下面这些旧版快捷方法继续保留，以兼容已有绘图代码：

| 图标 | 常见语义 |
|------|---------|
| `person` | 人、用户、角色 |
| `bot` | 机器、AI、自动化 |
| `gear` | 程序、确定性逻辑 |
| `cursor` | 点选、交互 |
| `flag` | 目标、里程碑 |
| `files` | 材料、资产、产物 |
| `ruler` | 规范、校验 |
| `lock` | 权限、安全 |
| `clock` | 历史、时间 |
| `bulb` | 想法、方案 |
| `pencil` | 修改、编辑 |
| `magnifier` | 检查、定位 |
| `wrench` | 工具、修复 |
| `checklist` | 报告、验收 |
| `stamp` | 发布、批准 |
| `scale` | 取舍、权衡 |
| `undo` | 回滚、返工 |
| `scissors` | 移除、切断 |
| `check` / `cross` | 通过 / 失败 |

更新图标版本时修改 `generate-icons.mjs` 中的 `LUCIDE_VERSION`，再运行：

```bash
node scripts/generate-icons.mjs
```

生成器一次下载该版本的完整 `sprite.svg`，不会维护图标白名单。版本、许可证和全部
路径数据都会写入仓库；更新后应检查生成 diff 并重跑全部案例。

## 图题与图注

```js
s.header({ title: '标题即结论', sub: '可选副标题' }); // 返回正文起始 y
// 默认不要 footer；仅当用户明确要求图注 / 脚注时：
// s.footer(y, '图注文字');
```

默认不加编号徽章。只有正文需要「图 1 / 图 2」交叉引用时才传 `label: '图 1'`。
标题固定在画布顶部，正文元素建议从返回值往下排。

**`footer` 默认省略。** 结论放在 `header` 标题与图内标签即可；不要每张图都加底部署名式说明。
省略时画布高度也不要预留图注区，贴齐内容下沿再留约 40～60px。

## 导出与渲染约定

```js
s.toSvg();      // 返回完整 SVG 字符串，可自行写文件
s.reseed(123);  // 换一版笔触手感
```

交给 CLI 渲染时，图形文件导出 `FIGURES`，数组或对象都可以：

```js
export const FIGURES = [['01-a', buildA], ['02-b', buildB]];
export const FIGURES = { '01-a': buildA, '02-b': buildB };
```

CLI 参数见 SKILL.md「第 4 步：渲染」。

## 调色板与字体

| 常量 | 色值 | 建议语义 |
|------|------|---------|
| `INK` | `#3A342D` | 中性、主线条 |
| `GREEN` | `#43795A` | 人、正向结果、交付 |
| `VIOLET` | `#6A5AA8` | 核心处理层、系统能力 |
| `BLUE` | `#3D6EA5` | 数据、规范、引用 |
| `RED` | `#C0483C` | 风险、边界、旧方式 |
| `GRAY` | `#7E766A` | 次要信息 |
| `YELLOW` | `#F0D48A` | 斜线填充，用于强调主块 |
| `PAPER` | `#FFFDF8` | 背景纸色 |

一张图的主色控制在 3～4 种，颜色多了语义就失效。语义可以按项目重新约定，
但同一组图必须保持一致。

字体常量：

| 常量 | 说明 |
|------|------|
| `FONT_HAND` | 默认，手写风优先，逐级回落到楷体、系统中文字体、无衬线 |
| `FONT_SANS` | 更正式的无衬线栈，适合对外正式材料 |
| `FONT` | `FONT_HAND` 的别名 |

SVG 里的字体依赖打开者本机是否安装。若图要在不确定环境下查看，分发 PNG 更稳妥。

## 环境要求

| 能力 | 需要什么 |
|------|---------|
| 生成 SVG | 仅 Node ≥ 18，无任何 npm 依赖 |
| 生成 PNG | 额外需要本机已装 Chrome / Chromium / Edge / Brave |
| 自定义浏览器路径 | `--chrome <path>` 或环境变量 `CHROME_PATH` |

脚本为 ESM（`.mjs`），可直接 `node` 运行，不需要 `package.json`，
也不受目标项目 `"type"` 字段影响。
