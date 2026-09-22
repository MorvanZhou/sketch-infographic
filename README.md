# sketch-infographic

手绘信息图的 AI Agent Skill。相对常见方案：

| | **sketch-infographic**（本项目） | Mermaid | AI 生图 | draw.io + MCP |
|---|---|---|---|---|
| **能力范围** | Agent 自动出图，形态由代码算 | 固定图式（流程/时序等） | 画面自由，结构难控 | 上万个现成图形，标准记法齐全 |
| **图形当主体** | **参数化轮廓**：一个函数定形状，内部构件从它推导 | 不支持，只有节点框 | 画得出但改不准，也难复现 | 能画自定义 stencil，但是声明式 XML：无循环变量，改比例要重写全部路径点 |
| **画错能不能拦住** | **双层 lint**：重叠、穿线、贴边、越界不过就不出图 | 布局交给引擎，不用自己管 | 没有检查 | 只校验 XML 合法性，摆位靠模型自觉 |
| **可维护性** | 源码/SVG 可 diff、可重渲 | 文本可 diff | 难精确改、难复现 | `.drawio` 可 diff，能改单元素，也能在编辑器里拖 |
| **经济性** | 本地重渲，省 Token | 改 DSL 即可 | 反复调模型，费 Token | 同为写文本，和本项目同量级 |
| **适用范围** | 研究、教学、科学结构、架构、方案 | 文档内嵌简单图 | 插画/氛围图 | 云架构、UML、BPMN 等标准图 |

读者要看**谁连谁**，draw.io 这类工具更强：图形库大、标准记法齐、非技术同事还能自己拖。
本项目的位置是读者要看**长什么样、怎么变**：形态由函数算出来，标注和连线跟形态共用同一套
坐标，改一个参数整张形态一起变。手绘风不是本项目独有的（draw.io 也有 `sketch=1`），
真正的差别是几何由代码生成，以及有程序拦住画错的图。

## 跨领域案例

<table>
  <tr>
    <td width="50%" valign="top">
      <p><b>研究框架</b><br/>
      <sub>设计 / 执行 / 解释三层：每阶段可追问点 + 结论拆分</sub></p>
      <a href="examples/images/01-research-framework.png"><img src="examples/images/01-research-framework.png" alt="研究框架图" /></a>
    </td>
    <td width="50%" valign="top">
      <p><b>光合作用教学图（形态当主体）</b><br/>
      <sub>叶形由半宽函数算出 · 叶脉/气孔/叶绿体都从它推导 · 基粒叠层而非方框墙</sub></p>
      <a href="examples/images/02-photosynthesis.png"><img src="examples/images/02-photosynthesis.png" alt="光合作用教学图" /></a>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <p><b>政策影响路径</b><br/>
      <sub>政府、商家、供应链、消费者与环境（卡片内图标 + parent）</sub></p>
      <a href="examples/images/03-policy-path.png"><img src="examples/images/03-policy-path.png" alt="政策影响路径图" /></a>
    </td>
    <td width="50%" valign="top">
      <p><b>服务拓扑</b><br/>
      <sub>同步贴边连接，异步外侧绕行</sub></p>
      <a href="examples/images/04-service-topology.png"><img src="examples/images/04-service-topology.png" alt="服务拓扑图" /></a>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <p><b>路径对比</b><br/>
      <sub>左右同构，只让差异变色</sub></p>
      <a href="examples/images/05-approach-compare.png"><img src="examples/images/05-approach-compare.png" alt="路径对比图" /></a>
    </td>
    <td width="50%" valign="top">
      <p><b>新用户旅程</b><br/>
      <sub>时间轴、情绪变化与流失风险</sub></p>
      <a href="examples/images/06-onboarding-journey.png"><img src="examples/images/06-onboarding-journey.png" alt="新用户旅程图" /></a>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <p><b>多租户平台架构</b><br/>
      <sub>边缘 / 业务域 / 数据面 / 控制面 / 可观测性：分列邻接连线</sub></p>
      <a href="examples/images/07-platform-architecture.png"><img src="examples/images/07-platform-architecture.png" alt="多租户平台架构图" /></a>
    </td>
    <td width="50%" valign="top">
      <p><b>CNN 结构（形态示意）</b><br/>
      <sub>特征图叠层变窄变厚 · 神经元圆点 · Softmax 柱，而不是方框标题墙</sub></p>
      <a href="examples/images/08-cnn-structure.png"><img src="examples/images/08-cnn-structure.png" alt="CNN 结构示意图" /></a>
    </td>
  </tr>
</table>


## 怎么用

### 1. 安装

```bash
npx skills add morvanzhou/sketch-infographic
```

### 2. 让 Agent 画

装好后直接说你要什么图，例如：

- 「画一张 Transformer 架构图」
- 「用特征图叠层画一张 CNN 结构示意，不要方框流水线」
- 「把这篇论文的方法、实验和结论画成研究框架图」
- 「给学生画光合作用，要让叶子当主体，把气孔和叶绿体按形态画出来」
- 「把这份政策方案画成利益相关方与影响路径图」
- 「画一下推荐系统的召回-排序链路」
- 「画一张同步/异步分开的微服务拓扑」

Agent 会选图式（拓扑或形态）、写图、渲染，并打开结果核对。

### 3.（可选）把图留在项目里

需要长期维护时，让 Agent 把脚本落到项目目录，之后随时改坐标重渲：

```bash
node $SKILL/scripts/init.mjs <项目里的图形目录> --name figures
cd <项目里的图形目录>
node render.mjs figures.mjs --lint-strict
node render.mjs figures.mjs --png
```

## 不适合什么

- 大规模数据探索、统计推断或需要交互筛选的专业图表（简单数据图仍可作为信息图的一部分）
- 照片级插画或封面（白板级图形化示意可以，写实插画请用别的工具）
- 只要一个极简流程图、团队已统一用 Mermaid

## License

[MIT](LICENSE)。Lucide 图标数据遵循 ISC，版本与声明见
`skills/sketch-infographic/scripts/lucide-icons.mjs` 文件头。
