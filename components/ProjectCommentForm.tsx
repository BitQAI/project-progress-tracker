'use client';

import React, { useState, useEffect } from 'react';
import { NodeTreeNode, FileAttachment } from '@/lib/types';
import { AttachmentBadgeList } from './AttachmentBadgeList';
import { X, Send, Loader2, Paperclip } from 'lucide-react';

interface ProjectCommentFormProps {
  project: NodeTreeNode;
  allNodes: { id: string; name: string }[];
  allTasks: { id: string; name: string; nodeId: string }[];
  nodesMap: Map<string, string>;
  author: string;
  onAuthorChange: (val: string) => void;
  content: string;
  onContentChange: (val: string) => void;
  replyParentId: string | null;
  replyParentAuthor: string | null;
  onCancelReply: () => void;
  uploadedAttachments: FileAttachment[];
  isUploading: boolean;
  uploadError: string | null;
  isSubmitting: boolean;
  isDragActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInputClick: () => void;
  onRemoveAttachment: (id: string) => void;
  onPreviewAttachment: (att: FileAttachment) => void;
  onSubmit: (targetType: 'project' | 'node' | 'task', targetId: string) => Promise<void>;
}

export function ProjectCommentForm({
  project,
  allNodes,
  allTasks,
  nodesMap,
  author,
  onAuthorChange,
  content,
  onContentChange,
  replyParentId,
  replyParentAuthor,
  onCancelReply,
  uploadedAttachments,
  isUploading,
  uploadError,
  isSubmitting,
  isDragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputClick,
  onRemoveAttachment,
  onPreviewAttachment,
  onSubmit,
}: ProjectCommentFormProps) {
  const [postTargetType, setPostTargetType] = useState<'project' | 'node' | 'task'>('project');
  const [selectedPostTargetId, setSelectedPostTargetId] = useState<string>(project.id);

  useEffect(() => {
    if (postTargetType === 'project') {
      setSelectedPostTargetId(project.id);
    } else if (postTargetType === 'node' && allNodes.length > 0) {
      setSelectedPostTargetId(allNodes[0].id);
    } else if (postTargetType === 'task' && allTasks.length > 0) {
      setSelectedPostTargetId(allTasks[0].id);
    }
  }, [postTargetType, project.id, allNodes, allTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(postTargetType, selectedPostTargetId);
  };

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border-t border-zinc-200 bg-white p-4 space-y-3 shrink-0 transition-all duration-200 ${
        isDragActive ? 'bg-blue-50/50 border-blue-300' : ''
      }`}
    >
      {replyParentId && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-1 text-xs text-blue-700 animate-in fade-in duration-150">
          <span className="truncate font-semibold">正在回复 @{replyParentAuthor}</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-blue-600 hover:text-blue-800 font-bold px-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* 顶部发布控制条 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-700">
          <span>发表身份:</span>
          <input
            type="text"
            required
            value={author}
            onChange={(e) => onAuthorChange(e.target.value)}
            placeholder="您的姓名"
            className="h-8 w-24 rounded-lg border border-zinc-200 px-2 text-xs text-zinc-800 focus:border-zinc-400 focus:outline-none"
          />
        </div>

        {/* 归属层级与节点快捷指派 */}
        <div className="flex items-center gap-1.5 flex-1 max-w-sm justify-start sm:justify-end">
          <span className="text-xs font-semibold text-zinc-500 shrink-0">归属挂载:</span>
          <select
            aria-label="选择归属挂载层级"
            value={postTargetType}
            onChange={(e) => setPostTargetType(e.target.value as 'project' | 'node' | 'task')}
            className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 focus:outline-none focus:border-zinc-400 shrink-0"
          >
            <option value="project">整项目总览</option>
            <option value="node">指定模块 (WBS)</option>
            <option value="task">具体任务项</option>
          </select>

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
          <AttachmentBadgeList
            attachments={uploadedAttachments}
            onPreview={onPreviewAttachment}
            onRemove={onRemoveAttachment}
          />
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
          onChange={(e) => onContentChange(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 p-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim() || isUploading}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-150 disabled:text-zinc-400 disabled:opacity-100 disabled:shadow-none text-white px-3.5 py-2 transition-all shrink-0 shadow-sm font-semibold cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* 操作提示与拖拽辅助 */}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
        <button
          type="button"
          onClick={onFileInputClick}
          disabled={isUploading || isSubmitting}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors text-xs font-semibold cursor-pointer"
        >
          <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
          <span>追加存证附件 (支持图片/MD/PDF/HTML拖拽)</span>
        </button>
        <span className="text-[10px] text-zinc-400 font-medium hidden xs:inline">支持拖拽多文件秒传</span>
      </div>
    </form>
  );
}
