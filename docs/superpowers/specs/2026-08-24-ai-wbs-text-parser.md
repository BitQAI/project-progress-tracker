# Spec - AI 智能文本解析与多层级 WBS/任务草稿导入器

## 1. 业务背景与用户价值
在项目进度管理与 WBS 拆解过程中，用户经常持有非结构化的自然语言文本（如：需求说明、会议纪要、敏捷冲刺清单、测试排期备忘、模块规划草案等）。手动逐条新建子分组、逐项录入任务和子任务效率低且容易遗漏关键属性。

用户需求明确指出：
- **多层级智能解析入口**：
  - **项目层 (Project Level)**：用户在项目总览/根节点处触发，输入一段非结构化文本，AI 自动解析拆解为**下级分组/模块节点**（并可包含各模块下的初始任务）。
  - **分组/模块层 (Node Level)**：用户在具体分组节点处触发，AI 解析拆解为该分组下的**子模块/子分组**或**任务列表**。
  - **任务层 (Task Level)**：用户在某条具体任务处触发，AI 解析拆解为该任务下的**下级子任务清单 (Subtasks)**。
- **草稿确认、实时编辑、删除与树状预览**：
  - AI 解析完成之后**绝不立即静默入库**；
  - 必须提供可视化的**草稿检查与确认模态框 (Draft Inspector Modal)**；
  - 用户在模态框中可**自由编辑**任何字段（名称、负责人、预估工期、截止日期、交付件要求）、**删除/剔除无用项**、**新增补充项**、并能实时查看**层级拓扑预览与导入影响摘要**（如“预计新增 3 个模块，8 项任务”）；
  - 用户确认满意后，一键执行批量事务入库并自动刷新项目进度树。

---

## 2. 系统与接口架构设计

### 2.1 数据结构与协议设计 (`lib/ai-wbs-types.ts`)
定义解析请求与草稿结构：
```typescript
export type WbsParseTargetLevel = 'project_subnodes' | 'node_tasks' | 'task_subtasks';

export interface ParsedDraftTask {
  id: string; // 临时前端草稿ID (如 draft_task_1)
  name: string;
  owner: string;
  dueDate?: string | null;
  estimatedDuration?: string;
  hasDeliverable?: boolean;
  deliverableRequirement?: string;
  deliverableItems?: { id: string; name: string; requirement?: string }[];
}

export interface ParsedDraftNode {
  id: string; // 临时前端草稿ID (如 draft_node_1)
  name: string;
  owner: string;
  estimatedDuration?: string;
  dueDate?: string | null;
  description?: string;
  tasks?: ParsedDraftTask[];
}

export interface WbsParseResult {
  targetLevel: WbsParseTargetLevel;
  summary: string;
  nodes?: ParsedDraftNode[]; // 当 targetLevel 为 project_subnodes 时
  tasks?: ParsedDraftTask[]; // 当 targetLevel 为 node_tasks 或 task_subtasks 时
}
```

### 2.2 服务端 AI 结构化解析 API (`/app/api/ai/parse-wbs/route.ts`)
- 基于 `@google/genai` (模型 `gemini-3.7-flash`，遵循服务端 API 规范与 `responseSchema` JSON 强类型约束)。
- 系统提示词具备专家级 WBS 拆解能力：
  - 自动识别输入文本中的层级、模块名、执行人姓名（若未指定则继承当前上下文默认负责人）、工期（如“3天”、“2周”）、交付物要求（如“需提供接口文档”、“需PRD评审签字”）；
  - 针对不同 `targetLevel` 输出针对性的结构化树或平铺任务列表；
  - 提供智能容错兜底机制。

### 2.3 批量持久化入库 API 与服务 (`lib/wbs-import-service.ts` & `/app/api/nodes/batch-import/route.ts`)
- 接收经过用户最终审核确认的草稿数据；
- 批量插入 `DbNode` 与 `DbTask`；
- 自动建立父子关系指针 (`parent_id`, `node_id`)；
- 记录一条结构化的 `activity_log`（如：“张三通过 AI 智能文本解析导入了 3 个模块分组与 7 项任务”）；
- 触发 `persistDb()`，保证数据高可靠持久化。

---

## 3. UI/UX 交互设计与组件结构
UI 遵循系统严谨的工程与设计美学（高对比度、无 AI Slop 虚浮特效、清晰层级、数学对称内边距）：

1. **触发入口 (Action Trigger Buttons)**：
   - **项目头部 (`ProjectHeader.tsx`)**：增加 `✨ AI 智能拆解` 按钮（带优雅的紫色/靛蓝微徽章）。
   - **分组节点 (`TreeNodeItem.tsx`)**：在操作按钮栏增加 `AI 解析` 快捷入口。
   - **任务项 (`TaskItem.tsx`)**：在更多菜单及操作栏增加 `✨ AI 拆解子任务` 入口。
2. **AI 解析弹窗 (`components/ai-parse/AiTextParseModal.tsx`)**：
   - **步骤 1：输入与配置 (Input & Config)**：
     - 上下文指示徽章（显示当前正在为哪个项目/分组/任务进行拆解）；
     - 多行大文本框，支持直接粘贴需求文本；
     - 预置 3 个经典场景快捷示例（“功能模块与阶段拆解”、“需求开发与交付物全流程”、“测试与上线验收清单”），点击一键填入；
     - 默认负责人继承与微调；
   - **步骤 2：解析加载态 (Analyzing State)**：
     - 平滑骨架屏与步骤指示；
   - **步骤 3：草稿确认、编辑与预览工作台 (Draft Review & Workbench)**：
     - **实时可编辑表格/卡片**：直接在输入框修改名称、负责人、日期、工期、交付件；
     - **单项删除与新增**：支持垃圾桶图标移除草稿项，支持「+ 补充一项」；
     - **实时树状层级预览 (Visual Tree Preview)**：直观展现将要插入到现有结构树中的层级关系与数量摘要；
     - **一键导入**：点击「确认导入」，执行入库并自动展开对应节点。

---

## 4. 文件行数与代码质量控制（严格遵守代码规范）
- 所有新建及修改的代码文件严格遵守：
  - 单文件行数 ≤ 300 行（软上限），禁止超过 500 行（硬上限）；
  - 单函数行数 ≤ 50 行；
  - 模块职责高度解耦，各司其职。

---

## 5. 验证与验收标准
1. 点击项目层、分组层、任务层的 `AI 解析` 入口，能够正确携带当前上下文节点信息打开弹窗。
2. 输入文本后调用 API，AI 能够准确拆解为对应的子分组/任务/子任务数据。
3. 解析结果在弹窗中展示为草稿，支持就地编辑、删除、新增与预览，未确认前数据库无任何变动。
4. 点击「确认导入」后，数据准确批量入库并记录操作日志，项目树无缝刷新并呈现新结构。
5. 运行 `compile_applet` 编译通过，无 TypeScript 或 ESLint 报错。
