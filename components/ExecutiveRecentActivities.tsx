'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ExecutiveActivityItem, FileAttachment, AttachmentType } from '@/lib/types';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import {
  Activity,
  FileCheck2,
  CheckCircle2,
  MessageSquareQuote,
  Clock3,
  ChevronRight,
  FolderGit2,
  Image as ImageIcon,
  FileCode,
  FileText,
  X,
} from 'lucide-react';

interface ExecutiveRecentActivitiesProps {
  activities: ExecutiveActivityItem[];
}

export function ExecutiveRecentActivities({ activities }: ExecutiveRecentActivitiesProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [previewAttachmentList, setPreviewAttachmentList] = useState<FileAttachment[]>([]);

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

  const getAttachments = (item: ExecutiveActivityItem) => {
    const list: FileAttachment[] = [];
    if (item.attachments && item.attachments.length > 0) {
      return item.attachments;
    }
    if (item.imageUrl) {
      list.push({
        id: `fallback_${item.id}`,
        name: '附图证据',
        url: item.imageUrl,
        type: 'image',
      });
    }
    return list;
  };

  const getFormatIcon = (type: AttachmentType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-3.5 w-3.5 text-blue-500" />;
      case 'md':
        return <FileCode className="h-3.5 w-3.5 text-emerald-500" />;
      case 'pdf':
        return <FileText className="h-3.5 w-3.5 text-rose-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-zinc-500" />;
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
              className="group flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-2 py-3 md:py-2 px-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              {/* 移动端与窄屏专属多行布局 (md:hidden) */}
              <div className="flex md:hidden flex-col gap-2 w-full">
                {/* 第一行：状态徽章与项目归属名称 */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${style.badgeClass}`}
                  >
                    {style.icon}
                    <span>{item.categoryBadge}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 truncate max-w-[180px] xs:max-w-xs">
                    <FolderGit2 className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span className="truncate">{item.projectName}</span>
                  </span>
                </div>

                {/* 第二行：核心业务进展结论 (无强制水平单行截断，允许完美折行) */}
                <div className="text-xs text-zinc-900 font-medium leading-relaxed">
                  {item.headline}
                </div>

                {/* 第三行：移动端专项多行缩略图预览与备注重构 (若存在) */}
                {(item.summary || getAttachments(item).length > 0) && (
                  <div className="flex items-start gap-2 bg-zinc-50/60 p-2 rounded-lg border border-zinc-150">
                    {getAttachments(item).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {getAttachments(item).map((att) => {
                          const isImg = att.type === 'image';
                          return (
                            <button
                              key={att.id || att.url}
                              onClick={(e) => {
                                e.preventDefault();
                                setPreviewAttachment(att);
                                setPreviewAttachmentList(getAttachments(item));
                              }}
                              className="relative group/thumb inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-zinc-200 bg-zinc-50/50 hover:border-blue-400 transition-all cursor-pointer shadow-3xs"
                              title={`点击预览: ${att.name}`}
                            >
                              {isImg ? (
                                <div className="h-full w-full rounded-sm overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full w-full bg-zinc-50 rounded-sm">
                                  {getFormatIcon(att.type)}
                                </div>
                              )}
                              <span className="absolute -top-0.5 -right-0.5 flex h-1 w-1 z-10">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1 w-1 bg-blue-500"></span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {item.summary && (
                      <span className="text-[11px] text-zinc-500 leading-relaxed min-w-0 break-words flex-1">
                        {item.summary}
                      </span>
                    )}
                  </div>
                )}

                {/* 第四行：时间与直达详情 */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-100/50 pt-2 mt-0.5">
                  <span>{item.formattedTime}</span>
                  {item.projectId && (
                    <Link
                      id={`executive-activity-row-link-mobile-${index + 1}`}
                      href={`/projects/${item.projectId}`}
                      className="inline-flex items-center gap-0.5 text-zinc-700 hover:text-blue-600 font-semibold transition-colors"
                    >
                      <span>查看详情</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* 网页端专属布局 (hidden md:flex) - 保持原有横向单行紧凑美学 */}
              <div className="hidden md:flex items-center gap-2 min-w-0 flex-1">
                {/* 状态徽章 */}
                <span
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${style.badgeClass}`}
                >
                  {style.icon}
                  <span>{item.categoryBadge}</span>
                </span>

                {/* 项目归属 */}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 shrink-0 max-w-[100px] xs:max-w-[150px] sm:max-w-xs lg:max-w-none truncate">
                  <FolderGit2 className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{item.projectName}</span>
                </span>

                <span className="text-zinc-300 shrink-0">|</span>

                {/* 老板视角的进展与业务价值描述 */}
                <div className="min-w-0 flex-1 text-xs text-zinc-800 flex items-center gap-1.5 overflow-visible">
                  <span className="font-medium text-zinc-900 truncate max-w-[110px] xs:max-w-[160px] sm:max-w-xs md:max-w-sm shrink-0">{item.headline}</span>
                  {item.summary ? (
                    <div className="text-zinc-500 ml-1.5 flex items-center gap-1.5 min-w-0 overflow-visible">
                      <span className="shrink-0">—</span>
                      {getAttachments(item).length > 0 && (
                        <div className="flex items-center gap-1 overflow-visible shrink-0 mx-0.5">
                          {getAttachments(item).map((att) => {
                            const isImg = att.type === 'image';
                            return (
                              <button
                                key={att.id || att.url}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPreviewAttachment(att);
                                  setPreviewAttachmentList(getAttachments(item));
                                }}
                                className="relative group/thumb inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm border border-zinc-200 bg-zinc-50/50 hover:scale-115 hover:border-blue-500 transition-all cursor-pointer shadow-3xs"
                                title={`点击预览: ${att.name}`}
                              >
                                {isImg ? (
                                  <div className="h-full w-full rounded-sm overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="h-full w-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-full w-full bg-zinc-50 rounded-sm">
                                    {getFormatIcon(att.type)}
                                  </div>
                                )}
                                <span className="absolute -top-0.5 -right-0.5 flex h-1 w-1 z-10">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1 w-1 bg-blue-500"></span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <span className="truncate min-w-0">{item.summary}</span>
                    </div>
                  ) : (
                    getAttachments(item).length > 0 && (
                      <div className="flex items-center gap-1 overflow-visible shrink-0 mx-0.5">
                        {getAttachments(item).map((att) => {
                          const isImg = att.type === 'image';
                          return (
                            <button
                              key={att.id || att.url}
                              onClick={(e) => {
                                e.preventDefault();
                                setPreviewAttachment(att);
                                setPreviewAttachmentList(getAttachments(item));
                              }}
                              className="relative group/thumb inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm border border-zinc-200 bg-zinc-50/50 hover:scale-115 hover:border-blue-500 transition-all cursor-pointer shadow-3xs"
                              title={`点击预览: ${att.name}`}
                            >
                              {isImg ? (
                                <div className="h-full w-full rounded-sm overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="h-full w-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full w-full bg-zinc-50 rounded-sm">
                                  {getFormatIcon(att.type)}
                                </div>
                              )}
                              <span className="absolute -top-0.5 -right-0.5 flex h-1 w-1 z-10">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1 w-1 bg-blue-500"></span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* 网页端专属布局右侧部分 (hidden md:flex) */}
              <div className="hidden md:flex items-center gap-3 text-[11px] text-zinc-400 shrink-0">
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

      {/* 附件在线预览模态框 */}
      {previewAttachment && (
        <AttachmentPreviewModal
          isOpen={!!previewAttachment}
          attachment={previewAttachment}
          attachmentList={previewAttachmentList}
          onSelectAttachment={(att) => setPreviewAttachment(att)}
          onClose={() => {
            setPreviewAttachment(null);
            setPreviewAttachmentList([]);
          }}
        />
      )}

      {/* 磨砂玻璃超清 Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] p-4 flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-4 md:top-4 md:right-4 text-white hover:text-zinc-300 bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors focus:outline-hidden"
              title="关闭"
            >
              <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="超清原图"
              className="max-w-full max-h-[80vh] rounded-md object-contain shadow-2xl border border-zinc-800"
            />
            <div className="mt-4 text-xs text-zinc-400 select-none bg-black/40 px-3 py-1 rounded-full">
              再次点击任意空白处或按钮退出预览
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
