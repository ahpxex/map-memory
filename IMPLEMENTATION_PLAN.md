# map-memory Implementation Plan v0

## 1. Plan Intent

这份文档不是重新写一遍 PRD，而是把 PRD 变成可以直接开工的实现顺序。

它回答的是：

- 这周先做哪条实现路径
- 技术栈怎么落地
- 哪些模块先做，哪些后做
- 哪些地方先不用过度设计

## 2. Locked Decisions

### 2.1 Styling: Tailwind CSS

结论：同意使用 `Tailwind CSS`。

理由：

- 这个产品是强布局、强状态、弱内容流的单屏应用，Tailwind 很适合
- 底部浮动工具栏、全屏地图层、popup、hover/selected/correct/wrong 等状态都适合 utility-first 写法
- Tailwind v4 对 Vite 的集成路径很直接，且支持用 `@theme` 定义 design tokens

落地建议：

- 使用 `Tailwind CSS v4`
- 使用官方 `@tailwindcss/vite`
- 设计 token 直接放在全局 CSS 的 `@theme` 中，不额外起一套复杂配置

### 2.2 State Management: Jotai

结论：同意使用 `Jotai`。

理由：

- 这个项目的状态本质上是很多小而清晰的原子状态，不像表单系统，也不像远程数据平台
- `dataset`、`interaction mode`、`training submode`、`selected region`、`label toggle`、`toolbar open state` 这类状态天然适合 atoms
- derived atoms 很适合表达“当前 popup 应显示什么”“当前训练题目是什么”“哪些区域应高亮”

落地建议：

- 用 Jotai 管 UI 和交互状态
- 不要把地图静态数据塞进 atom 里反复拷贝
- 静态地图数据走模块加载；atom 只持有当前选择、当前配置、当前训练进度与派生视图状态

### 2.3 Map Rendering: Apache ECharts

结论：`ECharts 能用，而且这周可以用`，但我要明确 challenge 一下它的边界。

我同意什么：

- ECharts 官方支持 `registerMap(GeoJSON)`
- 支持 `roam`，也就是缩放和平移
- 支持区域 label、emphasis、select、click 等交互
- 作为 week 13 的交互地图底座，它足够快把产品跑起来

我不同意什么：

- 不要把“ECharts 能画地图”误解成“ECharts 就是这个产品的完美长期底座”
- 这个产品不是“图表里嵌一张地图”，而是“地图本身就是产品”
- 如果后面需要更细的 label 排布、更重的区域状态逻辑、更复杂的手势、或者更强的地图语义层，ECharts 可能会开始限制你

更准确的说法：

- `ECharts 适合作为这周把交互式地图训练器做起来的渲染底座`
- `但它更像 week-13 implementation choice，不一定是长期不可替代 choice`

当前建议：

- 本周先用 ECharts
- 只封装一个很薄的 `MapCanvasAdapter`
- 不要把全项目逻辑深绑在 ECharts option 结构里

## 3. This Week's First Training Loop

本周第一个必须打通的训练闭环，建议选：

- `看名点图`

而不是先做：

- `看图猜名`

理由：

- `看名点图` 不需要先解决自由输入、别名、模糊匹配、拼写容错、中英混输这些问题
- 它更贴近地图本身，也更适合先验证“地图交互层是否成立”
- 世界国家和中国地级行政区两套数据都可以共用同一套玩法
- 一旦 `看名点图` 跑通，后面再叠 `看图猜名` 会轻很多

这一点我建议直接锁定，不要再摇摆。

## 4. Technical Architecture

## 4.1 Runtime

- React
- TypeScript
- Vite
- Tailwind CSS v4
- Jotai
- Apache ECharts

## 4.2 Storage

结论：用 `IndexedDB`，不要从 `localStorage` 起步。

理由：

- 这个项目虽然没有后端，但会有训练记录、错题池、设置项、导入导出版本信息
- `localStorage` 勉强能做，但不是一个值得长期依赖的状态容器
- 现在直接用 `IndexedDB`，后面不会因为数据结构复杂化再迁移一次

实现建议：

- 使用轻量封装，例如 `idb`
- 只做一个简单的本地 repository 层，不引入过重数据库抽象

## 4.3 Data Ownership

静态真相：

- 世界国家 GeoJSON / metadata
- 中国地级行政区 GeoJSON / metadata
- label、多语言名称、父级关系、邻接关系

用户本地真相：

- 当前设置
- 当前训练进度
- 错题池
- 熟练度
- 导入导出快照

关键边界：

- 静态数据和用户训练数据必须彻底分开
- import/export 导出的主要是用户数据，不是整套地图资源

## 5. Recommended File Structure

建议把目录尽早整理成下面这个形状：

```text
src/
  app/
    AppShell.tsx
  components/
    BottomToolbar.tsx
    RegionPopup.tsx
  features/
    map/
      MapCanvas.tsx
      echarts-map-adapter.ts
      map-option-builder.ts
    training/
      training-engine.ts
      training-selectors.ts
  state/
    atoms/
      dataset.ts
      ui.ts
      selection.ts
      training.ts
      persistence.ts
  data/
    world/
      world.geo.json
      world.metadata.json
    china-prefectures/
      china-prefectures.geo.json
      china-prefectures.metadata.json
  lib/
    storage/
      indexeddb.ts
      import-export.ts
    i18n/
      labels.ts
  styles/
    app.css
```

不用一开始完全照这个拆满，但方向应该是这个方向。

## 6. Build Order

## 6.1 Step 1: Install and Switch Styling Foundation

先把当前项目切到：

- Tailwind CSS v4
- 官方 Vite plugin

并完成：

- 全局样式入口切到 Tailwind
- 保留少量自定义 CSS，只做地图层和少数复杂动画/布局修正
- 建立一套基础 token：颜色、圆角、阴影、z-index、toolbar/popup spacing

完成标准：

- 当前占位首页能完全用 Tailwind 重写
- 页面视觉风格不回退到模板样式

## 6.2 Step 2: Add State Skeleton With Jotai

先建 atoms，不要先写复杂组件。

首批 atoms：

- `datasetAtom`
- `interactionModeAtom`
- `trainingModeAtom`
- `showLabelsAtom`
- `languageAtom`
- `selectedRegionIdAtom`
- `toolbarExpandedAtom`
- `popupModeAtom`

首批 derived atoms：

- `currentDatasetConfigAtom`
- `selectedRegionAtom`
- `popupContentAtom`
- `mapVisualStateAtom`

完成标准：

- 即使没有真实地图，状态切换也能在页面上被验证

## 6.3 Step 3: ECharts Map Adapter With One Dataset First

不要一上来同时接世界和中国。

建议顺序：

1. 先接世界地图
2. 跑通 click / hover / roam / label toggle
3. 再接中国地级行政区

为什么先世界：

- 数据层级更简单
- 能更快验证 `registerMap + roam + click + popup` 这条技术链

这一层要做的事情：

- 封装 ECharts init / dispose
- 封装 map registration
- 封装 click / hover 事件桥接到 Jotai
- 封装 option builder

完成标准：

- 世界地图全屏显示
- 能缩放、拖拽、hover、click
- click 后能拿到 region id 并驱动 popup

## 6.4 Step 4: Bottom Floating Toolbar

先把工具栏做成一个稳定的“控制台”，但只接最必要的控件：

- 世界 / 中国切换
- 探索 / 训练切换
- 看名点图切换
- label on/off
- 语言切换
- 导出 / 导入入口

这一步不要一次把所有开关做满。

完成标准：

- 工具栏已是唯一全局控制中心
- 顶部、侧边都没有额外控制条

## 6.5 Step 5: Popup System

先做两种 popup：

- explore popup
- training popup

先不做很多视觉分支，先把内容规则做清楚。

最小内容：

- explore popup
  - 名称
  - 上级归属
  - 邻接数量或基础概况

- training popup
  - 当前题目
  - 用户操作结果
  - 正确答案
  - 下一题

完成标准：

- popup 已经是“模式驱动”，而不是死模板

## 6.6 Step 6: First Real Training Loop

锁定并实现：

- `看名点图`

最小交互流：

1. 系统随机给出一个区域名称
2. 用户点击地图区域
3. 系统判定对错
4. popup 给出反馈
5. 更新训练记录
6. 进入下一题

完成标准：

- 世界模式至少能完整训练
- 训练记录能正确更新

## 6.7 Step 7: Persistence and Import/Export

在第一条训练闭环成立后，再接：

- IndexedDB persistence
- JSON export
- JSON import

建议导出结构：

```ts
type ExportPayload = {
  version: string
  exportedAt: string
  settings: UserSettings
  progress: Record<string, RegionProgress>
  errorPool: Record<string, ErrorRecord[]>
}
```

导入策略：

- 本周先只做 `replace import`
- 明确提示会覆盖本地记录

完成标准：

- 导出文件可以在本地下载
- 导入文件后训练状态恢复

## 6.8 Step 8: Second Dataset

在世界模式跑通后，接中国地级行政区。

这个阶段主要挑战不是 UI，而是：

- 数据口径
- region id 稳定性
- label 密度
- popup 信息字段对齐

必须守住的原则：

- 不为中国模式单独长出第二套交互架构

## 7. What Not To Overbuild This Week

这周先不要做重：

- 自由文本输入答题
- 复杂的模糊匹配与别名系统
- 高级 spaced repetition 算法
- 多维统计 dashboard
- 很重的百科信息卡
- 花哨的 3D / shader / 特效地图

## 8. Concrete Next Implementation Task

如果下一步立刻开工，我建议从下面这组任务开始：

1. 接入 Tailwind CSS v4
2. 安装并接入 Jotai
3. 安装 ECharts
4. 建 `datasetAtom / interactionModeAtom / selectedRegionIdAtom`
5. 接一张世界地图，跑通 click + popup

这是最稳的起手式。

## 9. Final Recommendation

我同意你现在锁这组技术栈：

- Tailwind CSS
- Jotai
- ECharts

但我会把它更准确地表述成：

- `Tailwind` 是样式基础设施
- `Jotai` 是交互状态骨架
- `ECharts` 是本周把地图训练器做起来的渲染底座

真正该优先验证的，不是“这三个库能不能一起用”，而是：

- 单屏地图结构能不能成立
- `看名点图` 能不能形成真正顺手的训练闭环
- popup 和底部工具栏会不会抢地图的主舞台

只要这三件事成立，这周的实现方向就是对的。
