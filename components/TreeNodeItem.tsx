'use client';

import React, { useState } from 'react';
import { NodeTreeNode, DbTask, DeliverableItem } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { AddTaskForm, AddSubNodeForm } from './NodeActionForms';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  CheckSquare,
  MessageSquare,
  AlertCircle,
  User,
  Clock,
} from 'lucide-react';

interface TreeNodeItemProps {
  node: NodeTreeNode;
  depth?: number;
  onToggleTaskStatus: (task: DbTask, newStatus: 'pending' | 'done', customDoneAt?: string) => void;
  onRequestSubmitDeliverable: (task: DbTask) => void;
  onUpdateTask: (task: DbTask) => void;
  onDeleteTask: (taskId: string, taskName?: string) => void;
  onAddSubNode: (parentId: string, name: string, owner: string, description?: string, estimatedDuration?: string) => void;
  onAddTask: (
    nodeId: string,
    name: string,
    owner: string,
    dueDate: string | undefined,
    hasDeliverable?: boolean,
    deliverableRequirement?: string,
    estimatedDuration?: string,
    deliverableItems?: DeliverableItem[]
  ) => void;
  onUpdateNode: (nodeId: string, name: string, owner: string, description?: string, estimatedDuration?: string) => void;
  onDeleteNode: (nodeId: string, name: string) => void;
  onOpenNodeComments: (node: NodeTreeNode) => void;
  onOpenTaskComments: (task: DbTask) => void;
}

export function TreeNodeItem({
  node,
  depth = 0,
  onToggleTaskStatus,
  onRequestSubmitDeliverable,
  onUpdateTask,
  onDeleteTask,
  onAddSubNode,
  onAddTask,
  onUpdateNode,
  onDeleteNode,
  onOpenNodeComments,
  onOpenTaskComments,
}: TreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAddSubNode, setShowAddSubNode] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const [isEditingNode, setIsEditingNode] = useState(false);
  const [editNodeName, setEditNodeName] = useState(node.name);
  const [editNodeOwner, setEditNodeOwner] = useState(node.owner);
  const [editNodeDesc, setEditNodeDesc] = useState(node.description || '');
  const [editNodeDuration, setEditNodeDuration] = useState(node.estimated_duration || '');

  const [showMenu, setShowMenu] = useState(false);

  const hasChildren = (node.children && node.children.length > 0) || (node.tasks && node.tasks.length > 0);

  const handleCreateSubNodeSubmit = (
    name: string,
    owner: string,
    desc?: string,
    estimatedDuration?: string
  ) => {
    onAddSubNode(node.id, name, owner, desc, estimatedDuration);
    setShowAddSubNode(false);
    setIsOpen(true);
  };

  const handleCreateTaskSubmit = (
    name: string,
    owner: string,
    dueDate: string | undefined,
    hasDeliverable: boolean,
    deliverableRequirement?: string,
    estimatedDuration?: string,
    deliverableItems?: DeliverableItem[]
  ) => {
    onAddTask(
      node.id,
      name,
      owner,
      dueDate,
      hasDeliverable,
      deliverableRequirement,
      estimatedDuration,
      deliverableItems
    );
    setShowAddTask(false);
    setIsOpen(true);
  };

  const handleSaveNodeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNodeName.trim() || !editNodeOwner.trim()) return;
    onUpdateNode(node.id, editNodeName.trim(), editNodeOwner.trim(), editNodeDesc, editNodeDuration);
    setIsEditingNode(false);
    setShowMenu(false);
  };

  return (
    <div className="flex flex-col select-none" style={{ marginLeft: `${depth > 0 ? 20 : 0}px` }}>
      {/* 节点控制条 */}
      <div
        id={`tree-node-${node.id}`}
        className={`group flex items-center justify-between rounded-xl border p-3 transition-all ${
          depth === 0
            ? 'border-zinc-200 bg-zinc-50/90 shadow-xs mb-2'
            : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-2xs my-1'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/70"
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 shrink-0">
            {isOpen ? <FolderOpen className="h-4 w-4 text-blue-600" /> : <Folder className="h-4 w-4" />}
          </div>

          {isEditingNode ? (
            <form onSubmit={handleSaveNodeEdit} className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                required
                value={editNodeName}
                onChange={(e) => setEditNodeName(e.target.value)}
                placeholder="分组名称"
                className="h-7 rounded-md border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-900 focus:outline-none"
              />
              <input
                type="text"
                required
                value={editNodeOwner}
                onChange={(e) => setEditNodeOwner(e.target.value)}
                className="h-7 w-20 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700 focus:outline-none"
                placeholder="负责人"
              />
              <input
                type="text"
                value={editNodeDuration}
                onChange={(e) => setEditNodeDuration(e.target.value)}
                className="h-7 w-24 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700 focus:outline-none"
                placeholder="预估周期(如:2周)"
              />
              <input
                type="text"
                value={editNodeDesc}
                onChange={(e) => setEditNodeDesc(e.target.value)}
                className="h-7 flex-1 min-w-32 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700 focus:outline-none"
                placeholder="分组描述说明..."
              />
              <button
                type="button"
                onClick={() => setIsEditingNode(false)}
                className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700 font-medium"
              >
                保存
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
              <span className={`font-bold truncate ${depth === 0 ? 'text-sm text-zinc-900' : 'text-xs text-zinc-800'}`}>
                {node.name}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-zinc-500 shrink-0">
                <User className="h-3 w-3 text-zinc-400" />
                {node.owner}
              </span>
              {node.estimated_duration && (
                <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 shrink-0 border border-zinc-200">
                  <Clock className="h-2.5 w-2.5 text-zinc-400" />
                  {node.estimated_duration}
                </span>
              )}
              {node.description && (
                <span className="text-[11px] text-zinc-400 truncate max-w-xs hidden sm:inline" title={node.description}>
                  · {node.description}
                </span>
              )}
              {node.hasOverdueTasks && (
                <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 shrink-0">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  存在超期
                </span>
              )}
            </div>
          )}
        </div>

        {/* 右侧递归汇总进度与操作 */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-zinc-900">{node.progressPercent}%</span>
              <span className="text-[10px] text-zinc-400">
                {node.completedTasksCount}/{node.totalTasksCount} 任务
              </span>
            </div>
            <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  node.progressPercent === 100
                    ? 'bg-emerald-500'
                    : node.hasOverdueTasks
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${node.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowAddTask(true);
                setShowAddSubNode(false);
              }}
              id={`btn-add-task-node-${node.id}`}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
              title="在此节点添加任务"
            >
              <CheckSquare className="h-3 w-3 text-blue-600" />
              <span>加任务</span>
            </button>

            <button
              onClick={() => {
                setShowAddSubNode(true);
                setShowAddTask(false);
              }}
              id={`btn-add-subnode-${node.id}`}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
              title="在此节点添加子节点"
            >
              <Plus className="h-3 w-3 text-emerald-600" />
              <span>加子分组</span>
            </button>

            <button
              onClick={() => onOpenNodeComments(node)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              title="节点进展与证据链"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-6 z-20 w-28 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setIsEditingNode(true);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                  >
                    <Edit2 className="h-3 w-3" />
                    编辑信息
                  </button>
                  <button
                    onClick={() => {
                      onDeleteNode(node.id, node.name);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    删除分组
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 展开内容 */}
      {isOpen && (
        <div className="space-y-2 border-l-2 border-zinc-150 pl-3 ml-3 my-1">
          {/* 新增任务表单组件 */}
          {showAddTask && (
            <AddTaskForm
              nodeName={node.name}
              defaultOwner={node.owner || ''}
              onClose={() => setShowAddTask(false)}
              onSubmit={handleCreateTaskSubmit}
            />
          )}

          {/* 新增子节点表单组件 */}
          {showAddSubNode && (
            <AddSubNodeForm
              defaultOwner={node.owner || ''}
              onClose={() => setShowAddSubNode(false)}
              onSubmit={handleCreateSubNodeSubmit}
            />
          )}

          {/* 任务列表 */}
          {node.tasks && node.tasks.length > 0 && (
            <div className="space-y-1.5">
              {node.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleStatus={onToggleTaskStatus}
                  onRequestSubmitDeliverable={onRequestSubmitDeliverable}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onOpenComments={onOpenTaskComments}
                />
              ))}
            </div>
          )}

          {/* 递归渲染子节点 */}
          {node.children && node.children.length > 0 && (
            <div className="space-y-2">
              {node.children.map((child) => (
                <TreeNodeItem
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  onToggleTaskStatus={onToggleTaskStatus}
                  onRequestSubmitDeliverable={onRequestSubmitDeliverable}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onAddSubNode={onAddSubNode}
                  onAddTask={onAddTask}
                  onUpdateNode={onUpdateNode}
                  onDeleteNode={onDeleteNode}
                  onOpenNodeComments={onOpenNodeComments}
                  onOpenTaskComments={onOpenTaskComments}
                />
              ))}
            </div>
          )}

          {!hasChildren && !showAddTask && !showAddSubNode && (
            <div className="py-2 text-center text-xs text-zinc-400">
              暂无下级任务或分组，点击上方「加任务」或「加子分组」开始规划
            </div>
          )}
        </div>
      )}
    </div>
  );
}

