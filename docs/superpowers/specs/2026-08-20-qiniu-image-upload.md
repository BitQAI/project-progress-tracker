# Spec: 优化评价（备注）系统支持图片上传与预览 (基于七牛云存储)

## 1. 问题背景与业务目标
在项目研发与 WBS 管理中，进度跟进、决策依据与完成成果往往需要提供视觉凭证（如测试报告截图、效果图、设计图等）。目前的评价（评论/备注）系统仅支持文本记录，无法上传图片作为确凿证据。
本设计的目标是重构评价系统，使其支持图片上传与实时预览，并将图片文件存储到七牛云，实现长久且高效的证据链留档。

同时，由于 WBS 数据已平铺至标准关系型数据表，我们将彻底废弃、清理原 `project_app_state` 单行 JSON 的依赖和代码引用，转为纯正的关系型存取结构。

## 2. 技术选型
1. **对象存储**：七牛云（Qiniu Cloud）对象存储服务。
2. **凭证签名安全**：采用**纯服务端签名 & 代理上传**（或直传签名）机制。由于 `QINIU_SECRET_KEY` 为极端敏感凭证，绝不泄露给前端。在 Next.js 服务端路由 `/api/qiniu/upload` 统一处理：
   - 接收前端 multipart 格式的文件。
   - 服务端使用 Node.js 原生 `crypto` 进行 HMAC-SHA1 签名生成七牛云上传凭证（Token）。
   - 服务端将文件以二进制流形式转发上传至七牛云存储节点 `https://upload.qiniup.com`。
   - 返回标准拼接后的公网 CDN 域名 URL：`https://files.bitqai.com/images/<filename>`。
3. **数据库更新**：
   - `DbComment`（`pm_comments`）表新增 `image_url` 列，支持可选存储图片地址。
4. **前端交互与动画**：
   - 使用 `<input type="file" accept="image/*">` 进行图片选取，支持拖拽或点击上传。
   - 展现精美的进度条与上传加载动画（基于 `lucide-react` 图标与 Tailwind CSS）。
   - 评论卡片增加点击图片查看原图的大图模态框预览。

## 3. 数据模型设计
### `pm_comments` (评论/备注表)
在原有 7 列基础上，增加第 8 列：
- **`image_url`**：`TEXT`（可选），存储在七牛云上的公网图片完整地址。

### TypeScript 接口更新
```ts
export interface DbComment {
  id: string;
  node_id: string | null;
  task_id: string | null;
  parent_id: string | null;
  author: string;
  content: string;
  created_at: string;
  image_url?: string | null; // 新增字段
}
```

## 4. 安全防护与上传验证
- 严格文件类型校验：仅允许 `image/png`、`image/jpeg`、`image/gif`、`image/webp` 等常见图片格式。
- 严格大小限制：限制单张图片最大 5MB，防止滥用和存储浪费。
- 唯一性命名：文件名由 `cmt_<id>_<timestamp>_<random>.<ext>` 构成，防止七牛云中同名覆盖。

## 5. 验收标准与验证方式
- 评论抽屉（`CommentDrawer`）包含图片上传入口，点击能正常选取文件，拖拽正常识别。
- 上传成功后显示图片预览缩略图，且输入框允许一并提交。
- 提交后，评论区卡片能完美渲染图片，点击缩略图会弹出高清大图预览层。
- 验证 Supabase `pm_comments` 表中存储的 `image_url` 数据。
