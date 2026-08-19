'use client';

import React, { useState } from 'react';
import { ProjectActivityItem } from '@/lib/types';
import { GitDiffView } from './GitDiffView';
import { formatBeijingShortDateTime } from '@/lib/date-utils';
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
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ProjectActivityFeedProps {
  projectId: string;
  activities?: ProjectActivityItem[];
  projectDescription?: string;
  estimatedDuration?: string;
  onAddBriefComment: (content: string) => Promise<void>;
}

export function ProjectActivityFeed({
  activities = [],
  projectDescription,
  estimatedDuration,
  onAddBriefComment,
}: ProjectActivityFeedProps) {
  // 1. 默认收起状态
  const [isExpanded, setIsExpanded] = useState(false);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim()) return;
    setIsPosting(true);
    try {
      await onAddBriefComment(newUpdateText.trim());
      setNewUpdateText('');
    } catch (err) {
      console.error('Post brief update error:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const getActivityConfig = (type: ProjectActivityItem['type']) => {
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
          icon: <Clock className="h-3.5 w-3.5 text-zinc-500" />,
          badge: '动态',
          badgeClass: 'bg-zinc-50 text-zinc-600 border-zinc-200',
        };
    }
  };

  const formatTimestamp = (ts: string) => {
    return formatBeijingShortDateTime(ts);
  };

  const latestAct = activities[0];

  return (
    <div
      id="project-activity-feed"
      className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-2xs transition-all"
    >
      {/* 收起时严格保持在单行 (1 行) */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-900 text-white">
            <Activity className="h-3 w-3 text-emerald-400" />
          </div>

          <span className="text-xs font-bold text-zinc-900 shrink-0">
            前情提要与最新进展
          </span>

          {activities.length > 0 && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-medium text-zinc-600 shrink-0">
              {activities.length} 条
            </span>
          )}

          {!isExpanded && (
            <>
              <span className="text-zinc-300 shrink-0 hidden sm:inline">|</span>
              <span className="text-[11px] text-zinc-500 truncate flex-1 hidden sm:inline">
                {latestAct
                  ? `最新：${latestAct.title}`
                  : projectDescription || '暂无更多前情背景'}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          id="toggle-project-activity-feed-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50/80 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors shrink-0"
        >
          <span>{isExpanded ? '收起' : '展开详情'}</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* 展开后的完整内容 */}
      {isExpanded && (
        <div className="mt-2.5 space-y-2.5 pt-2 border-t border-zinc-100">
          {/* 前情提要基础信息 */}
          {(projectDescription || estimatedDuration) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/70">
              <div className="md:col-span-2 space-y-0.5">
                <span className="font-semibold text-zinc-700">项目背景与前情说明:</span>
                <div className="text-zinc-600 leading-relaxed whitespace-pre-wrap font-sans">
                  {projectDescription || '暂无项目描述，点击上方编辑补充'}
                </div>
              </div>
              <div className="space-y-0.5 border-t md:border-t-0 md:border-l border-zinc-200/80 pt-1.5 md:pt-0 md:pl-2.5">
                <span className="font-semibold text-zinc-700">预估交付周期:</span>
                <p className="font-medium text-zinc-900 whitespace-pre-wrap">
                  {estimatedDuration || '未设定预估周期'}
                </p>
              </div>
            </div>
          )}

          {/* 快速追加动态输入框 */}
          <form onSubmit={handlePostUpdate} className="flex items-center gap-2">
            <input
              type="text"
              value={newUpdateText}
              onChange={(e) => setNewUpdateText(e.target.value)}
              placeholder="快速追加一条项目前情提要或今日进展结论..."
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <button
              type="submit"
              disabled={isPosting || !newUpdateText.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              <Send className="h-3 w-3" />
              <span>{isPosting ? '发布中' : '发布动态'}</span>
            </button>
          </form>

          {/* 动态时间流 */}
          {activities.length > 0 ? (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {activities.map((act) => {
                const config = getActivityConfig(act.type);
                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-2 rounded-lg border border-zinc-150 bg-white p-2 text-xs shadow-2xs hover:border-zinc-300 transition-all"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-50 border border-zinc-200">
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[10px] font-semibold shrink-0 ${config.badgeClass}`}
                          >
                            {config.badge}
                          </span>
                          <span className="font-medium text-zinc-900 break-words">{act.title}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {formatTimestamp(act.timestamp)}
                        </span>
                      </div>
                      {act.detail && (
                        <GitDiffView
                          rawText={act.detail}
                          type={act.type}
                          title={act.title}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-1 text-center text-xs text-zinc-400">
              暂无最新动态，当团队成员新增任务、编辑信息、勾选完成或提交交付件时将自动实时记录在此。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
