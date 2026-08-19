'use client';

import React, { useState, useEffect } from 'react';
import { CommentWithReplies } from '@/lib/types';
import { formatBeijingDateTime } from '@/lib/date-utils';
import { X, MessageSquare, CornerDownRight, Send, User, Clock } from 'lucide-react';

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
  const [author, setAuthor] = useState('当前用户');
  const [content, setContent] = useState('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyParentAuthor, setReplyParentAuthor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!isOpen || (!nodeId && !taskId)) return;

    async function loadComments() {
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
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setComments(data.data.comments);
        setContent('');
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
              <p className="text-xs">暂无流转记录与评论留档</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                在此记录进展、风险、决策依据，永久归档不可篡改
              </p>
            </div>
          ) : (
            comments.map((cmt) => (
              <div key={cmt.id} className="space-y-2">
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3">
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
                  <div className="mt-2 flex justify-end">
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
                      <div key={reply.id} className="rounded-lg border border-zinc-200/60 bg-white p-2.5">
                        <div className="flex items-center justify-between text-xs">
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

        {/* 底部输入框 */}
        <form onSubmit={handleSubmit} className="border-t border-zinc-200 bg-white p-4 space-y-2.5">
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
              className="h-8 w-1/3 rounded-lg border border-zinc-200 px-2 text-xs text-zinc-800 focus:border-zinc-900 focus:outline-none"
            />
            <span className="text-[11px] text-zinc-400 flex-1 text-right">永久记录不可篡改</span>
          </div>

          <div className="flex gap-2">
            <textarea
              id="comment-content-input"
              rows={2}
              required
              placeholder="填写进度备注、风险说明或完成依据..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-200 p-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800 disabled:opacity-40 transition-all shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
