# 实施计划 (Plan) - 项目全量留言备注与附件筛选看板

## 1. 任务分解与文件清单

### Task 1: 业务逻辑层扩展与 API 升级
- **修改文件**：`/lib/comment-service.ts`
  - 引入 `findRootProjectId` 和 `findRootProjectIdByTask` (已引入)。
  - 新增并导出函数 `getProjectComments(projectId: string)`，过滤属于该项目的所有节点的留言。
- **修改文件**：`/app/api/comments/route.ts`
  - 升级 GET 处理，支持 `projectId` 参数。
  - 如果有 `projectId`，调用 `getProjectComments(projectId)`；否则继续根据原来的 `nodeId` 或 `taskId` 获取评论。

### Task 2: 设计全量备注与附件看板组件
- **新建文件**：`/components/ProjectCommentsDrawer.tsx`
  - 侧边栏抽屉布局，复用类似 `CommentDrawer` 的遮罩和过渡动效。
  - **顶部统计与过滤面板**：
    - 模糊输入框：搜索备注内容、作者。
    - 附件类型 Switcher / Tabs：全部 / 仅看附件。
    - 附件格式二级筛选：图片、PDF、Markdown 电子文档。
    - WBS 分组过滤：下拉框，列出该项目下所有的子模块/节点，实现按模块看备注。
  - **留言时间轴列表**：
    - 每条评论渲染发送者、创建时间、所属模块/任务的胶囊标签。
    - 渲染备注正文与相关的多个附件卡片，点击唤起已有的 `AttachmentPreviewModal` 进行超清预览或在线渲染。
    - 支持显示回复内容。
  - **快速发表新备注**：
    - 底部支持快速输入发表项目级别的备注（默认关联项目根节点，以便快速记录项目整体的阶段性成果或纪要）。

### Task 3: 全局入口接入与数据同步
- **修改文件**：`/components/ProjectHeader.tsx`
  - 传入 `onOpenProjectComments` 毁调函数。
  - 在右侧操作按钮区，在“编辑项目”按钮左侧，新增一个醒目的 **“留言备注与附件”** 按钮（使用 `MessageSquare` 或 `Paperclip` 图标）。
- **修改文件**：`/components/ProjectTree.tsx`
  - 定义 `projectCommentsOpen` 状态。
  - 将 `onOpenProjectComments={() => setProjectCommentsOpen(true)}` 传给 `ProjectHeader`。
  - 引入并渲染 `<ProjectCommentsDrawer isOpen={projectCommentsOpen} onClose={() => setProjectCommentsOpen(false)} project={tree} />`。

## 2. 接口设计

### API GET `/api/comments`
- **请求参数**：
  - `projectId` (string, 可选): 项目根节点 ID。
  - `nodeId` (string, 可选): WBS节点 ID（原有）。
  - `taskId` (string, 可选): 任务 ID（原有）。
- **响应格式**：
  ```json
  {
    "ok": true,
    "data": [
      {
        "id": "cmt_123",
        "node_id": "node_abc",
        "task_id": null,
        "author": "郭鑫",
        "content": "已完成架构设计设计评审，附件包含会议纪要和拓扑图。",
        "created_at": "2026-08-25T10:00:00Z",
        "attachments": [
          { "id": "att_1", "name": "设计拓扑图.png", "url": "...", "type": "image" }
        ],
        "targetName": "架构设计与评审",
        "isTask": false,
        "replies": []
      }
    ]
  }
  ```

## 3. 验证与测试方式
1. **Linter & 编译检查**：运行 `npm run lint` 和 `npm run build`，确保无语法和类型错误。
2. **界面交互验证**：
   - 打开项目详情页，验证头部是否正确渲染了“项目留言与附件”按钮。
   - 点击按钮，验证右侧 Drawer 是否平滑滑出。
   - 验证筛选功能：
     - 输入关键词，备注列表是否实时过滤。
     - 切换“仅看附件”，是否只显示包含附件的评论。
     - 切换“图片”/“文档”/“Markdown”，附件是否精准筛选。
     - 选择“WBS 模块”，是否能针对特定模块过滤留言。
   - 验证附件预览：点击附件卡片，是否能正确拉起 `AttachmentPreviewModal` 进行图片灯箱、MD 渲染或 PDF 查阅。
   - 验证新增留言：在看板底部输入名字和内容并发表，验证是否即时渲染在时间轴顶端，并且该留言默认记录在项目根节点上。
