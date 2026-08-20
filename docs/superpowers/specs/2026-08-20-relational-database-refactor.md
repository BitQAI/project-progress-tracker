# Spec: Supabase 单一 JSON 状态重构为标准关系型数据模型与 AI 上下文精准化升级

## 1. 问题背景
当前系统中，Supabase 数据库仅使用了一张单行表 `project_app_state`（通过 `id = 'singleton'` 存储包含所有节点、任务、模板、评论和日志的庞大 JSON blob）。这种模式存在以下严重缺陷：
1. **并发冲突与全量覆盖风险**：任何微小修改（如修改一个任务状态）都会读出整个 JSON 并全量覆写，多端并发或网络抖动时极易发生数据覆盖丢失。
2. **缺乏关系型约束与级联完整性**：没有数据库级别的外键、索引、类型检查和级联删除支持。
3. **AI 问答信息严重受限**：由于数据全部压缩在单行 JSON 中，AI 接口无法灵活进行关系型检索与深度上下文关联，目前仅粗糙拼接了顶级项目摘要，导致 AI 面对“具体模块责任人”、“具体交付件验收结论”、“排期调整历史原因”、“多层级 WBS 风险”等深层问题时无法准确回答。

## 2. 方案概要
1. **关系模型重构**：将系统中的核心实体拆分为 7 张正规关系表：
   - `pm_nodes`：多层级项目与 WBS 树节点
   - `pm_tasks`：任务与交付件定义及提交成果
   - `pm_templates`：研发流程模板
   - `pm_template_stages`：模板阶段
   - `pm_template_deliverables`：模板标准交付件
   - `pm_comments`：跟进备注、证据链与多层回复
   - `pm_activity_logs`：全生命周期审计与操作日志
2. **平铺迁移与安全兜底**：
   - 设计自动平铺迁移器（`migrateJsonToRelational`）：系统启动或首次加载时，自动将原有 `project_app_state` 中的数据无损拆解并写入对应关系表。
   - 保留 `project_app_state` 作为历史快照与追溯归档。
   - 保持本地 `data/projects.json` 的离线降级机制，确保在 Supabase 无网络或离线时平滑运行。
3. **数据访问层（DAL）全面关系化**：
   - 重构 `lib/db.ts`、`lib/project-service.ts`、`lib/mutations.ts`、`lib/task-mutations.ts`、`lib/comment-service.ts`、`lib/template-service.ts`、`lib/activity-logger.ts`、`lib/executive-activity-service.ts`，支持基于 Supabase 关系表的单表精确 CRUD 与批量关联查询。
4. **AI 语义上下文与精准问答升级**：
   - 编写结构化、高保真关系型上下文聚合生成器，提取多维数据（全量 WBS 树、交付件提交详情与证据链、排期调整原因留档、负责人任务负载、逾期预警与关键活动），全面提升 AI 问答的精准度与洞察力。

## 3. 数据模型设计

### 3.1 `pm_nodes` (项目及各级模块)
- `id` TEXT PRIMARY KEY
- `parent_id` TEXT REFERENCES pm_nodes(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `owner` TEXT NOT NULL
- `order_num` INTEGER NOT NULL DEFAULT 1
- `status` TEXT NOT NULL DEFAULT 'in_progress'
- `priority` TEXT NOT NULL DEFAULT 'P1'
- `description` TEXT
- `estimated_duration` TEXT
- `due_date` TEXT
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### 3.2 `pm_tasks` (具体任务及交付物)
- `id` TEXT PRIMARY KEY
- `node_id` TEXT NOT NULL REFERENCES pm_nodes(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `owner` TEXT NOT NULL
- `due_date` TEXT
- `estimated_duration` TEXT
- `status` TEXT NOT NULL DEFAULT 'pending'
- `has_deliverable` BOOLEAN NOT NULL DEFAULT FALSE
- `deliverable_requirement` TEXT
- `deliverable_items` JSONB DEFAULT '[]'::jsonb
- `deliverable_submission` TEXT
- `deliverable_submitted_at` TIMESTAMPTZ
- `done_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### 3.3 `pm_templates` (流程模板)
- `id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `description` TEXT
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### 3.4 `pm_template_stages` (模板阶段)
- `id` TEXT PRIMARY KEY
- `template_id` TEXT NOT NULL REFERENCES pm_templates(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `order_num` INTEGER NOT NULL DEFAULT 1

### 3.5 `pm_template_deliverables` (模板标准交付物)
- `id` TEXT PRIMARY KEY
- `stage_id` TEXT NOT NULL REFERENCES pm_template_stages(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `order_num` INTEGER NOT NULL DEFAULT 1

### 3.6 `pm_comments` (评论与证据链)
- `id` TEXT PRIMARY KEY
- `node_id` TEXT REFERENCES pm_nodes(id) ON DELETE CASCADE
- `task_id` TEXT REFERENCES pm_tasks(id) ON DELETE CASCADE
- `parent_id` TEXT REFERENCES pm_comments(id) ON DELETE CASCADE
- `author` TEXT NOT NULL
- `content` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### 3.7 `pm_activity_logs` (操作与审计日志)
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL
- `node_id` TEXT
- `task_id` TEXT
- `type` TEXT NOT NULL
- `title` TEXT NOT NULL
- `detail` TEXT
- `author` TEXT NOT NULL
- `timestamp` TIMESTAMPTZ NOT NULL DEFAULT NOW()

## 4. 迁移与数据安全策略
1. **平铺迁移算法**：
   - 检查关系表中是否存在数据；
   - 若关系表尚无数据，从 `project_app_state` (或本地 `data/projects.json`) 读取全部实体；
   - 按照外键依赖拓扑顺序依次写入：
     1. `pm_templates` -> `pm_template_stages` -> `pm_template_deliverables`
     2. `pm_nodes` (先根节点，再按层级插入子节点)
     3. `pm_tasks`
     4. `pm_comments`
     5. `pm_activity_logs`
   - 在 `project_app_state` 记录迁移标记，保留原单行数据作为历史追溯。
2. **数据零丢失保障**：
   - 读取操作先检测关系表，若关系表读取正常则直接基于关系表构建高速内存缓存与查询；
   - 写入操作同步向 Supabase 关系表执行单条/批量操作，同时异步更新本地 `data/projects.json` 离线副本；
   - 遇到任何异常均有本地文件系统回退机制。

## 5. AI 上下文与精准问答设计
- 重构 `/app/api/ai/chat/route.ts` 与 `/app/api/ai/stats/route.ts`：
  1. 结构化构建四维全局知识库：
     - **全景 WBS 与责任网络**：每个项目的完整层级结构、各节点负责人、优先级、起止排期与当前进度；
     - **交付件证据链数据库**：所有需交付成果的任务详情、交付规范、实际提交文本/链接/验证结论及交付时间；
     - **排期变更与风险专区**：记录所有发生过排期调整的模块/任务、变更前后的日期差异、填写的调整理由，以及当前超期天数；
     - **核心管理日志与团队讨论**：近期的重大决策评论、阶段里程碑完工记录。
  2. 提供语义化的上下文注入，让 AI 能够直接按人员、按项目、按交付件、按风险点精准对答，彻底解决“信息盲区”问题。

## 6. 验证标准
1. 数据迁移无损：原有项目、任务、交付件、模板、评论、活动日志 100% 完整保留。
2. CRUD 操作完整走关系表，且支持离线与云端双向平滑切换。
3. 单元/构建验证通过：`npm run lint` 与 `compile_applet` 均绿灯。
4. AI 对话问答测试：向 AI 提问具体负责人（如“李工负责哪些任务”、“有哪些已提交的交付件”）、排期原因等，AI 能精准从关系型数据库数据中调取并正确回答。
