# Plan - 基于 React Flow 的可视化项目进度管理交互图实施计划

## 任务拆解与清单

- [x] **Task 1: 后端全量树形拓扑数据接口**
  - 文件：`app/api/projects/graph/route.ts` 与 `lib/graph-service.ts`
  - 目标：提供包含根节点汇总数据、所有项目完整子树（含所有子模块和任务）的结构化 JSON。

- [x] **Task 2: React Flow 自定义节点组件开发**
  - 文件：
    - `components/graph/nodes/RootProgressNode.tsx`（根节点：项目进度管理）
    - `components/graph/nodes/ProjectFlowNode.tsx`（项目节点）
    - `components/graph/nodes/ModuleFlowNode.tsx`（模块/阶段节点）
    - `components/graph/nodes/TaskFlowNode.tsx`（任务节点，支持直接勾选完成）
  - 目标：遵循 Anti-Slop 视觉规范，高对比度现代轻量 UI、状态配色、展开/折叠指示器。

- [x] **Task 3: 拓扑图转换与 Dagre 布局引擎**
  - 文件：`components/graph/flow-layout-utils.ts`
  - 目标：将多级树结构转换为 React Flow 的 Nodes & Edges，根据展开集合（expandedIds）与过滤条件动态裁剪与使用 Dagre 计算坐标（支持 LR 横向与 TB 纵向排版）。

- [x] **Task 4: 画布主体与交互组件（工具栏、侧边详情抽屉）**
  - 文件：
    - `components/graph/FlowControlsBar.tsx`（快捷搜索、状态筛选、展开全部/收起全部、排版切换）
    - `components/graph/NodeDetailDrawer.tsx`（节点详情、任务列表、动态证据链、快速跳转）
    - `components/graph/ProgressFlowCanvas.tsx`（ReactFlow 主体容器、交互事件绑定、任务快捷勾选逻辑）

- [x] **Task 5: 全景图页面与顶部导航栏入口集成**
  - 文件：
    - `app/graph/page.tsx`（页面入口）
    - `components/Navbar.tsx`（添加“全景拓扑图”导航项与高亮状态）
  - 目标：无缝接入全局导航体系。

- [x] **Task 6: 编译与功能自验**
  - 运行 `compile_applet` 和 `lint_applet`，确保所有文件类型安全、零编译错误。
