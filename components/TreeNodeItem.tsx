'use client';

import React, { useState } from 'react';
import { NodeTreeNode, DbTask, DeliverableItem, ProjectPriority } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { AddTaskForm, AddSubNodeForm, EditSubNodeForm } from './NodeActionForms';
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
  Calendar,
  Bot,
} from 'lucide-react';

interface TreeNodeItemProps {
  node: NodeTreeNode;
  depth?: number;
  hideCompleted?: boolean;
  onToggleTaskStatus: (task: DbTask, newStatus: 'pending' | 'done', customDoneAt?: string) => void;
  onRequestSubmitDeliverable: (task: DbTask) => void;
  onUpdateTask: (task: DbTask, changeReason?: string) => void;
  onDeleteTask: (taskId: string, taskName?: string) => void;
  onAddSubNode: (
    parentId: string,
    name: string,
    owner: string,
    description?: string,
    estimatedDuration?: string,
    dueDate?: string
  ) => void;
  onAddTask: (
    nodeId: string,
    name: string,
    owner: string,
    dueDate: string | undefined,
    hasDeliverable?: boolean,
    deliverableRequirement?: string,
    estimatedDuration?: string,
    deliverableItems?: DeliverableItem[],
    parentId?: string | null
  ) => void;
  onUpdateNode: (
    nodeId: string,
    name: string,
    owner: string,
    description?: string,
    estimatedDuration?: string,
    priority?: ProjectPriority,
    dueDate?: string | null,
    changeReason?: string
  ) => void;
  onDeleteNode: (nodeId: string, name: string) => void;
  onOpenNodeComments: (node: NodeTreeNode) => void;
  onOpenTaskComments: (task: DbTask) => void;
  onOpenAiParse?: (params: {
    targetLevel: 'project_subnodes' | 'node_tasks' | 'task_subtasks';
    targetNodeId?: string | null;
    targetTaskId?: string | null;
    contextName: string;
    defaultOwner: string;
  }) => void;
}

export function TreeNodeItem({
  node,
  depth = 0,
  hideCompleted = false,
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
  onOpenAiParse,
}: TreeNodeItemProps) {
  // 默认展开逻辑：仅进度在 0% ~ 100% 之间（即进行中）的分组和任务才会默认展开
  const isBetween0And100 = node.progressPercent > 0 && node.progressPercent < 100;
  const [isOpen, setIsOpen] = useState(isBetween0And100);
  // 仅进度在 0% ~ 100% 之间的分组，其任务列表才会默认展开
  const [showTasks, setShowTasks] = useState(isBetween0And100);
  const [showAddSubNode, setShowAddSubNode] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const hasChildren = (node.children && node.children.length > 0) || (node.tasks && node.tasks.length > 0);

  const handleCreateSubNodeSubmit = (
    name: string,
    owner: string,
    desc?: string,
    estimatedDuration?: string,
    dueDate?: string
  ) => {
    onAddSubNode(node.id, name, owner, desc, estimatedDuration, dueDate);
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
    setShowTasks(true); // 添加任务后自动展开当前节点任务
    setIsOpen(true);
  };

  const handleSaveNodeEdit = (
    name: string,
    owner: string,
    desc?: string,
    estimatedDuration?: string,
    dueDate?: string,
    changeReason?: string
  ) => {
    onUpdateNode(node.id, name, owner, desc, estimatedDuration, node.priority, dueDate, changeReason);
    setIsEditingNode(false);
  };

  return (
    <div
      className="flex flex-col select-none pl-[var(--indent-mobile)] sm:pl-[var(--indent-desktop)]"
      style={{
        '--indent-mobile': depth > 0 ? `${Math.min(depth * 6, 12)}px` : '0px',
        '--indent-desktop': depth > 0 ? `${Math.min(depth * 14, 28)}px` : '0px',
      } as React.CSSProperties}
    >
      {/* 节点控制条 */}
      <div
        id={`tree-node-${node.id}`}
        className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
          depth === 0
            ? 'border-zinc-200 bg-zinc-50/90 shadow-xs mb-2'
            : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-2xs my-1'
        }`}
      >
        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/70 shrink-0"
            title={isOpen ? '收起分组' : '展开分组'}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 shrink-0">
            {isOpen ? <FolderOpen className="h-3.5 w-3.5 text-blue-600" /> : <Folder className="h-3.5 w-3.5" />}
          </div>

          <div className="flex items-center gap-2 truncate flex-1 min-w-0 flex-wrap">
            <span className={`font-bold truncate ${depth === 0 ? 'text-sm text-zinc-900' : 'text-xs text-zinc-800'}`}>
              {node.name}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500 shrink-0">
              <User className="h-3 w-3 text-zinc-400" />
              {node.owner}
            </span>
            {node.estimated_duration && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-medium text-zinc-600 shrink-0 border border-zinc-200/70">
                <Clock className="h-2.5 w-2.5 text-zinc-400" />
                {node.estimated_duration}
              </span>
            )}
            {node.due_date && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-50/60 px-1.5 py-0.2 text-[10px] font-medium text-blue-700 shrink-0 border border-blue-200/60">
                <Calendar className="h-2.5 w-2.5 text-blue-500" />
                截止: {node.due_date}
              </span>
            )}
            {node.description && (
              <span className="text-[11px] text-zinc-400 truncate max-w-xs hidden sm:inline" title={node.description}>
                · {node.description}
              </span>
            )}
            {node.hasOverdueTasks && (
              <span className="inline-flex items-center gap-0.5 rounded bg-red-100 border border-red-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-red-700 shrink-0">
                <AlertCircle className="h-3 w-3 text-red-600" />
                延期 {node.maxOverdueDays || 1} 天
              </span>
            )}
          </div>
        </div>

        {/* 右侧递归汇总进度与操作 */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 shrink-0 pt-1.5 sm:pt-0 border-t border-zinc-100 sm:border-t-0">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-xs font-bold text-zinc-900">{node.progressPercent}%</span>
              <span className="text-[10px] text-zinc-400">
                {node.completedTasksCount}/{node.totalTasksCount} 任务
              </span>
            </div>
            <div className="h-2 w-14 sm:w-16 overflow-hidden rounded-full bg-zinc-200">
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
            {/* AI 拆解/解析按钮 */}
            {onOpenAiParse && (
              <button
                type="button"
                onClick={() =>
                  onOpenAiParse({
                    targetLevel: depth === 0 ? 'project_subnodes' : 'node_tasks',
                    targetNodeId: node.id,
                    contextName: node.name,
                    defaultOwner: node.owner || '',
                  })
                }
                id={`btn-ai-parse-node-${node.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200/70 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors shadow-3xs"
                title={`使用 AI 为「${node.name}」解析需求并智能拆解`}
              >
                <Bot className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden xs:inline">AI解析</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowAddTask(true);
                setShowTasks(true);
                setShowAddSubNode(false);
                setIsEditingNode(false);
              }}
              id={`btn-add-task-node-${node.id}`}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
              title="在此节点添加任务"
            >
              <CheckSquare className="h-3 w-3 text-blue-600" />
              <span className="hidden xs:inline">加任务</span>
            </button>

            <button
              onClick={() => {
                setShowAddSubNode(true);
                setShowAddTask(false);
                setIsEditingNode(false);
              }}
              id={`btn-add-subnode-${node.id}`}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
              title="在此节点添加子节点"
            >
              <Plus className="h-3 w-3 text-emerald-600" />
              <span className="hidden xs:inline">加子分组</span>
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
                <div className="absolute right-0 top-6 z-20 w-32 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  {onOpenAiParse && (
                    <button
                      onClick={() => {
                        onOpenAiParse({
                          targetLevel: depth === 0 ? 'project_subnodes' : 'node_tasks',
                          targetNodeId: node.id,
                          contextName: node.name,
                          defaultOwner: node.owner || '',
                        });
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-blue-700 hover:bg-blue-50 font-medium"
                    >
                      <Bot className="h-3.5 w-3.5 text-blue-600" />
                      AI 智能解析
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsEditingNode(true);
                      setShowAddSubNode(false);
                      setShowAddTask(false);
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
          {/* 编辑节点信息（平铺展开模式） */}
          {isEditingNode && (
            <EditSubNodeForm
              initialName={node.name}
              initialOwner={node.owner}
              initialDesc={node.description}
              initialDuration={node.estimated_duration}
              initialDueDate={node.due_date}
              onClose={() => setIsEditingNode(false)}
              onSubmit={handleSaveNodeEdit}
            />
          )}

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

          {/* 任务折叠与列表区（默认收起，按需展开，无多余边框） */}
          {node.tasks && node.tasks.length > 0 && (
            <div className="space-y-1.5 py-0.5">
              <button
                type="button"
                onClick={() => setShowTasks(!showTasks)}
                className="flex items-center justify-between w-full py-1.5 px-2.5 rounded-lg bg-zinc-100/70 hover:bg-zinc-200/60 text-xs text-zinc-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="font-medium text-zinc-800">
                    本组任务 ({node.tasks.length} 项)
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    · 已完工 {node.tasks.filter((t) => t.status === 'done').length} 项
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium shrink-0">
                  <span>{showTasks ? '收起任务' : '展开任务'}</span>
                  {showTasks ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
              </button>

              {showTasks && (
                <div className="space-y-1.5 pt-0.5">
                  {node.tasks
                    .filter((t) => !t.parent_id)
                    .filter((t) => !hideCompleted || t.status !== 'done' || node.tasks.some((sub) => sub.parent_id === t.id && sub.status !== 'done'))
                    .map((task) => {
                      const subtasks = node.tasks.filter((sub) => sub.parent_id === task.id);
                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          subtasks={subtasks}
                          onToggleStatus={onToggleTaskStatus}
                          onRequestSubmitDeliverable={onRequestSubmitDeliverable}
                          onUpdateTask={onUpdateTask}
                          onDeleteTask={onDeleteTask}
                          onOpenComments={onOpenTaskComments}
                          onAddTask={onAddTask}
                          onOpenAiParse={onOpenAiParse}
                          hideCompleted={hideCompleted}
                        />
                      );
                    })}
                  {hideCompleted &&
                    node.tasks.filter((t) => t.status === 'done').length > 0 &&
                    node.tasks.filter((t) => t.status !== 'done').length === 0 && (
                      <div className="py-1 px-2.5 text-[11px] text-zinc-400 italic bg-zinc-100/50 rounded-md">
                        本组 {node.tasks.length} 项任务均已完工（当前处于隐藏状态）
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* 递归渲染子节点（分组与子分组直接展开展示） */}
          {node.children && node.children.length > 0 && (
            <div className="space-y-2 pt-0.5">
              {node.children.map((child) => (
                <TreeNodeItem
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  hideCompleted={hideCompleted}
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
                  onOpenAiParse={onOpenAiParse}
                />
              ))}
            </div>
          )}

          {!hasChildren && !showAddTask && !showAddSubNode && !isEditingNode && (
            <div className="py-2 text-center text-xs text-zinc-400">
              暂无下级任务或分组，点击上方「加任务」或「加子分组」开始规划
            </div>
          )}
        </div>
      )}
    </div>
  );
}


