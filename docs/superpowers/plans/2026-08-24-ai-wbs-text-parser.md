# Plan - AI 智能文本解析与多层级 WBS/任务草稿导入器实施计划

基于 `docs/superpowers/specs/2026-08-24-ai-wbs-text-parser.md` 设计规格，实施分解如下：

## 任务拆解与清单

### Task 1: 核心类型定义与业务解析数据结构
- **文件清单**：`lib/ai-wbs-types.ts`
- **内容**：
  - 定义 `WbsParseTargetLevel` (`project_subnodes` | `node_tasks` | `task_subtasks`)
  - 定义 `ParsedDraftTask`, `ParsedDraftNode`, `WbsParseResult`, `BatchImportPayload`
  - 定义类型守卫与默认工厂生成函数

### Task 2: 服务端 Gemini AI 结构化文本解析 API 路由
- **文件清单**：`app/api/ai/parse-wbs/route.ts`
- **内容**：
  - 基于 `@google/genai` 编写服务端 POST 接口
  - 构造包含 WBS 拆解逻辑的系统提示词与 Few-Shot 示范
  - 使用 `responseSchema` JSON 强类型输出
  - 针对 `project_subnodes` / `node_tasks` / `task_subtasks` 进行不同格式解析
  - 处理异常与降级容错

### Task 3: 批量入库持久化 Mutation 与 API 接口
- **文件清单**：
  - `lib/wbs-import-service.ts`（入库核心事务与 Activity Log 记录）
  - `app/api/nodes/batch-import/route.ts`（批量导入 API 路由）
- **内容**：
  - 实现 `batchImportWbsDraft()` 函数，支持批量追加分组节点、模块任务及子任务
  - 关联生成唯一的 ID、维护 order、关联 parent_id / node_id
  - 记录详细的活动动态与证据链

### Task 4: 草稿编辑与预览子组件开发
- **文件清单**：
  - `components/ai-parse/DraftNodesEditor.tsx`（分组/模块草稿树编辑组件）
  - `components/ai-parse/DraftTasksEditor.tsx`（任务/子任务草稿列表编辑组件）
  - `components/ai-parse/DraftPreviewTree.tsx`（结构拓扑预览与摘要统计）
  - `components/ai-parse/AiTextParseModal.tsx`（主弹窗容器与步骤控制器）
- **内容**：
  - 交互式草稿输入与快捷示例模板
  - 就地修改每个节点/任务名称、负责人、工期、截止日期、交付件规范
  - 草稿项新增、单项删除、批量统计
  - 树状拟真预览与一键确认导入

### Task 5: 在项目层、分组层与任务层集成触发入口
- **文件清单**：
  - `components/ProjectTree.tsx`（挂载全局/项目级 AI 解析弹窗状态与刷新回调）
  - `components/ProjectHeader.tsx`（项目详情头部增加 `✨ AI 智能拆解` 按钮）
  - `components/TreeNodeItem.tsx`（分组操作栏增加 `AI 解析` 按钮）
  - `components/TaskItem.tsx`（任务项操作菜单及快捷按钮增加 `✨ AI 拆解子任务` 入口）

### Task 6: 验证与编译检查
- **内容**：
  - 运行 `compile_applet` 和 `lint_applet` 进行类型安全与构建验证
  - 确保各文件无语法错误且行数均符合代码规范
