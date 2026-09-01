'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CommentWithReplies, FileAttachment, AttachmentType } from '@/lib/types';
import { formatBeijingDateTime } from '@/lib/date-utils';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { AttachmentBadgeList, getAttachmentFormatIcon } from './AttachmentBadgeList';
import { MarkdownContent } from './MarkdownContent';
import { safeFetchJson } from '@/lib/fetch-utils';
import {
  X,
  MessageSquare,
  CornerDownRight,
  Send,
  User,
  Clock,
  Loader2,
  Paperclip,
} from 'lucide-react';

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  nodeId?: string | null;
  taskId?: string | null;
}

export function CommentDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  nodeId,
  taskId,
}: CommentDrawerProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [author, setAuthor] = useState('郭鑫');
  const [content, setContent] = useState('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyParentAuthor, setReplyParentAuthor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 附件上传与列表
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<FileAttachment[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 统一在线预览状态
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [previewAttachmentList, setPreviewAttachmentList] = useState<FileAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ignore = false;
    if (!isOpen || (!nodeId && !taskId)) return;

    async function loadComments() {
      if (!ignore) {
        setIsLoading(true);
      }
      try {
        const url = nodeId
          ? `/api/comments?nodeId=${encodeURIComponent(nodeId)}`
          : `/api/comments?taskId=${encodeURIComponent(taskId!)}`;
        const res = await safeFetchJson(url);
        if (!ignore && res.ok && res.data?.ok && res.data?.data) {
          setComments(res.data.data);
        }
      } catch (err) {
        console.error('Fetch comments error:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadComments();
    return () => {
      ignore = true;
    };
  }, [isOpen, nodeId, taskId]);

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

  // 服务端代理上传文件（图片/MD/PDF）到七牛云
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
        const newAttachment: FileAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: data.name || file.name,
          url: data.url,
          type: (data.type as AttachmentType) || 'other',
          size: data.size || file.size,
          uploaded_at: new Date().toISOString(),
        };
        return newAttachment;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !author.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await safeFetchJson<any>('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: nodeId || undefined,
          taskId: taskId || undefined,
          parentId: replyParentId || undefined,
          author: author.trim(),
          content: content.trim(),
          imageUrl: uploadedAttachments.find((a) => a.type === 'image')?.url || undefined,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });

      if (res.ok && res.data?.ok && res.data?.data) {
        setComments(res.data.data.comments);
        setContent('');
        setUploadedAttachments([]);
        setReplyParentId(null);
        setReplyParentAuthor(null);
        setUploadError(null);
      }
    } catch (err) {
      console.error('Submit comment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          id="comment-drawer"
          className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-zinc-200 animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-150 p-4 shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-900 text-sm truncate">{title}</h3>
                {subtitle && <p className="text-xs text-zinc-500 truncate">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 证据链流列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center text-xs text-zinc-400">
                加载证据链记录...
              </div>
            ) : comments.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-zinc-400">
                <MessageSquare className="h-8 w-8 text-zinc-300 mb-2" />
                <p className="text-xs font-medium text-zinc-700">暂无流转记录与评价留档</p>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[260px]">
                  在此记录进展、风险、决策依据，支持上传图片、Markdown、PDF 文档存证
                </p>
              </div>
            ) : (
              comments.map((cmt) => {
                const allAttachments: FileAttachment[] = cmt.attachments || (
                  cmt.image_url ? [{
                    id: `legacy_${cmt.id}`,
                    name: '存证凭据图片',
                    url: cmt.image_url,
                    type: 'image',
                  }] : []
                );

                return (
                  <div key={cmt.id} className="space-y-2">
                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                          <User className="h-3 w-3 text-zinc-500" />
                          <span>{cmt.author}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatBeijingDateTime(cmt.created_at)}</span>
                        </div>
                      </div>
                      
                      <MarkdownContent
                        content={cmt.content}
                        className="mt-2 text-xs leading-relaxed text-zinc-700"
                      />

                      {/* 附件与图片凭据列表 */}
                      {allAttachments.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          <div className="text-3xs font-semibold text-zinc-400 uppercase tracking-wider">
                            相关存证附件 ({allAttachments.length})
                          </div>
                          <AttachmentBadgeList
                            attachments={allAttachments}
                            onPreview={openPreview}
                          />
                        </div>
                      )}

                      <div className="mt-2.5 flex justify-end">
                        <button
                          onClick={() => {
                            setReplyParentId(cmt.id);
                            setReplyParentAuthor(cmt.author);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <CornerDownRight className="h-3 w-3" />
                          回复
                        </button>
                      </div>
                    </div>

                    {/* 嵌套回复 */}
                    {cmt.replies && cmt.replies.length > 0 && (
                      <div className="ml-5 space-y-2 border-l-2 border-zinc-200 pl-3">
                        {cmt.replies.map((reply) => (
                          <div key={reply.id} className="rounded-lg border border-zinc-200/60 bg-white p-2.5 shadow-xs">
                            <div className="flex items-between justify-between text-xs">
                              <span className="font-semibold text-zinc-800">{reply.author}</span>
                              <span className="text-[10px] text-zinc-400">
                                {formatBeijingDateTime(reply.created_at)}
                              </span>
                            </div>
                            <MarkdownContent
                              content={reply.content}
                              className="mt-1.5 text-xs text-zinc-700 leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 底部输入与上传框 */}
          <form 
            onSubmit={handleSubmit} 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-t border-zinc-200 bg-white p-4 space-y-3 shrink-0 transition-colors duration-200 ${
              isDragActive ? 'bg-blue-50/50 border-blue-300' : ''
            }`}
          >
            {replyParentId && (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                <span className="truncate">正在回复 @{replyParentAuthor}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyParentId(null);
                    setReplyParentAuthor(null);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="您的姓名/称呼"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="h-8 w-1/3 rounded-lg border border-zinc-200 px-2.5 text-xs text-zinc-800 focus:border-zinc-900 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-400 flex-1 text-right">支持拖拽图片/MD/PDF/HTML上传</span>
            </div>

            {/* 隐藏的通用文件上传 input */}
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

            {/* 已上传附件展示与进度列表 */}
            {(isUploading || uploadedAttachments.length > 0) && (
              <div className="space-y-1.5 bg-zinc-50 border border-zinc-200 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-3xs font-medium text-zinc-500">
                  <span>已就绪存证附件 ({uploadedAttachments.length})</span>
                  {isUploading && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> 上传中...
                    </span>
                  )}
                </div>
                <AttachmentBadgeList
                  attachments={uploadedAttachments}
                  onPreview={openPreview}
                  onRemove={handleRemoveAttachment}
                />
              </div>
            )}

            {uploadError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                {uploadError}
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                id="comment-content-input"
                rows={2}
                required
                placeholder={isDragActive ? "松开鼠标即可极速上传存证文件..." : "填写进度备注、风险说明或完成依据..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 p-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmitting || !content.trim() || isUploading}
                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3.5 py-2 text-white hover:bg-zinc-800 disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
              <div className="flex items-center gap-1.5">
                {/* 统一添加附件按钮 */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isSubmitting}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors text-xs font-medium"
                >
                  <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                  <span>添加附件 (图片/MD/PDF/HTML)</span>
                </button>
              </div>
              <span className="text-[10px] text-zinc-400">支持多文件与拖拽</span>
            </div>
          </form>
        </div>
      </div>

      {/* 统一在线预览模态框 */}
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

