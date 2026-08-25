'use client';

import React from 'react';
import { DbTask, FileAttachment, AttachmentType } from '@/lib/types';
import {
  FileCode,
  FileText,
  Image as ImageIcon,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface TaskDeliverablePreviewProps {
  task: DbTask;
  completionInfo: { text: string; className: string; doneDate: string } | null;
  onRequestSubmitDeliverable: (task: DbTask) => void;
  onPreviewAttachment: (att: FileAttachment) => void;
}

export function getAttachmentFormatIcon(type: AttachmentType) {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-3 w-3 text-sky-500" />;
    case 'md':
      return <FileCode className="h-3 w-3 text-emerald-500" />;
    case 'pdf':
      return <FileText className="h-3 w-3 text-rose-500" />;
    default:
      return <FileText className="h-3 w-3 text-zinc-500" />;
  }
}

export function TaskDeliverablePreview({
  task,
  completionInfo,
  onRequestSubmitDeliverable,
  onPreviewAttachment,
}: TaskDeliverablePreviewProps) {
  return (
    <div className="mt-1.5 pt-1.5 border-t border-zinc-150 text-xs bg-zinc-50/70 p-2.5 rounded-md space-y-1.5">
      {task.deliverable_requirement && (
        <div className="text-zinc-600 flex items-start gap-1 text-[11px]">
          <span className="font-semibold text-zinc-700 shrink-0">交付规范:</span>
          <span className="text-zinc-600 leading-tight">{task.deliverable_requirement}</span>
        </div>
      )}
      {task.deliverable_submission || (task.deliverable_attachments && task.deliverable_attachments.length > 0) ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50/90 px-2.5 py-1.5 rounded border border-emerald-200/80 w-full min-w-0 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="font-semibold shrink-0">已归档成果:</span>
              <span
                className="truncate break-all flex-1 min-w-0 font-medium"
                title={task.deliverable_submission || '交付件/附件已归档'}
              >
                {task.deliverable_submission || '已提交附件成果'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {completionInfo && (
                <span className="text-[10px] text-emerald-700 font-medium">{completionInfo.text}</span>
              )}
              <button
                type="button"
                onClick={() => onRequestSubmitDeliverable(task)}
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-white/80 hover:bg-white px-1.5 py-0.5 rounded border border-emerald-300 transition-colors shadow-3xs"
                title="回看或重新提交交付件/附件"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                <span>回看/编辑交付物</span>
              </button>
            </div>
          </div>

          {/* 交付件附件预览列表 */}
          {task.deliverable_attachments && task.deliverable_attachments.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-zinc-500 font-medium shrink-0">
                附件清单 ({task.deliverable_attachments.length}):
              </span>
              {task.deliverable_attachments.map((att) => (
                <button
                  key={att.id || att.url}
                  type="button"
                  onClick={() => onPreviewAttachment(att)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 text-[11px] text-zinc-700 shadow-3xs transition-all group"
                  title="点击在线预览"
                >
                  <span className="shrink-0">{getAttachmentFormatIcon(att.type)}</span>
                  <span className="truncate max-w-[120px] font-medium group-hover:text-zinc-900">{att.name}</span>
                  <Eye className="h-2.5 w-2.5 text-zinc-400 group-hover:text-emerald-600 ml-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-amber-800 bg-amber-50/70 px-2 py-1 rounded border border-amber-200/60 flex items-center justify-between text-[11px]">
          <span>暂未提交成果，勾选完成时需录入交付件</span>
          <button
            type="button"
            onClick={() => onRequestSubmitDeliverable(task)}
            className="font-medium underline hover:text-amber-950 ml-2 shrink-0"
          >
            立即提交成果
          </button>
        </div>
      )}
    </div>
  );
}
