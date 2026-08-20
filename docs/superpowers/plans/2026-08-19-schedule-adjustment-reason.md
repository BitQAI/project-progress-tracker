# Plan: 项目排期调整必须填写理由实施计划

基于 Spec，本项目排期调整必须填写理由的实施步骤分为两大部分：
1. 后端接口与业务逻辑层支持调整理由字段的接收、日志处理及评论自动建档。
2. 前端三个层级（项目、子模块、任务）的编辑表单中增加排期对比机制，并动态呈现必填的调整理由输入域。

## 任务分解清单

- [ ] **Task 1: 业务逻辑层支持 (Backend Business Logic)**
  - 修改 `lib/mutations.ts` 的 `updateNode` 方法：
    - 新增 `changeReason?: string` 传入参数。
    - 比对 `node.estimated_duration` 与 `estimatedDuration`、`node.due_date` 与 `dueDate`。
    - 如果检测到修改，且有 `changeReason`，将其追加到 `changes`（日志明细列表），并在 `db.comments` 中插入排期调整的归档评论。
  - 修改 `lib/task-mutations.ts` 的 `updateTask` 方法：
    - 新增 `changeReason?: string` 传入参数。
    - 比对 `task.estimated_duration` 与 `estimatedDuration`、`task.due_date` 与 `dueDate`。
    - 如果检测到修改，且有 `changeReason`，将其追加到 `changes`（日志明细），并在 `db.comments` 中插入排期调整的归档评论。

- [ ] **Task 2: API 接口路由层支持 (API Routes)**
  - 修改 `app/api/nodes/route.ts` 中的 `PUT` 请求处理方法：
    - 从 `req.json()` 中多解析出一个 `changeReason`。
    - 将 `changeReason` 传入 `updateNode`。
  - 修改 `app/api/tasks/route.ts` 中的 `PUT` 请求处理方法：
    - 从 `req.json()` 中多解析出一个 `changeReason`。
    - 将 `changeReason` 传入 `updateTask`。

- [ ] **Task 3: 前端交互适配 (Frontend Component UI)**
  - 修改 `components/ProjectTree.tsx`：
    - 更新 `handleUpdateNode` 及 `handleUpdateTask` 方法，增加 `changeReason?: string` 参数，并将该字段作为 JSON body 参数提交给对应的 API。
  - 修改 `components/EditProjectModal.tsx`（项目排期）：
    - 状态比较：如果 `duration !== initialDuration` 或 `dueDate !== initialDueDate`，则 `isScheduleChanged = true`。
    - 引入新状态 `changeReason`。
    - 如果 `isScheduleChanged` 为真，则在表单底部（文本域下方）展示 `排期调整理由 *` 输入框，为 `required`。
    - 在 `handleSubmit` 中，如果 `isScheduleChanged` 且没有填写理由，则拦截；否则传递 `changeReason` 给 `onSave`。
    - 在 `EditProjectModalProps` 接口中更新 `onSave` 签名以包含 `changeReason?: string`。
  - 修改 `components/NodeActionForms.tsx` 中的 `EditSubNodeForm`（模块/分组排期）：
    - 状态比较：如果 `subNodeDuration !== initialDuration` 或 `subNodeDueDate !== initialDueDate`，则 `isScheduleChanged = true`。
    - 引入状态 `changeReason`。
    - 如果 `isScheduleChanged` 为真，则在表单中展示 `排期调整理由 *` 必填框。
    - 修改 `onSubmit` 的接口和逻辑，传递 `changeReason`。
  - 修改 `components/TaskItem.tsx`（任务排期）：
    - 状态比较：如果 `dueDate !== (task.due_date || '')` 或 `estimatedDuration !== (task.estimated_duration || '')`，则 `isScheduleChanged = true`。
    - 引入状态 `changeReason`。
    - 动态展示 `排期调整理由 *`。
    - 将 `changeReason` 传入 `onUpdateTask`。

- [ ] **Task 4: 系统自验与构建测试**
  - 执行 `npm run lint` 和 `npm run build` 确保系统编译无错。
  - 用 Playwright 进行界面行为测试：
    1. 打开一个项目。
    2. 打开项目编辑 Modal，修改其截止日，验证是否强制要求理由。输入理由，验证是否成功提交并产生了对应的评论留档与活动日志。
    3. 在子分组的编辑中修改截止日期，重复上述验证。
    4. 在任务编辑中修改截止日期，重复上述验证。
