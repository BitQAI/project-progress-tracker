# Plan: Supabase 关系型模型重构与 AI 深度上下文实施计划

基于 Spec 文档，本项目重构将分为以下 5 个核心任务有序推进：

## 任务分解清单

- [x] **Task 1: 定义关系型数据类型与 SQL 建表/迁移脚本**
  - 在 `lib/types.ts` 中增强和完善关系型数据库实体映射与类型定义。
  - 创建 `lib/db-schema.sql` 包含 7 张标准关系表及索引的 DDL。
  - 编写迁移脚本/迁移函数 `lib/db-migrator.ts`，实现旧单行 JSON 到新关系表的无损自动平铺迁移。

- [x] **Task 2: 改造持久化与数据访问层 (DAL)**
  - 改造 `lib/db.ts`：
    - 支持直接从 7 张关系表中加载全部数据并构建高速内存状态。
    - 在加载时检测关系表状态；若为空且存在旧单行 JSON 或本地文件，自动触发 `db-migrator` 进行安全平铺迁移。
    - 升级 `persistDb` 和各个模块的持久化逻辑，支持直接执行针对关系表的插入/更新/删除（增量 SQL / Supabase REST），并保留本地 `data/projects.json` 作为高可靠离线缓存。

- [x] **Task 3: 重构核心业务变更服务 (Mutations & Services)**
  - 检查并优化 `lib/mutations.ts`、`lib/task-mutations.ts`、`lib/comment-service.ts`、`lib/template-service.ts`、`lib/activity-logger.ts`。
  - 确保增删改查对新关系表结构的完全适配与级联安全。
  - 保持文件行数与函数体行数在规范约束内。

- [x] **Task 4: AI 深度上下文引擎与精准问答能力升级**
  - 创建 `lib/ai-context-service.ts`（用于结构化生成全景 WBS、交付件证据链、排期调整归档、团队责任网等多维知识上下文）。
  - 改造 `app/api/ai/chat/route.ts` 与 `app/api/ai/stats/route.ts`，接入全新的关系型数据上下文提取能力，让 AI 精准回答所有项目细节、负责人分工、交付成果和历史原因。

- [x] **Task 5: 构建验证、自测与功能确认**
  - 执行 `npm run lint` 和 `compile_applet` 确保全栈代码无类型和语法错误。
  - 验证数据迁移与 CRUD 行为，确保数据平铺无损，且 AI 对话具备精准细节应答能力。
