'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NodeTreeNode, CommentWithReplies, FileAttachment, AttachmentType } from '@/lib/types';
import { formatBeijingDateTime } from '@/lib/date-utils';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { safeFetchJson } from '@/lib/fetch-utils';
import {
  X,
  MessageSquare,
  CornerDownRight,
  Send,
  User,
  Clock,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  FileCode,
  FileText,
  Trash2,
  Eye,
  Filter,
  Search,
  Check,
  ChevronDown,
} from 'lucide-react';

interface ProjectCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: NodeTreeNode;
  onRefreshProject?: () => void;
}

export function ProjectCommentsDrawer({
  isOpen,
  onClose,
  project,
  onRefreshProject,
}: ProjectCommentsDrawerProps) {
  const [comments, setComments] = useState<(CommentWithReplies & { targetName?: string; isTask?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 新评论表单状态
  const [author, setAuthor] = useState('郭鑫');
  const [content, setContent] = useState('');
  const [postTargetType, setPostTargetType] = useState<'project' | 'node' | 'task'>('project');
  const [selectedPostTargetId, setSelectedPostTargetId] = useState<string>(project.id);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyParentAuthor, setReplyParentAuthor] = useState<string | null>(null);

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [onlyHasAttachments, setOnlyHasAttachments] = useState(false);
  const [filterAttachmentType, setFilterAttachmentType] = useState<'all' | 'image' | 'pdf' | 'md' | 'other'>('all');
  const [filterNodeId, setFilterNodeId] = useState<string>('all');

  // 附件上传与列表
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<FileAttachment[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 统一在线预览状态
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [previewAttachmentList, setPreviewAttachmentList] = useState<FileAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 提取项目中所有的节点与任务，用于筛选和关联发布
  const { allNodes, allTasks, nodesMap, tasksMap } = useMemo(() => {
    const nodes: { id: string; name: string }[] = [];
    const tasks: { id: string; name: string; nodeId: string }[] = [];
    const nMap = new Map<string, string>();
    const tMap = new Map<string, string>();

    function traverse(n: NodeTreeNode) {
      nodes.push({ id: n.id, name: n.name });
      nMap.set(n.id, n.name);
      
      if (n.tasks && n.tasks.length > 0) {
        n.tasks.forEach((t) => {
          tasks.push({ id: t.id, name: t.name, nodeId: n.id });
          tMap.set(t.id, t.name);
        });
      }
      if (n.children && n.children.length > 0) {
        n.children.forEach(traverse);
      }
    }

    traverse(project);
    return { allNodes: nodes, allTasks: tasks, nodesMap: nMap, tasksMap: tMap };
  }, [project]);

  // 加载项目下的所有留言
  const loadProjectComments = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson(`/api/comments?projectId=${encodeURIComponent(project.id)}`);
      if (res.ok && res.data?.ok && Array.isArray(res.data?.data)) {
        setComments(res.data.data);
      }
    } catch (err) {
      console.error('Fetch project comments error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProjectComments();
      // 重置一些表单状态
      setReplyParentId(null);
      setReplyParentAuthor(null);
      setContent('');
      setUploadedAttachments([]);
      setPostTargetType('project');
      setSelectedPostTargetId(project.id);
    }
  }, [isOpen, project.id]);

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  // 极速代理上传附件
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await safeFetchJson<any>('/api/qiniu/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok || !res.data?.ok) {
          throw new Error(res.error || res.data?.error || `上传「${file.name}」失败`);
        }
        const data = res.data;
        return {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: data.name || file.name,
          url: data.url,
          type: (data.type as AttachmentType) || 'other',
          size: data.size || file.size,
          uploaded_at: new Date().toISOString(),
        } as FileAttachment;
      });

      const results = await Promise.all(uploadPromises);
      setUploadedAttachments((prev) => [...prev, ...results]);
    } catch (err: any) {
      console.error('Upload attachments error:', err);
      setUploadError(err.message || '上传异常，请重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setUploadedAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // 附件图标匹配
  const getFormatIcon = (type: AttachmentType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-3.5 w-3.5 text-sky-500" />;
      case 'md':
        return <FileCode className="h-3.5 w-3.5 text-emerald-500" />;
      case 'pdf':
        return <FileText className="h-3.5 w-3.5 text-rose-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-zinc-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openPreview = (att: FileAttachment, list?: FileAttachment[]) => {
    setPreviewAttachment(att);
    setPreviewAttachmentList(list || [att]);
  };

  // 提交评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !author.trim()) return;

    setIsSubmitting(true);
    try {
      // 确定 nodeId 和 taskId
      let finalNodeId: string | null = null;
      let finalTaskId: string | null = null;

      if (postTargetType === 'project') {
        finalNodeId = project.id;
      } else if (postTargetType === 'node') {
        finalNodeId = selectedPostTargetId;
      } else if (postTargetType === 'task') {
        finalTaskId = selectedPostTargetId;
        const matchedTask = allTasks.find((t) => t.id === selectedPostTargetId);
        if (matchedTask) {
          finalNodeId = matchedTask.nodeId;
        }
      }

      const res = await safeFetchJson<any>('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: finalNodeId || undefined,
          taskId: finalTaskId || undefined,
          parentId: replyParentId || undefined,
          author: author.trim(),
          content: content.trim(),
          imageUrl: uploadedAttachments.find((a) => a.type === 'image')?.url || undefined,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });

      if (res.ok && res.data?.ok) {
        setContent('');
        setUploadedAttachments([]);
        setReplyParentId(null);
        setReplyParentAuthor(null);
        setUploadError(null);
        
        // 重新拉取全量留言
        await loadProjectComments();
        
        // 触发外部更新
        if (onRefreshProject) {
          onRefreshProject();
        }
      }
    } catch (err) {
      console.error('Submit comment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 筛选出符合条件的评论列表
  const filteredComments = useMemo(() => {
    return comments.filter((cmt) => {
      // 1. 文本搜索过滤（内容或作者）
      if (searchText.trim()) {
        const text = searchText.toLowerCase();
        const contentMatch = cmt.content.toLowerCase().includes(text);
        const authorMatch = cmt.author.toLowerCase().includes(text);
        if (!contentMatch && !authorMatch) return false;
      }

      // 获取当前评论及其子回复中所有的附件
      const getAttachmentsCount = (c: CommentWithReplies): FileAttachment[] => {
        const currentAtt = c.attachments || (c.image_url ? [{ id: `img_${c.id}`, name: '存证凭证.jpg', url: c.image_url, type: 'image' } as FileAttachment] : []);
        const repliesAtt = c.replies ? c.replies.flatMap(getAttachmentsCount) : [];
        return [...currentAtt, ...repliesAtt];
      };
      
      const allCmtAttachments = getAttachmentsCount(cmt);

      // 2. 是否仅看含附件
      if (onlyHasAttachments) {
        if (allCmtAttachments.length === 0) return false;
      }

      // 3. 附件特定类型过滤
      if (filterAttachmentType !== 'all') {
        const hasMatchingAttachment = allCmtAttachments.some((att) => att.type === filterAttachmentType);
        if (!hasMatchingAttachment) return false;
      }

      // 4. WBS 模块节点过滤
      if (filterNodeId !== 'all') {
        // 如果是过滤特定模块节点，则该评论必须直接属于该 node_id，或者其所属任务属于该 node_id
        if (cmt.node_id === filterNodeId) return true;
        
        if (cmt.task_id) {
          const task = allTasks.find((t) => t.id === cmt.task_id);
          if (task && task.nodeId === filterNodeId) return true;
        }
        return false;
      }

      return true;
    });
  }, [comments, searchText, onlyHasAttachments, filterAttachmentType, filterNodeId, allTasks]);

  // 当切换发布目标类型时，自动将选中的 targetID 设为对应的第一个项
  useEffect(() => {
    if (postTargetType === 'project') {
      setSelectedPostTargetId(project.id);
    } else if (postTargetType === 'node' && allNodes.length > 0) {
      setSelectedPostTargetId(allNodes[0].id);
    } else if (postTargetType === 'task' && allTasks.length > 0) {
      setSelectedPostTargetId(allTasks[0].id);
    }
  }, [postTargetType, project.id, allNodes, allTasks]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-zinc-500/20 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          id="project-comments-drawer"
          className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl border-l border-zinc-200 animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-150 p-4 shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-150 shrink-0">
                <Paperclip className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-900 text-sm truncate">项目全量留言与附件看板</h3>
                <p className="text-xs text-zinc-500 truncate">
                  项目: {project.name} | 共 {comments.length} 条留言
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 筛选过滤工具条 */}
          <div className="border-b border-zinc-150 bg-zinc-50/70 p-3 shrink-0 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* 模糊搜索 */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="搜索留言内容、记录人..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-zinc-200 bg-white text-xs placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                  >
                    清除
                  </button>
                )}
              </div>

              {/* 按 WBS 分组过滤 */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">WBS 模块:</span>
                <select
                  aria-label="按WBS模块筛选留言"
                  value={filterNodeId}
                  onChange={(e) => setFilterNodeId(e.target.value)}
                  className="h-8 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:border-zinc-400 px-2 min-w-[120px] max-w-[200px] truncate"
                >
                  <option value="all">显示全部模块</option>
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              {/* 附件类型细化筛选 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setFilterAttachmentType('all');
                    setOnlyHasAttachments(false);
                  }}
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                    !onlyHasAttachments && filterAttachmentType === 'all'
                      ? 'bg-zinc-150 text-zinc-850 border-zinc-300 shadow-3xs'
                      : 'bg-white text-zinc-600 border-zinc-250 hover:bg-zinc-50'
                  }`}
                >
                  全部留言
                </button>
                <button
                  onClick={() => {
                    setOnlyHasAttachments(true);
                    setFilterAttachmentType('all');
                  }}
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                    onlyHasAttachments && filterAttachmentType === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-zinc-600 border-zinc-250 hover:bg-zinc-50'
                  }`}
                >
                  仅看含附件
                </button>

                <div className="h-4 w-px bg-zinc-250 mx-1 hidden sm:block" />

                {/* 格式标签过滤 */}
                {(['image', 'pdf', 'md'] as const).map((type) => {
                  const label = type === 'image' ? '图片凭证' : type === 'pdf' ? 'PDF文档' : 'Markdown';
                  const active = onlyHasAttachments && filterAttachmentType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setOnlyHasAttachments(true);
                        setFilterAttachmentType(type);
                      }}
                      className={`h-7 px-2 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {getFormatIcon(type)}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 匹配项数量 */}
              <span className="text-[11px] font-medium text-zinc-500">
                已筛选出 <strong className="text-zinc-800">{filteredComments.length}</strong> 条留言
              </span>
            </div>
          </div>

          {/* 留言备注列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/40">
            {isLoading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                <span className="text-xs text-zinc-500 font-medium">正在拉取并整合项目全量存证链...</span>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <MessageSquare className="h-10 w-10 text-zinc-300 mb-2.5" />
                <h4 className="text-xs font-bold text-zinc-700">未发现符合筛选条件的留言</h4>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[280px]">
                  可尝试清除搜索关键字、重置附件筛选、或选择“显示全部模块”后重试。
                </p>
              </div>
            ) : (
              filteredComments.map((cmt) => {
                const allAttachments: FileAttachment[] = cmt.attachments || (
                  cmt.image_url ? [{
                    id: `legacy_${cmt.id}`,
                    name: '存证凭据图片',
                    url: cmt.image_url,
                    type: 'image',
                  }] : []
                );

                // 判断这条评论所属的关联项名称
                const pathLabel = cmt.isTask ? '任务' : '模块';
                const tagColorClass = cmt.isTask 
                  ? 'bg-blue-50 text-blue-700 border-blue-150' 
                  : cmt.node_id === project.id 
                    ? 'bg-zinc-100 text-zinc-700 border-zinc-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-150';

                return (
                  <div key={cmt.id} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm hover:border-zinc-300 transition-all">
                      {/* 顶栏：作者，时间，所属模块胶囊 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2 mb-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                          <User className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{cmt.author}</span>
                          <span className="text-zinc-300">|</span>
                          <span
                            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-tight truncate max-w-[200px] ${tagColorClass}`}
                            title={`关联${pathLabel}: ${cmt.targetName}`}
                          >
                            {pathLabel}: {cmt.targetName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium shrink-0">
                          <Clock className="h-3 w-3" />
                          <span>{formatBeijingDateTime(cmt.created_at)}</span>
                        </div>
                      </div>

                      {/* 内容 */}
                      <p className="text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap font-sans">
                        {cmt.content}
                      </p>

                      {/* 附件 */}
                      {allAttachments.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-dashed border-zinc-100 space-y-2">
                          <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            相关存证附件 ({allAttachments.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {allAttachments.map((att) => (
                              <button
                                key={att.id || att.url}
                                type="button"
                                onClick={() => openPreview(att, allAttachments)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-150 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50 text-xs text-zinc-700 group transition-all text-left"
                              >
                                <span className="shrink-0">{getFormatIcon(att.type)}</span>
                                <span className="font-semibold truncate max-w-[150px] group-hover:text-zinc-900">
                                  {att.name}
                                </span>
                                {att.size && (
                                  <span className="text-[10px] text-zinc-400 font-normal shrink-0">
                                    ({formatFileSize(att.size)})
                                  </span>
                                )}
                                <Eye className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-600 shrink-0 ml-0.5 transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 回复与交互区 */}
                      <div className="mt-3 pt-2 border-t border-zinc-100/60 flex justify-end gap-3 text-xs">
                        <button
                          onClick={() => {
                            setReplyParentId(cmt.id);
                            setReplyParentAuthor(cmt.author);
                            // 快捷定位到输入框
                            document.getElementById('project-comment-textarea')?.focus();
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <CornerDownRight className="h-3 w-3" />
                          <span>回复</span>
                        </button>
                      </div>
                    </div>

                    {/* 嵌套回复列表 */}
                    {cmt.replies && cmt.replies.length > 0 && (
                      <div className="ml-5 space-y-1.5 border-l-2 border-zinc-200 pl-3">
                        {cmt.replies.map((reply) => (
                          <div key={reply.id} className="rounded-lg border border-zinc-150 bg-white/70 p-2.5 shadow-3xs">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-zinc-800 flex items-center gap-1">
                                <User className="h-3 w-3 text-zinc-400" />
                                {reply.author}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {formatBeijingDateTime(reply.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 底部新增留言表单 */}
          <form
            onSubmit={handleSubmit}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-t border-zinc-200 bg-white p-4 space-y-3 shrink-0 transition-all duration-200 ${
              isDragActive ? 'bg-blue-50/50 border-blue-300' : ''
            }`}
          >
            {replyParentId && (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-1 text-xs text-blue-700 animate-in fade-in duration-150">
                <span className="truncate font-semibold">正在回复 @{replyParentAuthor}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyParentId(null);
                    setReplyParentAuthor(null);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold px-1"
                >
                  ×
                </button>
              </div>
            )}

            {/* 名字输入 & 发布目标关联 */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5">
              <input
                type="text"
                placeholder="您的姓名/称呼"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="h-8 w-full xs:w-1/3 rounded-lg border border-zinc-200 px-2.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
              />
              
              <div className="flex-1 flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">关联位置:</span>
                
                {/* 关联类型 */}
                <select
                  aria-label="选择关联类型"
                  value={postTargetType}
                  onChange={(e) => setPostTargetType(e.target.value as any)}
                  className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-1.5 text-xs font-semibold text-zinc-700 focus:outline-none"
                >
                  <option value="project">整个项目</option>
                  <option value="node">指定模块</option>
                  <option value="task">具体任务</option>
                </select>

                {/* 关联的具体节点/任务 */}
                {postTargetType !== 'project' && (
                  <select
                    aria-label="选择关联的具体项"
                    value={selectedPostTargetId}
                    onChange={(e) => setSelectedPostTargetId(e.target.value)}
                    className="h-8 flex-1 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 focus:outline-none focus:border-zinc-400 truncate"
                  >
                    {postTargetType === 'node' &&
                      allNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    {postTargetType === 'task' &&
                      allTasks.map((t) => {
                        const parentNodeName = nodesMap.get(t.nodeId) || '';
                        return (
                          <option key={t.id} value={t.id}>
                            {t.name} (模块: {parentNodeName})
                          </option>
                        );
                      })}
                  </select>
                )}
              </div>
            </div>

            {/* 隐藏的文件上传 input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.md,.markdown,text/markdown,.pdf,application/pdf"
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
              }}
              disabled={isUploading || isSubmitting}
              className="hidden"
            />

            {/* 已就绪附件展示列表 */}
            {(isUploading || uploadedAttachments.length > 0) && (
              <div className="space-y-1.5 bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400">
                  <span>准备上传存证附件 ({uploadedAttachments.length})</span>
                  {isUploading && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> 正在急速上传...
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uploadedAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-zinc-200 text-xs shadow-3xs"
                    >
                      {getFormatIcon(att.type)}
                      <span className="max-w-[110px] truncate font-semibold text-zinc-700">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => openPreview(att, uploadedAttachments)}
                        className="text-zinc-400 hover:text-emerald-600 ml-0.5"
                        title="在线预览"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="text-zinc-400 hover:text-rose-600"
                        title="移除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 animate-in fade-in duration-150">
                {uploadError}
              </div>
            )}

            {/* 输入及发送 */}
            <div className="flex gap-2">
              <textarea
                id="project-comment-textarea"
                rows={2}
                required
                placeholder={isDragActive ? "松开鼠标即可极速上传存证文件..." : "在此写下您的留言说明、关键结论或风险纪要..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 p-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <button
                type="submit"
                disabled={isSubmitting || !content.trim() || isUploading}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-150 disabled:text-zinc-400 disabled:opacity-100 disabled:shadow-none text-white px-3.5 py-2 transition-all shrink-0 shadow-sm font-semibold"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* 操作提示与拖拽辅助 */}
            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSubmitting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors text-xs font-semibold"
              >
                <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                <span>追加存证附件 (支持图片/MD/PDF拖拽)</span>
              </button>
              <span className="text-[10px] text-zinc-400 font-medium hidden xs:inline">支持拖拽多文件秒传</span>
            </div>
          </form>
        </div>
      </div>

      {/* 统一在线预览 */}
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
    </>
  );
}
