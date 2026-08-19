'use client';

import React from 'react';
import Link from 'next/link';
import { ExecutiveActivityItem } from '@/lib/types';
import {
  Activity,
  FileCheck2,
  CheckCircle2,
  MessageSquareQuote,
  Clock3,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';

interface ExecutiveRecentActivitiesProps {
  activities: ExecutiveActivityItem[];
}

export function ExecutiveRecentActivities({ activities }: ExecutiveRecentActivitiesProps) {
  if (!activities || activities.length === 0) {
    return null;
  }

  const getBadgeStyle = (variant: ExecutiveActivityItem['badgeVariant']) => {
    switch (variant) {
      case 'emerald':
        return {
          icon: <FileCheck2 className="h-3 w-3 text-emerald-600 shrink-0" />,
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
        };
      case 'blue':
        return {
          icon: <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0" />,
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/70',
        };
      case 'purple':
        return {
          icon: <MessageSquareQuote className="h-3 w-3 text-purple-600 shrink-0" />,
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/70',
        };
      case 'amber':
      default:
        return {
          icon: <Clock3 className="h-3 w-3 text-amber-600 shrink-0" />,
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/70',
        };
    }
  };

  return (
    <section
      id="executive-recent-activities-section"
      className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-2xs"
      aria-label="最新动态"
    >
      {/* 紧凑头部指示 */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-1.5 mb-1.5 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-white">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span>最新动态</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>实时同步</span>
        </div>
      </div>

      {/* 紧凑行列表（各项目仅显示最新进展，最多3行） */}
      <div className="divide-y divide-zinc-100">
        {activities.slice(0, 3).map((item, index) => {
          const style = getBadgeStyle(item.badgeVariant);

          return (
            <div
              key={item.id || index}
              id={`executive-activity-row-${index + 1}`}
              className="group flex flex-col md:flex-row md:items-center justify-between gap-2 py-2 px-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              {/* 左侧：标签 + 项目 + 老板视角业务结论 */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* 状态徽章 */}
                <span
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${style.badgeClass}`}
                >
                  {style.icon}
                  <span>{item.categoryBadge}</span>
                </span>

                {/* 项目归属 */}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 shrink-0 max-w-[140px] truncate">
                  <FolderGit2 className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{item.projectName}</span>
                </span>

                <span className="text-zinc-300 shrink-0 hidden sm:inline">|</span>

                {/* 老板视角的进展与业务价值描述 (无 + - 符号) */}
                <div className="min-w-0 flex-1 text-xs text-zinc-800 truncate">
                  <span className="font-medium text-zinc-900">{item.headline}</span>
                  {item.summary && (
                    <span className="text-zinc-500 ml-1.5 hidden lg:inline truncate">
                      — {item.summary}
                    </span>
                  )}
                </div>
              </div>

              {/* 右侧：责任人 + 时间 + 直达链接 */}
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 shrink-0 pl-1 md:pl-0">
                <span className="text-zinc-600 font-medium">{item.owner}</span>
                <span>{item.formattedTime}</span>

                {item.projectId && (
                  <Link
                    id={`executive-activity-row-link-${index + 1}`}
                    href={`/projects/${item.projectId}`}
                    className="inline-flex items-center text-zinc-700 hover:text-blue-600 font-medium transition-colors group-hover:translate-x-0.5"
                    title="查看项目详情"
                  >
                    <span>详情</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
