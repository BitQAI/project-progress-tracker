# 实施计划：任务字符完整显示与周期选择器改造（含存量数据推断转换）

- **关联设计规格**：`docs/superpowers/specs/2026-09-07-task-display-expansion-and-duration-selector.md`
- **日期**：2026-09-07
- **状态**：Ready for Execution

---

## 任务拆解与清单

### Task 1: 周期推断与转换工具库 (`lib/duration-utils.ts`)
- [ ] 创建 `lib/duration-utils.ts`：
  - 实现 `inferAndNormalizeDuration(raw: string | null | undefined): string | null`；
  - 实现 `splitDuration(durationStr: string | null | undefined): { value: number | ''; unit: '天' | '周' | '个月' }`；
  - 实现 `formatDuration(value: number | '', unit: '天' | '周' | '个月'): string`；
  - 导出常用半数预设列表（`0.5天`, `1天`, `2天`, `2.5天`, `3天`, `1周`, `1.5周`, `2周`, `1个月` 等）。
- [ ] 编写测试脚本验证各种存量表达（如 `"1"`、`"2"`、`"3-4天"`、`"36人天"`、`"半天"`、`"2.5周"`）的推断转换准确率。

### Task 2: 存量数据批量转换与持久化
- [ ] 编写并执行迁移脚本 `scripts/migrate-durations.ts`：
  - 查询当前 Supabase 数据库和本地文件中的所有 `tasks`、`nodes`（含 projects）；
  - 对其中的 `estimated_duration` 应用 `inferAndNormalizeDuration` 进行批量修复；
  - 持久化至 Supabase 数据库与 `data/projects.json`。
- [ ] 在 `lib/db.ts` 与相关数据处理模块注入自动推断保底机制。

### Task 3: 打造通用周期选择器组件 (`components/common/DurationPicker.tsx`)
- [ ] 新建 `components/common/DurationPicker.tsx`：
  - 支持数值输入（步长 0.5，min 0.5）；
  - 支持“天(日)”、“周”、“月”单位选择；
  - 支持常用半数及天/周快捷药丸按钮；
  - 支持一键清除或重置为未设定；
  - 保证输入响应迅速，代码体量控制在 150 行以内。

### Task 4: 表单全面集成 `DurationPicker`
- [ ] `components/TaskEditForm.tsx`：将文本输入框替换为 `<DurationPicker />`；
- [ ] `components/NodeActionForms.tsx`：为 `AddTaskForm`、`AddSubNodeForm`、`EditSubNodeForm` 集成 `<DurationPicker />`；
- [ ] `components/EditProjectModal.tsx` & `components/CreateProjectModal.tsx`：集成 `<DurationPicker />`；
- [ ] 确保排期变更检测机制与新格式完全兼容。

### Task 5: 任务名称文本显示展开（彻底解除 30 字符截断）
- [ ] `components/TaskItem.tsx`：
  - 移除 `truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs`；
  - 改用 `break-words font-medium leading-relaxed` 配合 Flex 容器，让任务全名自然折行显示全部字符；
  - 保留 `title={task.name}` 气泡。
- [ ] `components/graph/NodeDetailDrawer.tsx`：
  - 优化模块直属任务清单中的文本显示，移除 `truncate`。
- [ ] `components/graph/nodes/TaskFlowNode.tsx`：
  - 调整拓扑流程图节点中的截断限制，展示更多字符。
- [ ] `components/gantt/GanttLeftTree.tsx`：
  - 允许 2~3 行折行或宽裕展示。

### Task 6: 验证与构建
- [ ] 运行 lint 和 compile 检查，保证 0 错误；
- [ ] 使用自动化测试和组件验证存量数据转换与长任务字符渲染表现；
- [ ] 梳理总结向主人汇报。
