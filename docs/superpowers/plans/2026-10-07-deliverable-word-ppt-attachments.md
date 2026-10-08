# Plan: 交付成果附件归档增加 Word 与 PPT 支持实施计划

基于 Spec: `docs/superpowers/specs/2026-10-07-deliverable-word-ppt-attachments.md`

## 任务拆解与分步执行清单

### Task 1: 基础类型与上传路由扩展
- [ ] 1.1 修改 `lib/types.ts`：扩充 `AttachmentType` 联合类型，增加 `'word' | 'ppt'`。
- [ ] 1.2 修改 `app/api/qiniu/upload/route.ts`：
  - 增加 Word (`docx`, `doc`) 与 PPT (`pptx`, `ppt`) 的文件扩展名及 MIME 类型匹配；
  - 针对 Word 判定为 `'word'`，针对 PPT 判定为 `'ppt'`；
  - 调整限制体积至 30MB，更新错误提示信息与回退机制。

### Task 2: 独立 Office 预览组件实现 (`OfficeDocumentPreview.tsx`)
- [ ] 2.1 新建 `components/OfficeDocumentPreview.tsx`：
  - 专为 Word/PPT 设计的高质感预览展示组件；
  - 支持“云端 Office 预览”与“交付成果档案卡”双模式；
  - 包含文档图标、文件大小、上传时间、本地 Office/WPS 打开指引、一键下载按钮；
  - 智能检测外网 URL 与本地路径，并提供友好状态提示。

### Task 3: 统一预览器与徽章组件适配
- [ ] 3.1 修改 `components/AttachmentPreviewModal.tsx`：
  - 引入 `OfficeDocumentPreview`；
  - 增加针对 `attachment.type === 'word'` 与 `'ppt'` 的标题图标（深蓝 Word / 橙红 Presentation）及展示分支；
  - 保持整体文件行数在 350 行左右（远低于 500 行硬上限）。
- [ ] 3.2 修改 `components/AttachmentBadgeList.tsx`：
  - 升级 `getAttachmentFormatIcon`，增加 Word (蓝) 与 PPT (橙红) 格式图标。
- [ ] 3.3 修改 `components/TaskDeliverablePreview.tsx`：
  - 同步更新 `getAttachmentFormatIcon`，支持 Word 和 PPT。

### Task 4: 交付成果归档弹窗与存证抽屉上传入口放宽
- [ ] 4.1 修改 `components/DeliverableSubmitModal.tsx`：
  - 增加 Word 与 PPT 图标及颜色映射；
  - 扩展 `<input type="file">` 的 `accept` 属性，添加 `.doc,.docx,.ppt,.pptx` 及相关 MIME；
  - 更新界面文案说明；
  - 优化部分内联渲染结构，确保总行数由 497 行降低至 450 行以内（严守 500 行硬上限）。
- [ ] 4.2 修改 `components/CommentDrawer.tsx`：
  - 扩展存证文件上传的 `accept` 属性及提示文本。

### Task 5: 验证与编译检查
- [ ] 5.1 运行 `lint_applet` 确保无语法和导入错误。
- [ ] 5.2 运行 `compile_applet` 确保构建成功。
- [ ] 5.3 检查所有涉及文件行数均未超过硬上限。
