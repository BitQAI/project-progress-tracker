# Spec: 取消勾选已完成任务必须弹窗提交原因说明

## 1. 问题背景
在当前系统中，用户或负责人在项目树中点击任务勾选框（Checkbox）时：
- 未完成任务点击时会弹出交付件提交弹窗（`DeliverableSubmitModal`）进行确认与成果归档；
- 但已完成的任务（`status === 'done'`），点击勾选框时会直接毫无阻拦地调用 `onToggleStatus(task, 'pending')` 将状态重置为待办，且原完成时间直接被清空。

这种设计存在严重隐患：
1. **误触风险**：成员或管理者在浏览或点击行操作时，一旦误触勾选框，已完工任务立即变成未完工，破坏了进度统计；
2. **缺乏审计留痕**：随意取消完成导致交付件与完成时间莫名丢失，没有记录是谁、因为什么原因取消了完成；
3. **流程不合规**：真实项目管理中，已完成的任务如果要重新退回待办（返工或需求变更），必须有明确的原因说明并记录在审计证据链中。

## 2. 方案概要
1. **拦截直接取消勾选交互**：
   - 当任务处于 `status === 'done'` 状态时，点击勾选框不再直接切换状态，而是触发 `onRequestUncheckTask(task)`，弹出专用的【取消任务完成确认】弹窗（`UncheckTaskModal`）。
2. **强制填写取消原因说明**：
   - 弹窗展示该任务的基本信息（任务名、负责人、原完工时间）以及操作风险提示；
   - 提供必填的“取消原因说明”（至少 2 个字符）文本域；
   - 提供快捷理由标签（如：“验收未通过需返工”、“需求发生变更”、“交付件需补充完善”、“误操作勾选”等），支持一键填入；
   - 用户点击“放弃，保持完成”时，关闭弹窗，任务保持完成状态不变；
   - 只有填入合规原因并点击“确认取消并提交原因”后，才向后端提交变更。
3. **后端接口校验与全链路审计留痕**：
   - `/api/tasks` PATCH 接口接收 `uncheckReason` 字段；若原状态为 `done` 且尝试变更为 `pending`，校验 `uncheckReason` 必填；
   - `lib/task-mutations.ts` 中持久化更新任务状态为 `pending`，清空 `done_at`；
   - 在活动操作日志（`recordActivity`）中生成带有明确取消原因的动态记录；
   - 在任务关联的证据链评论（`comments`）中自动沉淀一条【取消完成归档】系统留档记录，确保所有回退动作有据可查。

## 3. 影响范围
- **前端交互组件**：
  - 新增 `components/UncheckTaskModal.tsx`（弹窗组件）；
  - 修改 `components/TaskItem.tsx`（点击已完成勾选框路由至弹窗）；
  - 修改 `components/TreeNodeItem.tsx`（向下透传 `onRequestUncheckTask` 回调）；
  - 修改 `components/ProjectTree.tsx`（挂载 `UncheckTaskModal` 并连接状态）；
  - 修改 `hooks/useProjectTreeActions.ts`（增加 `uncheckingTask` 状态和 `handleUncheckTaskSuccess` 业务处理）；
  - 修改 `components/graph/NodeDetailDrawer.tsx` / `ProgressFlowCanvas.tsx`（拓扑图任务抽屉在取消完成时同样走确认弹窗流程）。
- **后端接口与持久层**：
  - 修改 `app/api/tasks/route.ts`（PATCH 方法增加对 `uncheckReason` 的必填校验与传递）；
  - 修改 `lib/task-mutations.ts`（`toggleTaskStatus` 记录取消原因到 activity 与 comments）。

## 4. 验证标准
1. 点击未完成任务：依然正常弹出交付件提交弹窗；
2. 点击已完成任务勾选框：不再直接取消，而是必须弹出取消任务完成原因说明弹窗；
3. 未填写原因或只填空格：提交按钮禁用，无法提交；
4. 点击“放弃/关闭”：弹窗关闭，任务保持已完成，无任何副作用；
5. 点击快捷标签并补充说明提交：
   - 弹窗关闭，任务变为待办进行中，勾选框变为未勾选；
   - 项目动态中显示“xxx 取消了任务「xxx」的完成状态并重置为待办，取消原因说明：xxx”；
   - 任务证据链评论抽屉中自动增加一条【取消完成归档】记录；
6. 后端防绕过：如果直接通过 API 尝试把 `done` 任务 PATCH 为 `pending` 且不传 `uncheckReason`，接口返回 400 校验错误。
