# Spec - 基于 React Flow 的全景项目进度管理交互图

## 1. 业务背景与目标
用户期望在系统中增加一个基于 React Flow 的可视化项目进度管理交互拓扑图：
- 根节点固定为 **「项目进度管理」**（中央总览根节点，展示系统整体指标、健康度、总体进度与告警）。
- 入口位置置于 **顶部导航栏**（如“全景进度图”导航项）。
- 支持向下逐级展开：
  - 一级分支：各个独立项目节点（包含负责人、进度条、工期/交付期、状态、优先级、超期告警等）。
  - 二级/多级分支：项目所属的模块与阶段节点。
  - 叶子/详情分支：模块下的各个具体任务节点，支持在流程图中直接勾选任务完成状态、查看交付件与评论证据链。
- 提供全交互特性：
  - 自由平移缩放（Pan/Zoom）、自适应居中（Fit View）、迷你地图（MiniMap）、布局切换（横向左向右 / 纵向上向下）。
  - 节点折叠与展开（Expand / Collapse），支持一键全展开/一键全折叠。
  - 过滤筛选（状态筛选、优先级筛选、人员搜索、关键词高亮）。
  - 节点点击唤起侧边信息抽屉（Node Detail Drawer），支持直接跳转项目、查看评论、快捷切换任务状态。

## 2. 技术选型与架构设计
- **前端核心库**：`@xyflow/react` (React Flow v12)，搭配 `@dagrejs/dagre` 自动层级拓扑布局算法。
- **状态与数据流**：
  - 后端新建 `/api/projects/graph` 路由，聚合全量项目树与任务数据。
  - 前端通过自定义 hook / 状态管理器维护节点展开状态（Set<string>）、过滤器、选中节点等。
- **自定义节点类型 (Custom Nodes)**：
  1. `RootNode`：根节点「项目进度管理」大卡片，展示全系统项目总数、综合完成率、逾期风险数、各状态项目统计。
  2. `ProjectNode`：项目节点，展示项目标题、负责人、优先级Badge、进度条与百分比、超期预警、展开/折叠按钮、跳转详情按钮。
  3. `ModuleNode`：模块/子阶段节点，展示阶段名称、负责人、任务完成比例、超期状态、展开/折叠按钮。
  4. `TaskNode`：任务节点，包含完成复选框（点击即触发 `/api/tasks` 切换状态）、负责人、交付件标志、逾期天数。
- **自定义边 (Custom Edges)**：平滑平滑贝塞尔曲线（SmoothStep / Bezier），带状态流向动态高亮与动画效果。

## 3. 页面与组件模块划分（严格限制行数 < 300 行）
- `app/graph/page.tsx`：全景进度图主页面，集成导航栏、加载骨架、主体画布与控制栏。
- `app/api/projects/graph/route.ts`：获取全部项目树结构及全局统计数据的高性能 API。
- `components/graph/ProgressFlowCanvas.tsx`：React Flow 容器组件，管理画布、背景网格、控制器、MiniMap。
- `components/graph/FlowControlsBar.tsx`：顶部/悬浮操作栏（搜索、状态过滤、方向切换、一键展开/折叠、全屏/复位）。
- `components/graph/NodeDetailDrawer.tsx`：选中节点后的侧边详情抽屉，展示关联任务清单、动态、操作入口。
- `components/graph/nodes/RootProgressNode.tsx`：根节点组件。
- `components/graph/nodes/ProjectFlowNode.tsx`：项目节点组件。
- `components/graph/nodes/ModuleFlowNode.tsx`：模块/阶段节点组件。
- `components/graph/nodes/TaskFlowNode.tsx`：任务节点组件。
- `components/graph/flow-layout-utils.ts`：拓扑数据转换与 Dagre 布局计算工具函数。
- `components/Navbar.tsx`：顶部导航栏增加「全景拓扑」/「全景进度图」入口链接。

## 4. 验证标准
1. 顶部导航栏显示「全景进度图」入口，点击能无缝跳转至 `/graph`。
2. 拓扑图根节点明确展示为「项目进度管理」，并包含全局汇总指标。
3. 能够清晰展开展示各个项目、子模块及任务节点，连接线平滑美观。
4. 支持在图谱中直接勾选任务完成/取消完成，数据实时同步并更新节点进度。
5. 搜索和状态过滤能够即时高亮和筛选节点。
6. 点击节点可打开右侧详情抽屉，并可一键跳转至项目看板。
7. 响应式与交互流畅，无任何控制台报错或 TypeScript 类型错误。
