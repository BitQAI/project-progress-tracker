'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ExecutiveActivityItem, FileAttachment, AttachmentType } from '@/lib/types';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { MarkdownContent } from './MarkdownContent';
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
  Globe,
  X,
  Search,
  Layers,
  Loader2,
} from 'lucide-react';

interface AllProjectsActivitiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialActivities?: ExecutiveActivityItem[];
}

export function AllProjectsActivitiesDrawer({
  isOpen,
  onClose,
  initialActivities = [],
}: AllProjectsActivitiesDrawerProps) {
  const [items, setItems] = useState<ExecutiveActivityItem[]>(initialActivities.slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [projectList, setProjectList] = useState<{ id: string; name: string }[]>([]);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialActivities.length);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [previewAttachmentList, setPreviewAttachmentList] = useState<FileAttachment[]>([]);

  const observerTarget = useRef<HTMLDivElement>(null);

  // 防抖搜索关键词
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 获取第一页数据或按条件重置检索
  const fetchFirstPage = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '10',
      });
      if (selectedProject !== 'all') params.set('projectId', selectedProject);
      if (selectedFilter !== 'all') params.set('type', selectedFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/activities?${params.toString()}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setItems(json.data.items || []);
        setTotal(json.data.total || 0);
        setHasMore(!!json.data.hasMore);
        setPage(1);
        if (Array.isArray(json.data.availableProjects)) {
          setProjectList(json.data.availableProjects);
        }
      }
    } catch (err) {
      console.error('Fetch activities error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, selectedProject, selectedFilter, debouncedSearch]);

  // 当打开抽屉或筛选/搜索条件变化时重新拉取第一页（10条）
  useEffect(() => {
    if (isOpen) {
      fetchFirstPage();
    }
  }, [isOpen, fetchFirstPage]);

  // 懒加载下一页数据（追加 10 条）
  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '10',
      });
      if (selectedProject !== 'all') params.set('projectId', selectedProject);
      if (selectedFilter !== 'all') params.set('type', selectedFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/activities?${params.toString()}`);
      const json = await res.json();
      if (json.ok && json.data) {
        const newItems: ExecutiveActivityItem[] = json.data.items || [];
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const uniqueNew = newItems.filter((i) => !existingIds.has(i.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(!!json.data.hasMore);
        setTotal(json.data.total || 0);
      }
    } catch (err) {
      console.error('Load more activities error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, hasMore, isLoading, isLoadingMore, selectedProject, selectedFilter, debouncedSearch]);

  // 监听滚动触底实现自动懒加载
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading, isLoadingMore]);

  if (!isOpen) return null;

  const getBadgeStyle = (variant: ExecutiveActivityItem['badgeVariant']) => {
    switch (variant) {
      case 'emerald':
        return {
          icon: <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />,
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'blue':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />,
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'purple':
        return {
          icon: <MessageSquareQuote className="h-3.5 w-3.5 text-purple-600 shrink-0" />,
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'amber':
      default:
        return {
          icon: <Clock3 className="h-3.5 w-3.5 text-amber-600 shrink-0" />,
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
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
      case 'html':
        return <Globe className="h-3.5 w-3.5 text-orange-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-zinc-500" />;
    }
  };

  return (
    <div
      id="all-projects-activities-drawer"
      className="fixed inset-0 z-50 flex justify-end bg-zinc-500/20 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-3xs">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900">全部项目动态追踪</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700">
                  已载入 {items.length} / 共 {total} 条
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                按需懒加载各个项目的交付成果、节点完工与管理留档历史
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-all-activities-drawer-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-150 transition-colors cursor-pointer"
            title="关闭面板"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 搜索与多维过滤器 */}
        <div className="px-5 py-3 border-b border-zinc-100 bg-white space-y-2.5 shrink-0">
          {/* 搜索框与项目下拉选择 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                id="activities-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索项目、任务、进展描述或负责人..."
                className="w-full pl-8.5 pr-3.5 py-1.5 text-xs rounded-lg border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-hidden transition-all bg-zinc-50/50 placeholder:text-zinc-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {projectList.length > 0 && (
              <select
                id="activities-project-filter-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="py-1.5 px-2 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-700 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-hidden cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">全部项目 ({projectList.length})</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 筛选 Pill 选项 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
            {[
              { id: 'all', label: '全部' },
              { id: 'deliverable', label: '成果交付', color: 'emerald' },
              { id: 'milestone', label: '节点完工', color: 'blue' },
              { id: 'comment', label: '管理留档', color: 'purple' },
              { id: 'progress', label: '进度同步', color: 'amber' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-zinc-900 text-white shadow-3xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 动态项目列表主体 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-2" />
              <p className="text-xs">正在加载最新进展...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-2">
                <Layers className="h-5 w-5" />
              </div>
              <p className="text-xs text-zinc-500 font-medium">没有找到符合条件的动态记录</p>
              <p className="text-[11px] text-zinc-400 mt-1">请尝试清除筛选条件或更换搜索关键词</p>
            </div>
          ) : (
            <>
              {items.map((item, idx) => {
                const style = getBadgeStyle(item.badgeVariant);
                const attachments = getAttachments(item);

                return (
                  <div
                    key={item.id || idx}
                    id={`drawer-activity-card-${idx + 1}`}
                    className="group rounded-xl border border-zinc-200/80 bg-white p-4 hover:border-zinc-300 hover:shadow-xs transition-all"
                  >
                    {/* 卡片头部：项目名称与类型徽章 */}
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${style.badgeClass}`}
                        >
                          {style.icon}
                          <span>{item.categoryBadge}</span>
                        </span>

                        <Link
                          href={`/projects/${item.projectId}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 hover:text-blue-600 transition-colors truncate"
                          title={item.projectName}
                        >
                          <FolderGit2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{item.projectName}</span>
                        </Link>

                        {item.moduleName && (
                          <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded shrink-0 hidden sm:inline-block">
                            {item.moduleName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-zinc-400">{item.formattedTime}</span>
                        <Link
                          href={`/projects/${item.projectId}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-zinc-600 hover:text-blue-600 transition-colors bg-zinc-50 hover:bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200/60"
                          title="查看项目详情"
                        >
                          <span>进入</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* 业务进展主标题 */}
                    <div className="text-xs font-semibold text-zinc-900 leading-relaxed">
                      {item.headline}
                    </div>

                    {/* 详细说明与附件卡片 */}
                    {(item.summary || attachments.length > 0) && (
                      <div className="mt-2 bg-zinc-50/70 p-2.5 rounded-lg border border-zinc-150/70 text-xs space-y-2">
                        {item.summary && (
                          <MarkdownContent
                            content={item.summary}
                            className="text-[11px] text-zinc-600 leading-relaxed"
                          />
                        )}

                        {/* 证据链与附件展示 */}
                        {attachments.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-200/60">
                            <span className="text-[10px] text-zinc-400 font-medium">附件凭据:</span>
                            {attachments.map((att) => {
                              const isImg = att.type === 'image';
                              return (
                                <button
                                  key={att.id || att.url}
                                  type="button"
                                  onClick={() => {
                                    setPreviewAttachment(att);
                                    setPreviewAttachmentList(attachments);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-zinc-200 hover:border-blue-300 text-[11px] text-zinc-700 hover:text-blue-700 transition-colors shadow-3xs cursor-pointer group/att"
                                  title={`点击预览: ${att.name}`}
                                >
                                  {isImg ? (
                                    <ImageIcon className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    getFormatIcon(att.type)
                                  )}
                                  <span className="max-w-[140px] truncate">{att.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 责任人标记 */}
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>责任人: <strong className="text-zinc-600 font-medium">{item.owner}</strong></span>
                      <span className="text-zinc-300 font-mono text-[9px]">{item.timestamp.replace('T', ' ').slice(0, 16)}</span>
                    </div>
                  </div>
                );
              })}

              {/* 懒加载触发与状态提示 */}
              <div ref={observerTarget} className="py-3 flex flex-col items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
                    <span>正在加载更多进展...</span>
                  </div>
                )}
                {!isLoadingMore && hasMore && (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    加载更多 (10条)
                  </button>
                )}
                {!hasMore && items.length > 0 && (
                  <p className="text-[11px] text-zinc-400">
                    已加载全部 {items.length} 条历史动态
                  </p>
                )}
              </div>
            </>
          )}
        </div>
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
    </div>
  );
}

