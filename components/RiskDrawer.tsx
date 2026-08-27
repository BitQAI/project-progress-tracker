'use client';

import React from 'react';
import { DashboardRiskItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import {
  X,
  AlertTriangle,
  Clock,
  ArrowRight,
  User,
  Calendar,
  FolderGit2,
  CheckSquare,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';

interface RiskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  riskItems: DashboardRiskItem[];
}

export function RiskDrawer({ isOpen, onClose, riskItems }: RiskDrawerProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const overdueItems = riskItems.filter((item) => item.riskType === 'overdue');
  const dueSoonItems = riskItems.filter((item) => item.riskType === 'due_soon');

  const handleNavigate = (item: DashboardRiskItem) => {
    onClose();
    if (item.kind === 'task' && item.taskId) {
      router.push(`/projects/${item.projectId}?targetTask=${item.taskId}`);
    } else if (item.kind === 'node' && item.nodeId) {
      router.push(`/projects/${item.projectId}?targetNode=${item.nodeId}`);
    } else {
      router.push(`/projects/${item.projectId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-zinc-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span>风险与临期预警清单</span>
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {riskItems.length}
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-zinc-500">
                  点击直接跳转至对应项目的任务或分组节点
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 transition-colors"
              title="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 统计快捷条 */}
          <div className="grid grid-cols-2 gap-2 px-5 py-2.5 bg-zinc-50/50 border-b border-zinc-150 text-xs">
            <div className="flex items-center gap-2 text-red-700 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span>超期延误: <strong>{overdueItems.length}</strong> 项</span>
            </div>
            <div className="flex items-center gap-2 text-amber-800 font-medium">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>1天内临期: <strong>{dueSoonItems.length}</strong> 项</span>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {riskItems.length === 0 ? (
              <div className="py-16 text-center text-zinc-400">
                <ShieldAlert className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium text-zinc-700">当前没有处于风险或临期的任务与项目</p>
                <p className="text-xs text-zinc-400 mt-1">所有工作进度正常运行中</p>
              </div>
            ) : (
              riskItems.map((item) => {
                const isOverdue = item.riskType === 'overdue';
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNavigate(item)}
                    className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer hover:shadow-md ${
                      isOverdue
                        ? 'border-red-200 bg-red-50/30 hover:bg-red-50/60 hover:border-red-300'
                        : 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* 状态徽章与所属项目 */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isOverdue
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {isOverdue ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            <span>{item.riskLabel}</span>
                          </span>

                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 truncate max-w-[200px]">
                            <FolderGit2 className="h-3 w-3 text-zinc-400 shrink-0" />
                            <span className="truncate">{item.projectName}</span>
                          </span>
                        </div>

                        {/* 标题 */}
                        <div className="flex items-center gap-1.5">
                          {item.kind === 'task' ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <FolderGit2 className="h-4 w-4 text-zinc-600 shrink-0" />
                          )}
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
                            {item.kind === 'task' ? item.taskName : item.projectName}
                          </h4>
                        </div>

                        {/* 所属分组与属性元数据 */}
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                          {item.nodeName && item.kind === 'task' && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
                              分组: {item.nodeName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-zinc-400" />
                            <span>{item.owner}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-zinc-400" />
                            <span>截止: {item.dueDate}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center self-center pl-2 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <span>共 {riskItems.length} 个重点关注项</span>
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              关闭面板
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
