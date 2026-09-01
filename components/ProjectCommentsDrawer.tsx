import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NodeTreeNode, CommentWithReplies, FileAttachment, AttachmentType } from '@/lib/types';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { ProjectCommentItem } from './ProjectCommentItem';
import { ProjectCommentFilterBar } from './ProjectCommentFilterBar';
import { ProjectCommentForm } from './ProjectCommentForm';
import { safeFetchJson } from '@/lib/fetch-utils';
import { X, MessageSquare, Loader2, Paperclip } from 'lucide-react';

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
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyParentAuthor, setReplyParentAuthor] = useState<string | null>(null);

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [onlyHasAttachments, setOnlyHasAttachments] = useState(false);
  const [filterAttachmentType, setFilterAttachmentType] = useState<'all' | 'image' | 'pdf' | 'md' | 'html' | 'other'>('all');
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
      setReplyParentId(null);
      setReplyParentAuthor(null);
      setContent('');
      setUploadedAttachments([]);
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

  const openPreview = (att: FileAttachment, list?: FileAttachment[]) => {
    setPreviewAttachment(att);
    setPreviewAttachmentList(list || [att]);
  };

  // 提交评论
  const handleSubmit = async (postTargetType: 'project' | 'node' | 'task', selectedPostTargetId: string) => {
    if (!content.trim() || !author.trim()) return;

    setIsSubmitting(true);
    try {
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
        
        await loadProjectComments();
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
      if (searchText.trim()) {
        const text = searchText.toLowerCase();
        const contentMatch = cmt.content.toLowerCase().includes(text);
        const authorMatch = cmt.author.toLowerCase().includes(text);
        if (!contentMatch && !authorMatch) return false;
      }

      const getAttachmentsCount = (c: CommentWithReplies): FileAttachment[] => {
        const currentAtt = c.attachments || (c.image_url ? [{ id: `img_${c.id}`, name: '存证凭证.jpg', url: c.image_url, type: 'image' } as FileAttachment] : []);
        const repliesAtt = c.replies ? c.replies.flatMap(getAttachmentsCount) : [];
        return [...currentAtt, ...repliesAtt];
      };
      
      const allCmtAttachments = getAttachmentsCount(cmt);

      if (onlyHasAttachments) {
        if (allCmtAttachments.length === 0) return false;
      }

      if (filterAttachmentType !== 'all') {
        const hasMatchingAttachment = allCmtAttachments.some((att) => att.type === filterAttachmentType);
        if (!hasMatchingAttachment) return false;
      }

      if (filterNodeId !== 'all') {
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
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 shrink-0 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 筛选过滤工具条 */}
          <ProjectCommentFilterBar
            searchText={searchText}
            onSearchTextChange={setSearchText}
            filterNodeId={filterNodeId}
            onFilterNodeIdChange={setFilterNodeId}
            allNodes={allNodes}
            onlyHasAttachments={onlyHasAttachments}
            filterAttachmentType={filterAttachmentType}
            onFilterTypeChange={(hasAtt, type) => {
              setOnlyHasAttachments(hasAtt);
              setFilterAttachmentType(type);
            }}
            matchCount={filteredComments.length}
          />

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
              filteredComments.map((cmt) => (
                <ProjectCommentItem
                  key={cmt.id}
                  comment={cmt}
                  projectId={project.id}
                  onReply={(parentId, replyAuthor) => {
                    setReplyParentId(parentId);
                    setReplyParentAuthor(replyAuthor);
                    document.getElementById('project-comment-textarea')?.focus();
                  }}
                  onPreview={openPreview}
                />
              ))
            )}
          </div>

          {/* 隐藏的文件上传 input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.md,.markdown,text/markdown,.pdf,application/pdf,.html,.htm,text/html"
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
            }}
            disabled={isUploading || isSubmitting}
            className="hidden"
          />

          {/* 底部新增留言表单 */}
          <ProjectCommentForm
            project={project}
            allNodes={allNodes}
            allTasks={allTasks}
            nodesMap={nodesMap}
            author={author}
            onAuthorChange={setAuthor}
            content={content}
            onContentChange={setContent}
            replyParentId={replyParentId}
            replyParentAuthor={replyParentAuthor}
            onCancelReply={() => {
              setReplyParentId(null);
              setReplyParentAuthor(null);
            }}
            uploadedAttachments={uploadedAttachments}
            isUploading={isUploading}
            uploadError={uploadError}
            isSubmitting={isSubmitting}
            isDragActive={isDragActive}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileInputClick={() => fileInputRef.current?.click()}
            onRemoveAttachment={handleRemoveAttachment}
            onPreviewAttachment={(att) => openPreview(att, uploadedAttachments)}
            onSubmit={handleSubmit}
          />
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

