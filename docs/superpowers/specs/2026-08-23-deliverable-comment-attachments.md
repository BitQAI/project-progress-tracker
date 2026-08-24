# Spec: 交付件归档与评价系统支持多类型附件（图片/MD/PDF）及在线预览

## 1. 问题背景与业务目标
在研发项目与 WBS 交付管理中，任务完工与证据链归档不仅需要文字描述或外部超链接，通常还需要上传核心交付成果文件（如 UI效果图/截图、Markdown 格式的 PRD/架构方案/测试报告、PDF 格式的验收签署文件/立项书等）。
同时，在团队评价与跟进流（Comment / 证据链）中，同样需要支持直接附带 MD 与 PDF 文档，以替代单纯文本或外部转移。

本功能旨在：
1. **交付件归档与完工确认**：在任务完工标记与交付件归档弹窗中，增加图片、Markdown、PDF 文件的上传与暂存入口，支持提交前即时预览；
2. **任务完成后的交付物回看**：完工后，用户可在任务行或交付详情中一键打开交付成果视图，直接回看并在线预览所归档的图片、MD 文档、PDF 文件；
3. **评论与证据链附件入口整合**：将评论抽屉底部的图片上传升级整合为统一的“添加附件（图片/MD/PDF）”入口，支持点击与拖拽上传，并在评论列表与回复中完美支持三种文件类型的卡片展示与一键在线预览；
4. **统一在线预览体系**：构建轻量可靠的通用预览模态框（图片 Lightbox 大图、Markdown 富文本排版渲染器、PDF 嵌入式阅览器）。

---

## 2. 技术选型与架构设计

### 2.1 存储与后端代理上传 (`/api/qiniu/upload`)
- 沿用七牛云（Qiniu Cloud）对象存储作为高可用多媒体与文档存储。
- 升级 `/api/qiniu/upload/route.ts` 接口：
  - 放宽白名单支持：
    - **图片**：`image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml` 等
    - **Markdown**：`text/markdown`, `text/plain` 或 `.md` 后缀
    - **PDF**：`application/pdf` 或 `.pdf` 后缀
  - 限制大小：图片/MD 最大 10MB，PDF 最大 20MB。
  - 返回规范格式的附件元数据：`{ ok: true, url, name, type, size, key }`。

### 2.2 统一预览机制 (`AttachmentPreviewModal`)
- **图片预览**：高分辨率自适应居中大图，支持新标签打开、下载。
- **Markdown 预览**：基于 `react-markdown` 进行排版解析（支持标题、列表、表格、代码高亮、引用、任务列表），并提供“渲染视图”和“Markdown 原文”双模式切换与一键复制。
- **PDF 预览**：基于 HTML5 浏览器内嵌 `<iframe src={url} />`，支持缩放、工具栏操作、在新标签打开以及本地下载。

---

## 3. 数据模型设计

### 3.1 附件基础类型 (`FileAttachment`)
```ts
export type AttachmentType = 'image' | 'md' | 'pdf' | 'other';

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: AttachmentType;
  size?: number;
  uploaded_at?: string;
}
```

### 3.2 任务数据模型 (`DbTask`)
在 `DbTask` 增加附件列表字段：
```ts
export interface DbTask {
  // ... 原有字段
  deliverable_attachments?: FileAttachment[]; // 交付件附件列表
}
```

### 3.3 评论数据模型 (`DbComment`)
在 `DbComment` 兼容原有 `image_url` 并支持结构化附件：
```ts
export interface DbComment {
  // ... 原有字段
  image_url?: string | null;
  attachment?: FileAttachment | null;
  attachments?: FileAttachment[];
}
```

---

## 4. 用户交互与界面流程

### 4.1 完工确认与交付件归档弹窗 (`DeliverableSubmitModal`)
1. 界面在成果文字说明下方增加“上传交付物附件”区域。
2. 支持点击文件按钮或拖拽放入（图片/MD/PDF）。
3. 列表显示已上传附件的类型图标、名称、大小，支持一键预览与删除。
4. 确认提交时，将附件列表与文本说明一同保存至任务。

### 4.2 完工任务回看 (`TaskItem` & `DeliverableDetailModal`)
1. 任务完工后，在任务行点击“交付件已归档”或“查看成果”时，展开或弹出交付成果查看器。
2. 呈现交付文字、完成时间、偏差说明，以及关联的附件列表卡片。
3. 点击任意附件即时唤起统一预览弹窗。

### 4.3 评论与证据链抽屉 (`CommentDrawer`)
1. 将原有的“添加凭证图片”整合为“添加存证附件 (图片/MD/PDF)”。
2. 支持拖拽任意合法格式文件到输入区域自动上传。
3. 评论记录中根据附件类型显示对应的缩略图或文档卡片，点击直接在线预览。

---

## 5. 验收标准与验证方式
1. **上传验证**：分别上传 PNG/JPG 图片、`.md` 文本文件、`.pdf` 文档，七牛云成功返回并正确识别 `type`。
2. **完工归档验证**：在完工弹窗中上传附件并完成任务，数据成功持久化。
3. **回看验证**：在已完工任务上点击交付件，能清晰看到附件列表，并能正确触发图片大图、MD 格式化渲染和 PDF 嵌入预览。
4. **评论验证**：在评论区上传 MD 和 PDF，发表后卡片正常展示并支持预览。
5. **构建验证**：通过 `compile_applet` 和 `lint_applet`，无类型和构建错误。
