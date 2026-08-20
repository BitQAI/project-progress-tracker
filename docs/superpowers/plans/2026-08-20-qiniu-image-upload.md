# Plan: 优化评价（备注）系统支持图片上传与预览 (基于七牛云存储)

## 任务分解清单

- [ ] **Task 1: 关系数据库与映射层（DAL）升级**
  - 在 `lib/types.ts` 中升级 `DbComment` 类型以包含可选的 `image_url?: string | null`。
  - 在 `lib/db.ts` 中：
    - 更新 `syncLocalStateToSupabase` 中的 `pm_comments` 映射层，在保存时将 `image_url` 映射入库。
    - 更新 `ensureDbLoaded` 关系表加载层，正确抓取 `pm_comments` 里的 `image_url` 字段。
    - 彻底废除并移除在 `syncLocalStateToSupabase` 和其他地方对旧 `project_app_state` 表的冗余写入和查询，实现完全的纯关系型架构。

- [ ] **Task 2: 服务端七牛云代理上传接口开发**
  - 声明七牛云环境变量在 `.env.example`，并建立 `.env.local` 本地验证文件。
  - 创建 `app/api/qiniu/upload/route.ts`：
    - 采用 Next.js App Router 规范。
    - 仅允许 POST 方法，解析 FormData。
    - 服务端安全生成 HMAC-SHA1 签名与 PutPolicy，杜绝客户端泄露 QINIU_SECRET_KEY。
    - 通过 `fetch` 将数据流代理发送至七牛官方网关 `https://upload.qiniup.com`。
    - 成功后拼接 `https://files.bitqai.com/images/...` 链接返回给前端。

- [ ] **Task 3: 前端评论抽屉 UI 深度重构**
  - 改造 `components/CommentDrawer.tsx`：
    - 新增图片文件预览态、清除态。
    - 增加拖拽（Drag and Drop）和点击上传区域。
    - 显示流畅的上传 Loading 骨架屏或图标变化。
    - 在评论记录列表中渲染已上传的图片卡片（带有精美倒角与悬浮放大效果）。
    - 编写全局大图预览弹窗模态框（Lightbox Mode），支持点击后遮罩居中呈现高清大图、滚轮缩放、点击任意处关闭。

- [ ] **Task 4: 编译、集成验证与自测**
  - 使用 `npm run lint` 和 `compile_applet` 对整体系统进行集成构建。
  - 提示用户在 Supabase 中运行以下 SQL：
    `ALTER TABLE pm_comments ADD COLUMN IF NOT EXISTS image_url TEXT;`
