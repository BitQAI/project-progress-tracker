import React from 'react';
import { ProjectActivityItem, FileAttachment } from './types';
import {
  Activity,
  FileCheck,
  CheckCircle2,
  MessageSquare,
  FolderPlus,
  FolderEdit,
  PlusCircle,
  Edit3,
  Trash2,
  Settings,
  Layers,
} from 'lucide-react';

export function getActivityItemAttachments(act: ProjectActivityItem): FileAttachment[] {
  if (act.attachments && act.attachments.length > 0) {
    return act.attachments;
  }
  if (act.image_url) {
    return [
      {
        id: `fallback_${act.id}`,
        name: '附图证据',
        url: act.image_url,
        type: 'image',
      },
    ];
  }
  return [];
}

export function getActivityConfig(type: ProjectActivityItem['type']) {
  switch (type) {
    case 'deliverable_submitted':
      return {
        icon: <FileCheck className="h-3.5 w-3.5 text-emerald-600" />,
        badge: '交付成果',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'task_done':
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />,
        badge: '已完工',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'task_created':
      return {
        icon: <PlusCircle className="h-3.5 w-3.5 text-indigo-600" />,
        badge: '新增任务',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    case 'task_updated':
      return {
        icon: <Edit3 className="h-3.5 w-3.5 text-amber-600" />,
        badge: '编辑任务',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'task_deleted':
      return {
        icon: <Trash2 className="h-3.5 w-3.5 text-rose-600" />,
        badge: '删除任务',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'node_created':
      return {
        icon: <FolderPlus className="h-3.5 w-3.5 text-amber-600" />,
        badge: '新建分组',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'node_updated':
      return {
        icon: <FolderEdit className="h-3.5 w-3.5 text-sky-600" />,
        badge: '编辑分组',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    case 'node_deleted':
      return {
        icon: <Trash2 className="h-3.5 w-3.5 text-rose-600" />,
        badge: '删除分组',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'project_created':
      return {
        icon: <Layers className="h-3.5 w-3.5 text-violet-600" />,
        badge: '项目立项',
        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
      };
    case 'project_updated':
      return {
        icon: <Settings className="h-3.5 w-3.5 text-purple-600" />,
        badge: '项目变更',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'comment_added':
      return {
        icon: <MessageSquare className="h-3.5 w-3.5 text-purple-600" />,
        badge: '备注留档',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'briefing':
      return {
        icon: <Activity className="h-3.5 w-3.5 text-violet-600" />,
        badge: '前情速报',
        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
      };
    default:
      return {
        icon: <Activity className="h-3.5 w-3.5 text-zinc-600" />,
        badge: '操作动态',
        badgeClass: 'bg-zinc-50 text-zinc-700 border-zinc-200',
      };
  }
}
