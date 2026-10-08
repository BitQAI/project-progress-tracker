# Spec: 交付成果附件归档增加 Word 与 PPT 文档支持及多模态预览

## 1. 业务背景与问题分析
在项目研发与交付管理体系中，任务交付成果（Deliverables）以及过程存证（Comments / 证据链）不仅包括图片、Markdown 文本、HTML 页面和 PDF 文件，在实际业务场景中，大量核心交付成果是以 Office 办公文档形式存在的：
- **Word 文档 (.docx / .doc)**：系统详细设计说明书、验收报告、需求规格说明书 (PRD)、会议纪要、合同与审批单等；
- **PPT 演示文稿 (.pptx / .ppt)**：阶段性项目述职报告、架构技术评审方案汇报、商业计划书、产品发布路演胶片等。

此前系统仅支持图片、Markdown、PDF 和 HTML 文件。用户在完工确认和证据链归档时无法直接上传与归档 Word/PPT 交付件。

本需求目标：
1. **类型扩展**：在数据结构、后端上传接口与前端校验中全面支持 Word (`.docx`, `.doc`) 与 PPT (`.pptx`, `.ppt`) 文件格式；
2. **归档上传**：在任务完工与交付件归档弹窗 (`DeliverableSubmitModal`)、评论存证抽屉 (`CommentDrawer`) 中增加 Word 与 PPT 的选择与拖拽上传支持；
3. **列表识别**：在附件徽章列表 (`AttachmentBadgeList`) 和任务成果回看视图 (`TaskDeliverablePreview`) 中，提供醒目的 Word (经典深蓝) 与 PPT (经典橙红/演示文稿) 标识图标与类型标签；
4. **统一预览**：在通用预览弹窗 (`AttachmentPreviewModal`) 中增加 Office 文档预览体系，提供“微软云端 Office 在线预览”与“交付成果档案卡 + 一键下载/本地打开”双重保障机制。

---

## 2. 方案概要与技术架构

### 2.1 数据模型扩展 (`lib/types.ts`)
- 将 `AttachmentType` 联合类型扩充为：
  `'image' | 'md' | 'pdf' | 'html' | 'word' | 'ppt' | 'other'`
- 交付件附件结构 `FileAttachment` 保持向后兼容：
  `{ id, name, url, type, size, uploaded_at }`

### 2.2 上传接口与格式探测 (`app/api/qiniu/upload/route.ts`)
- 扩展后缀与 MIME 类型白名单：
  - **Word**：`.docx`, `.doc`，对应 `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword` 等，探测分类为 `'word'`
  - **PPT**：`.pptx`, `.ppt`，对应 `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-powerpoint` 等，探测分类为 `'ppt'`
- 单文件上限配置为 30MB（满足演示文稿与图文丰富文档的归档需求）
- 生成标准化对象存储 Key 与本地/DataURL 持久化兜底

### 2.3 前端上传交互与组件呈现
- `DeliverableSubmitModal`：更新 input `accept` 属性，支持 `.doc,.docx,.ppt,.pptx` 及对应 MIME 类型；更新说明文案，引入专属 Word 与 PPT 图标；
- `CommentDrawer`：同步放宽存证附件的 Word/PPT 上传限制；
- `AttachmentBadgeList` & `TaskDeliverablePreview`：增加 `'word'` 和 `'ppt'` 的专有图标与颜色规范。

### 2.4 Office 文档预览器设计 (`components/OfficeDocumentPreview.tsx`)
为保障稳定性与可读性（避免单文件超限），将 Word 和 PPT 的预览模块独立封装为 `OfficeDocumentPreview`：
- **公共云端 URL (HTTP/HTTPS)**：支持无缝嵌入 Microsoft Office Online 官方在线阅览器 (`https://view.officeapps.live.com/op/view.aspx?src=...`)，可在网页内直接翻页查看文档/PPT 幻灯片；
- **本地环境与通用档案卡**：针对本地开发或局域网存储的文档，提供高保真的“Office 成果档案卡”，展示格式类型、文件大小、归档时间、校验信息，并提供“一键高速下载”、“在新窗口打开”、“本地 Office / WPS 快速查看”引导；
- 提供一键视图切换（在线云端阅览 vs 成果档案卡）。

---

## 3. 影响范围
- `lib/types.ts`
- `app/api/qiniu/upload/route.ts`
- `components/AttachmentBadgeList.tsx`
- `components/TaskDeliverablePreview.tsx`
- `components/DeliverableSubmitModal.tsx`
- `components/CommentDrawer.tsx`
- `components/AttachmentPreviewModal.tsx`
- `components/OfficeDocumentPreview.tsx` (新增子组件，防单文件行数超限)

---

## 4. 风险点与防范
1. **本地环境与外网 Office 预览限制**：
   - 风险：若附件为本地存储路径（如 `/uploads/xxx.docx`），微软 Office 在线服务器无法访问私网。
   - 防范：检测 URL 若为相对路径或 localhost，智能提示并默认展示“交付成果档案卡”，提供即时下载与本地 Office 打开按钮，避免显示白屏报错。
2. **文件行数超限**：
   - 风险：`DeliverableSubmitModal.tsx` 当前为 497 行，已临近 500 行硬上限。
   - 防范：优化提取公共逻辑，确保修改后各文件行数均在安全阈值以内；将 Office 预览逻辑拆为独立组件。

---

## 5. 验证标准
1. 上传 `.docx` 和 `.doc` 文件，接口正确识别为 `word` 类型并持久化；
2. 上传 `.pptx` 和 `.ppt` 文件，接口正确识别为 `ppt` 类型并持久化；
3. 交付件归档弹窗与评论抽屉中均可正常选择并拖拽上传 Word 和 PPT；
4. 任务成果与评论附件卡片上展示清晰的 Word (蓝) 和 PPT (橙) 视觉标识；
5. 点击预览能够正确调起预览模态框，Word/PPT 显示文档档案卡及云端阅览选项，支持下载与打开；
6. 执行 `compile_applet` 和 `lint_applet`，0 错误 0 告警通过。
