'use client';

import React from 'react';
import { CommentWithReplies, FileAttachment } from '@/lib/types';
import { formatBeijingDateTime } from '@/lib/date-utils';
import { MarkdownContent } from './MarkdownContent';
import { AttachmentBadgeList } from './AttachmentBadgeList';
import { User, Clock, CornerDownRight } from 'lucide-react';

interface ProjectCommentItemProps {
  comment: CommentWithReplies & { targetName?: string; isTask?: boolean };
  projectId: string;
  onReply: (parentId: string, author: string) => void;
  onPreview: (att: FileAttachment, list: FileAttachment[]) => void;
}

export function ProjectCommentItem({
  comment: cmt,
  projectId,
  onReply,
  onPreview,
}: ProjectCommentItemProps) {
  const allAttachments: FileAttachment[] = cmt.attachments || (
    cmt.image_url ? [{
      id: `legacy_${cmt.id}`,
      name: '存证凭据图片',
      url: cmt.image_url,
      type: 'image',
    }] : []
  );

  const pathLabel = cmt.isTask ? '任务' : '模块';
  const tagColorClass = cmt.isTask 
    ? 'bg-blue-50 text-blue-700 border-blue-150' 
    : cmt.node_id === projectId 
      ? 'bg-zinc-100 text-zinc-700 border-zinc-200' 
      : 'bg-amber-50 text-amber-700 border-amber-150';

  return (
    <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
        <MarkdownContent
          content={cmt.content}
          className="text-xs leading-relaxed text-zinc-700 font-sans"
        />

        {/* 附件 */}
        {allAttachments.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-dashed border-zinc-100 space-y-2">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              相关存证附件 ({allAttachments.length})
            </span>
            <AttachmentBadgeList
              attachments={allAttachments}
              onPreview={onPreview}
            />
          </div>
        )}

        {/* 回复与交互区 */}
        <div className="mt-3 pt-2 border-t border-zinc-100/60 flex justify-end gap-3 text-xs">
          <button
            onClick={() => onReply(cmt.id, cmt.author)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
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
              <MarkdownContent
                content={reply.content}
                className="text-xs text-zinc-700 leading-relaxed"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
