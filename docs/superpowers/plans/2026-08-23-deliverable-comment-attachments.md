# Plan: 交付件归档与评价系统支持多类型附件（图片/MD/PDF）及在线预览

## 任务目标
实现交付件归档、任务完工确认以及评论抽屉中对图片、Markdown、PDF 附件的完整支持（上传、存储、管理、回看与在线预览）。

---

## 任务拆解与分步检查清单

- [ ] **Task 1: 数据类型与存储 API 升级**
  - [ ] 1.1 更新 `/lib/types.ts`，定义 `FileAttachment`、`AttachmentType`，扩展 `DbTask`、`DbComment`、`DbActivityLog`。
  - [ ] 1.2 升级 `/app/api/qiniu/upload/route.ts`，支持图片、`.md`、`.pdf` 格式识别、大小校验及元数据返回。
  - [ ] 1.3 更新 `/lib/task-mutations.ts`，在 `addTask`、`updateTask`、`toggleTaskStatus` 中支持 `deliverableAttachments` 参数。
  - [ ] 1.4 更新 `/lib/comment-service.ts` 及 `/app/api/comments/route.ts`，在评论中支持附件对象与集合。
  - [ ] 1.5 更新 `/lib/db.ts`，保证 Supabase 关系表同步与本地 JSON 同步能够安全持久化附件数据。

- [ ] **Task 2: 构建统一附件在线预览与渲染器组件 (`AttachmentPreviewModal`)**
  - [ ] 2.1 创建 `/components/AttachmentPreviewModal.tsx`，支持图片、Markdown 富文本渲染（支持 `react-markdown`）、PDF 内嵌阅览器。
  - [ ] 2.2 完善预览器操作（全屏、新窗口打开、下载、Markdown 源码与渲染视图切换）。

- [ ] **Task 3: 改造完工确认与交付件归档弹窗 (`DeliverableSubmitModal`)**
  - [ ] 3.1 增加多格式附件上传与拖拽区（支持图片/MD/PDF）。
  - [ ] 3.2 增加已上传附件列表管理（卡片展示、删除、提交前点击即时预览）。
  - [ ] 3.3 提交时将附件列表与完成状态一并提交保存。

- [ ] **Task 4: 改造任务行与完工交付物回看 (`TaskItem` & `DeliverableDetailModal`)**
  - [ ] 4.1 在 `TaskItem` 已归档成果展示中，显示附件标签列表与计数。
  - [ ] 4.2 提供交付件成果回看弹窗或一键展开视图，支持点击任意附件唤起统一预览器。
  - [ ] 4.3 任务编辑表单中支持查看和维护已归档附件。

- [ ] **Task 5: 改造评论与证据链抽屉 (`CommentDrawer`)**
  - [ ] 5.1 将原图片上传入口合二为一为“添加附件 (图片/MD/PDF)”。
  - [ ] 5.2 支持拖拽任意合法格式文件自动上传，展示待提交附件卡片。
  - [ ] 5.3 评论列表中支持图片缩略图、Markdown 文档卡片、PDF 文档卡片并绑定一键在线预览。

- [ ] **Task 6: 联调、Lint 检查与端到端验证**
  - [ ] 6.1 运行 `lint_applet` 和 `compile_applet` 确保构建通过。
  - [ ] 6.2 验证交付件附件提交与回看流程。
  - [ ] 6.3 验证评论区附件提交与回看流程。
