'use client';

import React, { useState } from 'react';
import { NodeTreeNode } from '@/lib/types';
import { TreeNodeItem } from './TreeNodeItem';
import { CommentDrawer } from './CommentDrawer';
import { ConfirmDialog } from './ConfirmDialog';
import { DeliverableSubmitModal } from './DeliverableSubmitModal';
import { ProjectActivityFeed } from './ProjectActivityFeed';
import { ProjectHeader } from './ProjectHeader';
import { EditProjectModal } from './EditProjectModal';
import { GanttChart } from './gantt/GanttChart';
import { AiTextParseModal } from './ai-parse/AiTextParseModal';
import { useProjectTreeActions } from '@/hooks/useProjectTreeActions';
import { ListTree, CalendarRange } from 'lucide-react';

interface ProjectTreeProps {
  initialTree: NodeTreeNode;
  onRefresh?: () => void;
}

export function ProjectTree({ initialTree, onRefresh }: ProjectTreeProps) {
  const [activeView, setActiveView] = useState<'tree' | 'gantt'>('tree');
  const [hideCompleted, setHideCompleted] = useState(false);

  const {
    tree,
    reloadTree,
    isDeleting,
    isEditingProject,
    setIsEditingProject,
    deliverableTask,
    setDeliverableTask,
    commentTarget,
    setCommentTarget,
    confirmDialog,
    setConfirmDialog,
    aiParseModal,
    setAiParseModal,
    handleOpenAiParse,
    handleToggleTaskStatus,
    handleSubmitDeliverableSuccess,
    handleUpdateTask,
    handleDeleteTask,
    handleAddSubNode,
    handleAddTask,
    handleUpdateNode,
    handleDeleteNode,
    handleStatusChange,
    handleSaveProjectInfo,
    handleAddBriefComment,
  } = useProjectTreeActions(initialTree, onRefresh);

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* 顶部面包屑与项目概览面板 */}
      <ProjectHeader
        tree={tree}
        onEditClick={() => setIsEditingProject(true)}
        onStatusChange={handleStatusChange}
        onOpenAiParse={handleOpenAiParse}
      />

      {/* 前情提要与最新进展动态面板 */}
      <ProjectActivityFeed
        key={tree.id}
        projectId={tree.id}
        activities={tree.recentActivities}
        projectDescription={tree.description}
        estimatedDuration={tree.estimated_duration}
        onAddBriefComment={handleAddBriefComment}
      />

      {/* 视图展示区：支持 WBS 结构树与时间轴甘特图双向切换 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-150 pb-3.5 mb-3.5">
          {/* 左侧：视图切换 Segmented Switcher */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 shadow-2xs">
              <button
                type="button"
                id="view-toggle-tree-btn"
                onClick={() => setActiveView('tree')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeView === 'tree'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <ListTree className="h-3.5 w-3.5 text-blue-600" />
                <span>WBS 分解树</span>
              </button>
              <button
                type="button"
                id="view-toggle-gantt-btn"
                onClick={() => setActiveView('gantt')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeView === 'gantt'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5 text-indigo-600" />
                <span>时间轴甘特图 (Gantt)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 隐藏/折叠已完工项的快速切换开关 */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors select-none">
              <input
                type="checkbox"
                id="toggle-hide-completed-tasks"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/20"
              />
              <span>隐藏已完成任务</span>
              {tree.completedTasksCount > 0 && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] text-zinc-500">
                  {tree.completedTasksCount} 项已完工
                </span>
              )}
            </label>
          </div>
        </div>

        {activeView === 'tree' ? (
          <TreeNodeItem
            node={tree}
            depth={0}
            hideCompleted={hideCompleted}
            onToggleTaskStatus={handleToggleTaskStatus}
            onRequestSubmitDeliverable={(t) => setDeliverableTask(t)}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddSubNode={handleAddSubNode}
            onAddTask={handleAddTask}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onOpenAiParse={handleOpenAiParse}
            onOpenNodeComments={(n) =>
              setCommentTarget({
                isOpen: true,
                title: `节点备注与留档: ${n.name}`,
                subtitle: `负责人: ${n.owner}`,
                nodeId: n.id,
              })
            }
            onOpenTaskComments={(t) =>
              setCommentTarget({
                isOpen: true,
                title: `任务证据链: ${t.name}`,
                subtitle: `负责人: ${t.owner} | 截止: ${t.due_date}`,
                taskId: t.id,
              })
            }
          />
        ) : (
          <GanttChart
            tree={tree}
            hideCompleted={hideCompleted}
            onRequestSubmitDeliverable={(t) => setDeliverableTask(t)}
            onUpdateTask={handleUpdateTask}
            onOpenTaskComments={(t) =>
              setCommentTarget({
                isOpen: true,
                title: `任务证据链: ${t.name}`,
                subtitle: `负责人: ${t.owner} | 截止: ${t.due_date || '未定'}`,
                taskId: t.id,
              })
            }
            onOpenNodeComments={(n) =>
              setCommentTarget({
                isOpen: true,
                title: `节点备注与留档: ${n.name}`,
                subtitle: `负责人: ${n.owner}`,
                nodeId: n.id,
              })
            }
          />
        )}
      </div>

      {/* AI 文本解析与智能拆解弹窗 */}
      <AiTextParseModal
        isOpen={aiParseModal.isOpen}
        projectId={tree.id}
        targetLevel={aiParseModal.targetLevel}
        targetNodeId={aiParseModal.targetNodeId}
        targetTaskId={aiParseModal.targetTaskId}
        contextName={aiParseModal.contextName}
        defaultOwner={aiParseModal.defaultOwner}
        onClose={() => setAiParseModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          reloadTree();
        }}
      />

      {/* 交付件提交弹窗 */}
      <DeliverableSubmitModal
        isOpen={!!deliverableTask}
        task={deliverableTask}
        onClose={() => setDeliverableTask(null)}
        onSubmitSuccess={handleSubmitDeliverableSuccess}
      />

      {/* 评论抽屉 */}
      <CommentDrawer
        isOpen={commentTarget.isOpen}
        onClose={() => setCommentTarget({ ...commentTarget, isOpen: false })}
        title={commentTarget.title}
        subtitle={commentTarget.subtitle}
        nodeId={commentTarget.nodeId}
        taskId={commentTarget.taskId}
      />

      {/* 编辑项目基本信息弹窗 */}
      {isEditingProject && (
        <EditProjectModal
          isOpen={isEditingProject}
          initialName={tree.name}
          initialOwner={tree.owner}
          initialPriority={tree.priority}
          initialDescription={tree.description}
          initialDuration={tree.estimated_duration}
          initialDueDate={tree.due_date}
          onClose={() => setIsEditingProject(false)}
          onSave={handleSaveProjectInfo}
        />
      )}

      {/* 统一删除确认弹窗 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="确定删除"
        cancelText="取消"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
