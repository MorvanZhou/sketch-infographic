---
name: sketch-infographic
description: >
  用零依赖的 Node 脚本画「手绘风格信息图」（架构图、流程图、对比图、分层图、
  闭环图、分工图、时间线），输出 SVG，可选导出 PNG。凡是用户要为文章、README、
  周报、方案、复盘、培训材料、公众号推文、PPT 配一张讲清楚结构或流程的示意图时
  都用这个 skill，包括「画张架构图」「画个流程图」「做张对比图」「给这篇文章配图」
  「画个示意图」「新旧方案对比图」「画一下数据流」「手绘风格配图」这类说法。
  也用于修改、重排、重新生成已有的手绘信息图。不要改用 Mermaid、AI 生图或截图拼接：
  这套方案的图可进 Git、可复现、风格统一，且不需要安装 rough.js、playwright、
  puppeteer、canvas 等任何依赖，有 Node 就能跑，适合放进任何项目。
---

# sketch-infographic

## 这个 skill 解决什么问题

给文档或文章配结构示意图时，常见做法各有硬伤：Mermaid 布局不可控、样式单调；
AI 生图文字容易出错、改一个字要重抽；Figma 或截图进不了版本库、没法 diff。

这套方案用**代码描述图**：Node 脚本按坐标摆放卡片、箭头、图标和文字，库内部把每条线
重绘两遍并加上固定随机抖动，得到白板手绘质感。图定义是纯文本，能进 Git、能继续编辑、
能一键重渲染，且同样的输入每次得到完全相同的输出。

**唯一依赖是 Node（≥ 18）。** SVG 渲染全程只用标准库；只有需要 PNG 时才调用本机已装的
Chrome/Chromium/Edge/Brave 命令行截图，不安装任何 npm 包，也不需要 `package.json`。

## 快速开始

先确认 skill 自身所在目录（下文记作 `$SKILL`，通常是 `~/.claude/skills/sketch-infographic`
或项目内的 `.claude/skills/sketch-infographic`）。

### 方式 A：在目标项目里落地一份（推荐）

适合图要长期维护、要跟着项目走、别人 clone 下来也能重渲染的场景：

```bash
node $SKILL/scripts/init.mjs <项目里的图形目录> --name figures
```

它会把 `sketch.mjs`、`render.mjs` 和一个含四种常用图式的 `figures.mjs` 模板复制过去。
复制之后那个目录**完全自包含**，不再依赖 skill 路径：

```bash
cd <项目里的图形目录>
node render.mjs figures.mjs --png
```

### 方式 B：直接引用 skill 里的库

适合一次性出图、不打算把脚本留在项目里的场景。图形文件里这样导入：

```js
import { createSketch, INK, GREEN, VIOLET } from '$SKILL/scripts/sketch.mjs';
```

然后 `node $SKILL/scripts/render.mjs figures.mjs --out ./images --png`。

> 落地到项目时优先选方式 A。方式 B 的绝对路径换台机器就失效。

## 工作流程

### 第 1 步：先想清楚图在讲什么

动手写坐标前先定三件事，否则容易画出「信息很多但看不懂」的图：

1. **这张图的唯一结论是什么**，用一句话写下来，它就是标题。
2. **用哪种结构承载**（见下表），一张图只用一种主结构。
3. **画面上留多少元素**，顶层块控制在 3～7 个，超过就拆成两张图。

图上的文字只放 2～6 字标签，论述留给正文。图负责表达关系，不负责讲完道理。

### 第 2 步：选图式

| 图式 | 适合表达 | 画法要点 |
|------|---------|---------|
| **横向流程** | 步骤、链路、生命周期 | 等距 `card` + `arrow` 串联，返工路径用虚线 `curve` |
| **左右对比** | 新旧方案、有无某能力 | 中间一条虚线分隔，左右同构，只让差异处变色 |
| **纵向分层** | 系统架构、职责分层 | 自上而下若干 `box`，层内用小 `card` 列能力，层间用 `arrow` |
| **并列分工** | 角色职责划分 | 2～4 个等宽 `box`，每列一个大图标 + 若干 `iconLabel` |
| **闭环** | 反馈、迭代、修复回路 | 节点沿椭圆分布，用 `curve` 连接，返工段用虚线 |
| **中心辐射** | 上下文、依赖来源 | 中心放主体，四周放来源，`arrow` 指向中心 |
| **时间线** | 阶段演进、里程碑 | 一条主轴 + 刻度，节点大小表示权重 |

模板文件 `assets/template-figures.mjs` 里已经实现了前四种，照抄改比从空文件写快得多。

### 第 3 步：写图形定义文件

一张图 = 一个函数，最后导出 `FIGURES`：

```js
import { createSketch, INK, GREEN, VIOLET, YELLOW, GRAY } from './sketch.mjs';

function myFigure() {
  const s = createSketch(1200, 500);
  s.header({ label: '图 1', title: '标题就是这张图的结论', sub: '可选副标题' });

  s.card(80, 180, 220, 60, '输入', { stroke: GREEN });
  s.arrow(304, 210, 372, 210, { stroke: GRAY });
  s.box(380, 150, 420, 200, { stroke: VIOLET, fill: YELLOW, hachureGap: 18 });
  s.text(400, 170, 380, '处理层', { size: 22, weight: 700, align: 'center', color: VIOLET });

  return s;
}

export const FIGURES = [['01-my-figure', myFigure]];
```

`FIGURES` 也可以写成对象：`{ '01-my-figure': myFigure }`。
完整 API 见 `references/api.md`，坐标排版方法与避坑清单见 `references/layout.md`。

### 第 4 步：渲染

```bash
node render.mjs figures.mjs                      # 只出 SVG，零依赖最快
node render.mjs figures.mjs --png                # 同时出 PNG
node render.mjs figures.mjs --png --only 01-flow # 只重渲染一张
node render.mjs figures.mjs --list               # 看看有哪些图
```

参数：`--out` 输出目录（默认图形文件同级的 `images/`）、`--png` 附带 PNG、
`--scale` PNG 像素倍率（默认 2）、`--only` 逗号分隔的 id、
`--chrome` 手动指定浏览器（也可用环境变量 `CHROME_PATH`）。

### 第 5 步：看图改图

渲染完**一定要真的打开图看一眼**。生成式排版最常见的问题是重叠和留白失衡，
肉眼一眼能发现，只读代码发现不了。逐项检查：

- 文字有没有压住线条，箭头有没有穿过卡片；
- 同层元素是否对齐，间距是否一致；
- 颜色是否超过 4 种（超过就杂）；
- 缩到正文宽度后，最小字号还能不能看清。

发现问题改坐标重渲染即可，这个循环很便宜，值得多跑两轮。前两轮需要调整是正常的。

## 设计约定

保持这几条，一组图放在一起才像同一套：

- **一张图一个结论**，标题直接写结论，不写「XX 示意图」。
- **颜色表达语义**而非装饰：`INK` 中性、`GREEN` 人与正向结果、`VIOLET` 核心处理、
  `BLUE` 数据与规范、`RED` 风险与边界、`GRAY` 次要信息。语义可按项目重新约定，
  但同一组图里必须一致。
- **强调靠填充和线宽**：主块用 `fill: YELLOW` 斜线填充或 `sw: 2.2`，其余保持默认。
- **虚线专表示非主干**：反馈、回流、可选路径用 `dash: true`。
- **标签短**，图内文字超过 8 个字就换个说法。
- **画布宽度统一**（建议 1200），高度按内容定，这样一组图排进文档大小一致。

## 什么时候不要用这个 skill

- 需要精确数值的统计图表（柱状、折线、饼图）：用图表库，手绘风不适合承载数据。
- 需要照片级视觉的插画或封面：那是 AI 生图的活。
- 团队已统一用 Mermaid 且只要一个极简流程图：沿用 Mermaid 更省事。

## 目录结构

```
sketch-infographic/
├── SKILL.md                      本文件
├── scripts/
│   ├── sketch.mjs                零依赖渲染库（手绘笔触、填充、文字自适应）
│   ├── render.mjs                渲染 CLI（SVG 零依赖，PNG 走本机浏览器）
│   └── init.mjs                  把上面两个脚本 + 模板落地到目标项目
├── assets/
│   └── template-figures.mjs      四种常用图式的可运行模板
└── references/
    ├── api.md                    全部 API、参数、图标清单
    └── layout.md                 坐标排版方法与重叠避坑清单
```
