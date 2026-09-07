# Plan: 取消勾选已完成任务必须弹窗提交原因说明实施计划

基于设计规范 `docs/superpowers/specs/2026-09-07-uncheck-task-reason-modal.md` 拆分的实施任务列表。

## 任务清单

### Task 1: 后端接口增强与取消原因审计留痕
- [ ] 修改 `lib/task-mutations.ts` 中的 `toggleTaskStatus`，增加 `uncheckReason?: string` 参数
- [ ] 在 `toggleTaskStatus` 中，当状态变为 `pending` 且原任务为 `done` 时：
  - 更新 activity 操作日志，加入 `+ 取消完成原因说明: ${uncheckReason}`
  - 向 `comments` 集合自动写入【取消完成归档】证据链记录
- [ ] 修改 `app/api/tasks/route.ts` 中的 PATCH 处理函数：
  - 解析 `uncheckReason`
  - 如果原任务状态为 `done` 且变更为 `pending`，校验 `uncheckReason` 必须非空且有效，否则返回 400
  - 将 `uncheckReason` 传给 `toggleTaskStatus`

### Task 2: 创建 `UncheckTaskModal` 专用弹窗组件
- [ ] 创建 `components/UncheckTaskModal.tsx`
  - 任务基本信息展示（任务名称、负责人、原完工时间）
  - 风险提示告知（状态将重置为待办，原完成记录被撤回）
  - 快捷原因预设标签（验收未通过需返工、需求发生变更、交付件需补充完善、误操作勾选等）
  - 必填原因说明文本域（带字数统计和校验提示）
  - 确认提交与放弃按钮，处理提交状态

### Task 3: 前端项目树与任务项交互接入
- [ ] 在 `hooks/useProjectTreeActions.ts` 中新增 `uncheckingTask` 状态和 `handleUncheckTaskSuccess` 异步处理方法
- [ ] 在 `components/TaskItem.tsx` 中增加 `onRequestUncheckTask` 回调，在 `handleCheckboxClick` 时对 `isDone` 状态进行拦截并触发弹窗
- [ ] 在 `components/TreeNodeItem.tsx` 中将 `onRequestUncheckTask` 向下透传给每个 `TaskItem`
- [ ] 在 `components/ProjectTree.tsx` 中挂载 `UncheckTaskModal` 并连接相关状态与回调

### Task 4: 流程自验与全链路测试
- [ ] 运行 `lint_applet` 和 `compile_applet` 确保构建与类型完全通过
- [ ] 验证点击已完成任务勾选框：弹出弹窗，无法随手取消
- [ ] 验证未填写原因无法提交
- [ ] 验证提交原因后：任务恢复待办、动态日志与证据链评论中完整显示原因
