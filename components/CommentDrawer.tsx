'use client';

import React, { useState, useEffect } from 'react';
import { CommentWithReplies } from '@/lib/types';
import { formatBeijingDateTime } from '@/lib/date-utils';
import { X, MessageSquare, CornerDownRight, Send, User, Clock, Image as ImageIcon, Loader2 } from 'lucide-react';

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

  // 七牛云上传状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // 全屏预览状态 (Lightbox)
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);

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
        const res = await fetch(url);
        const data = await res.json();
        if (!ignore && data.ok && data.data) {
          setComments(data.data);
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

  // 处理拖拽
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
      await uploadToQiniu(files[0]);
    }
  };

  // 服务端代理上传图片到七牛云
  const uploadToQiniu = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('⚠️ 请选择有效的图片文件！');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ 图片大小不能超过 5MB！');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/qiniu/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.ok && data.url) {
        setUploadedImageUrl(data.url);
      } else {
        alert(data.error || '图片上传失败，请重试');
      }
    } catch (err) {
      console.error('Qiniu upload error:', err);
      alert('上传异常，请检查后端七牛云配置');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadToQiniu(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !author.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: nodeId || undefined,
          taskId: taskId || undefined,
          parentId: replyParentId || undefined,
          author: author.trim(),
          content: content.trim(),
          imageUrl: uploadedImageUrl || undefined, // 传递已上传的七牛 URL
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setComments(data.data.comments);
        setContent('');
        setUploadedImageUrl(null); // 清空图片
        setReplyParentId(null);
        setReplyParentAuthor(null);
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
          className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-zinc-200 animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-150 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">{title}</h3>
                {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
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
                  在此记录进展、风险、决策依据，支持上传图片存证，永久归档
                </p>
              </div>
            ) : (
              comments.map((cmt) => (
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
                    
                    <p className="mt-2 text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap">
                      {cmt.content}
                    </p>

                    {/* 图片预览 */}
                    {cmt.image_url && (
                      <div 
                        onClick={() => setSelectedFullImage(cmt.image_url!)}
                        className="mt-2.5 relative max-w-[220px] rounded-lg overflow-hidden border border-zinc-200/80 group cursor-zoom-in"
                      >
                        <img
                          src={cmt.image_url}
                          alt="存证凭据"
                          className="max-h-36 object-cover w-full group-hover:scale-[1.03] transition-transform duration-250 ease-out"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium backdrop-blur-2xs">
                          点击查看大图
                        </div>
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
                          <p className="mt-1.5 text-xs text-zinc-700 whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 底部输入与上传框 */}
          <form 
            onSubmit={handleSubmit} 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-t border-zinc-200 bg-white p-4 space-y-3 transition-colors duration-200 ${
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
              <span className="text-[10px] text-zinc-400 flex-1 text-right">支持拖拽图片到此区域上传</span>
            </div>

            {/* 图片上传展示 & 进度区域 */}
            {(isUploading || uploadedImageUrl) && (
              <div className="relative inline-flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl p-2 max-w-full">
                <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200/80 flex items-center justify-center shrink-0">
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                      <span className="text-[9px] text-zinc-400">上传中</span>
                    </div>
                  ) : (
                    <img
                      src={uploadedImageUrl!}
                      alt="已上传凭证"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
                {!isUploading && (
                  <div className="flex flex-col text-left pr-6">
                    <span className="text-[11px] font-semibold text-emerald-600">✨ 七牛云上传成功</span>
                    <span className="text-[9px] text-zinc-400 truncate max-w-[150px]">已生成安全公网链接</span>
                  </div>
                )}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => setUploadedImageUrl(null)}
                    className="absolute top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-zinc-500 hover:bg-zinc-600 text-white text-xs transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                id="comment-content-input"
                rows={2}
                required
                placeholder={isDragActive ? "松开鼠标即可极速上传图片凭证..." : "填写进度备注、风险说明或完成依据..."}
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
              <label className="flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors">
                <ImageIcon className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-medium">添加凭证图片</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isUploading || isSubmitting}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-zinc-400">最大支持 5MB JPG/PNG/WEBP</span>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox 大图预览 */}
      {selectedFullImage && (
        <div
          onClick={() => setSelectedFullImage(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={selectedFullImage}
              alt="存证大图原图"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setSelectedFullImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-zinc-300 text-xs font-semibold bg-zinc-900/40 px-3.5 py-1.5 rounded-full backdrop-blur-md"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
