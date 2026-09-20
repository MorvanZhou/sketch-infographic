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
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `width` / `height` | 必填 | 画布尺寸；一组图建议统一宽度（如 1200），高度按内容定 |
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
| `fill` | 无 | 斜线填充颜色，常用 `YELLOW` |
| `hachureGap` | `8` | 填充线间距；大面积块用 `16`～`20` 更透气 |
| `hachureAngle` | `-41` | 填充角度 |
| `fillWeight` | `1.4` | 填充线宽 |
| `head` | `13` | 仅箭头：箭头大小 |

## 基础图形

| 方法 | 说明 |
|------|------|
| `line(x1, y1, x2, y2, o?)` | 直线 |
| `polyline(points, o?)` | 折线；`points` 为 `[[x, y], ...]`，`o.closed = true` 闭合 |
| `rect(x, y, w, h, o?)` | 直角矩形 |
| `box(x, y, w, h, o?)` | 圆角矩形，信息图的主力容器 |
| `circle(cx, cy, d, o?)` | 圆，`d` 为直径 |
| `ellipse(cx, cy, w, h, o?)` | 椭圆 |
| `arrow(x1, y1, x2, y2, o?)` | 直线箭头 |
| `curve(x1, y1, cx, cy, x2, y2, o?)` | 二次贝塞尔箭头，用于回流、跨层连线 |

## 文字

```js
s.text(x, y, w, content, o?)
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

要点：

- `content` 支持 `\n` 手动换行，超宽会自动折行（中文按 1em、西文按 0.55em 估算）。
- `measure(content, size)` 返回估算像素宽度。排卡片前先量一下就能避免自动缩字：
  卡片宽度建议 ≥ `measure(label, size) + 24`。

## 组合件

| 方法 | 说明 |
|------|------|
| `card(x, y, w, h, content, o?)` | 圆角框 + 居中文字，最常用的单元 |
| `window(x, y, w, h, o?)` | 应用窗口：标题栏 + 三个圆点 |
| `lines(x, y, w, n?, gap?, o?)` | 若干潦草横线，示意「一段内容」 |
| `bubble(x, y, w, h, o?)` | 对话气泡 |
| `fence(x, y, w, o?)` | 围栏，表达边界、护栏、约束 |
| `iconLabel(kind, cx, cy, s, label, o?)` | 图标 + 下方短标签，`kind` 为下表任一图标名 |

## 象形图标

统一签名 `icon(cx, cy, s, o?)`，`cx/cy` 为中心，`s` 为尺寸（常用 40～72）。

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

## 图题与图注

```js
s.header({ label: '图 1', title: '标题即结论', sub: '可选副标题' }); // 返回正文起始 y
s.footer(y, '图注文字');
```

`label` 可省略。标题固定在画布顶部，正文元素建议从返回值往下排。

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
