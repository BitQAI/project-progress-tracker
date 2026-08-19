'use client';

import React, { useState } from 'react';
import { NodeTreeNode, TaskStatus, ProjectStatus, DbTask, DeliverableItem, ProjectPriority } from '@/lib/types';
import { TreeNodeItem } from './TreeNodeItem';
import { CommentDrawer } from './CommentDrawer';
import { ConfirmDialog } from './ConfirmDialog';
import { DeliverableSubmitModal } from './DeliverableSubmitModal';
import { ProjectActivityFeed } from './ProjectActivityFeed';
import { ProjectHeader } from './ProjectHeader';
import { EditProjectModal } from './EditProjectModal';
import { ListTree } from 'lucide-react';

interface ProjectTreeProps {
  initialTree: NodeTreeNode;
  onRefresh?: () => void;
}

export function ProjectTree({ initialTree, onRefresh }: ProjectTreeProps) {
  const [tree, setTree] = useState<NodeTreeNode>(initialTree);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [commentTarget, setCommentTarget] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    nodeId?: string | null;
    taskId?: string | null;
  }>({
    isOpen: false,
    title: '',
  });

  // 交付件提交弹窗
  const [deliverableTask, setDeliverableTask] = useState<DbTask | null>(null);

  // 通用确认删除弹窗
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // 项目基础信息编辑模态
  const [isEditingProject, setIsEditingProject] = useState(false);

  const reloadTree = async () => {
    try {
      const res = await fetch(`/api/projects/${tree.id}`);
      const data = await res.json();
      if (data.ok && data.data) {
        setTree(data.data);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Reload tree error:', err);
    }
  };

  const handleToggleTaskStatus = async (task: DbTask, newStatus: TaskStatus, customDoneAt?: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus, doneAt: customDoneAt }),
      });
      reloadTree();
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  const handleSubmitDeliverableSuccess = async (taskId: string, submissionText: string, doneDate: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: 'done',
          deliverableSubmission: submissionText,
          doneAt: doneDate,
        }),
      });
      reloadTree();
    } catch (err) {
      console.error('Submit deliverable error:', err);
      throw err;
    }
  };

  const handleUpdateTask = async (task: DbTask) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          name: task.name,
          owner: task.owner,
          dueDate: task.due_date,
          estimatedDuration: task.estimated_duration,
          hasDeliverable: task.has_deliverable,
          deliverableRequirement: task.deliverable_requirement,
          deliverableItems: task.deliverable_items,
          deliverableSubmission: task.deliverable_submission,
          doneAt: task.done_at,
          status: task.status,
        }),
      });
      reloadTree();
    } catch (err) {
      console.error('Update task error:', err);
    }
  };

  const handleDeleteTask = (taskId: string, taskName: string = '该任务') => {
    setConfirmDialog({
      isOpen: true,
      title: '确认删除任务',
      message: `确定要删除任务「${taskName}」吗？此操作将同时清理该任务关联的交付物与证据链记录，且不可撤销。`,
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, { method: 'DELETE' });
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          reloadTree();
        } catch (err) {
          console.error('Delete task error:', err);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleAddSubNode = async (
    parentId: string,
    name: string,
    owner: string,
    description?: string,
    estimatedDuration?: string,
    dueDate?: string
  ) => {
    try {
      await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, name, owner, description, estimatedDuration, dueDate }),
      });
      reloadTree();
    } catch (err) {
      console.error('Add subnode error:', err);
    }
  };

  const handleAddTask = async (
    nodeId: string,
    name: string,
    owner: string,
    dueDate: string | undefined,
    hasDeliverable?: boolean,
    deliverableRequirement?: string,
    estimatedDuration?: string,
    deliverableItems?: DeliverableItem[]
  ) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          name,
          owner,
          dueDate,
          hasDeliverable,
          deliverableRequirement,
          estimatedDuration,
          deliverableItems,
        }),
      });
      reloadTree();
    } catch (err) {
      console.error('Add task error:', err);
    }
  };

  const handleUpdateNode = async (
    nodeId: string,
    name: string,
    owner: string,
    description?: string,
    estimatedDuration?: string,
    priority?: ProjectPriority,
    dueDate?: string | null
  ) => {
    try {
      await fetch('/api/nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nodeId, name, owner, description, estimatedDuration, priority, dueDate }),
      });
      reloadTree();
    } catch (err) {
      console.error('Update node error:', err);
    }
  };

  const handleDeleteNode = (nodeId: string, name: string) => {
    if (nodeId === tree.id) {
      setConfirmDialog({
        isOpen: true,
        title: '提示',
        message: '根项目节点是项目主入口，如需删除整个项目，请返回主仪表盘列表进行删除。',
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: '确认删除分组节点',
      message: `确定删除分组「${name}」及其下全部子节点和任务吗？该操作将级联清理所有数据，无法恢复。`,
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await fetch(`/api/nodes?id=${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          reloadTree();
        } catch (err) {
          console.error('Delete node error:', err);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      const res = await fetch(`/api/projects/${tree.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setTree(data.data);
      }
    } catch (err) {
      console.error('Change status error:', err);
    }
  };

  const handleSaveProjectInfo = async (
    name: string,
    owner: string,
    desc: string,
    dur: string,
    pri: ProjectPriority,
    dueDate: string | null
  ) => {
    await handleUpdateNode(tree.id, name, owner, desc, dur, pri, dueDate);
  };

  const handleAddBriefComment = async (content: string) => {
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: tree.id,
        author: tree.owner || '项目负责人',
        content: `【前情提要 / 进展速报】${content}`,
      }),
    });
    reloadTree();
  };

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* 顶部面包屑与项目概览面板 */}
      <ProjectHeader
        tree={tree}
        onEditClick={() => setIsEditingProject(true)}
        onStatusChange={handleStatusChange}
      />

      {/* 前情提要与最新进展动态面板 */}
      <ProjectActivityFeed
        projectId={tree.id}
        activities={tree.recentActivities}
        projectDescription={tree.description}
        estimatedDuration={tree.estimated_duration}
        onAddBriefComment={handleAddBriefComment}
      />

      {/* 递归树展示区 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-150 pb-3.5 mb-3.5">
          <div className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-zinc-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              项目分解结构树 (WBS)
            </h2>
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
      </div>

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
