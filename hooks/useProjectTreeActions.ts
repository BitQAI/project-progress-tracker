import { useState } from 'react';
import { NodeTreeNode, TaskStatus, ProjectStatus, DbTask, DeliverableItem, ProjectPriority, FileAttachment } from '@/lib/types';
import { WbsParseTargetLevel } from '@/lib/ai-wbs-types';
import { safeFetchJson } from '@/lib/fetch-utils';

export function useProjectTreeActions(initialTree: NodeTreeNode, onRefresh?: () => void) {
  const [tree, setTree] = useState<NodeTreeNode>(initialTree);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [deliverableTask, setDeliverableTask] = useState<DbTask | null>(null);

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

  const [aiParseModal, setAiParseModal] = useState<{
    isOpen: boolean;
    targetLevel: WbsParseTargetLevel;
    targetNodeId?: string | null;
    targetTaskId?: string | null;
    contextName: string;
    defaultOwner: string;
  }>({
    isOpen: false,
    targetLevel: 'project_subnodes',
    contextName: '',
    defaultOwner: '',
  });

  const reloadTree = async () => {
    try {
      const res = await safeFetchJson(`/api/projects/${tree.id}`);
      if (res.ok && res.data?.ok && res.data?.data) {
        setTree(res.data.data);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.warn('Reload tree warn:', err);
    }
  };

  const handleOpenAiParse = (params: {
    targetLevel: WbsParseTargetLevel;
    targetNodeId?: string | null;
    targetTaskId?: string | null;
    contextName: string;
    defaultOwner: string;
  }) => {
    setAiParseModal({
      isOpen: true,
      ...params,
    });
  };

  const handleToggleTaskStatus = async (task: DbTask, newStatus: TaskStatus, customDoneAt?: string) => {
    try {
      await safeFetchJson('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus, doneAt: customDoneAt }),
      });
      reloadTree();
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  const handleSubmitDeliverableSuccess = async (
    taskId: string,
    submissionText: string,
    doneDate: string,
    attachments?: FileAttachment[]
  ) => {
    try {
      const res = await safeFetchJson('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: 'done',
          deliverableSubmission: submissionText,
          doneAt: doneDate,
          deliverableAttachments: attachments,
        }),
      });
      if (!res.ok) {
        throw new Error(res.error || '提交交付物失败');
      }
      reloadTree();
    } catch (err) {
      console.error('Submit deliverable error:', err);
      throw err;
    }
  };

  const handleUpdateTask = async (task: DbTask, changeReason?: string) => {
    try {
      await safeFetchJson('/api/tasks', {
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
          changeReason,
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
          await safeFetchJson(`/api/tasks?id=${encodeURIComponent(taskId)}`, { method: 'DELETE' });
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
      await safeFetchJson('/api/nodes', {
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
    deliverableItems?: DeliverableItem[],
    parentId?: string | null
  ) => {
    try {
      await safeFetchJson('/api/tasks', {
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
          parentId,
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
    dueDate?: string | null,
    changeReason?: string
  ) => {
    try {
      await safeFetchJson('/api/nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nodeId, name, owner, description, estimatedDuration, priority, dueDate, changeReason }),
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
          await safeFetchJson(`/api/nodes?id=${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
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
      const res = await safeFetchJson(`/api/projects/${tree.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok && res.data?.ok && res.data?.data) {
        setTree(res.data.data);
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
    dueDate: string | null,
    changeReason?: string
  ) => {
    await handleUpdateNode(tree.id, name, owner, desc, dur, pri, dueDate, changeReason);
  };

  const handleAddBriefComment = async (content: string) => {
    await safeFetchJson('/api/comments', {
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

  return {
    tree,
    setTree,
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
  };
}
