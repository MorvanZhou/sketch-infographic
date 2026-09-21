# 排版方法与避坑清单

这套方案是**手工坐标排版**，没有自动布局。好处是想怎么放就怎么放，代价是容易重叠。
下面这套做法能把返工次数压到很低。

## 一、先算网格，再写坐标

不要一上来就凭感觉写数字。先定三个量，后面所有坐标都从它们推导：

```js
const W = 1200;   // 画布宽，一组图保持一致
const M = 48;     // 页边距
const GUT = 24;   // 元素间距
```

常用推导：

```js
// n 等分列
function cols(n, left = M, right = M, gutter = GUT) {
  const w = (W - left - right - gutter * (n - 1)) / n;
  return { w, x: (i) => left + i * (w + gutter) };
}

// 纵向等距堆叠
const rowY = (i, top = 160, h = 54, gap = 36) => top + i * (h + gap);
```

用函数生成坐标而不是手写常量，改间距时只需要改一处。

## 二、图式从哪里抄

`assets/template-figures.mjs` 只是 `init` 的单图种子（`R` + `card` + `connect`），
**不是图式清单**，也不代表「信息图 = 方框流程图」。具体结构请按内容组合原语；
仓库 `examples/` 有跨领域可跑样本（含更图形化的 CNN 示意）。

常见起点（不是封闭白名单）：

| 读者要看什么 | 优先手段 |
|-------------|----------|
| 节点名与依赖 | `card` / `box` + `connect` / `bypass` |
| 形态、体积、缩放、包含 | 叠层 `rect`、圆/椭圆、扇形、`path` 轮廓 |
| 连续变化 / 回流 | `curve`、虚线旁路 |
| 抽象符号 | Lucide 或 `svgGlyph` |

教学、科学概念、神经网络、生物结构等，优先画「长什么样」：例如特征图用层层叠高的
色块示意通道变深与空间变窄，全连接用圆点阵列 + 曲线扇入，而不是六个等宽标题卡片。

装饰性内部笔触（网格、示意剖面线、小核窗口）可对元素设 `lint: false`，外层仍用 `R` +
`track` 登记可检查边界。

## 三、常见问题与修法

| 现象 | 原因 | 修法 |
|------|------|------|
| 文字被自动缩成一团 | 卡片宽度不够 | 渲染前用 `s.measure(label, size)` 核对，宽度取 `measure + 24` |
| 标签压住箭头 | 标签和连线抢同一段空间 | 标签移到连线一侧，留 12px 以上；或把标签放进小 `card` |
| 曲线穿过卡片 | 控制点离图形太近 | 控制点往外推 40～80px，或改走画布外侧通道 |
| 箭头扎进框里 | 起止点用了框中心 | **改用 `connect` / `bypass`**，从边中点进出 |
| 底部元素被截断 | 画布高度不够 | 画布高度 = 最低元素 y + 60 以上 |
| 图看着乱 | 顶层块超过 7 个 | 合并同类项，或拆成两张图 |
| 手绘感太强，正式场合不合适 | 默认 roughness 偏大 | `createSketch(w, h, { stroke: { roughness: 0.8, passes: 1 }, font: FONT_SANS })` |

## 四、复杂图怎么画稳（必读）

信息一多，手写 `arrow(cx1, cy1, cx2, cy2)` 几乎一定会穿框、指不明。
复杂图请改用下面这套约定——拓扑示例见 `examples/figures.mjs` 的 `04-service-topology`。

### 1. 节点先变成矩形对象

```js
import {
  createSketch, R, assertNoOverlap, VIOLET, GRAY,
} from './sketch.mjs';

const order = R(540, 220, 140, 70, '订单');
const pay   = R(760, 220, 140, 70, '支付');
s.card(order.x, order.y, order.w, order.h, '订单', { stroke: VIOLET });
s.card(pay.x, pay.y, pay.w, pay.h, '支付', { stroke: GRAY });

// 同级区域先做硬检查；不足 24px 也按碰撞处理
assertNoOverlap([['订单', order], ['支付', pay]], 24);
```

### 2. 用 `connect` 贴边连，不要连框心

```js
// 从订单右边中点 → 支付左边中点；默认正交折线
s.connect(order, 'e', pay, 'w', { stroke: GRAY });
s.connect(order, 's', stock, 'n', { stroke: GRAY });
```

`side` 取 `n/s/e/w`（或 top/bottom/left/right）。库会自动留 6px 间隙，箭头不会扎进字里。

### 3. 回流 / 跨层用 `bypass` 走外侧通道

```js
// 从上方绕行，不穿过中间的支付卡片
s.bypass(order, 'n', mkt, 'n', {
  via: 'above', pad: 36, dash: true, stroke: RED, label: '优惠核销事件',
});
```

`via`: `above` | `below` | `left` | `right`。虚线回流一律走通道，禁止斜穿。

### 4. 先留「走线槽」，再摆节点

把画布想成电路板：

- 行与行之间留 **40～56px** 专给水平线；
- 列与列之间留 **24～36px** 专给竖直线；
- 回流线再额外要一条在整组节点外的通道（上/下/左/右各最多一条）。
- 泳道只保留参与者卡片和细虚线生命线，不画贯穿全高的粗外框。

节点网格对齐后，`connect` 的正交折线会落在槽里，交叉会少很多。

连线标签统一用 `wireLabel`，纸色光晕把文字与线条隔开：

```js
s.polyArrow([[x1, y], [x2, y]], { stroke: BLUE });
s.wireLabel(x1, y - 24, x2 - x1, '鉴权通过', {
  align: 'center', color: BLUE, haloWidth: 7,
});
```

### 5. 绘制顺序：容器 → 节点 → 连线 → 标签

后画的压在上面。连线放在节点之后，箭头盖在框边上更清晰；
`connect` / `bypass` 的 `label` 已经在线旁自动落字。

### 6. 复杂图略降手绘抖动

连线 API 默认 `passes: 1, roughness: 0.85`。整张图也可以：

```js
const s = createSketch(1200, 700, { stroke: { roughness: 0.9, passes: 1 } });
```

箭头指向会更明确，框角也不会抖到压住邻线。

### 7. 用几何 lint 先排除硬错误

```bash
node render.mjs figures.mjs --lint-strict
```

第一层会检查矩形重叠、图标互压/压节点、线穿非目标节点或图标、线线交叉/共线和画布越界；
第二层检查最终 SVG 的尺寸/viewBox、非法数值、实际笔触和文字越界。两层都会输出错误码与坐标。
`connect` / `bypass` / `lucideIcon` 自动登记几何；手写折线要补全语义：

```js
s.polyArrow(points, { id: '支付回调', from: pay, to: order });
s.trackRoute(busPoints, { id: '测试总线' }); // 已用 line/polyline 画过的普通线
s.track(groupBox, { id: '测试区', kind: 'region' });
s.lucideIcon('store', card.x + 28, card.y + card.h / 2, 26, {
  id: 'icon-shop', parent: card.id, // 卡片内图标
});
```

共享总线可对对应边使用 `allowOverlap: true`。只有确认交叉不会引起歧义时才使用
`allowCrossing: true`，不能把豁免当作全局关闭开关。

### 8. 仍然看不清就拆图

一张图一个主结构。超过约 8 个需互连的节点，优先拆成
「总览拓扑」+「某一跳时序」两张，比硬塞一张稳得多。

## 五、留白与层级

- 画布四周至少留 48px。
- 标题与首个元素之间留 60px 以上。
- 相关元素靠近（≤ 16px），无关元素拉开（≥ 36px），距离本身就是分组信息。
- 突出某块时优先用斜线填充，其次加粗线宽，最后才换颜色。三种手段同时上会很吵。

## 六、检查节奏

改完坐标就渲染，渲染完一定要真的看图：

```bash
node render.mjs figures.mjs --png --only 01-my-figure
node render.mjs figures.mjs --lint-strict --only 01-my-figure
```

看图时按这个顺序扫一遍：

1. 从缩放看整体，分组是否清楚；
2. 逐块看文字与图标，有没有被缩小、遮挡、切断，图标是否互压或挡住连线；
3. 顺着箭头走一遍，流向是否成立且未穿过图标；
4. 缩到正文宽度，最小字号是否还能看清（正文宽度下 17px 大致是下限）。

前两轮渲染通常都要调坐标，这是正常的，不要指望一次成型。

## 七、输出格式怎么选

| 场景 | 建议 |
|------|------|
| 代码仓库文档、网页 | SVG，体积小、可缩放、diff 友好 |
| Markdown 发布、公众号、PPT、飞书、邮件 | PNG，加 `--png`，`--scale 2` 保证清晰度 |
| 需要透明底 | `createSketch(w, h, { background: 'transparent' })` |
| 目标环境字体不确定 | 一律用 PNG，避免字体缺失导致排版走样 |

## 八、把图纳入版本管理

- 图形定义文件（`figures.mjs`）必须进仓库，它才是源文件。
- SVG 建议进仓库，文本 diff 可读。
- PNG 是否进仓库看团队习惯：需要在 README、Wiki 直接看图就提交，
  否则在 CI 或本地按需重新生成。
- 不要手工改生成出来的 SVG，下次渲染会被覆盖，改动请回到图形定义文件。
